import logger from "../lib/logger.js";

// Catches requests that matched no route.
export const notFound = (req, res) => {
  logger.warn(`404 Not Found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ message: `Not found: ${req.method} ${req.originalUrl}` });
};

// Centralized API error logging + JSON response. Express routes errors here via
// `next(err)` (and thrown errors in sync handlers).
// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  logger.error(`API error ${status}: ${req.method} ${req.originalUrl} —`, err.message);
  res.status(status).json({ message: err.message || "Internal server error" });
};
