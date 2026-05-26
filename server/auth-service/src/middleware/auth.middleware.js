import authService from "../services/auth.service.js";
class AuthMiddleware {
  authenticate(req, res, next) {
    try {
      const authHeader = req.headers["authorization"];
      if (!authHeader?.startsWith("Bearer ")) {
        return res.status(401).json({ message: "No access token provided" });
      }
      const token = authHeader.split(" ")[1];
      const payload = authService.verifyAccessToken(token);

      req.userId = payload.userId;
      next();
    } catch (err) {
      if (err.message === "ACCESS_TOKEN_EXPIRED") {
        return res.status(401).json({
          message: "Access token expired",
        });
      }
      return res.status(401).json({ message: "Invalid access token" });
    }
  }
}
export default new AuthMiddleware();
