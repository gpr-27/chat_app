import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import config from "../config/index.js";

const userSchema = new mongoose.Schema(
  {
    // Clerk is the identity authority for full accounts; each maps to one user.
    clerkId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    // Anonymous guest accounts (guest_<uuid>). Mutually exclusive with clerkId.
    guestId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    isGuest: {
      type: Boolean,
      default: false,
    },
    email: {
      type: String,
      default: "",
    },
    fullName: {
      type: String,
      default: "",
    },
    // Optional: only legacy (pre-Clerk) accounts have a password. Clerk- and
    // guest-backed users never store one.
    password: {
      type: String,
      minlength: 6,
    },
    profilePic: {
      type: String,
      default: "",
    },
    // Touched on every authenticated guest request; drives the TTL cleanup below.
    lastActiveAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

// TTL cleanup for inactive GUESTS only: a partial TTL index expires guest
// documents `guestRetentionDays` after their lastActiveAt. The
// partialFilterExpression keeps Clerk accounts (which never set lastActiveAt)
// entirely out of scope.
userSchema.index(
  { lastActiveAt: 1 },
  {
    expireAfterSeconds: config.guestRetentionDays * 24 * 60 * 60,
    partialFilterExpression: { isGuest: true },
    name: "guest_ttl",
  }
);

// Hash the password before saving whenever it has been set or changed.
userSchema.pre("save", async function hashPassword(next) {
  if (!this.isModified("password") || !this.password) return next();

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare a plain-text candidate against the stored hash.
userSchema.methods.matchPassword = function matchPassword(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model("User", userSchema);

export default User;
