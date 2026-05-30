import userService from "../services/user.service.js";
import {
  completeProfileSchema,
  approvalSchema,
  registerProfileSchema,
} from "../validators/user.validator.js";
class UserController {
  async register(req, res) {
    try {
      const parsed = registerProfileSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: parsed.error.flatten().fieldErrors,
        });
      }
      const profile = await userService.createProfile(parsed.data);
      return res.status(201).json({
        success: true,
        message: "Profile created successfully",
        userId: profile.id,
      });
    } catch (error) {
      if (error.message === "PROFILE_ALREADY_EXISTS") {
        return res.status(409).json({
          success: false,
          message: "Profile already exists",
        });
      }
      return res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  async rollback(req, res) {
    try {
      const { userId } = req.params;
      await userService.rollbackProfile(userId);

      return res.status(200).json({
        success: true,
        message: "Profile rolled back successfully",
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Rollback failed",
        error: error.message,
      });
    }
  }
  async getProfile(req, res) {
    try {
      const userId = "3f5b9d9a-7c4b-4abc-a2f3-5e0c6d8f9b12";
      const profile = await userService.getProfile(userId);
      return res.status(200).json({
        success: true,
        data: {
          id: profile.id,
          name: profile.name,
          email: profile.email,
          role: profile.role,
          university: profile.university,
          bio: profile.bio,
          avatarUrl: profile.avatarUrl,
          isProfileComplete: profile.isProfileComplete,
          approvalStatus: profile.approvalStatus,
          createdAt: profile.createdAt,
          identifier: profile.identifier
            ? {
                identifier: profile.identifier.identifier,
                department: profile.identifier.department,
                degreeProgram: profile.identifier.degreeProgram,
                batch: profile.identifier.batch,
              }
            : null,
        },
      });
    } catch (error) {
      if (error.message === "PROFILE_NOT_FOUND") {
        return res.status(404).json({
          success: false,
          message: "Profile not found",
        });
      }
      return res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }
  async completeProfile(req, res) {
    try {
      // inject role from JWT into body so schema can discriminate
      const userId = "2f4b9d9a-7c4b-4abc-a2f3-5e0c6d8f7b11";
      const role = "INSTRUCTOR";
      const body = {
        ...req.body,
        role,
      };
      console.log("Received complete profile request with body:", req.body);
      const parsed = completeProfileSchema.safeParse(body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: parsed.error.flatten().fieldErrors,
        });
      }
      const profile = await userService.completeProfile(userId, parsed.data);
      return res.status(200).json({
        success: true,
        message: "Profile completed successfully",
        data: {
          id: profile.id,
          name: profile.name,
          email: profile.email,
          role: profile.role,
          university: profile.university,
          isProfileComplete: profile.isProfileComplete,
          approvalStatus: profile.approvalStatus,
          identifier: profile.identifier
            ? {
                identifier: profile.identifier.identifier,
                department: profile.identifier.department,
                degreeProgram: profile.identifier.degreeProgram,
                batch: profile.identifier.batch,
              }
            : null,
        },
      });
    } catch (error) {
      if (error.message === "PROFILE_NOT_FOUND") {
        return res.status(404).json({
          success: false,
          message: "Profile not found",
        });
      }

      if (error.message === "PROFILE_ALREADY_COMPLETE") {
        return res.status(400).json({
          success: false,
          message: "Profile is already complete",
        });
      }

      if (error.message === "ROLE_MISMATCH") {
        return res.status(400).json({
          success: false,
          message: "Role mismatch between token and profile",
        });
      }

      if (error.code === "P2002") {
        return res.status(409).json({
          success: false,
          message: "Roll number or employee ID already exists",
        });
      }

      return res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }
  async updateApproval(req, res) {
    try {
      // validate body
      const parsed = approvalSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: parsed.error.flatten().fieldErrors,
        });
      }

      const { userId } = req.params;
      const { status } = parsed.data;
      const approvedBy ="7c426e12-5b70-445d-b007-87be55ea1ab2";

      const updated = await userService.updateApproval(userId, {
        status,
        approvedBy,
      });

      return res.status(200).json({
        success: true,
        message: `User ${
          status === "APPROVED" ? "approved" : "rejected"
        } successfully`,
        data: {
          id: updated.id,
          name: updated.name,
          role: updated.role,
          approvalStatus: updated.approvalStatus,
          approvedAt: updated.approvedAt,
          approvedBy: updated.approvedBy,
        },
      });
    } catch (error) {
      if (error.message === "USER_NOT_FOUND") {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      if (error.message === "STUDENTS_DONT_NEED_APPROVAL") {
        return res.status(400).json({
          success: false,
          message: "Students don't need approval",
        });
      }

      if (error.message === "USER_NOT_PENDING") {
        return res.status(400).json({
          success: false,
          message: "User is not in pending status",
        });
      }

      return res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }
}

export default new UserController();
