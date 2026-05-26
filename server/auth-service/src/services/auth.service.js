import authRepository from "../repositories/auth.repository.js";
import jwtUtil from "../utils/jwt.js";
class AuthService {
  async register({ username, email, password }) {
    const existing = await authRepository.findUserByEmail(email);
    if (existing) throw new Error("EMAIL_ALREADY_EXISTS");
    const user = await authRepository.createUser({ username, email, password });
    const accessToken = jwtUtil.signAccessToken({
      userId: user._id.toString(),
    });
    const refreshToken = jwtUtil.signRefreshToken({
      userId: user._id.toString(),
    });
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    await sessionRepository.createSession({
      user: user._id,
      refreshTokenHash,
      ip,
      userAgent,
    });
    return { accessToken, refreshToken };
    // console.log(result)
  }
  async login({ email, password }) {
    const user = await authRepository.findUserByEmail(email);
    if (!user) throw new Error("INVALID_CREDENTIALS");
    const isMatch = await user.comparePassword(password);
    if (!isMatch) throw new Error("INVALID_CREDENTIALS");
    const accessToken = jwtUtil.signAccessToken({
      userId: user._id.toString(),
    });
    const refreshToken = jwtUtil.signRefreshToken({
      userId: user._id.toString(),
    });
    return { accessToken, refreshToken };
  }
  async getMe(userId) {
    const user = await authRepository.findUserById(userId);
    if (!user) throw new Error("USER_NOT_FOUND");
    return user;
  }
  verifyAccessToken(token) {
    return jwtUtil.verifyAccessToken(token);
  }
  async refreshToken(userId) {
    const user = await authRepository.findUserById(userId);
    if (!user) throw new Error("USER_NOT_FOUND");

    return {
      accessToken: jwtUtil.signAccessToken({
        userId: user._id.toString(),
      }),

      refreshtoken: jwtUtil.signRefreshToken({
        userId: user._id.toString(),
      }),
    };
  }
}
export default new AuthService();
