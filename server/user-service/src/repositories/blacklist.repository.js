import Blacklist from "../models/blacklist.model.js";

class BlacklistRepository {
  async isBlacklisted(jti) {
    const found = await Blacklist.findOne({ token: jti });
    return !!found;
  }
}

export default new BlacklistRepository();
