// ─────────────────────────────────────────────────────────────────────────
//  Centralized backend configuration.
//
//  This is the ONLY module in the backend that reads `process.env`. Every other
//  module imports its values from here. Configuration is validated once, at
//  import time: if any required variable is missing or invalid, the process
//  prints a clear diagnostic and exits immediately (fail fast) instead of
//  booting in a broken, half-configured state.
//
//  There are intentionally NO inline fallbacks (no `process.env.X || "default"`)
//  anywhere — a missing value is an error, not something to paper over.
// ─────────────────────────────────────────────────────────────────────────

import path from "path";
import { config as loadEnv } from "dotenv";

// Load variables from the repo-root `.env` into `process.env`, once, before any
// value is read. Backend processes (`npm run dev` / `npm start` / the seed
// script) all run from the repo root, so the default cwd-relative lookup
// resolves the root `.env`.
loadEnv();

// ── validation helpers ─────────────────────────────────────────────────────

// Collect every problem so we can report them all at once rather than failing
// one variable at a time.
const errors = [];

const required = (name) => {
  const value = process.env[name];
  if (value === undefined || value === null || String(value).trim() === "") {
    errors.push(`Missing ${name}`);
    return "";
  }
  return String(value).trim();
};

const optionalVar = (name) => {
  const value = process.env[name];
  return value === undefined || value === null ? "" : String(value).trim();
};

const oneOf = (name, value, allowed) => {
  if (value && !allowed.includes(value)) {
    errors.push(`${name} must be one of [${allowed.join(", ")}] (got "${value}")`);
  }
  return value;
};

const positiveInt = (name, value) => {
  // A missing value is already reported by required(); don't double-report.
  if (value === "") return 0;
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) {
    errors.push(`${name} must be a positive integer (got "${value}")`);
    return 0;
  }
  return n;
};

// Split a comma-separated value ("a, b ,c") into a trimmed, de-duplicated list.
const toList = (value) => [
  ...new Set(
    String(value || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  ),
];

// ── read + validate raw values ──────────────────────────────────────────────

const NODE_ENV = oneOf("NODE_ENV", required("NODE_ENV"), [
  "development",
  "production",
  "test",
]);
const PORT = positiveInt("PORT", required("PORT"));
const CLIENT_URL = required("CLIENT_URL");
const MONGODB_URI = required("MONGODB_URI");
const JWT_SECRET = required("JWT_SECRET");

const CLOUDINARY_CLOUD_NAME = required("CLOUDINARY_CLOUD_NAME");
const CLOUDINARY_API_KEY = required("CLOUDINARY_API_KEY");
const CLOUDINARY_API_SECRET = required("CLOUDINARY_API_SECRET");

// Clerk (authentication). Only the PUBLISHABLE key is required: sessions are
// verified networklessly against Clerk's public JWKS, located via the frontend-
// API domain encoded in the publishable key. The SECRET key is optional and
// only used (if present) for Clerk Backend API calls.
const CLERK_PUBLISHABLE_KEY = required("CLERK_PUBLISHABLE_KEY");
const CLERK_SECRET_KEY = optionalVar("CLERK_SECRET_KEY");

// pk_(test|live)_<base64("<frontend-api-domain>$")>
const CLERK_FRONTEND_API = (() => {
  try {
    const b64 = CLERK_PUBLISHABLE_KEY.split("_")[2] || "";
    return Buffer.from(b64, "base64").toString("utf8").replace(/\$+$/, "");
  } catch {
    return "";
  }
})();
if (CLERK_PUBLISHABLE_KEY && !CLERK_FRONTEND_API) {
  errors.push("CLERK_PUBLISHABLE_KEY is malformed (cannot derive the Clerk frontend-API domain)");
}

// Anonymous guest accounts are auto-deleted after this many days of inactivity
// (enforced by a MongoDB TTL index on the User model).
const GUEST_RETENTION_DAYS = positiveInt("GUEST_RETENTION_DAYS", required("GUEST_RETENTION_DAYS"));

const LOG_LEVEL = oneOf("LOG_LEVEL", required("LOG_LEVEL"), [
  "error",
  "warn",
  "info",
  "debug",
]);

// ── fail fast ────────────────────────────────────────────────────────────────

if (errors.length) {
  // The logger depends on this module, and config isn't valid yet, so write
  // straight to stderr here.
  console.error("\n❌ Invalid configuration — the server cannot start:\n");
  for (const e of errors) console.error(`   ❌ ${e}`);
  console.error("\n   Set the missing values in your .env file (see .env.example) and retry.\n");
  process.exit(1);
}

// ── assembled, frozen config ──────────────────────────────────────────────

const CLIENT_URLS = toList(CLIENT_URL);

const config = Object.freeze({
  env: NODE_ENV,
  isProduction: NODE_ENV === "production",
  isDevelopment: NODE_ENV === "development",

  port: PORT,

  // CLIENT_URL may list several comma-separated origins (e.g. multiple dev
  // ports). The first is treated as the canonical client URL.
  clientUrl: CLIENT_URLS[0],
  clientUrls: CLIENT_URLS,

  mongoUri: MONGODB_URI,
  jwtSecret: JWT_SECRET,

  cloudinary: Object.freeze({
    cloudName: CLOUDINARY_CLOUD_NAME,
    apiKey: CLOUDINARY_API_KEY,
    apiSecret: CLOUDINARY_API_SECRET,
  }),

  clerk: Object.freeze({
    publishableKey: CLERK_PUBLISHABLE_KEY,
    secretKey: CLERK_SECRET_KEY, // optional ("" when unset)
    frontendApi: CLERK_FRONTEND_API,
    jwksUrl: CLERK_FRONTEND_API
      ? `https://${CLERK_FRONTEND_API}/.well-known/jwks.json`
      : "",
  }),

  guestRetentionDays: GUEST_RETENTION_DAYS,

  logLevel: LOG_LEVEL,

  paths: Object.freeze({
    // Where the production build of the frontend is served from. This is a
    // fixed project-layout path — identical in every environment — so it is
    // derived from the working directory rather than read from the environment.
    clientDist: path.resolve(process.cwd(), "frontend", "dist"),
  }),
});

export default config;
