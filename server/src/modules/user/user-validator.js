/**
 * User Validator
 * Validates user input data before processing
 * Works with plain password field, not hashed password
 */

class UserValidator {
  /**
   * Validate user creation data
   * Expects plain password field (will be hashed in repository)
   */
  static validateCreate(data) {
    const errors = [];

    // Name validation
    if (!data.name || data.name.trim() === "") {
      errors.push("Name is required");
    } else if (data.name.length > 100) {
      errors.push("Name must be max 100 characters");
    }

    // Email validation
    if (!data.email || data.email.trim() === "") {
      errors.push("Email is required");
    } else if (!this.isValidEmail(data.email)) {
      errors.push("Email format is invalid");
    } else if (data.email.length > 100) {
      errors.push("Email must be max 100 characters");
    }

    // Plain password validation (will be hashed by repository)
    if (!data.hash_password || data.hash_password.trim() === "") {
      errors.push("Password is required");
    } else if (data.hash_password.length < 8) {
      errors.push("Password must be at least 8 characters");
    } else if (data.hash_password.length > 128) {
      errors.push("Password must be max 128 characters");
    }

    // Role validation
    if (data.role && !["ADMIN", "STUDENT", "INSTRUCTOR", "SUPERADMIN"].includes(data.role)) {
      errors.push("Role must be one of: ADMIN, STUDENT, INSTRUCTOR, SUPERADMIN");
    }
    
    // University validation
    // - SUPERADMIN should not have a university
    // - All other roles default to "UET" if not provided
    if (data.role === "SUPERADMIN") {
      if (data.university) {
        errors.push("SUPERADMIN should not be assigned to a specific university");
      }
    } else {
      // For other roles, university is optional (defaults to UET in service)
      if (data.university && data.university.length > 50) {
        errors.push("University must be max 50 characters");
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate user update data
   * Can include plain password for password changes
   */
  static validateUpdate(data) {
    const errors = [];

    if (data.name !== undefined) {
      if (data.name.trim() === "") {
        errors.push("Name cannot be empty");
      } else if (data.name.length > 100) {
        errors.push("Name must be max 100 characters");
      }
    }

    if (data.email !== undefined) {
      if (data.email.trim() === "") {
        errors.push("Email cannot be empty");
      } else if (!this.isValidEmail(data.email)) {
        errors.push("Email format is invalid");
      } else if (data.email.length > 100) {
        errors.push("Email must be max 100 characters");
      }
    }

    // Validate plain password for updates
    if (data.hash_password !== undefined) {
      if (data.hash_password.trim() === "") {
        errors.push("Password cannot be empty");
      } else if (data.hash_password.length < 8) {
        errors.push("Password must be at least 8 characters");
      } else if (data.hash_password.length > 128) {
        errors.push("Password must be max 128 characters");
      }
    }

    if (data.role !== undefined && !["ADMIN", "STUDENT", "INSTRUCTOR", "SUPERADMIN"].includes(data.role)) {
      errors.push("Role must be one of: ADMIN, STUDENT, INSTRUCTOR, SUPERADMIN");
    }

    if (data.university !== undefined) {
      if (data.university && data.university.length > 50) {
        errors.push("University must be max 50 characters");
      }
    }

    if (data.approvalStatus !== undefined && !["PENDING", "APPROVED", "REJECTED"].includes(data.approvalStatus)) {
      errors.push("Approval status must be one of: PENDING, APPROVED, REJECTED");
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate user identifier data
   */
  static validateIdentifier(data) {
    const errors = [];

    if (!data.identifier || data.identifier.trim() === "") {
      errors.push("Identifier is required");
    } else if (data.identifier.length > 50) {
      errors.push("Identifier must be max 50 characters");
    }

    if (!data.department || data.department.trim() === "") {
      errors.push("Department is required");
    } else if (data.department.length > 100) {
      errors.push("Department must be max 100 characters");
    }

    if (data.degreeProgram && data.degreeProgram.length > 100) {
      errors.push("Degree Program must be max 100 characters");
    }

    if (data.batch !== undefined && (typeof data.batch !== "number" || data.batch < 0)) {
      errors.push("Batch must be a positive number");
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Helper: Validate email format
   */
  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

module.exports = UserValidator;