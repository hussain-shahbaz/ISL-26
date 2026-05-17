/**
 * User Controller
 * Handles HTTP requests for user operations
 */

const UserService = require("./user-service");

class UserController {
  /**
   * Create a new user
   * POST /api/v1/user/create
   */
  async createUser(req, res) {
    try {
      const { name, email, hash_password, role, university } = req.body;

      const user = await UserService.createUser({
        name,
        email,
        hash_password,
        role,
        university
      });

      res.status(201).json({
        success: true,
        message: "User created successfully",
        data: user
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Get user by ID
   * GET /api/v1/user/get/:id
   */
  async getUser(req, res) {
    try {
      const { id } = req.params;

      const user = await UserService.getUserById(id);

      res.status(200).json({
        success: true,
        message: "User fetched successfully",
        data: user
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Get all users
   * GET /api/v1/user/get-users
   */
  async getUsers(req, res) {
    try {
      const { role, university } = req.query;

      const filters = {};
      if (role) filters.role = role;
      if (university) filters.university = university;

      const users = await UserService.getAllUsers(filters);

      res.status(200).json({
        success: true,
        message: "Users fetched successfully",
        count: users.length,
        data: users
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Update user
   * PUT /api/v1/user/update/:id
   */
  async updateUser(req, res) {
    try {
      const { id } = req.params;
      const { name, email, hash_password, role, university } = req.body;

      const user = await UserService.updateUser(id, {
        name,
        email,
        hash_password,
        role,
        university
      });

      res.status(200).json({
        success: true,
        message: "User updated successfully",
        data: user
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Delete user
   * DELETE /api/v1/user/delete/:id
   */
  async deleteUser(req, res) {
    try {
      const { id } = req.params;

      const user = await UserService.deleteUser(id);

      res.status(200).json({
        success: true,
        message: "User deleted successfully",
        data: user
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Restore user
   * POST /api/v1/user/restore/:id
   */
  async restoreUser(req, res) {
    try {
      const { id } = req.params;

      const user = await UserService.restoreUser(id);

      res.status(200).json({
        success: true,
        message: "User restored successfully",
        data: user
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Create user identifier
   * POST /api/v1/user/:id/identifier
   */
  async createUserIdentifier(req, res) {
    try {
      const { id } = req.params;
      const { identifier, department, degreeProgram, batch } = req.body;

      const userIdentifier = await UserService.createUserIdentifier(id, {
        identifier,
        department,
        degreeProgram,
        batch
      });

      res.status(201).json({
        success: true,
        message: "User identifier created successfully",
        data: userIdentifier
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Get user identifier
   * GET /api/v1/user/:id/identifier
   */
  async getUserIdentifier(req, res) {
    try {
      const { id } = req.params;

      const identifier = await UserService.getUserIdentifier(id);

      if (!identifier) {
        return res.status(404).json({
          success: false,
          message: "User identifier not found"
        });
      }

      res.status(200).json({
        success: true,
        message: "User identifier fetched successfully",
        data: identifier
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Update user identifier
   * PUT /api/v1/user/:id/identifier
   */
  async updateUserIdentifier(req, res) {
    try {
      const { id } = req.params;
      const { identifier, department, degreeProgram, batch } = req.body;

      const userIdentifier = await UserService.updateUserIdentifier(id, {
        identifier,
        department,
        degreeProgram,
        batch
      });

      res.status(200).json({
        success: true,
        message: "User identifier updated successfully",
        data: userIdentifier
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Get user statistics
   * GET /api/v1/user/statistics
   */
  async getStatistics(req, res) {
    try {
      const stats = await UserService.getUserStatistics();

      res.status(200).json({
        success: true,
        message: "User statistics fetched successfully",
        data: stats
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Get pending approvals (for ADMIN)
   * GET /api/v1/user/approvals/pending
   */
  async getPendingApprovals(req, res) {
    try {
      const { university } = req.query;

      if (!university) {
        return res.status(400).json({
          success: false,
          message: "University parameter is required"
        });
      }

      const pendingUsers = await UserService.getPendingApprovals(university);

      res.status(200).json({
        success: true,
        message: "Pending approvals fetched successfully",
        count: pendingUsers.length,
        data: pendingUsers
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Approve user registration
   * POST /api/v1/user/approve/:id
   */
  async approveUser(req, res) {
    try {
      const { id } = req.params;
      const { approverId, approverRole, approverUniversity } = req.body;

      if (!approverId || !approverRole) {
        return res.status(400).json({
          success: false,
          message: "approverId and approverRole are required"
        });
      }

      const approvedUser = await UserService.approveUser(
        id,
        approverId,
        approverRole,
        approverUniversity
      );

      res.status(200).json({
        success: true,
        message: "User approved successfully",
        data: approvedUser
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Reject user registration
   * POST /api/v1/user/reject/:id
   */
  async rejectUser(req, res) {
    try {
      const { id } = req.params;
      const { approverId, approverRole, approverUniversity } = req.body;

      if (!approverId || !approverRole) {
        return res.status(400).json({
          success: false,
          message: "approverId and approverRole are required"
        });
      }

      const rejectedUser = await UserService.rejectUser(
        id,
        approverId,
        approverRole,
        approverUniversity
      );

      res.status(200).json({
        success: true,
        message: "User rejected successfully",
        data: rejectedUser
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Get users by approval status
   * GET /api/v1/user/approvals/:status
   */
  async getUsersByApprovalStatus(req, res) {
    try {
      const { status } = req.params;
      const { role, university } = req.query;

      if (!["PENDING", "APPROVED", "REJECTED"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid approval status. Must be PENDING, APPROVED, or REJECTED"
        });
      }

      const filters = {};
      if (role) filters.role = role;
      if (university) filters.university = university;

      const users = await UserService.getUsersByApprovalStatus(status, filters);

      res.status(200).json({
        success: true,
        message: `Users with ${status} approval status fetched successfully`,
        count: users.length,
        data: users
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = new UserController();