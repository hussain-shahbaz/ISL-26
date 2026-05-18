import Session from "../models/session.model.js";
class SessionRepository {
    async createSession(sessionData) {
        return await Session.create(sessionData);
    }
}
export default new SessionRepository();