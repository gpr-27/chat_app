const MessageSkeleton = () => {
  const skeletonMessages = Array(6).fill(null);

  return (
    <div className="scroll-slim flex-1 space-y-4 overflow-y-auto px-3 py-4 sm:px-6">
      {skeletonMessages.map((_, idx) => {
        const isMine = idx % 2 === 1;
        return (
          <div
            key={idx}
            className={`flex items-end gap-2 ${isMine ? "flex-row-reverse" : "flex-row"}`}
          >
            {!isMine && (
              <div className="skeleton size-8 shrink-0 rounded-full ring-2 ring-primary/10" />
            )}
            <div className={`flex flex-col gap-1 ${isMine ? "items-end" : "items-start"}`}>
              <div
                className={`skeleton rounded-2xl ${
                  isMine ? "rounded-br-md" : "rounded-bl-md"
                } h-14 ${idx % 3 === 0 ? "w-52" : "w-40"}`}
              />
              <div className={`skeleton h-2.5 w-12 rounded-full ${isMine ? "self-end" : ""}`} />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default MessageSkeleton;
