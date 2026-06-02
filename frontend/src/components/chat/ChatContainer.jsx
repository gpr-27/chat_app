import { useEffect, useRef, useState } from "react";
import { Check, CheckCheck, Trash2 } from "lucide-react";

import { useChatStore } from "../../store/useChatStore";
import { useAuthStore } from "../../store/useAuthStore";
import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "../skeletons/MessageSkeleton";
import { formatMessageTime, formatDateSeparator, isNewDay } from "../../lib/utils";

const ChatContainer = () => {
  const { messages, getMessages, isMessagesLoading, selectedUser, deleteMessage, typingUsers } =
    useChatStore();
  const { authUser } = useAuthStore();

  const bottomRef = useRef(null);
  const [lightboxSrc, setLightboxSrc] = useState(null);

  const isTyping = !!typingUsers[selectedUser._id];

  useEffect(() => {
    getMessages(selectedUser._id);
  }, [selectedUser._id, getMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  if (isMessagesLoading) {
    return (
      <div className="flex flex-1 flex-col overflow-hidden">
        <ChatHeader />
        <MessageSkeleton />
        <MessageInput />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <ChatHeader />

      <div className="scroll-slim app-bg relative flex-1 space-y-1 overflow-y-auto px-3 py-4 sm:px-6">
        <div className="blobs" aria-hidden="true" />

        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <div className="grid size-20 place-items-center rounded-3xl bg-primary/10 text-4xl shadow-inner">
              👋
            </div>
            <div className="space-y-1.5">
              <p className="font-display text-xl font-bold tracking-tight">
                Say hi to {selectedUser.fullName}
              </p>
              <p className="max-w-xs text-sm text-base-content/55 leading-relaxed">
                This is the beginning of your conversation. Send a message to get started.
              </p>
            </div>
          </div>
        )}

        {messages.map((message, index) => {
          const isMine = message.senderId === authUser._id;
          const showDate = isNewDay(messages[index - 1]?.createdAt, message.createdAt);

          return (
            <div key={message._id}>
              {showDate && (
                <div className="my-5 flex justify-center">
                  <span className="chip text-[11px] font-semibold uppercase tracking-wider">
                    {formatDateSeparator(message.createdAt)}
                  </span>
                </div>
              )}

              <div
                className={`group flex items-end gap-2 ${isMine ? "flex-row-reverse" : "flex-row"}`}
              >
                {!isMine && (
                  <img
                    src={selectedUser.profilePic || "/avatar.png"}
                    alt={selectedUser.fullName}
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = "/avatar.png";
                    }}
                    className="size-8 shrink-0 rounded-full object-cover ring-2 ring-primary/15 shadow-sm"
                  />
                )}

                <div
                  className={`flex max-w-[75%] flex-col sm:max-w-[65%] ${
                    isMine ? "items-end" : "items-start"
                  }`}
                >
                  <div
                    className={`animate-bubble-in overflow-hidden px-3.5 py-2.5 shadow-sm ${
                      isMine
                        ? "bubble-sent rounded-2xl rounded-br-md"
                        : "bubble-recv rounded-2xl rounded-bl-md"
                    }`}
                  >
                    {message.image && (
                      <img
                        src={message.image}
                        alt="Attachment"
                        onClick={() => setLightboxSrc(message.image)}
                        loading="lazy"
                        className="mb-1.5 block h-auto w-auto max-h-80 max-w-[18rem] cursor-zoom-in rounded-xl object-contain"
                      />
                    )}
                    {message.text && (
                      <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">
                        {message.text}
                      </p>
                    )}
                  </div>

                  <div
                    className={`mt-1 flex items-center gap-1 px-1 text-[11px] text-base-content/45 ${
                      isMine ? "flex-row-reverse" : ""
                    }`}
                  >
                    <time>{formatMessageTime(message.createdAt)}</time>
                    {isMine &&
                      (message.seen ? (
                        <CheckCheck className="size-3.5 text-primary" />
                      ) : (
                        <Check className="size-3.5" />
                      ))}
                    {isMine && (
                      <button
                        onClick={() => deleteMessage(message._id)}
                        className="opacity-0 transition-opacity hover:text-error group-hover:opacity-100"
                        aria-label="Delete message"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Live typing bubble */}
        {isTyping && (
          <div className="flex items-end gap-2">
            <img
              src={selectedUser.profilePic || "/avatar.png"}
              alt={selectedUser.fullName}
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = "/avatar.png";
              }}
              className="size-8 shrink-0 rounded-full object-cover ring-2 ring-primary/15 shadow-sm"
            />
            <div className="bubble-recv flex items-center gap-1 rounded-2xl rounded-bl-md px-4 py-3">
              {["0ms", "150ms", "300ms"].map((delay) => (
                <span
                  key={delay}
                  className="size-2 animate-bounce rounded-full bg-base-content/40"
                  style={{ animationDelay: delay, animationDuration: "1s" }}
                />
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <MessageInput />

      {/* Image lightbox */}
      {lightboxSrc && (
        <div
          onClick={() => setLightboxSrc(null)}
          className="fixed inset-0 z-50 flex animate-scale-in cursor-zoom-out items-center justify-center bg-black/80 p-6 backdrop-blur-sm"
        >
          <img
            src={lightboxSrc}
            alt="Attachment preview"
            className="max-h-[90vh] max-w-full rounded-2xl shadow-2xl"
          />
        </div>
      )}
    </div>
  );
};

export default ChatContainer;
