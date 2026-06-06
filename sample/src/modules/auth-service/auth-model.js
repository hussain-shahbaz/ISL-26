class AuthModel {
  schema() {
    return {
      userId: "string",
      username: "string",
      passwordHash: "string",
      role: "student | teacher"
    };
  }
}
module.exports = new AuthModel();