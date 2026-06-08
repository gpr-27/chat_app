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

// Free public STUN servers (Google + Cloudflare) — used when VITE_STUN_URLS is
// not set. STUN only helps two peers discover their public address; it does NOT
// relay media.
const DEFAULT_STUN_URLS = [
  "stun:stun.l.google.com:19302",
  "stun:stun1.l.google.com:19302",
  "stun:stun2.l.google.com:19302",
  "stun:stun.cloudflare.com:3478",
];

// A TURN server relays the actual audio/video when a direct peer-to-peer path
// can't be established — the COMMON case between two phones on mobile data, or
// behind strict/symmetric NATs and corporate firewalls. Without TURN a call can
// appear "connected" while no media ever flows (the classic "I called but the
// other phone has no sound").
//
// NOTE: there is no longer a reliable no-signup public TURN relay (the old
// Metered "openrelayproject" credentials were retired and no longer authenticate
// — which silently breaks cross-network calls). So TURN is enabled by providing
// your OWN credentials via env. The simplest free option is ExpressTURN
// (https://www.expressturn.com — 1 TB/month free, static credentials, no card):
// set VITE_TURN_USERNAME + VITE_TURN_CREDENTIAL and we default the relay URLs to
// ExpressTURN below. No relay credentials are ever baked into the committed repo.
const EXPRESSTURN_DEFAULT_URLS = [
  "turn:relay1.expressturn.com:3478",
  "turns:relay1.expressturn.com:443?transport=tcp",
];

// Build the WebRTC ICE server list:
//   • STUN is always included (free; lets direct peer-to-peer paths form).
//   • TURN (media relay) is included when credentials are configured — either an
//     explicit VITE_TURN_URL (one or more comma-separated URLs), or just a
//     username + credential, in which case the URLs default to ExpressTURN over
//     both plain UDP/TCP (3478) and TLS/443 (443 traverses the strictest NATs).
const buildIceServers = (stunUrls, turnUrls, turnUser, turnCredential) => {
  const stun = toList(stunUrls);
  const servers = (stun.length ? stun : DEFAULT_STUN_URLS).map((urls) => ({ urls }));

  if (turnUser && turnCredential) {
    const provided = toList(turnUrls);
    const relayUrls = provided.length ? provided : EXPRESSTURN_DEFAULT_URLS;
    for (const urls of relayUrls) {
      servers.push({ urls, username: turnUser, credential: turnCredential });
    }
  }
  return servers;
};

// ── read + validate ──────────────────────────────────────────────────────

const APP_ENV = required("VITE_APP_ENV");
const API_URL = required("VITE_API_URL");
const SOCKET_URL = required("VITE_SOCKET_URL");

const CLERK_PUBLISHABLE_KEY = required("VITE_CLERK_PUBLISHABLE_KEY");

// STUN is optional (a free default list is used when unset). TURN is enabled by
// supplying credentials (VITE_TURN_USERNAME + VITE_TURN_CREDENTIAL, and optionally
// one or more comma-separated VITE_TURN_URL). Without TURN, same-network calls
// work but cross-network calls may fail — see DEPLOYMENT.md → Voice/video calls.
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
    // True when a TURN relay is configured (so the UI can warn that cross-network
    // calls may not connect when it's false).
    hasTurn: Boolean(TURN_USERNAME && TURN_CREDENTIAL),
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
