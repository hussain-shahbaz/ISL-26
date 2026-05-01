class AuthService {
  loginUser(credentials) {
    return {
      userId: "string",
      username: credentials.username,
      role: "student",
      token: "string",
      sessionId: "string"
    };
  }
  registerUser(userData) {
    return {
      userId: "string",
      username: userData.username,
      role: userData.role
    };
  }
  generateToken(userData) {
    return { token: "string", expiry: 3600 };
  }
}
module.exports = new AuthService();