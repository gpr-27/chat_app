import crypto from "crypto";
import { verifyToken } from "@clerk/backend";
import config from "../config/index.js";

// Verify a Clerk session JWT WITHOUT the secret key, using the instance's public
// JWKS (located via the publishable key's frontend-API domain). @clerk/backend's
// verifyToken enforces RS256-only, signature, exp (5s skew), nbf, iat and sub;
// we add cheap defense-in-depth (explicit RS256 header check, required kid) and
// a TTL cache so rotated keys are eventually picked up.
const JWKS_TTL_MS = 60 * 60 * 1000; // 1 hour
let cache = { keys: null, fetchedAt: 0 };

const fetchJwks = async () => {
  const res = await fetch(config.clerk.jwksUrl);
  if (!res.ok) throw new Error(`JWKS fetch failed (HTTP ${res.status})`);
  const { keys } = await res.json();
  if (!Array.isArray(keys) || keys.length === 0) {
    throw new Error("JWKS response contained no keys");
  }
  cache = { keys, fetchedAt: Date.now() };
  return keys;
};

const getKeys = async (forceRefresh = false) => {
  const fresh = cache.keys && Date.now() - cache.fetchedAt < JWKS_TTL_MS;
  return !forceRefresh && fresh ? cache.keys : fetchJwks();
};

const decodeHeader = (token) => {
  try {
    return JSON.parse(Buffer.from(token.split(".")[0], "base64url").toString("utf8"));
  } catch {
    return null;
  }
};

const jwkToPem = (jwk) => {
  if (jwk.kty !== "RSA") throw new Error("Unexpected JWKS key type");
  return crypto.createPublicKey({ key: jwk, format: "jwk" }).export({ type: "spki", format: "pem" });
};

// Returns the verified token claims ({ sub, ... }); throws on any failure.
export const verifyClerkToken = async (token) => {
  const header = decodeHeader(token);
  // Clerk session tokens are always RS256 with a key id — reject anything else
  // up front (algorithm-confusion / alg=none / keyless tokens).
  if (!header || header.alg !== "RS256") throw new Error("Unsupported token algorithm");
  if (!header.kid) throw new Error("Token missing key id");

  let keys = await getKeys();
  let jwk = keys.find((k) => k.kid === header.kid);
  if (!jwk) {
    keys = await getKeys(true); // unknown kid — keys may have rotated; refetch once
    jwk = keys.find((k) => k.kid === header.kid);
  }
  if (!jwk) throw new Error("No matching JWKS key for the token");

  const jwtKey = jwkToPem(jwk);
  return verifyToken(token, { jwtKey });
};
