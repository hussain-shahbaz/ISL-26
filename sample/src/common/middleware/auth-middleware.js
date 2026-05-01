class AuthMiddleware {
  handle(req, res, next) {
    req.user = { userId: "string", role: "student" };
    next();
  }
}
module.exports = new AuthMiddleware();