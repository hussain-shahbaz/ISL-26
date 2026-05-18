import authService from "../services/auth.service.js";
import jwt from "../utils/jwt.js";
const ERROR_MAP = {
  EMAIL_ALREADY_EXISTS: [409, "An account with this email already exists"],
  INVALID_CREDENTIALS: [401, "Invalid email or password"],
  USER_NOT_FOUND: [404, "User not found"],
  REFRESH_TOKEN_EXPIRED: [401, "Refresh token expired"],
  INVALID_REFRESH_TOKEN: [401, "Invalid refresh token"],
};
class AuthController {
  async register(req, res) {
    try {
      const { username, email, password } = req.body;
      if (!username || !email || !password) {
        return res
          .status(400)
          .json({ message: "username, email, and password are required" });
      }
      const { accessToken, refreshToken } = await authService.register({
        username,
        email,
        password,
    //      ip: req.ip,
    //   userAgent: req.headers["user-agent"],
      });
      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
      return res.status(201).json({
        message: "Registration successful",
        accessToken,
      });
    } catch (err) {
      //  catch (err) {
      //   console.error("Auth.register error:", err);
      //   const [status, message] = ERROR_MAP[err.message] || [
      //     500,
      //     "Internal server error jjj",
      //   ];
      //   return res.status(status).json({ message });
      // }
      console.error(err);

      return res.status(500).json({
        error: err.message,
        stack: err.stack,
      });
    }
  }
  async login(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res
          .status(400)
          .json({ message: "email and password are required" });
      }
      const { accessToken, refreshToken } = await authService.login({
        email,
        password,
      });
      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
      return res.status(200).json({
        message: "Login successful",
        accessToken,
      });
    } catch (err) {
      const [status, message] = ERROR_MAP[err.message] || [
        500,
        "Internal server error",
      ];
      return res.status(status).json({ message });
    }
  }

  async refreshToken(req, res) {
    try {
      const refreshToken = req.cookies?.refreshToken;
      if (!refreshToken) {
        return res.status(401).json({ message: "Refresh token not found" });
      }
      const decoded = jwt.verifyRefreshToken(refreshToken);
      const {accessToken,refreshtoken} = await authService.refreshToken(decoded.userId);
      const newrefreshtoken = refreshtoken
      res.cookie("newrefreshtoken", newrefreshtoken, {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
      return res.status(200).json({
        message: "Access token refreshed successfully",
        accessToken,
        refreshtoken
      });
    } catch (err) {
      const [status, message] = ERROR_MAP[err.message] || [
        401,
        "Invalid refresh token",
      ];
      return res.status(status).json({ message });
    }
  }
  async getMe(req, res) {
    try {
      const user = await authService.getMe(req.userId);
      return res.status(200).json({ user });
    } catch (err) {
      const [status, message] = ERROR_MAP[err.message] || [
        500,
        "Internal server error",
      ];
      return res.status(status).json({ message });
    }
  }
}

export default new AuthController();
