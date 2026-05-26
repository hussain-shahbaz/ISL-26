import User from "../models/user.model.js";
class AuthRepository {
  async createUser(userData) {
    return User.create(userData);
  }
  async findUserByEmail(email) {
    return User.findOne({ email });
  }
  async findUserById(id) {
    return User.findById(id).select("-password");
  }
}
export default new AuthRepository();
