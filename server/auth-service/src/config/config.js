import dotenv from "dotenv";
dotenv.config();
export default {
  PORT: process.env.PORT,
  mongoURI: process.env.MONGO_URI,
  ACCESS_TOKEN_SECRET: process.env.ACCESS_TOKEN_SECRET,
  REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET,
  INTERNAL_SECRET: process.env.INTERNAL_SECRET,
  max_active_sessions: process.env.max_active_sessions,
  Google_Client_Id: process.env.Google_Client_Id,
  Google_Client_Secret: process.env.Google_Client_Secret,
  Google_User: process.env.Google_User,
  Google_Refresh_Token: process.env.Google_Refresh_Token,
  USER_SERVICE_URL: process.env.USER_SERVICE_URL,
  REDIS_URL: process.env.REDIS_URL,
};
