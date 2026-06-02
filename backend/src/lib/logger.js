// Minimal leveled logger. The active threshold comes from config (LOG_LEVEL):
// messages above the configured level are dropped. Every log line is prefixed
// with an ISO timestamp and its level so output is greppable and ordered.
import config from "../config/index.js";

const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const threshold = LEVELS[config.logLevel] ?? LEVELS.info;

const stamp = () => new Date().toISOString();

const emit = (level, sink, args) => {
  if (LEVELS[level] > threshold) return;
  sink(`${stamp()} [${level.toUpperCase()}]`, ...args);
};

const logger = {
  error: (...args) => emit("error", console.error, args),
  warn: (...args) => emit("warn", console.warn, args),
  info: (...args) => emit("info", console.log, args),
  debug: (...args) => emit("debug", console.log, args),
};

export default logger;
