import userService from "../services/user.service.js";
import {
  completeProfileSchema,
  approvalSchema,
  registerProfileSchema,
} from "../validators/user.validator.js";
import {
  formatStudent,
  formatInstructor,
  formatPending,
  formatProfile,
  buildPagination,
} from "../utils/format.js";
import {paginationSchema} from "../validators/user.validator.js";
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
      // Persist only the validated payload, never the raw request body.
      const profile = await userService.createProfile(parsed.data);
      return res.status(201).json({
        success: true,
        message: "Profile created successfully",
        userId: profile.id,
      });
    } catch (error) {
      if (error.message === "CANNOT_SELF_REGISTER_AS_ADMIN") {
        return res.status(403).json({
          success: false,
          message: "Cannot self-register as admin",
        });
      }
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
      console.log("Decoded token payload:", req.user);
      const userId = req.user?.userId || req.user?.id || req.user?.sub;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Access token missing user id",
        });
      }
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
      const { userId, role: rawRole } = req.user;
      if (!userId || !rawRole) {
        return res.status(401).json({
          success: false,
          message: "Invalid token payload",
        });
      }
      const role = String(rawRole).toUpperCase();
      const body = {
        ...req.body,
        role,
      };
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
      const approverId = req.user?.userId || req.user?.id || req.user?.sub;

      if (!approverId) {
        return res.status(401).json({
          success: false,
          message: "Unauthenticated: approver id missing from token",
        });
      }

      const updated = await userService.updateApproval(userId, {
        status,
        approvedBy: approverId,
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
  async rejectInstructor(req, res) {
    const instructor = await userService.rejectInstructor(
      req.params.id,
      req.user.userId
    );

    return res.status(200).json({
      success: true,

      message: "Instructor rejected successfully",

      data: instructor,
    });
  }
  async getStudents(req, res) {
    try {
      const parsed = paginationSchema.safeParse(req.query);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          message: "Invalid query params",
          errors: parsed.error.flatten().fieldErrors,
        });
      }

      const { page, limit, search } = parsed.data;
      const adminId = req.user?.userId || req.user?.id || req.user?.sub;
      const adminProfile = await userService.getProfile(adminId);

      const { users, total } = await userService.getStudents({
        university: adminProfile.university,
        page,
        limit,
        search,
      });

      return res.status(200).json({
        success: true,
        data: {
          users: users.map(formatStudent),
          pagination: buildPagination({ total, page, limit }),
        },
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  // Teacher/admin: search students (by name or email) for exam enrollment.
  // Unlike getStudents, this is not university-scoped so teachers can find
  // any student they intend to enroll.
  async searchStudents(req, res) {
    try {
      const search = (req.query.search || "").toString().trim();
      const limit = Math.min(Number(req.query.limit) || 20, 50);

      const { users } = await userService.getStudents({
        page: 1,
        limit,
        search: search || undefined,
      });

      return res.status(200).json({
        success: true,
        data: { users: users.map(formatStudent) },
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  // Teacher/admin: resolve a list of student emails to canonical user IDs
  // (the paste-emails enrollment fallback).
  async resolveStudents(req, res) {
    try {
      const raw = Array.isArray(req.body?.emails) ? req.body.emails : [];
      const emails = [
        ...new Set(raw.map((e) => String(e).trim()).filter(Boolean)),
      ].slice(0, 200);

      const { matched, unmatched } = await userService.resolveStudentsByEmails(emails);

      return res.status(200).json({
        success: true,
        data: { matched, unmatched },
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  // Internal-only: lets the auth-service read a user's live approval state so it
  // can embed it in the access token at login/refresh. Service-secret protected.
  async getApprovalStatus(req, res) {
    try {
      const { userId } = req.params;
      const profile = await userService.getProfile(userId);
      return res.status(200).json({
        success: true,
        data: { role: profile.role, approvalStatus: profile.approvalStatus },
      });
    } catch (error) {
      if (error.message === "PROFILE_NOT_FOUND") {
        return res.status(404).json({ success: false, message: "Profile not found" });
      }
      return res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  async getInstructors(req, res) {
    try {
      const parsed = paginationSchema.safeParse(req.query);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          message: "Invalid query params",
          errors: parsed.error.flatten().fieldErrors,
        });
      }

      const { page, limit, search } = parsed.data;

      const { users, total } = await userService.getInstructors({
        page,
        limit,
        search,
      });

      return res.status(200).json({
        success: true,
        data: {
          users: users.map(formatInstructor),
          pagination: buildPagination({ total, page, limit }),
        },
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  async getPendingUsers(req, res) {
    try {
      const parsed = paginationSchema.safeParse(req.query);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          message: "Invalid query params",
          errors: parsed.error.flatten().fieldErrors,
        });
      }

      const { page, limit } = parsed.data;

      const { users, total } = await userService.getPendingUsers({
        page,
        limit,
      });

      return res.status(200).json({
        success: true,
        data: {
          users: users.map(formatPending),
          pagination: buildPagination({ total, page, limit }),
        },
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }
}

export default new UserController();
