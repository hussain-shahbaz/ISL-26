import rateLimit from "express-rate-limit";
// General Auth Limiter
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 requests per 15 minutes
  message: {
    success: false,
    message: "Too many requests . Please try again after 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
// Login Limiter (Stricter)
export const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 8, // Max 8 login attempts
  message: {
    success: false,
    message: "Too many login attempts. Please try again after 10 minutes.",
  },
});
// Registration Limiter (Most Strict)
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Max 5 registrations per hour
  message: {
    success: false,
    message: "Too many registration attempts from this IP.",
  },
});
