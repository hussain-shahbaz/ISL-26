import VerificationToken from "../models/verificationToken.model.js";
import authIdentityModel from "../models/authIdentity.model.js";
export class VerificationRepository {
  async create(data) {
    return VerificationToken.create(data);
  }
  async findValidToken(userId, type) {
    return VerificationToken.findOne({
      userId,
      type,
      used: false,
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });
  }
  async markUsed(id) {
    return VerificationToken.updateOne({ _id: id }, { used: true });
  }
  async incrementAttempts(id) {
    return VerificationToken.updateOne({ _id: id }, { $inc: { attempts: 1 } });
  }

  async findToken(userId, type) {
    return VerificationToken.findOne({
      userId,
      type,
    });
  }
  async deleteToken(id) {
    return VerificationToken.findByIdAndDelete(id);
  }
}
