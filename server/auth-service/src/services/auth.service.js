import { v4 as uuid } from "uuid";
import { AuthRepository } from "../repositories/auth.repository.js";
import { SessionRepository } from "../repositories/session.repository.js";
import { compareHash, hashValue } from "../utils/hash.js";
import { EmailService } from "./email.service.js";
import { VerificationRepository } from "../repositories/verification.repository.js";
import { blacklistToken } from "../utils/jwt.js";
import { generateOTP } from "../utils/otp.js";
import crypt from "crypto";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../utils/jwt.js";
const authRepo = new AuthRepository();
const sessionRepo = new SessionRepository();
const emailService = new EmailService();
const verificationRepo = new VerificationRepository();
export class AuthService {
  async register(body) {
    const existing = await authRepo.findByEmail(body.email);
    if (existing) {
      throw new Error("Email already exists");
    }
    const userId = uuid();
    // future:
    // call user service here
    const passwordHash = await hashValue(body.password);
    // CREATE USER
    await authRepo.create({
      userId,
      email: body.email,
      passwordHash,
      role: body.role,
      isEmailVerified: false,
    });
    // GENERATE OTP
    const otp = generateOTP();
    // HASH OTP
    const otpHash = await hashValue(otp);
    // STORE OTP
    await verificationRepo.create({
      userId,
      type: "EMAIL_VERIFICATION",
      otpHash,
      resendCount: 0,
      blockedUntil: null,
      expiresAt: new Date(Date.now() + 2 * 60 * 1000),
    });
    // SEND EMAIL
    await emailService.sendVerificationEmail(body.email, otp);
    // FINAL RESPONSE
    return {
      message:
        "Registration successful. Please check your email for verification OTP.",
      expiresAt: new Date(Date.now() + 2 * 60 * 1000),
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
    const sessionId = uuid();
    const accessToken = generateAccessToken({
      userId: user.userId,
      role: user.role,
      sessionId,
      jti: crypto.randomUUID(),
    });
    const refreshToken = generateRefreshToken({
      userId: user.userId,
      role: user.role,
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

    // const MAX_ACTIVE_SESSIONS = parseInt(process.env.MAX_ACTIVE_SESSIONS) || 5;

    // const activeCount = await sessionRepo.findActiveBySessionId(user.userId);
    // if (activeCount >= MAX_ACTIVE_SESSIONS) {
    //   await sessionRepo.deleteOldestSession(user.userId);
    // }
    return { accessToken, refreshToken, user };
  }
  async verifyEmail(body) {
    // FIND USER
    const user = await authRepo.findByEmail(body.email);

    if (!user) {
      throw new Error("User not found");
    }
    // CHECK VERIFIED
    if (user.isEmailVerified) {
      throw new Error("Email already verified");
    }

    // FIND TOKEN
    const token = await verificationRepo.findToken(
      user.userId,
      "EMAIL_VERIFICATION"
    );

    // TOKEN NOT FOUND
    if (!token) {
      throw new Error("No OTP session found. Please request a new OTP.");
    }

    // OTP ALREADY USED
    if (token.used) {
      throw new Error("OTP already used. Please request a new OTP.");
    }

    // OTP EXPIRED
    // if (token.expiresAt < new Date()) {
    //   throw new Error("OTP expired. Please request a new OTP.");
    // }

    // TOO MANY WRONG ATTEMPTS
    if (token.attempts >= 5) {
      throw new Error("Too many failed attempts. Please request a new OTP.");
    }

    // COMPARE OTP
    const matched = await compareHash(body.otp, token.otpHash);

    // INVALID OTP
    if (!matched) {
      await verificationRepo.incrementAttempts(token._id);

      throw new Error("Invalid OTP");
    }
    if (matched && token.expiresAt < new Date()) {
      throw new Error("OTP expired. Please request a new OTP.");
    }

    // MARK USED
    await verificationRepo.markUsed(token._id);

    // VERIFY USER
    await authRepo.verifyEmail(user.userId);

    return {
      message: "Email verified successfully. You can now login.",
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
      userId: user.userId,
      role: user.role,
      sessionId: session.sessionId,
      jti: crypto.randomUUID(),
    });
  }
  async getMe(userId) {
    return authRepo.findByUserId(userId);
  }
  async getSessions(userId) {
    return sessionRepo.getUserSessions(userId);
  }
  // async logout(refreshToken) {
  //   if (!refreshToken) {
  //     throw new Error("Refresh token is required");
  //   }

  //   let decoded;
  //   try {
  //     decoded = verifyRefreshToken(refreshToken);
  //   } catch (e) {
  //     throw new Error("Invalid refresh token");
  //   }
  //   const session = await sessionRepo.findActiveBySessionId(decoded.sessionId);
  //   if (!session) {
  //     throw new Error("Session not found or already logged out");
  //   }
  //   const matched = await compareHash(refreshToken, session.refreshTokenHash);
  //   if (!matched) {
  //     throw new Error("Invalid refresh token");
  //   }
  //   // Revoke the session
  //   await sessionRepo.revoke(decoded.sessionId);
  //   if (accessToken) {
  //     try {
  //       const decodedAccess = verifyAccessToken(accessToken); // decode it
  //       await blacklistAccessToken(
  //         decodedAccess.jti, // unique token id
  //         decodedAccess.exp // expiry timestamp
  //       );
  //     } catch (e) {
  //       // if access token already expired — no need to blacklist, ignore
  //       console.warn("Access token invalid or expired, skipping blacklist");
  //     }
  //   }
  //   return {
  //     message: "Logged out successfully",
  //   };
  // }
  // New: Logout from all devices
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

  // ✅ NEW — blacklist the access token jti
  await blacklistToken(jti, "ACCESS", exp);
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
    // 1. FIND USER
    const user = await authRepo.findByEmail(body.email);
    if (!user) {
      throw new Error("User not found");
    }
    // 2. CHECK VERIFIED
    if (user.isEmailVerified) {
      throw new Error("Email already verified");
    }
    // 3. FIND EXISTING TOKEN
    const token = await verificationRepo.findToken(
      user.userId,
      "EMAIL_VERIFICATION"
    );
    if (!token) {
      throw new Error("No OTP session found");
    }
    // if (token.expiresAt < new Date()) {
    //   throw new Error("OTP expired");
    // }
    // 4. CHECK TEMP BLOCK
    if (token.blockedUntil && token.blockedUntil > new Date()) {
      throw new Error("Too many OTP requests. Try again later.");
    }
    // 5. CHECK COOLDOWN
    const timeDifference = Date.now() - new Date(token.updatedAt).getTime();
    if (timeDifference < 30 * 1000) {
      throw new Error("Please wait 30 seconds before requesting another OTP.");
    }
    // 6. CHECK RESEND LIMIT
    if (token.resendCount >= 3) {
      token.blockedUntil = new Date(Date.now() + 15 * 60 * 1000);
      await token.save();
      throw new Error("Too many OTP requests. Try again after 15 minutes.");
    }
    // 7. GENERATE NEW OTP
    const otp = generateOTP();
    // 8. HASH OTP
    const otpHash = await hashValue(otp);
    // 9. NEW EXPIRY
    const expiresAt = new Date(Date.now() + 2 * 60 * 1000);
    // 10. UPDATE EXISTING TOKEN
    token.otpHash = otpHash;
    token.expiresAt = expiresAt;
    token.used = false;
    token.attempts = 0;
    token.resendCount += 1;
    await token.save();
    // 11. SEND EMAIL
    await emailService.sendVerificationEmail(body.email, otp);
    // 12. RETURN RESPONSE
    return {
      message: "OTP sent successfully",
      expiresAt,
    };
  }
  async forgotPassword(body) {
    // 1. FIND USER
    const user = await authRepo.findByEmail(body.email);
    // SECURITY:
    // Do not reveal whether email exists
    if (!user) {
      return {
        message:
          "If an account exists with this email, a reset OTP has been sent.",
      };
    }
    if (!user.isEmailVerified) {
      throw new Error("Please verify your email first.");
    }
    // 2. FIND EXISTING RESET TOKEN
    let token = await verificationRepo.findToken(user.userId, "PASSWORD_RESET");

    // 3. CHECK TEMP BLOCK
    if (token?.blockedUntil && token.blockedUntil > new Date()) {
      throw new Error("Too many OTP requests. Try again later.");
    }
    // 4. RESET BLOCK IF EXPIRED
    if (token?.blockedUntil && token.blockedUntil < new Date()) {
      token.blockedUntil = null;
      token.resendCount = 0;
      await token.save();
    }
    // 5. COOLDOWN CHECK
    if (token) {
      const diff = Date.now() - new Date(token.updatedAt).getTime();
      if (diff < 30 * 1000) {
        throw new Error(
          "Please wait 30 seconds before requesting another OTP."
        );
      }
    }
    // 6. RESEND LIMIT
    if (token && token.resendCount >= 3) {
      token.blockedUntil = new Date(Date.now() + 15 * 60 * 1000);
      await token.save();
      throw new Error("Too many OTP requests. Try again after 15 minutes.");
    }
    // 7. GENERATE OTP
    const otp = generateOTP();
    // 8. HASH OTP
    const otpHash = await hashValue(otp);
    // 9. NEW EXPIRY
    const expiresAt = new Date(Date.now() + 2 * 60 * 1000);
    // 10. CREATE TOKEN IF NOT EXISTS
    if (!token) {
      token = await verificationRepo.create({
        userId: user.userId,
        type: "PASSWORD_RESET",
        otpHash,
        expiresAt,
        attempts: 0,
        resendCount: 0,
        used: false,
        resetVerified: false,
      });
    } else {
      // 11. UPDATE EXISTING TOKEN
      token.otpHash = otpHash;
      token.expiresAt = expiresAt;
      token.attempts = 0;
      token.used = false;
      token.resetVerified = false;
      token.resendCount += 1;
      await token.save();
    }
    // 12. SEND EMAIL
    await emailService.sendPasswordResetEmail(body.email, otp);
    // 13. RESPONSE
    return {
      message:
        "If an account exists with this email, a reset OTP has been sent.",
      expiresAt,
    };
  }
  async verifyResetOTP(body) {
    // 1. FIND USER
    const user = await authRepo.findByEmail(body.email);

    if (!user) {
      throw new Error("User not found");
    }

    // 2. FIND RESET TOKEN
    const token = await verificationRepo.findToken(
      user.userId,
      "PASSWORD_RESET"
    );

    // 3. TOKEN NOT FOUND
    if (!token) {
      throw new Error("No reset OTP session found.");
    }

    // 4. OTP ALREADY USED
    if (token.used) {
      throw new Error("OTP already used.");
    }

    // 5. OTP EXPIRED
    if (token.expiresAt < new Date()) {
      throw new Error("OTP expired. Please request a new OTP.");
    }

    // 6. TOO MANY FAILED ATTEMPTS
    if (token.attempts >= 5) {
      throw new Error("Too many failed attempts. Please request a new OTP.");
    }

    // 7. COMPARE OTP
    const matched = await compareHash(body.otp, token.otpHash);

    // 8. INVALID OTP
    if (!matched) {
      await verificationRepo.incrementAttempts(token._id);

      throw new Error("Invalid OTP");
    }

    // 9. MARK RESET VERIFIED
    token.resetVerified = true;

    // token.used = true;

    await token.save();

    // 10. SUCCESS RESPONSE
    return {
      message: "OTP verified successfully. You can now reset your password.",
    };
  }
  async requestResetPasswordOTP(body) {
    // 1. FIND USER
    const user = await authRepo.findByEmail(body.email);

    if (!user) {
      throw new Error("User not found");
    }

    // 2. EMAIL MUST BE VERIFIED
    if (!user.isEmailVerified) {
      throw new Error("Please verify your email first.");
    }

    // 3. FIND EXISTING TOKEN
    let token = await verificationRepo.findToken(user.userId, "PASSWORD_RESET");

    // 4. CHECK BLOCK
    if (token?.blockedUntil && token.blockedUntil > new Date()) {
      throw new Error("Too many OTP requests. Try again after 15 minutes.");
    }

    // 5. RESET BLOCK IF EXPIRED
    if (token?.blockedUntil && token.blockedUntil < new Date()) {
      token.blockedUntil = null;

      token.resendCount = 0;

      await token.save();
    }

    // 6. COOLDOWN CHECK
    if (token) {
      const diff = Date.now() - new Date(token.updatedAt).getTime();

      if (diff < 30 * 1000) {
        throw new Error(
          "Please wait 30 seconds before requesting another OTP."
        );
      }
    }

    // 7. RESEND LIMIT
    if (token && token.resendCount >= 3) {
      token.blockedUntil = new Date(Date.now() + 15 * 60 * 1000);

      await token.save();

      throw new Error("Too many OTP requests. Try again after 15 minutes.");
    }

    // 8. GENERATE OTP
    const otp = generateOTP();

    // 9. HASH OTP
    const otpHash = await hashValue(otp);

    // 10. EXPIRY
    const expiresAt = new Date(Date.now() + 2 * 60 * 1000);

    // 11. CREATE TOKEN
    if (!token) {
      token = await verificationRepo.create({
        userId: user.userId,

        type: "PASSWORD_RESET",

        otpHash,

        expiresAt,

        attempts: 0,

        resendCount: 1,

        used: false,

        resetVerified: false,
      });
    } else {
      // UPDATE EXISTING TOKEN
      token.otpHash = otpHash;

      token.expiresAt = expiresAt;

      token.attempts = 0;

      token.used = false;

      token.resetVerified = false;

      token.resendCount += 1;

      await token.save();
    }

    // 12. SEND EMAIL
    await emailService.sendPasswordResetEmail(body.email, otp);

    // 13. RESPONSE
    return {
      message: "Reset OTP sent successfully.",

      expiresAt,
    };
  }
  async resetPassword(body) {
    // 1. FIND USER
    const user = await authRepo.findByEmail(body.email);
    if (!user) {
      throw new Error("User not found");
    }
    // 2. FIND PASSWORD RESET TOKEN
    const token = await verificationRepo.findToken(
      user.userId,
      "PASSWORD_RESET"
    );
    // 3. TOKEN NOT FOUND
    if (!token) {
      throw new Error("Reset session not found.");
    }
    // 4. CHECK OTP VERIFIED
    if (!token.resetVerified) {
      throw new Error("OTP verification required.");
    }
    // 5. CHECK TOKEN USED
    if (token.used) {
      throw new Error("Reset session already used.");
    }
    // 6. CHECK EXPIRY
    if (token.expiresAt < new Date()) {
      throw new Error("Reset session expired. Please request a new OTP.");
    }
    // 7. HASH NEW PASSWORD
    const passwordHash = await hashValue(body.password);
    // 8. UPDATE PASSWORD
    await authRepo.updatePassword(user.userId, passwordHash);
    // 9. MARK TOKEN USED
    token.used = true;
    await token.save();
    if (token.used) {
      await verificationRepo.deleteToken(token._id);
    }
    // 10. SUCCESS RESPONSE
    return {
      message: "Password reset successful. You can now login.",
    };
  }
}
