import dotenv from "dotenv";
dotenv.config();
export default {
  port: process.env.PORT,
  mongoURI: process.env.MONGO_URI,
  ACCESS_TOKEN_SECRET: process.env.ACCESS_TOKEN_SECRET,
  REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET
};