class AuthModule {
  init() {
    return {
      module: "auth",
      status: "initialized",
      routes: ["/api/auth/login", "/api/auth/register"]
    };
  }
}
module.exports = new AuthModule();