import jwt from "jsonwebtoken";
import config from "../config/index.js";

// Anonymous guest sessions are authenticated with a backend-signed HMAC JWT
// (the `iss` claim distinguishes them from Clerk tokens). Signing with the
// server's JWT_SECRET means a guest token can't be forged or reassigned to
// another guestId by the client.
export const GUEST_ISSUER = "chat-app-guest";

export const signGuestToken = (guestId) =>
  jwt.sign({ isGuest: true }, config.jwtSecret, {
    algorithm: "HS256",
    issuer: GUEST_ISSUER,
    subject: guestId,
    expiresIn: `${config.guestRetentionDays}d`,
  });

// Pin the algorithm (defense-in-depth against alg-confusion / alg=none).
export const verifyGuestToken = (token) =>
  jwt.verify(token, config.jwtSecret, { algorithms: ["HS256"], issuer: GUEST_ISSUER });

// Cheap, UNVERIFIED issuer peek — used only to route a Bearer token to the
// correct verifier (Clerk JWKS vs guest HMAC). The chosen verifier still does
// full cryptographic verification.
export const peekIssuer = (token) => {
  try {
    return JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8")).iss;
  } catch {
    return undefined;
  }
};
