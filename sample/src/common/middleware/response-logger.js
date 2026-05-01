class ResponseLogger {
  logResponse(req, resBody) {
    return {
      userId: req.user?.userId,
      timestamp: "ISO8601",
      route: req.path,
      request: { method: req.method, body: req.body },
      response: { statusCode: resBody.statusCode },
      payload: {},
      responseBody: resBody.body,
      sha256HASH: "string"
    };
  }
}
module.exports = new ResponseLogger();