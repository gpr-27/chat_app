import mongoose from "mongoose";
import config from "../config/index.js";
import logger from "./logger.js";

// Connects to MongoDB and returns the connected host (used in the startup
// banner). Throws on failure so the caller can decide to abort startup.
export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(config.mongoUri);
    logger.info(`MongoDB connected: ${conn.connection.host}`);
    return conn.connection.host;
  } catch (error) {
    logger.error("MongoDB connection error:", error.message);
    throw error;
  }
};
