import { AuthService } from "../services/auth.service.js";
const authService = new AuthService();
import { verifyRefreshToken } from "../utils/jwt.js";
export class AuthController {
  async register(req, res, next) {
    try {
      const user = await authService.register(req.body);
      res.status(201).json({
        success: true,
        data: user,
      });
    } catch (err) {
      next(err);
    }
  }
  async verifyEmail(req, res, next) {
    try {
      const result = await authService.verifyEmail(req.body);
      return res.json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
  async login(req, res, next) {
    try {
      const result = await authService.login(req.body, {
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
        deviceFingerprint: req.headers["x-device-fingerprint"] || "unknown",
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
  async refresh(req, res, next) {
    try {
      const token = await authService.refresh(req.body.refreshToken);
      res.json({
        success: true,
        data: { accessToken: token },
      });
    } catch (err) {
      next(err);
    }
  }

  async me(req, res, next) {
    try {
      const user = await authService.getMe(req.user.userId);
      res.json({
        success: true,
        data: user,
      });
    } catch (err) {
      next(err);
    }
  }
  async sessions(req, res, next) {
    try {
      const sessions = await authService.getSessions(req.user.userId);
      res.json({
        success: true,
        data: sessions,
      });
    } catch (err) {
      next(err);
    }
  }
  // async logout(req, res, next) {
  //   try {
  //     // const accessToken = req.headers.authorization?.split(" ")[1] || null;
  //     const refreshToken = req.body.refreshToken;

  //     const result = await authService.logout(refreshToken);

  //     res.json({
  //       success: true,
  //       message: result.message,
  //     });
  //   } catch (err) {
  //     next(err);
  //   }
  // }
  async logout(req, res, next) {
    try {
      const refreshToken = req.body.refreshToken;
      console.log("req.user →", req.user)
      // ✅ jti and exp come from req.user (set by authMiddleware)
      const { jti, exp } = req.user;
      const result = await authService.logout(refreshToken, jti, exp);
      res.json({
        success: true,
        message: result.message ,
      });
    } catch (err) {
      next(err);
    }
  }

  async logoutAll(req, res, next) {
    try {
      await authService.logoutAll(req.user.userId);
      res.json({
        success: true,
        message: "Logged out from all devices",
      });
    } catch (err) {
      next(err);
    }
  }
  async revokeSession(req, res, next) {
    try {
      await authService.revokeSession(req.params.id, req.user.userId);
      res.json({
        success: true,
        message: "Session revoked successfully",
      });
    } catch (err) {
      next(err);
    }
  }
  async requestNewOTP(req, res, next) {
    try {
      const result = await authService.requestNewOTP(req.body);
      return res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
  async forgotPassword(req, res, next) {
    try {
      const result = await authService.forgotPassword(req.body);
      return res.status(200).json(result);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
  async verifyResetOTP(req, res, next) {
    try {
      const result = await authService.verifyResetOTP(req.body);
      return res.status(200).json(result);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
  async resetPassword(req, res, next) {
    try {
      const result = await authService.resetPassword(req.body);
      return res.status(200).json(result);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
  requestResetPasswordOTP = async (req, res) => {
    try {
      const result = await authService.requestResetPasswordOTP(req.body);

      return res.status(200).json(result);
    } catch (error) {
      return res.status(400).json({
        message: error.message,
      });
    }
  };
}
