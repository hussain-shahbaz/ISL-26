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
  async verifyEmail(email) {
    return AuthIdentity.findOneAndUpdate(
      { email },
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
