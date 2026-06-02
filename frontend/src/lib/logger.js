// Lightweight frontend logger. errors/warnings always surface; info/debug are
// gated to non-production so they don't clutter the console for end users.
import config from "../config/index.js";

const verbose = !config.isProduction;
const tag = "[chat]";

const logger = {
  error: (...args) => console.error(tag, ...args),
  warn: (...args) => console.warn(tag, ...args),
  info: (...args) => verbose && console.log(tag, ...args),
  debug: (...args) => verbose && console.debug(tag, ...args),
};

export default logger;
