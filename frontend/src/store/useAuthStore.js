import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";
import toast from "react-hot-toast";
import { io } from "socket.io-client";
import config from "../config/index.js";
import logger from "../lib/logger.js";
import {
  getGuestToken,
  setGuestSession,
  clearGuestSession,
} from "../lib/guestSession.js";

// Holds the app-specific Mongo user — for either a Clerk account OR an anonymous
// guest — plus the realtime socket + presence used by chat and calls.
export const useAuthStore = create((set, get) => ({
  authUser: null, // Mongo user (account or guest)
  isUpdatingProfile: false,
  isSyncingUser: false,
  syncError: null,
  onlineUsers: [],
  socket: null,

  // ── Clerk account session ────────────────────────────────────────────────
  // Fetch/provision the Mongo user for the signed-in Clerk session, then connect.
  syncUser: async (profile = {}) => {
    if (get().isSyncingUser) return;
    set({ isSyncingUser: true, syncError: null });
    try {
      const res = await axiosInstance.post("/auth/sync", profile);
      set({ authUser: res.data, syncError: null });
      get().connectSocket();
    } catch (error) {
      logger.error("Failed to sync user:", error.message);
      set({
        authUser: null,
        syncError:
          error.response?.data?.message ||
          "Couldn't reach the server. Make sure the backend is running, then retry.",
      });
    } finally {
      set({ isSyncingUser: false });
    }
  },

  // ── Anonymous guest session ──────────────────────────────────────────────
  // Create a new guest account, persist the session, and connect.
  continueAsGuest: async () => {
    if (get().isSyncingUser) return;
    set({ isSyncingUser: true, syncError: null });
    try {
      const res = await axiosInstance.post("/auth/guest");
      const { user, token } = res.data;
      setGuestSession(token, user.guestId);
      set({ authUser: user, syncError: null });
      get().connectSocket();
    } catch (error) {
      logger.error("Failed to start guest session:", error.message);
      set({
        syncError:
          error.response?.data?.message ||
          "Couldn't start a guest session. Make sure the backend is running, then retry.",
      });
    } finally {
      set({ isSyncingUser: false });
    }
  },

  // Restore a guest session from localStorage on startup. Returns true on success.
  restoreGuest: async () => {
    if (!getGuestToken()) return false;
    set({ isSyncingUser: true, syncError: null });
    try {
      const res = await axiosInstance.get("/auth/check"); // interceptor sends the guest token
      set({ authUser: res.data, syncError: null });
      get().connectSocket();
      return true;
    } catch (error) {
      logger.warn("Guest session expired/invalid; clearing.", error.message);
      clearGuestSession();
      set({ authUser: null });
      return false;
    } finally {
      set({ isSyncingUser: false });
    }
  },

  // After a Clerk sign-in: migrate any prior guest's data into the account.
  migrateGuestIfNeeded: async () => {
    const guestToken = getGuestToken();
    if (!guestToken) return;
    try {
      // Send the signed guest token as ownership proof (verified server-side).
      await axiosInstance.post("/auth/migrate-guest", { guestToken });
      logger.info("Migrated guest data to account.");
    } catch (error) {
      logger.warn("Guest migration failed:", error.message);
    } finally {
      clearGuestSession();
    }
  },

  // ── shared ───────────────────────────────────────────────────────────────
  clearUser: () => {
    get().disconnectSocket();
    set({ authUser: null, onlineUsers: [], syncError: null });
  },

  // Guest "log out": end the session and forget it.
  exitGuest: () => {
    clearGuestSession();
    get().clearUser();
  },

  updateProfile: async (data) => {
    set({ isUpdatingProfile: true });
    try {
      const res = await axiosInstance.put("/auth/update-profile", data);
      set({ authUser: res.data });
      toast.success("Profile updated successfully");
    } catch (error) {
      logger.error("Update profile failed:", error.message);
      toast.error(error.response?.data?.message || "Failed to update profile");
    } finally {
      set({ isUpdatingProfile: false });
    }
  },

  connectSocket: async () => {
    const { authUser } = get();
    if (!authUser || get().socket?.connected) return;

    // Authenticate the socket with whichever session token applies.
    let token = null;
    try {
      token = await window.Clerk?.session?.getToken();
    } catch {
      // Clerk not ready / no session — fall through to the guest token.
    }
    if (!token) token = getGuestToken();
    if (!token) return;

    const socket = io(config.socketUrl, {
      auth: { token },
      extraHeaders: { ...config.http.tunnelHeaders },
    });
    socket.connect();

    set({ socket });

    socket.on("getOnlineUsers", (userIds) => {
      set({ onlineUsers: userIds });
    });
  },

  disconnectSocket: () => {
    if (get().socket?.connected) get().socket.disconnect();
    set({ socket: null });
  },
}));
