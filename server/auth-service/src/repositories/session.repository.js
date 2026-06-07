import Session from "../models/session.model.js";
export class SessionRepository {
  async create(data) {
    return Session.create(data);
  }
  async findActiveBySessionId(sessionId) {
    return Session.findOne({
      sessionId,
      revoked: false,
      expiresAt: { $gt: new Date() },
    });
  }
  async getActiveSessionCount(userId) {
  return Session.countDocuments({
    userId,
    revoked: false,
    expiresAt: { $gt: new Date() }
  });
}
  async revoke(sessionId) {
    return Session.updateOne({ sessionId }, { revoked: true });
  }
  async revokeAllForUser(userId) {
    return Session.updateMany({ userId, revoked: false }, { revoked: true });
  }
  async getUserSessions(userId) {
    return Session.find({
      userId,
      revoked: false,
    });
  }
}
