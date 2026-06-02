// ─────────────────────────────────────────────────────────────────────────
//  Centralized frontend configuration.
//
//  This is the ONLY module in the frontend that reads `import.meta.env`. Every
//  other module imports its values from here. Required values are validated at
//  import time: if any are missing the app throws immediately with a clear,
//  actionable message rather than failing later with a confusing runtime error.
//
//  There are intentionally NO inline fallbacks (no `import.meta.env.X || "..."`)
//  and no hardcoded URLs, ports, or origins anywhere.
// ─────────────────────────────────────────────────────────────────────────

const errors = [];

const required = (name) => {
  const value = import.meta.env[name];
  if (value === undefined || value === null || String(value).trim() === "") {
    errors.push(`Missing ${name}`);
    return "";
  }
  return String(value).trim();
};

const optional = (name) => {
  const value = import.meta.env[name];
  return value === undefined || value === null ? "" : String(value).trim();
};

const toList = (value) => [
  ...new Set(
    String(value || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  ),
];

// Build the WebRTC ICE server list from configuration. STUN URLs are required
// (NAT traversal needs at least one); TURN is optional and only added when its
// credentials are configured.
const buildIceServers = (stunUrls, turnUrl, turnUser, turnCredential) => {
  const servers = toList(stunUrls).map((urls) => ({ urls }));
  if (turnUrl) {
    servers.push({ urls: turnUrl, username: turnUser, credential: turnCredential });
  }
  return servers;
};

// ── read + validate ──────────────────────────────────────────────────────

const APP_ENV = required("VITE_APP_ENV");
const API_URL = required("VITE_API_URL");
const SOCKET_URL = required("VITE_SOCKET_URL");

const CLERK_PUBLISHABLE_KEY = required("VITE_CLERK_PUBLISHABLE_KEY");

const STUN_URLS = required("VITE_STUN_URLS");
const STUN_LIST = toList(STUN_URLS);
if (STUN_URLS && STUN_LIST.length === 0) {
  errors.push("VITE_STUN_URLS must contain at least one STUN URL");
}
const TURN_URL = optional("VITE_TURN_URL");
const TURN_USERNAME = optional("VITE_TURN_USERNAME");
const TURN_CREDENTIAL = optional("VITE_TURN_CREDENTIAL");

if (errors.length) {
  const message = [
    "❌ Invalid frontend configuration — the app cannot start:",
    ...errors.map((e) => `   ❌ ${e}`),
    "   Set these VITE_* variables in frontend/.env (see frontend/.env.example) and reload.",
  ].join("\n");
  // Surface in the console and halt module evaluation (Vite shows the overlay).
  console.error(message);
  throw new Error(message);
}

const config = Object.freeze({
  env: APP_ENV,
  isProduction: APP_ENV === "production",
  isDevelopment: APP_ENV === "development",

  apiUrl: API_URL,
  socketUrl: SOCKET_URL,

  clerk: Object.freeze({
    publishableKey: CLERK_PUBLISHABLE_KEY,
  }),

  webrtc: Object.freeze({
    iceServers: Object.freeze(
      buildIceServers(STUN_URLS, TURN_URL, TURN_USERNAME, TURN_CREDENTIAL)
    ),
  }),

  http: Object.freeze({
    // Header sent on XHR + Socket.IO handshakes to bypass ngrok's free-tier
    // browser-warning interstitial. A fixed protocol workaround (harmless on
    // non-ngrok hosts), centralized here so transports share one source.
    tunnelHeaders: Object.freeze({ "ngrok-skip-browser-warning": "true" }),
  }),
});

export default config;
