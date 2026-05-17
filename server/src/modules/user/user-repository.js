/**
 * User Repository
 * Handles all database operations for User entity using Prisma
 * Password hashing is handled here using bcrypt
 */

const prisma = require("./db");
const bcrypt = require("bcrypt");

class UserRepository {
  /**
   * Hash a plain password using bcrypt
   * @param {string} plainPassword - Plain text password
   * @returns {Promise<string>} - Hashed password
   */
  async hashPassword(plainPassword) {
    const saltRounds = 10; // Standard for bcrypt
    return await bcrypt.hash(plainPassword, saltRounds);
  }

  /**
   * Create a new user
   * @param {Object} userData - User data with plain password (password field, not hash_password)
   */
  async create(userData) {
    try {
      // Hash the plain password before storing
      const hashedPassword = await this.hashPassword(userData.hash_password);
        // console.log(userData);
        
      const user = await prisma.user.create({
        data: {
          name: userData.name,
          email: userData.email,
          hash_password: hashedPassword,
          role: userData.role || "STUDENT",
          university: userData.university || "UET" // Default to UET if not provided
        },
        include: {
          identifier: true
        }
      });
      return user;
    } catch (error) {
      throw new Error(`Failed to create user: ${error.message}`);
    }
  }

  /**
   * Get user by ID
   */
  async getById(userId) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          identifier: true
        }
      });
      return user;
    } catch (error) {
      throw new Error(`Failed to fetch user: ${error.message}`);
    }
  }

  /**
   * Get user by email
   */
  async getByEmail(email) {
    try {
      const user = await prisma.user.findUnique({
        where: { email },
        include: {
          identifier: true
        }
      });
      return user;
    } catch (error) {
      throw new Error(`Failed to fetch user by email: ${error.message}`);
    }
  }

  /**
   * Get all users (excluding deleted ones)
   */
  async getAll(filters = {}) {
    try {
      const where = { isDeleted: false };

      if (filters.role) {
        where.role = filters.role;
      }
      if (filters.university) {
        where.university = filters.university;
      }

      const users = await prisma.user.findMany({
        where,
        include: {
          identifier: true
        },
        orderBy: { createdAt: "desc" }
      });
      return users;
    } catch (error) {
      throw new Error(`Failed to fetch users: ${error.message}`);
    }
  }

  /**
   * Update user
   * If password is provided, it will be hashed before storage
   */
  async update(userId, updateData) {
    try {
      // Prepare update object
      const dataToUpdate = {};

      if (updateData.name !== undefined) {
        dataToUpdate.name = updateData.name;
      }
      if (updateData.email !== undefined) {
        dataToUpdate.email = updateData.email;
      }
      if (updateData.hash_password !== undefined) {
        // Hash the new password
        dataToUpdate.hash_password = await this.hashPassword(updateData.hash_password);
      }
      if (updateData.role !== undefined) {
        dataToUpdate.role = updateData.role;
      }
      if (updateData.university !== undefined) {
        dataToUpdate.university = updateData.university;
      }
      if (updateData.approvalStatus !== undefined) {
        dataToUpdate.approvalStatus = updateData.approvalStatus;
      }
      if (updateData.approvedAt !== undefined) {
        dataToUpdate.approvedAt = updateData.approvedAt;
      }
      if (updateData.approvedBy !== undefined) {
        dataToUpdate.approvedBy = updateData.approvedBy;
      }
      if (updateData.isDeleted !== undefined) {
        dataToUpdate.isDeleted = updateData.isDeleted;
      }

      const user = await prisma.user.update({
        where: { id: userId },
        data: dataToUpdate,
        include: {
          identifier: true
        }
      });
      return user;
    } catch (error) {
      throw new Error(`Failed to update user: ${error.message}`);
    }
  }

  /**
   * Soft delete user (set isDeleted to true)
   */
  async softDelete(userId) {
    try {
      const user = await prisma.user.update({
        where: { id: userId },
        data: { isDeleted: true }
      });
      return user;
    } catch (error) {
      throw new Error(`Failed to delete user: ${error.message}`);
    }
  }

  /**
   * Hard delete user (permanent deletion)
   */
  async hardDelete(userId) {
    try {
      // Delete identifier first (foreign key constraint)
      await prisma.userIdentifier.deleteMany({
        where: { userId }
      });

      // Then delete user
      const user = await prisma.user.delete({
        where: { id: userId }
      });
      return user;
    } catch (error) {
      throw new Error(`Failed to permanently delete user: ${error.message}`);
    }
  }

  /**
   * Create user identifier
   */
  async createIdentifier(userId, identifierData) {
    try {
      const identifier = await prisma.userIdentifier.create({
        data: {
          identifier: identifierData.identifier,
          department: identifierData.department,
          degreeProgram: identifierData.degreeProgram,
          batch: identifierData.batch,
          userId
        }
      });
      return identifier;
    } catch (error) {
      throw new Error(`Failed to create user identifier: ${error.message}`);
    }
  }

  /**
   * Get user identifier
   */
  async getIdentifier(userId) {
    try {
      const identifier = await prisma.userIdentifier.findUnique({
        where: { userId }
      });
      return identifier;
    } catch (error) {
      throw new Error(`Failed to fetch user identifier: ${error.message}`);
    }
  }

  /**
   * Update user identifier
   */
  async updateIdentifier(userId, updateData) {
    try {
      const dataToUpdate = {};

      if (updateData.identifier !== undefined) {
        dataToUpdate.identifier = updateData.identifier;
      }
      if (updateData.department !== undefined) {
        dataToUpdate.department = updateData.department;
      }
      if (updateData.degreeProgram !== undefined) {
        dataToUpdate.degreeProgram = updateData.degreeProgram;
      }
      if (updateData.batch !== undefined) {
        dataToUpdate.batch = updateData.batch;
      }

      const identifier = await prisma.userIdentifier.update({
        where: { userId },
        data: dataToUpdate
      });
      return identifier;
    } catch (error) {
      throw new Error(`Failed to update user identifier: ${error.message}`);
    }
  }

  /**
   * Get count of users by role
   */
  async countByRole(role) {
    try {
      const count = await prisma.user.count({
        where: {
          role,
          isDeleted: false
        }
      });
      return count;
    } catch (error) {
      throw new Error(`Failed to count users: ${error.message}`);
    }
  }

  /**
   * Get pending approvals for a specific university (for ADMIN)
   * ADMIN can only see pending approvals for INSTRUCTOR in their university
   */
  async getPendingApprovals(university) {
    try {
      const users = await prisma.user.findMany({
        where: {
          university: university, // Filter by specific university
          approvalStatus: "PENDING",
          isDeleted: false,
          role: "INSTRUCTOR" // Only show pending INSTRUCTOR registrations
        },
        include: {
          identifier: true
        },
        orderBy: { createdAt: "asc" }
      });
      return users;
    } catch (error) {
      throw new Error(`Failed to fetch pending approvals: ${error.message}`);
    }
  }

  /**
   * Get pending approvals for SUPERADMIN (all universities)
   */
  async getPendingApprovalsForSuperAdmin() {
    try {
      const users = await prisma.user.findMany({
        where: {
          approvalStatus: "PENDING",
          isDeleted: false,
          role: { in: ["ADMIN", "INSTRUCTOR"] }
        },
        include: {
          identifier: true
        },
        orderBy: { createdAt: "asc" }
      });
      return users;
    } catch (error) {
      throw new Error(`Failed to fetch pending approvals for superadmin: ${error.message}`);
    }
  }

  /**
   * Approve a user
   */
  async approveUser(userId, approverId) {
    try {
      const user = await prisma.user.update({
        where: { id: userId },
        data: {
          approvalStatus: "APPROVED",
          approvedAt: new Date(),
          approvedBy: approverId
        },
        include: {
          identifier: true
        }
      });
      return user;
    } catch (error) {
      throw new Error(`Failed to approve user: ${error.message}`);
    }
  }

  /**
   * Reject a user
   */
  async rejectUser(userId, approverId) {
    try {
      const user = await prisma.user.update({
        where: { id: userId },
        data: {
          approvalStatus: "REJECTED",
          approvedAt: new Date(),
          approvedBy: approverId
        },
        include: {
          identifier: true
        }
      });
      return user;
    } catch (error) {
      throw new Error(`Failed to reject user: ${error.message}`);
    }
  }

  /**
   * Get users by approval status
   */
  async getByApprovalStatus(status, filters = {}) {
    try {
      const where = {
        approvalStatus: status,
        isDeleted: false
      };

      if (filters.role) {
        where.role = filters.role;
      }
      if (filters.university) {
        where.university = filters.university;
      }

      const users = await prisma.user.findMany({
        where,
        include: {
          identifier: true
        },
        orderBy: { createdAt: "desc" }
      });
      return users;
    } catch (error) {
      throw new Error(`Failed to fetch users by approval status: ${error.message}`);
    }
  }

  /**
   * Get instructors for a specific university (for ADMIN to add/manage)
   */
  async getInstructorsByUniversity(university) {
    try {
      const instructors = await prisma.user.findMany({
        where: {
          university,
          role: "INSTRUCTOR",
          isDeleted: false
        },
        include: {
          identifier: true
        },
        orderBy: { createdAt: "desc" }
      });
      return instructors;
    } catch (error) {
      throw new Error(`Failed to fetch instructors: ${error.message}`);
    }
  }

  /**
   * Get students for a specific university
   */
  async getStudentsByUniversity(university) {
    try {
      const students = await prisma.user.findMany({
        where: {
          university,
          role: "STUDENT",
          isDeleted: false
        },
        include: {
          identifier: true
        },
        orderBy: { createdAt: "desc" }
      });
      return students;
    } catch (error) {
      throw new Error(`Failed to fetch students: ${error.message}`);
    }
  }
}

module.exports = new UserRepository();