// import 'dotenv/config';
// import authRouter from "./routes/auth.routes.js";
// import express from "express";
// import cookieParser from "cookie-parser";
// import { errorMiddleware } from "./middleware/error.middleware.js";
// const app = express();
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));
// app.use(cookieParser());
// app.use("/api/auth", authRouter);
// app.use(errorMiddleware);
// export default app;
import "dotenv/config";
import authRouter from "./routes/auth.routes.js";
import express from "express";
import cookieParser from "cookie-parser";
import { errorMiddleware } from "./middleware/error.middleware.js";
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use("/api/auth", authRouter);
app.use(errorMiddleware);
// for main server mounting ← add this
export const attachAuth = (mainApp) => {
  mainApp.use("/api/auth", authRouter);
  app.use(errorMiddleware);
};
export default app;
