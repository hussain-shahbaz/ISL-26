import dotenv from "dotenv";
dotenv.config();
export default {
  INTERNAL_SECRET: process.env.INTERNAL_SECRET,
  ACCESS_TOKEN_SECRET: process.env.ACCESS_TOKEN_SECRET,
  MONGO_URI: process.env.MONGO_URI,
  ROLES: {
    ADMIN: process.env.ADMIN_ROLE || "ADMIN",
    INSTRUCTOR: process.env.INSTRUCTOR_ROLE || "INSTRUCTOR",
    STUDENT: process.env.STUDENT_ROLE || "STUDENT",
  },
};
