import { verifyAccessToken, isBlackListed } from "../utils/jwt.js";

export const authMiddleware = async (req, res, next) => {
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

    const decoded = await verifyAccessToken(token);

    if (decoded.jti) {
      const blacklisted = await isBlackListed(decoded.jti);
      if (blacklisted) {
        return res.status(401).json({
          success: false,
          message: "Token has been revoked",
        });
      }
    }

    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({
      success: false,
      message: err.message || "Unauthorized",
    });
  }
};
