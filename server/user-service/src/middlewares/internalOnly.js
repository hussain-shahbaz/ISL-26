import config from "../config/config.js";
const internalOnly = (req, res, next) => {
  const secret = req.headers["x-internal-secret"];
  if (!secret || secret !== config.INTERNAL_SECRET) {
    return res.status(403).json({
      success: false,
      message: "Forbidden — internal access only",
    });
  }
  next();
};
export default internalOnly;
