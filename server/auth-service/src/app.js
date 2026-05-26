import authRouter from "./routes/auth.routes.js";
import express from "express";
import cookieParser from "cookie-parser";
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use("/api/auth", authRouter);
export default app;