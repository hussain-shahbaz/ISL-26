import { Router } from "express";
import userController from "../controllers/user.controller.js";
import internalOnly from "../middlewares/internalOnly.js";
import { authenticate } from "../middlewares/authenticate.js";
import { authorizeRoles } from "../middlewares/authMiddleware.js";
import config from "../config/config.js";
const userRouter = Router();
userRouter.post("/register", internalOnly, userController.register);
userRouter.delete("/users/:userId", userController.rollback);
userRouter.get("/profile", authenticate, userController.getProfile);
userRouter.patch(
  "/profile/complete",
  authenticate,
  userController.completeProfile
);
userRouter.patch(
  "/:userId/approval",
  authenticate,
  authorizeRoles(config.ROLES.ADMIN),
  userController.updateApproval
);
userRouter.get(
  "/instructors/pending",
  authenticate,
  authorizeRoles(config.ROLES.ADMIN),
  userController.getPendingUsers
);
userRouter.get(
  "/instructors",
  authenticate,
  authorizeRoles(config.ROLES.ADMIN),
  userController.getInstructors
);
userRouter.get(
  "/students",
  authenticate,
  authorizeRoles(config.ROLES.ADMIN),
  userController.getStudents
);
userRouter.patch(
  "/instructors/:id/reject",
  authenticate,
  authorizeRoles(config.ROLES.ADMIN),
  userController.rejectInstructor
);
export default userRouter;
