// import { verifyAccessToken } from "../utils/jwt.js";
// export const authMiddleware = async (req, res, next) => {
//   try {
//     const authHeader = req.headers.authorization;
//     if (!authHeader) throw new Error("Unauthorized");
//     const token = authHeader.split(" ")[1];
//     req.user = await verifyAccessToken(token);   // Now async

//     next();
//   } catch (err) {
//     res.status(401).json({
//       success: false,
//       message: err.message || "Unauthorized"
//     });
//   }
// };
import { verifyAccessToken } from "../utils/jwt.js";
import { isBlackListed } from "../utils/jwt.js";
export const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) throw new Error("Unauthorized");

    const token = authHeader.split(" ")[1];
    const decoded = await verifyAccessToken(token);

    // ✅ NEW — blacklist check
    const blacklisted = await isBlackListed(decoded.jti);
    if (blacklisted) {
      return res.status(401).json({
        success: false,
        message: "Token has been revoked"
      });
    }
    req.user = decoded; // jti and exp now available in req.user
    next();

  } catch (err) {
    res.status(401).json({
      success: false,
      message: err.message || "Unauthorized"
    });
  }
};