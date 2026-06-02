import { Phone, PhoneOff, Video } from "lucide-react";
import { useCallStore } from "../../store/useCallStore";

const IncomingCallModal = () => {
  const { callStatus, callType, otherUser, acceptCall, rejectCall } = useCallStore();

  if (callStatus !== "ringing") return null;

  const isVideo = callType === "video";
  const callerName = otherUser?.fullName ?? "Unknown";
  const callerPic = otherUser?.profilePic || "/avatar.png";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-base-content/40 backdrop-blur-sm animate-fade-in-up">
      <div className="glass-card rounded-3xl max-w-sm w-full mx-4 p-8 text-center animate-scale-in">

        {/* Avatar with pulsing ring */}
        <div className="relative flex items-center justify-center mb-6">
          {/* Outer pulse ring */}
          <span className="absolute size-32 rounded-full bg-primary/20 animate-ping" />
          {/* Inner pulse ring */}
          <span className="absolute size-28 rounded-full bg-primary/15 animate-pulse" />
          {/* Avatar */}
          <img
            src={callerPic}
            alt={callerName}
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = "/avatar.png";
            }}
            className="relative size-24 rounded-full object-cover ring-4 ring-primary/30 shadow-lg z-10"
          />
        </div>

        {/* Caller name */}
        <h2 className="font-display text-2xl font-bold text-base-content mb-1">
          {callerName}
        </h2>

        {/* Subtitle + call-type chip */}
        <p className="text-base-content/55 text-sm mb-2">
          Incoming {isVideo ? "video" : "voice"} call…
        </p>

        <div className="flex justify-center mb-8">
          <span className="chip flex items-center gap-1.5 text-xs">
            {isVideo ? <Video className="size-3.5" /> : <Phone className="size-3.5" />}
            {isVideo ? "Video" : "Voice"}
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex items-end justify-center gap-10">
          {/* Decline */}
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={rejectCall}
              aria-label="Decline call"
              className="size-14 rounded-full bg-error text-error-content grid place-items-center shadow-lg transition-transform active:scale-95 hover:opacity-90"
            >
              <PhoneOff className="size-6" />
            </button>
            <span className="text-xs text-base-content/55">Decline</span>
          </div>

          {/* Accept */}
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={acceptCall}
              aria-label="Accept call"
              className="size-14 rounded-full bg-success text-success-content grid place-items-center shadow-lg transition-transform active:scale-95 hover:opacity-90 animate-bounce"
            >
              {isVideo ? <Video className="size-6" /> : <Phone className="size-6" />}
            </button>
            <span className="text-xs text-base-content/55">Accept</span>
          </div>
        </div>

      </div>
    </div>
  );
};

export default IncomingCallModal;
