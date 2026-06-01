import jwt from "jsonwebtoken";
import config from "../config/config.js";
export const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Access token required",
      });
    }
    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, config.ACCESS_TOKEN_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      message: "Invalid token",
    });
  }
};
