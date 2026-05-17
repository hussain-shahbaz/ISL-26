/**
 * User Model
 * Defines the User entity structure based on Prisma schema
 * 
 * Relationships:
 * - User can have one UserIdentifier (one-to-one)
 * 
 * Role enum values: ADMIN, STUDENT, INSTRUCTOR
 */

class UserModel {
  /**
   * User field definitions
   */
  static fields = {
    id: "String (UUID, auto-generated)",
    name: "String (max 100 chars)",
    email: "String (max 100 chars, unique)",
    role: "Role enum (ADMIN | STUDENT | INSTRUCTOR, default: STUDENT)",
    university: "String (max 50 chars, default: 'UET')",
    createdAt: "DateTime (auto-generated)",
    updatedAt: "DateTime (auto-updated)",
    isDeleted: "Boolean (default: false)",
    identifier: "UserIdentifier (optional, one-to-one relationship)"
  };

  /**
   * Get all field names
   */
  static getFieldNames() {
    return Object.keys(this.fields);
  }

  /**
   * Get field description
   */
  static getFieldDescription(fieldName) {
    return this.fields[fieldName] || null;
  }

  /**
   * Validate required fields for user creation
   */
  static validateCreateFields(data) {
    const requiredFields = ["name", "email"];
    const missingFields = requiredFields.filter(field => !data[field]);
    return {
      isValid: missingFields.length === 0,
      missingFields
    };
  }
}

module.exports = UserModel;
