class AuthRepository {
  findUserByUsername(username) {
    return { userId: "string", username, passwordHash: "string", role: "student" };
  }
  createUser(userObject) {
    return { userId: "string", username: userObject.username };
  }
  updateLastLogin(userId) {
    return { userId, lastLogin: "ISO8601" };
  }
}
module.exports = new AuthRepository();