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
import connectDB from "./config/database.js";


// const app = express();
async function AddAuth(app) {
  await connectDB();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.get('/api/auth/health', (req, res) => {
    res.status(200).json({ success: true, message: 'Auth service is healthy' });
  });
  app.use("/api/auth", authRouter);
  app.use(errorMiddleware);
  return app;
}

export default AddAuth;
