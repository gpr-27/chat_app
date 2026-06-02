import { Server } from "socket.io";
import http from "http";
import express from "express";

import Message from "../models/message.model.js";
import { corsOrigin } from "./cors.js";
import logger from "./logger.js";
import { resolveUserFromToken } from "./resolveUser.js";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: corsOrigin,
    credentials: true,
  },
});

// Authenticate every socket on its handshake: the client sends its Clerk
// session token in `auth.token`; we verify it, resolve the Mongo user, and pin
// that user's _id to the socket. Connections without a valid token are rejected.
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Unauthorized: missing token"));

    const user = await resolveUserFromToken(token);
    socket.data.userId = user._id.toString();
    next();
  } catch (error) {
    logger.warn("Socket auth rejected:", error.message);
    next(new Error("Unauthorized"));
  }
});

export function getReceiverSocketId(userId) {
  return userSocketMap[userId];
}

// used to store online users -> { userId: socketId }
const userSocketMap = {};
// tracks who each user is currently on a call with -> { userId: partnerUserId }
const activeCallPeer = {};

io.on("connection", (socket) => {
  logger.debug("Socket connected:", socket.id);

  // Set by the io.use auth middleware above (the verified Mongo user _id).
  const userId = socket.data.userId;
  if (userId) userSocketMap[userId] = socket.id;

  // Broadcast the current set of online users to everyone.
  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  // ── WebRTC call signaling ──────────────────────────────────────────────
  // The server only relays SDP/ICE between the two peers; media is P2P.
  socket.on("call:offer", ({ to, offer, callType }) => {
    const receiverSocketId = userSocketMap[to];
    if (!receiverSocketId) {
      socket.emit("call:unavailable", { to });
      return;
    }
    activeCallPeer[userId] = to;
    activeCallPeer[to] = userId;
    io.to(receiverSocketId).emit("call:incoming", { from: userId, offer, callType });
  });

  socket.on("call:answer", ({ to, answer }) => {
    const receiverSocketId = userSocketMap[to];
    if (receiverSocketId) io.to(receiverSocketId).emit("call:answered", { from: userId, answer });
  });

  socket.on("call:ice", ({ to, candidate }) => {
    const receiverSocketId = userSocketMap[to];
    if (receiverSocketId) io.to(receiverSocketId).emit("call:ice", { from: userId, candidate });
  });

  socket.on("call:reject", ({ to }) => {
    delete activeCallPeer[userId];
    delete activeCallPeer[to];
    const receiverSocketId = userSocketMap[to];
    if (receiverSocketId) io.to(receiverSocketId).emit("call:rejected", { from: userId });
  });

  socket.on("call:end", ({ to }) => {
    delete activeCallPeer[userId];
    delete activeCallPeer[to];
    const receiverSocketId = userSocketMap[to];
    if (receiverSocketId) io.to(receiverSocketId).emit("call:ended", { from: userId });
  });

  socket.on("call:busy", ({ to }) => {
    const receiverSocketId = userSocketMap[to];
    if (receiverSocketId) io.to(receiverSocketId).emit("call:busy", { from: userId });
  });

  // Relay "typing" / "stopTyping" straight to the person being messaged.
  socket.on("typing", ({ receiverId }) => {
    const receiverSocketId = userSocketMap[receiverId];
    if (receiverSocketId) io.to(receiverSocketId).emit("typing", { senderId: userId });
  });

  socket.on("stopTyping", ({ receiverId }) => {
    const receiverSocketId = userSocketMap[receiverId];
    if (receiverSocketId) io.to(receiverSocketId).emit("stopTyping", { senderId: userId });
  });

  // The reader tells the server it has seen a conversation; we persist that and
  // notify the original sender so their read receipts can update in real time.
  socket.on("markSeen", async ({ senderId }) => {
    try {
      if (!senderId || !userId) return;

      await Message.updateMany(
        { senderId, receiverId: userId, seen: false },
        { $set: { seen: true } }
      );

      const senderSocketId = userSocketMap[senderId];
      if (senderSocketId) io.to(senderSocketId).emit("messagesSeen", { byUserId: userId });
    } catch (error) {
      logger.error("Error in markSeen handler:", error.message);
    }
  });

  socket.on("disconnect", () => {
    logger.debug("Socket disconnected:", socket.id);

    // If this user was mid-call, tell their peer the call ended.
    const peerId = activeCallPeer[userId];
    if (peerId) {
      const peerSocketId = userSocketMap[peerId];
      if (peerSocketId) io.to(peerSocketId).emit("call:ended", { from: userId });
      delete activeCallPeer[peerId];
      delete activeCallPeer[userId];
    }

    delete userSocketMap[userId];
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });
});

export { io, app, server };
