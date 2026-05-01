class RequestLogger {
  logRequest(req) {
    return { route: req.path, method: req.method, timestamp: "ISO8601" };
  }
}
module.exports = new RequestLogger();