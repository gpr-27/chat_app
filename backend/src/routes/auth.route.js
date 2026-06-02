import express from "express";
import {
  checkAuth,
  createGuest,
  migrateGuest,
  syncProfile,
  updateProfile,
} from "../controllers/auth.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

// Anonymous guest account creation — no session required.
router.post("/guest", createGuest);

// Account (Clerk) + guest sessions both pass protectRoute.
router.get("/check", protectRoute, checkAuth);
router.post("/sync", protectRoute, syncProfile);
router.put("/update-profile", protectRoute, updateProfile);

// Migrate guest data into the signed-in Clerk account.
router.post("/migrate-guest", protectRoute, migrateGuest);

export default router;
