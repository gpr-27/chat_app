import { useEffect, useState } from "react";
import { useChatStore } from "../../store/useChatStore";
import { useAuthStore } from "../../store/useAuthStore";
import SidebarSkeleton from "../skeletons/SidebarSkeleton";
import { formatRelativeTime } from "../../lib/utils";
import { ImageIcon, Search, Users } from "lucide-react";

const previewText = (lastMessage, myId) => {
  if (!lastMessage) return null;
  const mine = lastMessage.senderId === myId;
  const prefix = mine ? "You: " : "";
  if (lastMessage.image && !lastMessage.text) return { prefix, body: "Photo", isPhoto: true };
  return { prefix, body: lastMessage.text, isPhoto: false };
};

const Sidebar = ({ onSelectUser }) => {
  const { getUsers, users, selectedUser, setSelectedUser, isUsersLoading } = useChatStore();
  const { onlineUsers, authUser } = useAuthStore();

  const [showOnlineOnly, setShowOnlineOnly] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    getUsers();
  }, [getUsers]);

  const onlineCount = Math.max(0, onlineUsers.filter((id) => id !== authUser?._id).length);

  const filteredUsers = users
    .filter((user) => (showOnlineOnly ? onlineUsers.includes(user._id) : true))
    .filter((user) => user.fullName.toLowerCase().includes(search.trim().toLowerCase()));

  const handleSelect = (user) => {
    setSelectedUser(user);
    onSelectUser?.();
  };

  if (isUsersLoading) return <SidebarSkeleton />;

  return (
    <aside className="glass flex h-full w-full flex-col border-r border-base-content/10">
      {/* Header */}
      <div className="space-y-3 border-b border-base-content/10 p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold tracking-tight">Messages</h2>
          <span className="chip">
            <span className="size-1.5 rounded-full bg-success" />
            {onlineCount} online
          </span>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-base-content/40" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search contacts"
            className="input-soft pl-9"
          />
        </div>

        {/* Online-only toggle */}
        <label className="flex cursor-pointer items-center gap-2 text-sm text-base-content/70">
          <input
            type="checkbox"
            checked={showOnlineOnly}
            onChange={(e) => setShowOnlineOnly(e.target.checked)}
            className="toggle toggle-primary toggle-xs"
          />
          Online only
        </label>
      </div>

      {/* Contact list */}
      <div className="scroll-slim flex-1 overflow-y-auto p-2">
        {filteredUsers.map((user) => {
          const isOnline = onlineUsers.includes(user._id);
          const isActive = selectedUser?._id === user._id;
          const preview = previewText(user.lastMessage, authUser?._id);
          const unread = user.unreadCount || 0;

          return (
            <button
              key={user._id}
              onClick={() => handleSelect(user)}
              className={`mb-1 flex w-full items-center gap-3 rounded-2xl p-2.5 text-left transition-all duration-200 ${
                isActive
                  ? "bg-primary/12 ring-1 ring-primary/30"
                  : "hover:bg-base-content/5"
              }`}
            >
              {/* Avatar */}
              <div className="relative shrink-0">
                <img
                  src={user.profilePic || "/avatar.png"}
                  alt={user.fullName}
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = "/avatar.png";
                  }}
                  className="size-12 rounded-full object-cover ring-1 ring-base-content/10"
                />
                {isOnline && (
                  <span className="absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full border-2 border-base-100 bg-success" />
                )}
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className={`truncate ${unread > 0 ? "font-bold" : "font-semibold"}`}>
                    {user.fullName}
                  </span>
                  {user.lastMessage && (
                    <span className="shrink-0 text-[11px] font-medium text-base-content/45">
                      {formatRelativeTime(user.lastMessage.createdAt)}
                    </span>
                  )}
                </div>

                <div className="mt-0.5 flex items-center justify-between gap-2">
                  <span
                    className={`flex min-w-0 items-center gap-1 truncate text-sm ${
                      unread > 0 ? "text-base-content/80" : "text-base-content/50"
                    }`}
                  >
                    {preview ? (
                      <>
                        {preview.prefix && <span className="shrink-0">{preview.prefix}</span>}
                        {preview.isPhoto && <ImageIcon className="size-3.5 shrink-0" />}
                        <span className="truncate">{preview.body}</span>
                      </>
                    ) : (
                      <span className="italic text-base-content/40">Tap to start chatting</span>
                    )}
                  </span>

                  {unread > 0 && (
                    <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-content">
                      {unread > 99 ? "99+" : unread}
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}

        {/* Empty state */}
        {filteredUsers.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-12 text-center text-base-content/40">
            <Users className="size-8" />
            <p className="text-sm">
              {users.length === 0
                ? "No contacts yet"
                : showOnlineOnly
                ? "No one online"
                : "No matches found"}
            </p>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
