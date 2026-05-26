import { z } from "zod";
// REGISTER
export const registerSchema = z.object({
  email: z.string().email(),

  password: z.string().min(8),

  role: z.string(),
});
// LOGIN
export const loginSchema = z.object({
  email: z.string().email(),

  password: z.string().min(1),
});

// VERIFY EMAIL
export const verifyEmailSchema = z.object({
  email: z.string().email(),

  otp: z.string().length(6),
});

// REQUEST OTP
export const requestOTPSchema = z.object({
  email: z.string().email(),
});

// FORGOT PASSWORD
export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

// VERIFY RESET OTP
export const verifyResetOTPSchema = z.object({
  email: z.string().email(),

  otp: z.string().length(6),
});

// RESET PASSWORD
export const resetPasswordSchema = z.object({
  email: z.string().email(),

  password: z.string().min(8),
});
