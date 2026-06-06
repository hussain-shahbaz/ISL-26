import dotenv from "dotenv";
dotenv.config();

// JWT secrets fall back to the single shared JWT_SECRET (see root .env.example)
// so every service signs/verifies with the same key per the integration contract.
const SHARED_JWT_SECRET = process.env.JWT_SECRET;

export default {
  port: process.env.AUTH_PORT || process.env.PORT || 3001,
  mongoURI: process.env.AUTH_MONGO_URI || process.env.MONGO_URI || "mongodb://localhost:27017/auth",
  redisURL: process.env.REDIS_URL || "redis://localhost:6379",
  ACCESS_TOKEN_SECRET: process.env.ACCESS_TOKEN_SECRET || SHARED_JWT_SECRET,
  REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET || SHARED_JWT_SECRET,
  INTERNAL_SECRET: process.env.INTERNAL_SECRET,
  max_active_sessions: process.env.MAX_ACTIVE_SESSIONS || process.env.max_active_sessions || 5,
  Google_Client_Id: process.env.GMAIL_CLIENT_ID || process.env.Google_Client_Id || "",
  Google_Client_Secret: process.env.GMAIL_CLIENT_SECRET || process.env.Google_Client_Secret || "",
  Google_User: process.env.GMAIL_USER || process.env.Google_User || "",
  Google_Refresh_Token: process.env.GMAIL_REFRESH_TOKEN || process.env.Google_Refresh_Token || "",
  USER_SERVICE_URL: process.env.USER_SERVICE_URL || "http://localhost:3002",
};
