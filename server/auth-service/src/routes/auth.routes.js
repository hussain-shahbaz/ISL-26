import { Router } from "express";
import { AuthController } from "../controllers/auth.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
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
} from "../validators/auth.validator.js";
authRouter.post("/register", validate(registerSchema), controller.register);
// LOGIN
authRouter.post("/login", validate(loginSchema), controller.login);
// VERIFY EMAIL
authRouter.post(
  "/verify-email",

  validate(verifyEmailSchema),
  controller.verifyEmail
);
// REFRESH TOKEN
authRouter.post("/refresh", controller.refresh);
// CURRENT USER
authRouter.get(
  "/me",

  authMiddleware,

  controller.me
);
// USER SESSIONS
authRouter.get(
  "/sessions",

  authMiddleware,

  controller.sessions
);
// LOGOUT
authRouter.post("/logout", controller.logout);
// LOGOUT ALL
authRouter.post(
  "/logout-all",

  authMiddleware,

  controller.logoutAll
);
// REQUEST NEW EMAIL OTP
authRouter.post(
  "/request-otp",
  validate(requestOTPSchema),
  controller.requestNewOTP
);

// REQUEST RESET PASSWORD OTP
authRouter.post(
  "/request-reset-password-otp",

  validate(requestOTPSchema),

  controller.requestResetPasswordOTP
);

// FORGOT PASSWORD
authRouter.post(
  "/forgot-password",

  validate(forgotPasswordSchema),

  controller.forgotPassword
);

// VERIFY RESET OTP
authRouter.post(
  "/verify-reset-otp",

  validate(verifyResetOTPSchema),

  controller.verifyResetOTP
);

// RESET PASSWORD
authRouter.post(
  "/reset-password",

  validate(resetPasswordSchema),

  controller.resetPassword
);

// REVOKE SESSION
authRouter.delete(
  "/sessions/:id",

  authMiddleware,

  controller.revokeSession
);
export default authRouter;
