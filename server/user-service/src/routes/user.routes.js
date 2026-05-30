import { Router } from "express";
import userController from "../controllers/user.controller.js";
const userRouter = Router();
userRouter.post("/register", userController.register);
userRouter.delete("/users/:userId", userController.rollback);
userRouter.get("/profile", userController.getProfile);
userRouter.patch("/profile/complete", userController.completeProfile);
userRouter.patch("/:userId/approval", userController.updateApproval);
export default userRouter;
