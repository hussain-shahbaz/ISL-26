export const errorMiddleware = (err, req, res, next) => {
  let statusCode = err.status || 500;
  // map error messages to status codes
  if (err.message.includes("not found") || err.message.includes("Not found")) {
    statusCode = 404;
  } else if (
    err.message.includes("already exists") ||
    err.message.includes("duplicate")
  ) {
    statusCode = 409;
  } else if (
    err.message.includes("Unauthorized") ||
    err.message.includes("Token") ||
    err.message.includes("Invalid credentials")
  ) {
    statusCode = 401;
  } else if (err.message.includes("Forbidden")) {
    statusCode = 403;
  } else if (err.message.includes("Validation")) {
    statusCode = 422;
  }

  res.status(statusCode).json({
    success: false,
    message: err.message || "Something went wrong",
  });
};
