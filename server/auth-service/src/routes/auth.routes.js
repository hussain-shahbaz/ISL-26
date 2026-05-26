import { Router } from "express";
import authController from "../controllers/auth.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";
const authRouter = Router();
// Public
authRouter.post("/register", authController.register.bind(authController));
authRouter.post("/login", authController.login.bind(authController));
authRouter.post("/refresh-token", authController.refreshToken.bind(authController));
// authRouter.post("/logout,authController.logout.bind")
// Protected
authRouter.get(
  "/getMe",
  authMiddleware.authenticate.bind(authMiddleware),
  authController.getMe.bind(authController)
);
export default authRouter;