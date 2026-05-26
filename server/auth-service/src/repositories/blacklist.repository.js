import Blacklist from "../models/blacklist.model.js";
export class BlacklistRepository {
  async add(jti, exp) {
    const expiresAt = new Date(exp * 1000); // convert unix timestamp to Date
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
