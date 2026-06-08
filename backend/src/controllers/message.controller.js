import mongoose from "mongoose";

import User from "../models/user.model.js";
import Message from "../models/message.model.js";

import cloudinary, { cloudinaryEnabled } from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";
import logger from "../lib/logger.js";

// Returns every other user alongside the last message exchanged and how many
// of their messages the logged-in user has not yet seen. The list is ordered
// by most-recent conversation so the sidebar behaves like a real chat app.
export const getUsersForSidebar = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;

    const users = await User.aggregate([
      { $match: { _id: { $ne: loggedInUserId } } },
      {
        $lookup: {
          from: "messages",
          let: { contactId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $or: [
                    {
                      $and: [
                        { $eq: ["$senderId", loggedInUserId] },
                        { $eq: ["$receiverId", "$$contactId"] },
                      ],
                    },
                    {
                      $and: [
                        { $eq: ["$senderId", "$$contactId"] },
                        { $eq: ["$receiverId", loggedInUserId] },
                      ],
                    },
                  ],
                },
              },
            },
            { $sort: { createdAt: -1 } },
            { $limit: 1 },
          ],
          as: "lastMessage",
        },
      },
      {
        $lookup: {
          from: "messages",
          let: { contactId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$senderId", "$$contactId"] },
                    { $eq: ["$receiverId", loggedInUserId] },
                    { $eq: ["$seen", false] },
                  ],
                },
              },
            },
            { $count: "count" },
          ],
          as: "unread",
        },
      },
      {
        $addFields: {
          lastMessage: { $arrayElemAt: ["$lastMessage", 0] },
          unreadCount: { $ifNull: [{ $arrayElemAt: ["$unread.count", 0] }, 0] },
        },
      },
      { $project: { password: 0, unread: 0, __v: 0 } },
      // Most recent conversations first; users with no history fall to the bottom.
      { $sort: { "lastMessage.createdAt": -1, fullName: 1 } },
    ]);

    res.status(200).json(users);
  } catch (error) {
    logger.error("Error in getUsersForSidebar:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { id: userToChatId } = req.params;
    const myId = req.user._id;

    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
    }).sort({ createdAt: 1 });

    res.status(200).json(messages);
  } catch (error) {
    logger.error("Error in getMessages controller:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { text, image } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    if (!text?.trim() && !image) {
      return res.status(400).json({ error: "Message cannot be empty" });
    }

    let imageUrl;
    if (image) {
      // Image upload is best-effort and isolated: if Cloudinary is disabled or
      // the upload fails, a message that ALSO has text still sends (text-only),
      // and an image-only message returns a clear error instead of a generic 500.
      if (!cloudinaryEnabled) {
        if (!text?.trim()) {
          return res.status(503).json({ error: "Image uploads are not configured on this server" });
        }
        logger.warn("Image dropped — Cloudinary not configured; sending text only");
      } else {
        try {
          const uploadResponse = await cloudinary.uploader.upload(image);
          imageUrl = uploadResponse.secure_url;
        } catch (uploadError) {
          logger.error("Cloudinary upload failed:", uploadError.message);
          if (!text?.trim()) {
            return res.status(502).json({ error: "Image upload failed — please try again" });
          }
        }
      }
    }

    const newMessage = new Message({
      senderId,
      receiverId,
      text,
      image: imageUrl,
    });

    await newMessage.save();

    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", newMessage);
    }

    res.status(201).json(newMessage);
  } catch (error) {
    logger.error("Error in sendMessage controller:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const deleteMessage = async (req, res) => {
  try {
    const { id: messageId } = req.params;
    const myId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      return res.status(400).json({ error: "Invalid message id" });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    // Only the sender is allowed to delete their own message.
    if (message.senderId.toString() !== myId.toString()) {
      return res.status(403).json({ error: "You can only delete your own messages" });
    }

    await message.deleteOne();

    const receiverSocketId = getReceiverSocketId(message.receiverId.toString());
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("messageDeleted", { messageId });
    }

    res.status(200).json({ messageId });
  } catch (error) {
    logger.error("Error in deleteMessage controller:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};
