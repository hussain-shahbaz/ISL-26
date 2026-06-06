class AuthRoutes {
  getRoutes() {
    return [
      { method: "POST", path: "/api/auth/login", handler: "loginUser" },
      { method: "POST", path: "/api/auth/register", handler: "registerUser" }
    ];
  }
}
module.exports = new AuthRoutes();