import Blacklist from "../models/blacklist.model.js";
export class BlacklistRepository {
  async add(token, expiresAt, type) {
    return Blacklist.create({ token, expiresAt, type });
  }
  async isBlacklisted(token) {
    const entry = await Blacklist.findOne({ token });
    return !!entry;
  }
}