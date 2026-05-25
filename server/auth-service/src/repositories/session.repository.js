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
  async revoke(sessionId) {
    return Session.updateOne({ sessionId }, { revoked: true });
  }
  async getUserSessions(userId) {
    return Session.find({
      userId,
      revoked: false,
    });
  }
//   async cleanupExpiredSessions() {
//   try {
//     return await Session.deleteMany({
//       expiresAt: { $lt: new Date() }
//     });
//   } catch (error) {
//     throw error; // Let the job handle the error
//   }
// }
}
