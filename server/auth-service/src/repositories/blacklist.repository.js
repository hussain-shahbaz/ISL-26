import Blacklist from "../models/blacklist.model.js";
export class BlacklistRepository {
  async add(jti, expUnixSeconds) {
    const expiresAt = new Date(expUnixSeconds * 1000);
    await Blacklist.create({
      token: jti,
      type: "access",
      expiresAt,
    });
  }
  async isBlacklisted(jti) {
    const found = await Blacklist.findOne({ token: jti });
    return !!found; // true if blacklisted, false if clean
  }
}
