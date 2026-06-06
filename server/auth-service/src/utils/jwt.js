import jwt from "jsonwebtoken";
import config from "../config/config.js";
import { BlacklistRepository } from "../repositories/blacklist.repository.js";
const blacklistRepo = new BlacklistRepository();
export const generateAccessToken = (payload) => {
  return jwt.sign(payload, config.ACCESS_TOKEN_SECRET, { expiresIn: "15m" });
};
export const generateRefreshToken = (payload) => {
  return jwt.sign(payload, config.REFRESH_TOKEN_SECRET, { expiresIn: "7d" });
};
export const verifyAccessToken = async (token) => {
  // const isBlacklisted = await blacklistRepo.isBlacklisted(token);
  // if (isBlacklisted) throw new Error("Token has been revoked");
  return jwt.verify(token, config.ACCESS_TOKEN_SECRET);
};
export const verifyRefreshToken = (token) => {
  return jwt.verify(token, config.REFRESH_TOKEN_SECRET);
};
export const blacklistToken = async (jti, expUnixSeconds) => {
  await blacklistRepo.add(jti, expUnixSeconds);
};
export const isBlackListed = async (jti) => {
  return await blacklistRepo.isBlacklisted(jti);
};
