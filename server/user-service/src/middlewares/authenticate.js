import jwt from "jsonwebtoken";
import config from "../config/config.js";
import blacklistRepository from "../repositories/blacklist.repository.js";

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Access token required",
      });
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access token required",
      });
    }

    const decoded = jwt.verify(token, config.ACCESS_TOKEN_SECRET);

    if (decoded.jti) {
      const blacklisted = await blacklistRepository.isBlacklisted(decoded.jti);
      if (blacklisted) {
        return res.status(401).json({
          success: false,
          message: "Token has been revoked",
        });
      }
    }

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid token",
    });
  }
};
