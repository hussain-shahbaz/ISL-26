import dotenv from "dotenv";
dotenv.config();
export default {
  INTERNAL_SECRET: process.env.INTERNAL_SECRET,
  PORT: process.env.USER_PORT || process.env.PORT || 3002,
  // Verify with the same shared secret the gateway/auth-service sign with.
  ACCESS_TOKEN_SECRET: process.env.ACCESS_TOKEN_SECRET || process.env.JWT_SECRET,
  MONGO_URI: process.env.MONGODB_URI || process.env.MONGO_URI,
  ROLES: {
    ADMIN: process.env.ADMIN_ROLE || "ADMIN",
    INSTRUCTOR: process.env.INSTRUCTOR_ROLE || "INSTRUCTOR",
    STUDENT: process.env.STUDENT_ROLE || "STUDENT",
  },
};
