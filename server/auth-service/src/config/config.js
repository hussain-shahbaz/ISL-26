import dotenv from "dotenv";
dotenv.config();
export default {
  port: process.env.PORT || 3000,
  mongoURI: process.env.MONGO_URI || "mongodb://localhost:27017/auth",
  ACCESS_TOKEN_SECRET: process.env.ACCESS_TOKEN_SECRET || "120edab9f903d124d9dc1ad20a9bd350e7",
  REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET || "d9c1ad20a9bd350e7120edab9f903d124d9",
  max_active_sessions: process.env.max_active_sessions || 5,
  Google_Client_Id: process.env.Google_Client_Id || "",
  Google_Client_Secret: process.env.Google_Client_Secret || "",
  Google_User:process.env.Google_User || "",
  Google_Refresh_Token:process.env.Google_Refresh_Token || ""
};
