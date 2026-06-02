// Config is imported first: it loads + validates the environment and will exit
// the process immediately if anything required is missing or invalid.
import config from "./config/index.js";
import logger from "./lib/logger.js";

import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import path from "path";

import { connectDB } from "./lib/db.js";
import { corsOrigin } from "./lib/cors.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";

import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.route.js";
import { app, server } from "./lib/socket.js";

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

app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);

if (config.isProduction) {
  app.use(express.static(config.paths.clientDist));

  app.get("*", (req, res) => {
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
