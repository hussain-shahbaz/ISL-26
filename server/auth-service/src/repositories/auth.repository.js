import AuthIdentity from "../models/authIdentity.model.js";

export class AuthRepository {
  async create(data) {
    return AuthIdentity.create(data);
  }

  async findByEmail(email) {
    return AuthIdentity.findOne({ email });
  }

  async findByUserId(userId) {
    return AuthIdentity.findOne({ userId });
  }
  async verifyEmail(userId) {
    return AuthIdentity.findOneAndUpdate(
      { userId },
      {
        isEmailVerified: true,
      },
      {
        new: true,
      }
    );
  }
  async updatePassword(userId, passwordHash) {
    return AuthIdentity.findOneAndUpdate(
      { userId },
      {
        passwordHash,
      }
    );
  }
}
