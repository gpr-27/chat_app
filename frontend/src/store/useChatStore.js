import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

const SOCKET_EVENTS = ["newMessage", "messageDeleted", "messagesSeen", "typing", "stopTyping"];

// Newest conversation first; contacts with no history sink to the bottom.
const sortByRecency = (users) =>
  [...users].sort((a, b) => {
    const aTime = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
    const bTime = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
    return bTime - aTime;
  });

export const useChatStore = create((set, get) => ({
  messages: [],
  users: [],
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,
  typingUsers: {}, // { [userId]: true } — contacts currently typing to me

  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/users");
      set({ users: sortByRecency(res.data) });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load contacts");
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getMessages: async (userId) => {
    set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/messages/${userId}`);
      set({ messages: res.data });
      get().markConversationSeen(userId);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load messages");
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  sendMessage: async (messageData) => {
    const { selectedUser, messages } = get();
    if (!selectedUser) return;

    const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, messageData);
    set({ messages: [...messages, res.data] });
    get().updateConversationPreview(selectedUser._id, res.data);
  },

  deleteMessage: async (messageId) => {
    try {
      await axiosInstance.delete(`/messages/${messageId}`);
      set((state) => ({ messages: state.messages.filter((m) => m._id !== messageId) }));
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete message");
    }
  },

  setSelectedUser: (selectedUser) => {
    set({ selectedUser });
    if (selectedUser?._id) get().resetUnread(selectedUser._id);
  },

  // ── live-state helpers ────────────────────────────────────────────────

  resetUnread: (userId) =>
    set((state) => ({
      users: state.users.map((u) => (u._id === userId ? { ...u, unreadCount: 0 } : u)),
    })),

  updateConversationPreview: (userId, message, { incrementUnread = false } = {}) => {
    const { users } = get();
    if (!users.some((u) => u._id === userId)) {
      // First-ever message from a brand-new contact — refresh the list.
      get().getUsers();
      return;
    }

    const updated = users.map((u) =>
      u._id === userId
        ? {
            ...u,
            lastMessage: message,
            unreadCount: incrementUnread ? (u.unreadCount || 0) + 1 : u.unreadCount || 0,
          }
        : u
    );
    set({ users: sortByRecency(updated) });
  },

  markConversationSeen: (userId) => {
    const socket = useAuthStore.getState().socket;
    socket?.emit("markSeen", { senderId: userId });
    get().resetUnread(userId);
  },

  notifyTyping: () => {
    const { selectedUser } = get();
    const socket = useAuthStore.getState().socket;
    if (selectedUser && socket) socket.emit("typing", { receiverId: selectedUser._id });
  },

  notifyStopTyping: () => {
    const { selectedUser } = get();
    const socket = useAuthStore.getState().socket;
    if (selectedUser && socket) socket.emit("stopTyping", { receiverId: selectedUser._id });
  },

  // ── socket wiring ─────────────────────────────────────────────────────

  subscribeToMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    // Idempotent: drop any prior handlers before re-binding (StrictMode/reconnect).
    SOCKET_EVENTS.forEach((event) => socket.off(event));

    socket.on("newMessage", (newMessage) => {
      const senderId = newMessage.senderId;
      const { selectedUser } = get();
      const isOpenConversation = selectedUser && senderId === selectedUser._id;

      // The sender clearly stopped typing the moment a message landed.
      set((state) => ({ typingUsers: { ...state.typingUsers, [senderId]: false } }));

      if (isOpenConversation) {
        set((state) => ({ messages: [...state.messages, newMessage] }));
        get().markConversationSeen(senderId);
        get().updateConversationPreview(senderId, newMessage);
      } else {
        get().updateConversationPreview(senderId, newMessage, { incrementUnread: true });
      }
    });

    socket.on("messageDeleted", ({ messageId }) => {
      set((state) => ({ messages: state.messages.filter((m) => m._id !== messageId) }));
    });

    socket.on("messagesSeen", ({ byUserId }) => {
      const { selectedUser } = get();
      const myId = useAuthStore.getState().authUser?._id;
      if (!selectedUser || byUserId !== selectedUser._id) return;

      set((state) => ({
        messages: state.messages.map((m) =>
          m.senderId === myId ? { ...m, seen: true } : m
        ),
      }));
    });

    socket.on("typing", ({ senderId }) => {
      set((state) => ({ typingUsers: { ...state.typingUsers, [senderId]: true } }));
    });

    socket.on("stopTyping", ({ senderId }) => {
      set((state) => ({ typingUsers: { ...state.typingUsers, [senderId]: false } }));
    });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;
    SOCKET_EVENTS.forEach((event) => socket.off(event));
  },
}));
