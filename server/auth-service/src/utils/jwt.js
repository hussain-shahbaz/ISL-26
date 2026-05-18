import jwt from "jsonwebtoken";
import config from "../config/config.js";
class JwtUtil {
  // ── Access Token ─────────────────────────────────────────────────────────
  signAccessToken(payload) {
    return jwt.sign({ userId: payload.userId }, config.ACCESS_TOKEN_SECRET, {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY || "15m",
    });
  }
  //   Refresh token
  signRefreshToken(payload) {
    return jwt.sign({ userId: payload.userId }, config.REFRESH_TOKEN_SECRET, {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY || "7d",
    });
  }
  verifyAccessToken(token) {
    try {
      return jwt.verify(token, config.ACCESS_TOKEN_SECRET);
    } catch (err) {
      if (err.name === "TokenExpiredError")
        throw new Error("ACCESS_TOKEN_EXPIRED");
      throw new Error("INVALID_ACCESS_TOKEN");
    }
  }
  verifyRefreshToken(token) {
    try {
      return jwt.verify(token, config.REFRESH_TOKEN_SECRET);
    } catch (err) {
      if (err.name === "TokenExpiredError")
        throw new Error("REFRESH_TOKEN_EXPIRED");
      throw new Error("INVALID_REFRESH_TOKEN");
    }
  }
}
export default new JwtUtil();
