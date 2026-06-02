import User from "../models/user.model.js";
import logger from "./logger.js";

// Maps a verified Clerk user id to this app's Mongo User document (messages and
// contacts key on the Mongo _id). Find-or-create. The trusted identity (clerkId)
// always comes from the verified session token; the display profile
// (name / email / avatar) is supplied by the client from Clerk's useUser().
export const getOrCreateUserByClerkId = async (clerkId, profile = {}) => {
  const set = {};
  if (profile.fullName) set.fullName = profile.fullName;
  if (profile.email) set.email = profile.email;
  if (profile.profilePic) set.profilePic = profile.profilePic;

  const onInsert = { clerkId };
  // When a user is created before its real email is known (e.g. a request that
  // arrives before /auth/sync), seed a UNIQUE placeholder derived from the
  // clerkId. This avoids colliding on the database's legacy unique `email`
  // index (which would otherwise reject a second account-less user). syncProfile
  // then overwrites it with the real Clerk email.
  if (!set.email) onInsert.email = `${clerkId}@users.noreply`;

  const update = { $setOnInsert: onInsert };
  if (Object.keys(set).length) update.$set = set;

  const before = await User.exists({ clerkId });
  const user = await User.findOneAndUpdate({ clerkId }, update, {
    new: true,
    upsert: true,
  });
  if (!before) logger.info(`Provisioned Mongo user for Clerk id ${clerkId}`);
  return user;
};
