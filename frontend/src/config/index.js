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

// Free public STUN servers (Google) — used when VITE_STUN_URLS is not set.
// STUN only helps two peers discover their public address; it does NOT relay
// media.
const DEFAULT_STUN_URLS = [
  "stun:stun.l.google.com:19302",
  "stun:stun1.l.google.com:19302",
];

// Free public TURN relay (Metered "Open Relay"). A TURN server relays the actual
// audio/video when a direct peer-to-peer path can't be established — which is the
// COMMON case between two phones on mobile data, or behind strict/symmetric NATs
// and corporate firewalls. Without TURN, a call can appear "connected" while no
// media ever flows (the classic "I called but the other phone has no sound").
//
// These no-signup credentials are a best-effort fallback so calls work out of
// the box at zero cost. For production-grade reliability, set your own TURN
// server via VITE_TURN_URL / VITE_TURN_USERNAME / VITE_TURN_CREDENTIAL (e.g. a
// free Metered API key, Twilio, or a self-hosted coturn) — it takes precedence.
const DEFAULT_TURN_SERVERS = [
  { urls: "turn:openrelay.metered.ca:80", username: "openrelayproject", credential: "openrelayproject" },
  { urls: "turn:openrelay.metered.ca:443", username: "openrelayproject", credential: "openrelayproject" },
  { urls: "turn:openrelay.metered.ca:443?transport=tcp", username: "openrelayproject", credential: "openrelayproject" },
];

// Build the WebRTC ICE server list. STUN (with a sensible default) is always
// included; a TURN relay is always included too — either the one configured via
// env, or the free public fallback — so NAT traversal works without per-deploy
// setup.
const buildIceServers = (stunUrls, turnUrl, turnUser, turnCredential) => {
  const stun = toList(stunUrls);
  const servers = (stun.length ? stun : DEFAULT_STUN_URLS).map((urls) => ({ urls }));
  if (turnUrl) {
    servers.push({ urls: turnUrl, username: turnUser, credential: turnCredential });
  } else {
    servers.push(...DEFAULT_TURN_SERVERS);
  }
  return servers;
};

// ── read + validate ──────────────────────────────────────────────────────

const APP_ENV = required("VITE_APP_ENV");
const API_URL = required("VITE_API_URL");
const SOCKET_URL = required("VITE_SOCKET_URL");

const CLERK_PUBLISHABLE_KEY = required("VITE_CLERK_PUBLISHABLE_KEY");

// STUN/TURN are optional: buildIceServers() falls back to free public servers
// when these are unset, so calls work without any per-deployment configuration.
const STUN_URLS = optional("VITE_STUN_URLS");
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
