import { randomUUID } from "crypto";
import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import cloudinary, { cloudinaryEnabled } from "../lib/cloudinary.js";
import logger from "../lib/logger.js";
import { signGuestToken, verifyGuestToken } from "../lib/guestToken.js";

// Full accounts are owned by Clerk on the client; anonymous guests get a
// backend-issued session. The backend exposes the app-specific profile (avatar),
// the current user, guest creation, and guest→account migration.

// Create an anonymous guest account and return a signed guest session token.
export const createGuest = async (_req, res) => {
  try {
    const guestId = `guest_${randomUUID()}`;
    const user = await User.create({
      guestId,
      isGuest: true,
      fullName: "Guest User",
      // Unique placeholder so guests never collide on the legacy unique `email`
      // index (the empty-string default would reject a second account-less user).
      email: `${guestId}@guests.noreply`,
      lastActiveAt: new Date(),
    });
    const token = signGuestToken(guestId);
    logger.info(`Created guest account ${guestId}`);
    res.status(201).json({ user, token });
  } catch (error) {
    logger.error("Error in createGuest controller:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Migrate an anonymous guest's data into the signed-in Clerk account, then
// remove the guest record. protectRoute guarantees req.user is the account; the
// guest's SIGNED token (ownership proof) is required, not just a guessable id.
export const migrateGuest = async (req, res) => {
  try {
    if (req.user.isGuest) {
      return res.status(400).json({ message: "Sign in with an account to migrate guest data" });
    }
    const { guestToken } = req.body || {};
    if (!guestToken) return res.status(200).json({ migrated: false });

    let guestId;
    try {
      guestId = verifyGuestToken(guestToken).sub;
    } catch {
      return res.status(400).json({ message: "Invalid guest token" });
    }

    const guest = await User.findOne({ guestId, isGuest: true });
    if (!guest || guest._id.equals(req.user._id)) {
      return res.status(200).json({ migrated: false });
    }

    // Re-point the guest's messages (both directions) to the account.
    const sent = await Message.updateMany(
      { senderId: guest._id },
      { $set: { senderId: req.user._id } }
    );
    const received = await Message.updateMany(
      { receiverId: guest._id },
      { $set: { receiverId: req.user._id } }
    );
    await guest.deleteOne();

    const moved = (sent.modifiedCount || 0) + (received.modifiedCount || 0);
    logger.info(`Migrated guest ${guestId} → user ${req.user._id} (${moved} messages)`);
    res.status(200).json({ migrated: true, messages: moved });
  } catch (error) {
    logger.error("Error in migrateGuest controller:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { profilePic } = req.body;
    const userId = req.user._id;

    if (!profilePic) {
      return res.status(400).json({ message: "Profile pic is required" });
    }

    if (!cloudinaryEnabled) {
      return res.status(503).json({ message: "Avatar uploads are not configured on this server" });
    }

    let uploadResponse;
    try {
      uploadResponse = await cloudinary.uploader.upload(profilePic);
    } catch (uploadError) {
      logger.error("Cloudinary avatar upload failed:", uploadError.message);
      return res.status(502).json({ message: "Avatar upload failed — please try again" });
    }
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { profilePic: uploadResponse.secure_url },
      { new: true }
    ).select("-password");

    res.status(200).json(updatedUser);
  } catch (error) {
    logger.error("Error in updateProfile controller:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const checkAuth = (req, res) => {
  try {
    // req.user is the Mongo user resolved from the session by protectRoute.
    res.status(200).json(req.user);
  } catch (error) {
    logger.error("Error in checkAuth controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Persists the client-supplied Clerk display profile onto the Mongo user. The
// identity (clerkId) comes from the verified token, never the body.
export const syncProfile = async (req, res) => {
  try {
    const cap = (v, n) => (typeof v === "string" ? v.trim().slice(0, n) : "");
    const fullName = cap(req.body?.fullName, 80);
    const email = cap(req.body?.email, 200);
    const profilePic = cap(req.body?.profilePic, 2000);

    const update = {};
    if (fullName) update.fullName = fullName;
    if (email) update.email = email;
    if (profilePic) update.profilePic = profilePic;

    const user = Object.keys(update).length
      ? await User.findByIdAndUpdate(req.user._id, update, { new: true }).select("-password")
      : req.user;

    res.status(200).json(user);
  } catch (error) {
    logger.error("Error in syncProfile controller:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};
