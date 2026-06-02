// Shared CORS origin policy for both the REST API (Express) and the realtime
// layer (socket.io). Allowed origins come entirely from configuration
// (CLIENT_URL, which may list several comma-separated origins) — there are no
// hardcoded origins or localhost assumptions in the code.
import config from "../config/index.js";
import logger from "./logger.js";

const allowedOrigins = new Set(config.clientUrls);

export function isAllowedOrigin(origin) {
  // Same-origin requests, curl, and native clients send no Origin header.
  if (!origin) return true;
  return allowedOrigins.has(origin);
}

// Express/socket.io-compatible origin callback.
export function corsOrigin(origin, callback) {
  if (isAllowedOrigin(origin)) return callback(null, true);
  logger.warn(`CORS: blocked disallowed origin "${origin}"`);
  callback(null, false);
}
