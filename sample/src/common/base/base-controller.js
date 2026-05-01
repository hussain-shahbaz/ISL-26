class BaseController {
  buildSuccessResponse(data, message = "") {
    return { status: "success", message, data };
  }
  buildErrorResponse(message, code = 400) {
    return { status: "error", message, code };
  }
}
module.exports = BaseController;