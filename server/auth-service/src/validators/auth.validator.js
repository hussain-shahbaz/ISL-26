import { z } from "zod";
// REGISTER
export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100, "Name cannot exceed 100 characters"),
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z
    .string()
    // CONVERT TO LOWERCASE
    .transform((value) => value.toLowerCase())
    // VALIDATE ROLE
    // Disallow self-registration as admin; only instructor and student allowed
    .refine((value) => ["instructor", "student"].includes(value), {
      message: "Role must be instructor or student",
    }),
});
// LOGIN
export const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});
// VERIFY EMAIL
export const verifyEmailSchema = z.object({
  email: z.string().email("Invalid email format"),
  otp: z.string().length(6, "OTP must be exactly 6 digits"),
});
// REQUEST OTP
export const requestOTPSchema = z.object({
  email: z.string().email("Invalid email format"),
});
// FORGOT PASSWORD
export const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email format"),
});

// VERIFY RESET OTP
export const verifyResetOTPSchema = z.object({
  email: z.string().email("Invalid email format"),
  otp: z.string().length(6, "OTP must be exactly 6 digits"),
});
// RESET PASSWORD
export const resetPasswordSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});
// CHANGE PASSWORD (authenticated)
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
});
