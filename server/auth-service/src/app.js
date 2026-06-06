import 'dotenv/config'; 
import authRouter from "./routes/auth.routes.js";
import express from "express";
import cookieParser from "cookie-parser";
import { errorMiddleware } from "./middleware/error.middleware.js";
import connectDB from "./config/database.js";


// const app = express();
async function AddAuth(app) {
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use("/api/auth", authRouter);
  app.use(errorMiddleware);
  await connectDB();
  return app;
}

export default AddAuth;
