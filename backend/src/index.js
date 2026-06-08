// Config is imported first: it loads + validates the environment and will exit
// the process immediately if anything required is missing or invalid.
import config from "./config/index.js";
import logger from "./lib/logger.js";

import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import compression from "compression";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import mongoose from "mongoose";
import path from "path";

import { connectDB } from "./lib/db.js";
import { corsOrigin } from "./lib/cors.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";

import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.route.js";
import healthRoutes from "./routes/health.route.js";
import { app, server, io } from "./lib/socket.js";

// Behind a reverse proxy (Render's router, a load balancer) in production: trust
// the first proxy hop so req.ip, req.protocol, and rate-limiting see the real
// client address/scheme from X-Forwarded-* rather than the proxy's.
if (config.isProduction) app.set("trust proxy", 1);

// Baseline security headers. CSP / COOP / COEP are disabled deliberately:
// the SPA loads Clerk + Cloudinary from third-party origins and uses OAuth
// popups, and a strict policy here would break them without careful tuning.
// The remaining defaults (HSTS, nosniff, frameguard, referrer policy, …) are
// safe for a same-origin SPA + JSON API.
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
  })
);

app.use(compression());

// Increase payload size limit for base64 image uploads.
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
  })
);

app.use(cookieParser());

// Health probe — registered before auth + rate limiting so orchestrator and
// load-balancer checks are never throttled or rejected.
app.use("/api/health", healthRoutes);

// Rate limiting (production only — avoids throttling local dev / seeding).
// A general per-IP cap on the whole API, plus a stricter cap on anonymous
// guest-account creation, which is unauthenticated and writes to the database.
if (config.isProduction) {
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many requests — please try again later." },
  });
  const guestCreateLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many guest accounts created — please try again later." },
  });
  app.use("/api", apiLimiter);
  app.use("/api/auth/guest", guestCreateLimiter);
}

app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);

if (config.isProduction) {
  app.use(express.static(config.paths.clientDist));

  // SPA fallback: serve index.html for client-side routes, but let unknown
  // /api/* paths fall through to the JSON 404 handler below (otherwise a typo'd
  // or removed API route would silently return the HTML shell with a 200).
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) return next();
    res.sendFile(path.join(config.paths.clientDist, "index.html"));
  });
}

// 404 + centralized error logging (registered after all routes).
app.use(notFound);
app.use(errorHandler);

const printStartupBanner = (dbHost) => {
  [
    "=================================",
    ` NODE_ENV     ${config.env}`,
    ` PORT         ${config.port}`,
    ` CLIENT_URL   ${config.clientUrls.join(", ")}`,
    ` MongoDB      Connected ✓ (${dbHost})`,
    ` Clerk auth   Configured ✓`,
    "=================================",
  ].forEach((line) => logger.info(line));
};

// ── graceful shutdown ───────────────────────────────────────────────────────
// Containers and orchestrators stop processes with SIGTERM (SIGINT on Ctrl-C).
// Close Socket.IO (which also closes the underlying HTTP server and disconnects
// clients), then the MongoDB connection, then exit. A timer guarantees the
// process still exits if a connection refuses to drain.
let shuttingDown = false;
const shutdown = (signal) => {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info(`${signal} received — shutting down gracefully…`);

  const forceExit = setTimeout(() => {
    logger.error("Could not close connections in time — forcing shutdown.");
    process.exit(1);
  }, 10000);
  forceExit.unref();

  io.close(async () => {
    try {
      await mongoose.connection.close(false);
      logger.info("MongoDB connection closed. Shutdown complete.");
    } catch (error) {
      logger.error("Error closing MongoDB connection:", error.message);
    } finally {
      clearTimeout(forceExit);
      process.exit(0);
    }
  });
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled promise rejection:", reason);
});
process.on("uncaughtException", (error) => {
  logger.error("Uncaught exception:", error);
  process.exit(1);
});

const start = async () => {
  logger.info(`Environment loaded — starting in "${config.env}" mode`);
  try {
    const dbHost = await connectDB();
    server.listen(config.port, () => {
      logger.info(`Server listening on port ${config.port}`);
      printStartupBanner(dbHost);
    });
  } catch (error) {
    logger.error("Fatal: server failed to start —", error.message);
    process.exit(1);
  }
};

start();
