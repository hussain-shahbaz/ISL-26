import userRouter from "./routes/user.routes.js";
import express from "express";
const app = express();
// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/api/users", userRouter);
// Error handling middleware
export default app;
