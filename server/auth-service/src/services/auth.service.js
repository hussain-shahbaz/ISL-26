import { v4 as uuid } from "uuid";
import { AuthRepository } from "../repositories/auth.repository.js";
import { SessionRepository } from "../repositories/session.repository.js";
import { compareHash, hashValue } from "../utils/hash.js";
import { EmailService } from "./email.service.js";
import { VerificationRepository } from "../repositories/verification.repository.js";
import { blacklistToken } from "../utils/jwt.js";
import { generateOTP } from "../utils/otp.js";
import crypto from "crypto";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../utils/jwt.js";
import userServiceHttp from "../http/userService.http.js";
const authRepo = new AuthRepository();
const sessionRepo = new SessionRepository();
const emailService = new EmailService();
const verificationRepo = new VerificationRepository();
export class AuthService {
  async register(body) {
    // Prevent users from self-registering as admin
    if (String(body.role).toLowerCase() === "admin") {
      throw new Error("CANNOT_SELF_REGISTER_AS_ADMIN");
    }
    // 1. check MongoDB — permanent record
    const existing = await authRepo.findByEmail(body.email);
    if (existing) {
      throw new Error("Email already exists");
    }
    // 2. check Redis — registration in progress
    const inProgress = await verificationRepo.isRegistrationInProgress(
      body.email
    );
    if (inProgress) {
      throw new Error(
        "Registration already in progress. Please verify your email."
      );
    }
    // 3. generate userId + hash password
    const userId = uuid();
    const passwordHash = await hashValue(body.password);
    // 4. store temp registration data in Redis
    await verificationRepo.storeTempRegistration(userId, {
      userId,
      name: body.name,
      email: body.email,
      role: body.role,
      passwordHash,
    });
    // 5. generate OTP + hash it
    const otp = generateOTP();
    const otpHash = await hashValue(otp);

    // 6. store OTP in Redis
    await verificationRepo.storeOTP("EMAIL_VERIFICATION", body.email, {
      userId, // ← link to temp data
      otpHash,
    });

    // 7. send OTP email
    await emailService.sendVerificationEmail(body.email, otp);

    return {
      message:
        "Registration successful. Please check your email for verification OTP.",
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    };
  }
  async login(body, meta) {
    const user = await authRepo.findByEmail(body.email);
    if (!user) throw new Error("Invalid credentials");

    const matched = await compareHash(body.password, user.passwordHash);
    if (!matched) throw new Error("Invalid credentials");
    if (!user.isEmailVerified) {
      throw new Error("Please verify your email");
    }
    const activeSessionCount = await sessionRepo.getActiveSessionCount(
      user.userId
    );

    if (activeSessionCount > 0) {
      throw new Error(
        "You are already logged in on another device. Please logout from there first."
      );
    }
    const sessionId = uuid();
    const deviceFingerprintHash = crypto
      .createHash("sha256")
      .update(meta.deviceFingerprint || "unknown")
      .digest("hex");
    // Shared JWT contract: user_id, username, role, session_id,
    // device_fingerprint_hash. camelCase aliases kept for backward compat.
    const accessToken = generateAccessToken({
      user_id: user.userId,
      userId: user.userId,
      username: user.email,
      role: user.role,
      session_id: sessionId,
      sessionId,
      device_fingerprint_hash: deviceFingerprintHash,
      jti: crypto.randomUUID(),
    });
    const refreshToken = generateRefreshToken({
      user_id: user.userId,
      userId: user.userId,
      role: user.role,
      session_id: sessionId,
      sessionId,
    });
    const refreshTokenHash = await hashValue(refreshToken);
    await sessionRepo.create({
      sessionId,
      userId: user.userId,
      refreshTokenHash,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      deviceFingerprint: meta.deviceFingerprint,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    return { accessToken, refreshToken, user };
  }
  async verifyEmail(body) {
    // 1. get OTP data from Redis
    const otpData = await verificationRepo.getOTP(
      "EMAIL_VERIFICATION",
      body.email
    );
    if (!otpData) {
      throw new Error("OTP expired or invalid. Please register again.");
    }
    // 2. check if blocked
    if (otpData.blockedUntil && new Date(otpData.blockedUntil) > new Date()) {
      throw new Error("Too many failed attempts. Please try again later.");
    }
    // 3. check already used
    if (otpData.used) {
      throw new Error("OTP already used. Please request a new OTP.");
    }
    // 4. check expired
    if (new Date(otpData.expiresAt) < new Date()) {
      throw new Error("OTP expired. Please register again.");
    }
    // 5. check too many attempts
    if (otpData.attempts >= 5) {
      await verificationRepo.updateOTP("EMAIL_VERIFICATION", body.email, {
        blockedUntil: new Date(Date.now() + 10 * 60 * 1000),
      });
      throw new Error("Too many failed attempts. Please request a new OTP.");
    }
    // 6. compare OTP
    const matched = await compareHash(body.otp, otpData.otpHash);
    if (!matched) {
      await verificationRepo.updateOTP("EMAIL_VERIFICATION", body.email, {
        attempts: otpData.attempts + 1,
      });
      throw new Error("Invalid OTP");
    }
    // 7. get temp registration data
    const tempData = await verificationRepo.getTempRegistration(otpData.userId);
    if (!tempData) {
      throw new Error("Registration session expired. Please register again.");
    }
    // Extra guard: prevent admin from being created via temp data
    if (String(tempData.role).toLowerCase() === "admin") {
      // cleanup temp entries
      await verificationRepo.deleteOTP("EMAIL_VERIFICATION", body.email);
      await verificationRepo.deleteTempRegistration(tempData.userId);
      throw new Error("CANNOT_SELF_REGISTER_AS_ADMIN");
    }
    // 8. create auth record in MongoDB
    await authRepo.create({
      userId: tempData.userId,
      email: tempData.email,
      passwordHash: tempData.passwordHash,
      role: tempData.role,
      isEmailVerified: true,
    });
    try {
      await userServiceHttp.createProfile({
        userId: tempData.userId,
        name: tempData.name,
        email: tempData.email,
        role: tempData.role,
      });
    } catch (error) {
      // user-service failed → rollback auth record
      await authRepo.deleteByEmail(tempData.email);
      throw new Error("Registration failed. Please try again.");
    }
    // 10. mark OTP used
    await verificationRepo.updateOTP("EMAIL_VERIFICATION", body.email, {
      used: true,
    });
    // 11. cleanup Redis
    await verificationRepo.deleteOTP("EMAIL_VERIFICATION", body.email);
    await verificationRepo.deleteTempRegistration(tempData.userId);
    return {
      message: "Email verified successfully.",
    };
  }
  async refresh(refreshToken) {
    const decoded = verifyRefreshToken(refreshToken);
    const session = await sessionRepo.findActiveBySessionId(decoded.sessionId);
    if (!session) throw new Error("Invalid session");
    const matched = await compareHash(refreshToken, session.refreshTokenHash);
    if (!matched) throw new Error("Invalid refresh token");
    const user = await authRepo.findByUserId(decoded.userId);
    return generateAccessToken({
      user_id: user.userId,
      userId: user.userId,
      username: user.email,
      role: user.role,
      session_id: session.sessionId,
      sessionId: session.sessionId,
      jti: crypto.randomUUID(),
    });
  }
  async getMe(userId) {
    const user = await authRepo.findByUserId(userId);
    if (!user) return null;
    // Never expose the password hash to clients.
    return {
      userId: user.userId,
      email: user.email,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      isBlocked: user.isBlocked,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
  async getSessions(userId) {
    const sessions = await sessionRepo.getUserSessions(userId);
    // Strip the refresh token hash; expose only safe session metadata.
    return (sessions || []).map((s) => ({
      sessionId: s.sessionId,
      ipAddress: s.ipAddress,
      userAgent: s.userAgent,
      revoked: s.revoked,
      expiresAt: s.expiresAt,
      lastActivityAt: s.lastActivityAt,
      createdAt: s.createdAt,
    }));
  }
  async logout(refreshToken, jti, exp) {
    if (!refreshToken) {
      throw new Error("Refresh token is required");
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch (e) {
      throw new Error("Invalid refresh token");
    }

    const session = await sessionRepo.findActiveBySessionId(decoded.sessionId);
    if (!session) {
      throw new Error("Session not found or already logged out");
    }
    const matched = await compareHash(refreshToken, session.refreshTokenHash);
    if (!matched) {
      throw new Error("Invalid refresh token");
    }

    // ✅ Your existing logic
    await sessionRepo.revoke(decoded.sessionId);

    // Blacklist access token until its natural expiry
    await blacklistToken(jti, exp);
    return { message: "Logged out successfully" };
  }
  async logoutAll(userId) {
    await Session.updateMany({ userId, revoked: false }, { revoked: true });
    return true;
  }

  // New: Revoke single session
  async revokeSession(sessionId, userId) {
    const session = await sessionRepo.findActiveBySessionId(sessionId);
    if (!session || session.userId !== userId) {
      throw new Error("Session not found or unauthorized");
    }
    await sessionRepo.revoke(sessionId);
    return true;
  }
  async requestNewOTP(body) {
    // 1. check permanent record — must NOT exist yet
    const user = await authRepo.findByEmail(body.email);
    if (user) {
      throw new Error("Email already verified. Please login.");
    }
    // 2. get OTP from Redis
    const otpData = await verificationRepo.getOTP(
      "EMAIL_VERIFICATION",
      body.email
    );
    if (!otpData) {
      throw new Error("No OTP session found. Please register again.");
    }
    // 3. check blocked
    if (otpData.blockedUntil && new Date(otpData.blockedUntil) > new Date()) {
      throw new Error("Too many OTP requests. Try again later.");
    }
    // 4. cooldown check (30 seconds)
    const timeDiff = Date.now() - new Date(otpData.updatedAt).getTime();
    if (timeDiff < 30 * 1000) {
      throw new Error("Please wait 30 seconds before requesting another OTP.");
    }
    // 5. resend limit
    if (otpData.resendCount >= 3) {
      await verificationRepo.updateOTP("EMAIL_VERIFICATION", body.email, {
        blockedUntil: new Date(Date.now() + 15 * 60 * 1000),
      });
      throw new Error("Too many OTP requests. Try again after 15 minutes.");
    }

    // 6. generate new OTP
    const otp = generateOTP();
    const otpHash = await hashValue(otp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // 7. update OTP in Redis
    await verificationRepo.updateOTP("EMAIL_VERIFICATION", body.email, {
      otpHash,
      expiresAt,
      used: false,
      attempts: 0,
      resendCount: otpData.resendCount + 1,
    });

    // 8. send email
    await emailService.sendVerificationEmail(body.email, otp);

    return {
      message: "OTP sent successfully.",
      expiresAt,
    };
  }
  async forgotPassword(body) {
    // 1. find user — security: don't reveal if email exists
    const user = await authRepo.findByEmail(body.email);
    if (!user) {
      return {
        message:
          "If an account exists with this email, a reset OTP has been sent.",
      };
    }
    if (!user.isEmailVerified) {
      throw new Error("Please verify your email first.");
    }
    // 2. get existing OTP from Redis
    const otpData = await verificationRepo.getOTP("PASSWORD_RESET", body.email);

    // 3. check blocked
    if (otpData?.blockedUntil && new Date(otpData.blockedUntil) > new Date()) {
      throw new Error("Too many OTP requests. Try again later.");
    }

    // 4. reset block if expired
    if (otpData?.blockedUntil && new Date(otpData.blockedUntil) < new Date()) {
      await verificationRepo.updateOTP("PASSWORD_RESET", body.email, {
        blockedUntil: null,
        resendCount: 0,
      });
    }
    // 5. cooldown check
    if (otpData) {
      const diff = Date.now() - new Date(otpData.updatedAt).getTime();
      if (diff < 30 * 1000) {
        throw new Error(
          "Please wait 30 seconds before requesting another OTP."
        );
      }
    }
    // 6. resend limit
    if (otpData && otpData.resendCount >= 3) {
      await verificationRepo.updateOTP("PASSWORD_RESET", body.email, {
        blockedUntil: new Date(Date.now() + 15 * 60 * 1000),
      });
      throw new Error("Too many OTP requests. Try again after 15 minutes.");
    }

    // 7. generate OTP
    const otp = generateOTP();
    const otpHash = await hashValue(otp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // 8. store or update OTP in Redis
    if (!otpData) {
      await verificationRepo.storeOTP("PASSWORD_RESET", body.email, {
        otpHash,
        expiresAt,
      });
    } else {
      await verificationRepo.updateOTP("PASSWORD_RESET", body.email, {
        otpHash,
        expiresAt,
        used: false,
        attempts: 0,
        resetVerified: false,
        resendCount: otpData.resendCount + 1,
      });
    }

    // 9. send email
    await emailService.sendPasswordResetEmail(body.email, otp);

    return {
      message:
        "If an account exists with this email, a reset OTP has been sent.",
      expiresAt,
    };
  }

  async verifyResetOTP(body) {
    // 1. get OTP from Redis
    const otpData = await verificationRepo.getOTP("PASSWORD_RESET", body.email);
    if (!otpData) {
      throw new Error("No reset OTP session found.");
    }
    // 2. check already used
    if (otpData.used) {
      throw new Error("OTP already used.");
    }

    // 3. check expired
    if (new Date(otpData.expiresAt) < new Date()) {
      throw new Error("OTP expired. Please request a new OTP.");
    }
    // 4. check too many attempts
    if (otpData.attempts >= 5) {
      throw new Error("Too many failed attempts. Please request a new OTP.");
    }

    // 5. compare OTP
    const matched = await compareHash(body.otp, otpData.otpHash);
    if (!matched) {
      await verificationRepo.updateOTP("PASSWORD_RESET", body.email, {
        attempts: otpData.attempts + 1,
      });
      throw new Error("Invalid OTP");
    }
    // 6. mark reset verified
    await verificationRepo.updateOTP("PASSWORD_RESET", body.email, {
      resetVerified: true,
    });
    return {
      message: "OTP verified successfully. You can now reset your password.",
    };
  }
  async resetPassword(body) {
    // 1. find user
    const user = await authRepo.findByEmail(body.email);
    if (!user) {
      throw new Error("User not found");
    }

    // 2. get OTP from Redis
    const otpData = await verificationRepo.getOTP("PASSWORD_RESET", body.email);
    if (!otpData) {
      throw new Error("Reset session not found.");
    }

    // 3. check reset verified
    if (!otpData.resetVerified) {
      throw new Error("OTP verification required.");
    }

    // 4. check already used
    if (otpData.used) {
      throw new Error("Reset session already used.");
    }

    // 5. check expired
    if (new Date(otpData.expiresAt) < new Date()) {
      throw new Error("Reset session expired. Please request a new OTP.");
    }

    // 6. hash new password
    const passwordHash = await hashValue(body.password);

    // 7. update password in MongoDB
    await authRepo.updatePassword(user.userId, passwordHash);

    // 8. cleanup Redis
    await verificationRepo.deleteOTP("PASSWORD_RESET", body.email);

    return {
      message: "Password reset successful. You can now login.",
    };
  }
}
