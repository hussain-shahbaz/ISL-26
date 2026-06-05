export const errorMiddleware = (err, req, res, next) => {
  // console.error("Error:", err.message);
  let statusCode = 400;
  if (err.message.includes("Unauthorized") || err.message.includes("Token")) {
    statusCode = 401;
  }
  res.status(statusCode).json({
    success: false,
    message: err.message || "Something went wrong"
  });
};