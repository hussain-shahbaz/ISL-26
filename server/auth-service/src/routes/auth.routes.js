import { Router } from "express";
import { AuthController } from "../controllers/auth.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { authLimiter,registerLimiter,loginLimiter } from "../middleware/rateLimiter.js";
const authRouter = Router();
const controller = new AuthController();
import express from "express";
import { validate } from "../middleware/validate.middleware.js";
import {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  requestOTPSchema,
  forgotPasswordSchema,
  verifyResetOTPSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from "../validators/auth.validator.js";
authRouter.post(
  "/register",
  registerLimiter,
  validate(registerSchema),
  controller.register
);
// LOGIN
authRouter.post(
  "/login",
  loginLimiter,
  validate(loginSchema),
  controller.login
);
// VERIFY EMAIL
authRouter.post(
  "/verify-email",
  authLimiter,
  validate(verifyEmailSchema),
  controller.verifyEmail
);
// REFRESH TOKEN
authRouter.post("/refresh", authLimiter, controller.refresh);
// CURRENT USER
authRouter.get("/me", authMiddleware, controller.me);
// USER SESSIONS
authRouter.get("/sessions", authMiddleware, controller.sessions);
// LOGOUT
authRouter.post("/logout", authMiddleware, controller.logout);
// LOGOUT ALL DEVICES
authRouter.post("/logout-all", authMiddleware, controller.logoutAll);
// REVOKE A SINGLE SESSION
authRouter.post("/sessions/:id/revoke", authMiddleware, controller.revokeSession);
// CHANGE PASSWORD (authenticated)
authRouter.post(
  "/change-password",
  authLimiter,
  authMiddleware,
  validate(changePasswordSchema),
  controller.changePassword
);
// REQUEST NEW EMAIL OTP
authRouter.post(
  "/request-otp",
  authLimiter,
  validate(requestOTPSchema),
  controller.requestNewOTP
);
// REQUEST RESET PASSWORD OTP
authRouter.post(
  "/request-reset-password-otp",
  authLimiter,
  validate(requestOTPSchema),
  controller.requestResetPasswordOTP
);
// FORGOT PASSWORD
authRouter.post(
  "/forgot-password",
  authLimiter,
  validate(forgotPasswordSchema),
  controller.forgotPassword
);
// VERIFY RESET OTP
authRouter.post(
  "/verify-reset-otp",
  authLimiter,
  validate(verifyResetOTPSchema),
  controller.verifyResetOTP
);
// RESET PASSWORD
authRouter.post(
  "/reset-password",
  authLimiter,
  validate(resetPasswordSchema),
  controller.resetPassword
);
export default authRouter;
