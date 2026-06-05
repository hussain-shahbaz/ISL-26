import 'dotenv/config'; 
import authRouter from "./routes/auth.routes.js";
import express from "express";
import cookieParser from "cookie-parser";
import { errorMiddleware } from "./middleware/error.middleware.js";
<<<<<<< HEAD
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use("/api/auth", authRouter);
app.use(errorMiddleware);
export default app;
=======
import connectDB from "./config/database.js";


// const app = express();
function AddAuth(app) {
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use("/api/auth", authRouter);
  app.use(errorMiddleware);
  connectDB();
  return app;
}

export default AddAuth;
>>>>>>> 2546fea1fbbeff931eae5532f4e9089cd98b9512
