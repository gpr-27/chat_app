import logger from "../lib/logger.js";
import { resolveUserFromToken } from "../lib/resolveUser.js";

// Pull the session token from the Authorization header (the frontend attaches
// it as `Bearer <token>` — a Clerk token for accounts, or a guest token).
const extractToken = (req) => {
  const header = req.headers.authorization || "";
  return header.startsWith("Bearer ") ? header.slice(7).trim() : null;
};

// Gate protected routes on a valid session — Clerk OR guest. The resolved Mongo
// user is attached as req.user for downstream controllers.
export const protectRoute = async (req, res, next) => {
  const token = extractToken(req);
  if (!token) {
    logger.warn(`Auth failed: no bearer token — ${req.method} ${req.originalUrl}`);
    return res.status(401).json({ message: "Unauthorized - No session token" });
  }

  try {
    req.user = await resolveUserFromToken(token);
    next();
  } catch (error) {
    logger.warn(`Auth failed: ${error.message} — ${req.method} ${req.originalUrl}`);
    return res.status(401).json({ message: "Unauthorized - Invalid session" });
  }
};
