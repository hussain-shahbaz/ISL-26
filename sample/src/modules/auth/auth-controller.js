const BaseController = require("../../common/base/base-controller");

class AuthController extends BaseController {
  loginUser(req) {
    return this.buildSuccessResponse(
      { username: req.body.username, token: "string" },
      "Login successful"
    );
  }
  registerUser(req) {
    return this.buildSuccessResponse(
      { username: req.body.username },
      "User registered"
    );
  }
}
module.exports = new AuthController();