import { verifyAccessToken } from "../utils/jwt.js";
export const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) throw new Error("Unauthorized");
    const token = authHeader.split(" ")[1];
    req.user = await verifyAccessToken(token);   // Now async

    next();
  } catch (err) {
    res.status(401).json({
      success: false,
      message: err.message || "Unauthorized"
    });
  }
};