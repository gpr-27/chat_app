import { useEffect, useRef, useState } from "react";
import {
  Mic,
  MicOff,
  PhoneOff,
  Settings,
  Video,
  VideoOff,
  Volume2,
} from "lucide-react";
import { useCallStore } from "../../store/useCallStore";

// Picking the audio output device (speaker) is only possible where the
// HTMLMediaElement.setSinkId API exists (Chromium-based browsers).
const canChooseSpeaker =
  typeof window !== "undefined" &&
  !!window.HTMLMediaElement &&
  "setSinkId" in window.HTMLMediaElement.prototype;

const CallOverlay = () => {
  const {
    callStatus,
    callType,
    otherUser,
    localStream,
    remoteStream,
    isMuted,
    isCameraOff,
    streamEpoch,
    devices,
    audioInputId,
    audioOutputId,
    videoInputId,
    iceDiag,
    endCall,
    toggleMute,
    toggleCamera,
    loadDevices,
    setAudioInput,
    setAudioOutput,
    setVideoInput,
  } = useCallStore();

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const [showDevices, setShowDevices] = useState(false);

  // Attach the local preview. streamEpoch forces a re-attach when a track is
  // swapped in place by a device change (the stream reference is unchanged).
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, streamEpoch]);

  // Attach remote video. Re-attach + play() on every track add/remove: the
  // remote VIDEO track frequently arrives just AFTER the audio track (a late
  // addtrack on the same MediaStream), and some browsers (Safari/iOS) won't
  // start rendering a late-added track on an already-attached element unless
  // srcObject is reassigned. Relying on the `autoPlay` attribute alone also
  // isn't enough when srcObject is set programmatically — so call play()
  // explicitly. This is what fixes the receiver showing a black remote video
  // even though the track is healthy and flowing.
  useEffect(() => {
    const el = remoteVideoRef.current;
    if (!el || !remoteStream) return;

    const attach = () => {
      el.srcObject = remoteStream;
      el.play?.().catch(() => {});
    };
    attach();

    remoteStream.addEventListener?.("addtrack", attach);
    remoteStream.addEventListener?.("removetrack", attach);
    return () => {
      remoteStream.removeEventListener?.("addtrack", attach);
      remoteStream.removeEventListener?.("removetrack", attach);
    };
  }, [remoteStream]);

  // Remote audio plays through a dedicated, always-mounted <audio> sink so it
  // works for both audio and video calls and can be routed to a chosen speaker.
  // Mobile browsers often block autoplay of a media element, which is a common
  // reason "the other phone has no sound" — so if play() is rejected we retry
  // once on the next user interaction (which is always allowed).
  useEffect(() => {
    const el = remoteAudioRef.current;
    if (!el || !remoteStream) return;

    el.srcObject = remoteStream;

    const tryPlay = () => el.play?.().catch(() => {});
    tryPlay();

    const resumeOnGesture = () => tryPlay();
    document.addEventListener("click", resumeOnGesture, { once: true });
    document.addEventListener("touchend", resumeOnGesture, { once: true });

    return () => {
      document.removeEventListener("click", resumeOnGesture);
      document.removeEventListener("touchend", resumeOnGesture);
    };
  }, [remoteStream]);

  // Route remote audio to the selected speaker.
  useEffect(() => {
    const el = remoteAudioRef.current;
    if (el && audioOutputId && typeof el.setSinkId === "function") {
      el.setSinkId(audioOutputId).catch(() => {});
    }
  }, [audioOutputId, remoteStream]);

  // Tidy the panel when the call goes away.
  useEffect(() => {
    if (callStatus === "idle") setShowDevices(false);
  }, [callStatus]);

  if (callStatus !== "calling" && callStatus !== "connected") return null;

  const statusLabel = callStatus === "calling" ? "Calling…" : "Connected";
  const showRemotePlaceholder =
    callType === "video" && (callStatus === "calling" || !remoteStream);

  const openDevicePanel = () => {
    loadDevices();
    setShowDevices((v) => !v);
  };

  return (
    <div className="fixed inset-0 z-[60] animate-scale-in overflow-hidden">
      {/* Dark stage background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#1b1830] via-[#241f3d] to-[#3a2540]" />

      {/* Remote audio sink (always mounted; remote <video> stays muted) */}
      <audio ref={remoteAudioRef} autoPlay className="hidden" />

      {/* ── VIDEO layout ─────────────────────────────────────────────────── */}
      {callType === "video" && (
        <>
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 h-full w-full bg-black object-cover"
          />

          {/* Placeholder layered over the (black) remote video until it arrives */}
          {showRemotePlaceholder && (
            <div className="absolute inset-0 flex animate-fade-in-up flex-col items-center justify-center gap-4 px-6 text-center">
              <Avatar user={otherUser} className="size-24 sm:size-28 md:size-32 ring-4 ring-white/20" />
              <p className="font-display text-xl text-white sm:text-2xl">
                {otherUser?.fullName}
              </p>
              <p className="text-sm tracking-wide text-white/60">{statusLabel}</p>
            </div>
          )}

          {/* Local PiP — top-right on phones (clears the controls), bottom-right on larger screens */}
          <div className="absolute right-3 top-16 aspect-[3/4] w-24 overflow-hidden rounded-2xl shadow-xl ring-2 ring-white/20 sm:bottom-28 sm:right-4 sm:top-auto sm:w-32 md:w-40">
            {isCameraOff || !localStream ? (
              <div className="grid h-full w-full place-items-center bg-white/10 backdrop-blur">
                <VideoOff className="size-7 text-white/50 sm:size-8" />
              </div>
            ) : (
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="h-full w-full scale-x-[-1] object-cover"
              />
            )}
          </div>
        </>
      )}

      {/* ── AUDIO layout ─────────────────────────────────────────────────── */}
      {callType === "audio" && (
        <div className="absolute inset-0 flex animate-fade-in-up flex-col items-center justify-center gap-5 px-6 text-center">
          <Avatar
            user={otherUser}
            className="size-28 animate-pulse ring-4 ring-primary/50 sm:size-32 md:size-36"
          />
          <p className="font-display text-2xl text-white sm:text-3xl">
            {otherUser?.fullName}
          </p>
          <p className="text-sm tracking-wide text-white/60">{statusLabel}</p>
        </div>
      )}

      {/* ── Status line near the top ─────────────────────────────────────── */}
      <div className="pointer-events-none absolute inset-x-0 top-5 flex justify-center px-4 sm:top-6">
        <span className="max-w-[90%] truncate text-xs uppercase tracking-widest text-white/70 sm:text-sm">
          {otherUser?.fullName
            ? `${otherUser.fullName} · ${statusLabel}`
            : statusLabel}
        </span>
      </div>

      {/* Temporary connection diagnostic (remove after debugging one-way media) */}
      {iceDiag && (
        <div className="pointer-events-none absolute inset-x-0 top-11 flex justify-center px-4 sm:top-12">
          <span className="rounded-md bg-black/45 px-2 py-0.5 font-mono text-[10px] text-white/75 backdrop-blur">
            {iceDiag}
          </span>
        </div>
      )}

      {/* ── Device picker panel ──────────────────────────────────────────── */}
      {showDevices && (
        <div className="absolute inset-x-0 bottom-24 flex justify-center px-4 sm:bottom-28">
          <div className="glass-card max-h-[55vh] w-full max-w-sm space-y-3 overflow-y-auto rounded-2xl p-4">
            <DeviceSelect
              label="Microphone"
              icon={Mic}
              value={audioInputId}
              options={devices.mics}
              onChange={setAudioInput}
            />
            {callType === "video" && (
              <DeviceSelect
                label="Camera"
                icon={Video}
                value={videoInputId}
                options={devices.cameras}
                onChange={setVideoInput}
              />
            )}
            {canChooseSpeaker ? (
              <DeviceSelect
                label="Speaker"
                icon={Volume2}
                value={audioOutputId}
                options={devices.speakers}
                onChange={setAudioOutput}
                placeholder="System default"
              />
            ) : (
              <p className="flex items-center gap-2 text-xs text-white/50">
                <Volume2 className="size-3.5" />
                Speaker selection isn’t supported in this browser.
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Control bar ──────────────────────────────────────────────────── */}
      <div className="absolute inset-x-0 bottom-0 flex justify-center gap-3 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:gap-4">
        <ControlButton
          onClick={toggleMute}
          label={isMuted ? "Unmute" : "Mute"}
          active={isMuted}
        >
          {isMuted ? <MicOff className="size-5" /> : <Mic className="size-5" />}
        </ControlButton>

        {callType === "video" && (
          <ControlButton
            onClick={toggleCamera}
            label={isCameraOff ? "Turn camera on" : "Turn camera off"}
            active={isCameraOff}
          >
            {isCameraOff ? (
              <VideoOff className="size-5" />
            ) : (
              <Video className="size-5" />
            )}
          </ControlButton>
        )}

        <ControlButton
          onClick={openDevicePanel}
          label="Audio & video settings"
          active={showDevices}
        >
          <Settings className="size-5" />
        </ControlButton>

        <ControlButton onClick={endCall} label="End call" variant="danger">
          <PhoneOff className="size-5" />
        </ControlButton>
      </div>
    </div>
  );
};

// ── small presentational helpers ──────────────────────────────────────────

const Avatar = ({ user, className = "" }) => (
  <div className={`overflow-hidden rounded-full shadow-2xl ${className}`}>
    {user?.profilePic ? (
      <img
        src={user.profilePic}
        alt={user.fullName}
        onError={(e) => {
          e.currentTarget.onerror = null;
          e.currentTarget.src = "/avatar.png";
        }}
        className="h-full w-full object-cover"
      />
    ) : (
      <div className="grid h-full w-full place-items-center bg-primary/40 font-display text-4xl text-white">
        {user?.fullName?.[0] ?? "?"}
      </div>
    )}
  </div>
);

const ControlButton = ({ onClick, label, active, variant = "default", children }) => {
  const styles =
    variant === "danger"
      ? "bg-error text-error-content shadow-lg hover:opacity-90"
      : active
        ? "bg-white text-[#241f3d] shadow-lg"
        : "bg-white/15 text-white hover:bg-white/25";
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`grid size-12 place-items-center rounded-full backdrop-blur transition-all active:scale-95 sm:size-14 ${styles}`}
    >
      {children}
    </button>
  );
};

const DeviceSelect = ({ label, icon: Icon, value, options, onChange, placeholder }) => (
  <label className="block">
    <span className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-white/60">
      <Icon className="size-3.5" />
      {label}
    </span>
    <select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm text-white outline-none focus:border-white/40 [&>option]:text-black"
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((d, i) => (
        <option key={d.deviceId || i} value={d.deviceId}>
          {d.label || `${label} ${i + 1}`}
        </option>
      ))}
    </select>
  </label>
);

export default CallOverlay;
