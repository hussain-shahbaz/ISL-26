/**
 * User Service
 * Contains business logic for user operations
 * Password handling: accepts plain password, passes to repository for hashing
 */

const UserRepository = require("./user-repository");
const UserValidator = require("./user-validator");

class UserService {
  /**
   * Create a new user with validation
   * @param {Object} userData - User data with plain password field
   */
  async createUser(userData) {
    // Validate input
    // console.log(userData);
    
    const validation = UserValidator.validateCreate(userData);
    if (!validation.isValid) {
        // console.log(userData);        
      throw new Error(`Validation failed: ${validation.errors.join(", ")}`);
    }

    // Check if email already exists
    const existingUser = await UserRepository.getByEmail(userData.email);
    if (existingUser) {
      throw new Error("Email already registered");
    }

    // Handle university based on role
    if (userData.role === "SUPERADMIN") {
      // SUPERADMIN has no university context
      userData.university = null;
    } else {
      // All other roles default to UET if not provided
      if (!userData.university) {
        userData.university = "UET";
      }
    }

    // Create user (repository will hash the password)
    const user = await UserRepository.create(userData);
    return user;
  }

  /**
   * Get user by ID
   */
  async getUserById(userId) {
    const user = await UserRepository.getById(userId);
    if (!user || user.isDeleted) {
      throw new Error("User not found");
    }
    return user;
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email) {
    const user = await UserRepository.getByEmail(email);
    if (!user || user.isDeleted) {
      throw new Error("User not found");
    }
    return user;
  }

  /**
   * Get all users with optional filters
   */
  async getAllUsers(filters = {}) {
    const users = await UserRepository.getAll(filters);
    return users;
  }

  /**
   * Update user with validation
   * @param {string} userId - User ID to update
   * @param {Object} updateData - Update data (can include plain password)
   */
  async updateUser(userId, updateData) {
    // Check if user exists
    await this.getUserById(userId);

    // Validate update data
    const validation = UserValidator.validateUpdate(updateData);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(", ")}`);
    }

    // Check if new email is already in use
    if (updateData.email) {
      const existingUser = await UserRepository.getByEmail(updateData.email);
      if (existingUser && existingUser.id !== userId) {
        throw new Error("Email already in use");
      }
    }

    const updatedUser = await UserRepository.update(userId, updateData);
    return updatedUser;
  }

  /**
   * Delete user (soft delete)
   */
  async deleteUser(userId) {
    await this.getUserById(userId);
    const user = await UserRepository.softDelete(userId);
    return user;
  }

  /**
   * Restore deleted user
   */
  async restoreUser(userId) {
    const user = await UserRepository.getById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const restored = await UserRepository.update(userId, { isDeleted: false });
    return restored;
  }

  /**
   * Create user identifier
   */
  async createUserIdentifier(userId, identifierData) {
    await this.getUserById(userId);

    // Validate identifier data
    const validation = UserValidator.validateIdentifier(identifierData);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(", ")}`);
    }

    const identifier = await UserRepository.createIdentifier(userId, identifierData);
    return identifier;
  }

  /**
   * Get user identifier
   */
  async getUserIdentifier(userId) {
    await this.getUserById(userId);
    const identifier = await UserRepository.getIdentifier(userId);
    return identifier;
  }

  /**
   * Update user identifier
   */
  async updateUserIdentifier(userId, updateData) {
    await this.getUserById(userId);

    // Validate identifier data
    const validation = UserValidator.validateIdentifier(updateData);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(", ")}`);
    }

    const identifier = await UserRepository.updateIdentifier(userId, updateData);
    return identifier;
  }

  /**
   * Get user statistics
   */
  async getUserStatistics() {
    const adminCount = await UserRepository.countByRole("ADMIN");
    const studentCount = await UserRepository.countByRole("STUDENT");
    const instructorCount = await UserRepository.countByRole("INSTRUCTOR");

    return {
      adminCount,
      studentCount,
      instructorCount,
      totalCount: adminCount + studentCount + instructorCount
    };
  }

  /**
   * Get pending approvals for ADMIN (only for their university)
   * ADMIN sees pending INSTRUCTOR registrations in their university
   */
  async getPendingApprovalsForAdmin(adminUniversity) {
    const pendingUsers = await UserRepository.getPendingApprovals(adminUniversity);
    return pendingUsers;
  }

  /**
   * Get pending approvals for SUPERADMIN (all universities)
   * SUPERADMIN sees pending ADMIN and INSTRUCTOR registrations
   */
  async getPendingApprovalsForSuperAdmin() {
    const pendingUsers = await UserRepository.getPendingApprovalsForSuperAdmin();
    return pendingUsers;
  }

  /**
   * Approve user registration
   * - ADMIN can approve INSTRUCTOR in their university
   * - SUPERADMIN can approve ADMIN or INSTRUCTOR
   */
  async approveUser(userId, approverId, approverRole, approverUniversity) {
    // Get the user to be approved
    const userToApprove = await this.getUserById(userId);

    // Validate approval permissions
    if (approverRole === "ADMIN") {
      // ADMIN can only approve INSTRUCTOR in their university
      if (userToApprove.role !== "INSTRUCTOR") {
        throw new Error("ADMIN can only approve INSTRUCTOR registrations");
      }
      // Check if user's university matches ADMIN's university
      if (userToApprove.university !== approverUniversity) {
        throw new Error("ADMIN can only approve users from their own university");
      }
    } else if (approverRole === "SUPERADMIN") {
      // SUPERADMIN can approve ADMIN or INSTRUCTOR (no university restriction)
      if (!["ADMIN", "INSTRUCTOR"].includes(userToApprove.role)) {
        throw new Error("SUPERADMIN can only approve ADMIN or INSTRUCTOR registrations");
      }
      // SUPERADMIN has no university context, so no university check needed
    } else {
      throw new Error("Only ADMIN or SUPERADMIN can approve users");
    }

    // Approve the user
    const approvedUser = await UserRepository.approveUser(userId, approverId);
    return approvedUser;
  }

  /**
   * Reject user registration
   * - ADMIN can reject INSTRUCTOR in their university
   * - SUPERADMIN can reject ADMIN or INSTRUCTOR
   */
  async rejectUser(userId, approverId, approverRole, approverUniversity) {
    // Get the user to be rejected
    const userToReject = await this.getUserById(userId);

    // Validate rejection permissions
    if (approverRole === "ADMIN") {
      // ADMIN can only reject INSTRUCTOR in their university
      if (userToReject.role !== "INSTRUCTOR") {
        throw new Error("ADMIN can only reject INSTRUCTOR registrations");
      }
      // Check if user's university matches ADMIN's university
      if (userToReject.university !== approverUniversity) {
        throw new Error("ADMIN can only reject users from their own university");
      }
    } else if (approverRole === "SUPERADMIN") {
      // SUPERADMIN can reject ADMIN or INSTRUCTOR (no university restriction)
      if (!["ADMIN", "INSTRUCTOR"].includes(userToReject.role)) {
        throw new Error("SUPERADMIN can only reject ADMIN or INSTRUCTOR registrations");
      }
      // SUPERADMIN has no university context, so no university check needed
    } else {
      throw new Error("Only ADMIN or SUPERADMIN can reject users");
    }

    // Reject the user
    const rejectedUser = await UserRepository.rejectUser(userId, approverId);
    return rejectedUser;
  }

  /**
   * Get users by approval status
   */
  async getUsersByApprovalStatus(status, filters = {}) {
    const users = await UserRepository.getByApprovalStatus(status, filters);
    return users;
  }

  /**
   * Get instructors for a specific university (for ADMIN to manage)
   * ADMIN can only get instructors from their university
   */
  async getInstructorsByUniversity(university) {
    const instructors = await UserRepository.getInstructorsByUniversity(university);
    return instructors;
  }

  /**
   * Get students for a specific university
   */
  async getStudentsByUniversity(university) {
    const students = await UserRepository.getStudentsByUniversity(university);
    return students;
  }

  /**
   * Add a new instructor (ADMIN adds instructors to their university)
   * @param {Object} instructorData - Instructor data with password field
   * @param {string} adminUniversity - The university of the admin adding the instructor
   */
  async addInstructorByAdmin(instructorData, adminUniversity) {
    // Validate input
    const validation = UserValidator.validateCreate(instructorData);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(", ")}`);
    }

    // Check if email already exists
    const existingUser = await UserRepository.getByEmail(instructorData.email);
    if (existingUser) {
      throw new Error("Email already registered");
    }

    // Ensure role is INSTRUCTOR
    if (instructorData.role !== "INSTRUCTOR") {
      throw new Error("Only INSTRUCTOR role can be added by ADMIN");
    }

    // Set university to admin's university
    instructorData.university = adminUniversity;

    // Create user with PENDING approval status (repository will hash password)
    const user = await UserRepository.create(instructorData);
    return user;
  }
}

module.exports = new UserService();