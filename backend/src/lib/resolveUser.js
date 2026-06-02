import { verifyClerkToken } from "./clerkVerify.js";
import { getOrCreateUserByClerkId } from "./clerkUser.js";
import { verifyGuestToken, peekIssuer, GUEST_ISSUER } from "./guestToken.js";
import User from "../models/user.model.js";

// Resolve a Bearer token to this app's Mongo user. Supports BOTH a Clerk session
// (verified against Clerk's public JWKS) and an anonymous guest session
// (verified against the server's HMAC secret). Throws on any failure.
export const resolveUserFromToken = async (token) => {
  if (!token) throw new Error("No token");

  // ── Guest session ──
  if (peekIssuer(token) === GUEST_ISSUER) {
    const payload = verifyGuestToken(token);
    const guestId = payload.sub;
    // Touch lastActiveAt (resets the TTL window) and confirm the guest exists.
    const user = await User.findOneAndUpdate(
      { guestId, isGuest: true },
      { $set: { lastActiveAt: new Date() } },
      { new: true }
    );
    if (!user) throw new Error("Guest session no longer exists");
    return user;
  }

  // ── Clerk session ──
  const claims = await verifyClerkToken(token);
  return getOrCreateUserByClerkId(claims.sub);
};
