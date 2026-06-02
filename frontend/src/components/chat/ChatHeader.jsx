import { ArrowLeft, Phone, Video, X } from "lucide-react";
import { useAuthStore } from "../../store/useAuthStore";
import { useChatStore } from "../../store/useChatStore";
import { useCallStore } from "../../store/useCallStore";

const ChatHeader = () => {
  const { selectedUser, setSelectedUser, typingUsers } = useChatStore();
  const { onlineUsers } = useAuthStore();
  const { initiateCall, callStatus } = useCallStore();

  const isOnline = onlineUsers.includes(selectedUser._id);
  const isTyping = !!typingUsers[selectedUser._id];
  const callsDisabled = callStatus !== "idle";

  return (
    <div className="glass flex items-center justify-between gap-3 border-b border-base-content/10 px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <button
          onClick={() => setSelectedUser(null)}
          className="btn btn-circle btn-ghost btn-sm sm:hidden"
          aria-label="Back to contacts"
        >
          <ArrowLeft className="size-5" />
        </button>

        <div className="relative shrink-0">
          <img
            src={selectedUser.profilePic || "/avatar.png"}
            alt={selectedUser.fullName}
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = "/avatar.png";
            }}
            className="size-11 rounded-full object-cover ring-2 ring-primary/20 shadow-sm"
          />
          {isOnline && (
            <span className="absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full border-2 border-base-100 bg-success shadow-sm" />
          )}
        </div>

        <div className="min-w-0">
          <h3 className="truncate font-display text-base font-bold tracking-tight">
            {selectedUser.fullName}
          </h3>
          {isTyping ? (
            <p className="flex items-center gap-1 text-sm font-medium text-primary">
              typing
              <span className="flex gap-0.5">
                <Dot delay="0ms" />
                <Dot delay="150ms" />
                <Dot delay="300ms" />
              </span>
            </p>
          ) : (
            <p className="text-sm text-base-content/55">
              {isOnline ? "Active now" : "Offline"}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={() => initiateCall(selectedUser, "audio")}
          disabled={callsDisabled}
          className="btn btn-circle btn-ghost btn-sm text-base-content/70 hover:text-primary disabled:opacity-40"
          aria-label="Start voice call"
          title="Voice call"
        >
          <Phone className="size-5" />
        </button>
        <button
          onClick={() => initiateCall(selectedUser, "video")}
          disabled={callsDisabled}
          className="btn btn-circle btn-ghost btn-sm text-base-content/70 hover:text-primary disabled:opacity-40"
          aria-label="Start video call"
          title="Video call"
        >
          <Video className="size-5" />
        </button>
        <button
          onClick={() => setSelectedUser(null)}
          className="btn btn-circle btn-ghost btn-sm hidden sm:inline-flex"
          aria-label="Close conversation"
        >
          <X className="size-5" />
        </button>
      </div>
    </div>
  );
};

const Dot = ({ delay }) => (
  <span
    className="inline-block size-1.5 animate-bounce rounded-full bg-primary"
    style={{ animationDelay: delay, animationDuration: "1s" }}
  />
);

export default ChatHeader;
