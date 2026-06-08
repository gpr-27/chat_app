import { create } from "zustand";
import toast from "react-hot-toast";
import { useAuthStore } from "./useAuthStore";
import { useChatStore } from "./useChatStore";
import config from "../config/index.js";

// ICE servers (STUN, and optional TURN for strict/corporate firewalls) come
// entirely from configuration — see VITE_STUN_URLS / VITE_TURN_* in .env.
const ICE_CONFIG = { iceServers: config.webrtc.iceServers };

const CALL_EVENTS = [
  "call:incoming",
  "call:answered",
  "call:ice",
  "call:rejected",
  "call:ended",
  "call:busy",
  "call:unavailable",
];

const getSocket = () => useAuthStore.getState().socket;

// getUserMedia (camera/mic) is only available in a secure context: HTTPS or
// http://localhost. Over plain HTTP on a LAN IP it's undefined and throws a
// confusing generic error, so guard with an actionable message up front.
const hasMediaSupport = () => Boolean(navigator.mediaDevices?.getUserMedia);

const resolveUser = (userId) => {
  const user = useChatStore.getState().users.find((u) => u._id === userId);
  return user || { _id: userId, fullName: "Unknown", profilePic: "" };
};

export const useCallStore = create((set, get) => ({
  callStatus: "idle", // "idle" | "calling" | "ringing" | "connected"
  callType: null, // "audio" | "video"
  otherUser: null, // { _id, fullName, profilePic }
  localStream: null,
  remoteStream: null,
  isMuted: false,
  isCameraOff: false,

  // ── device selection ────────────────────────────────────────────────────
  devices: { mics: [], speakers: [], cameras: [] },
  audioInputId: null, // selected microphone
  audioOutputId: null, // selected speaker (null → system default)
  videoInputId: null, // selected camera
  // Bumped whenever localStream's tracks are swapped (device change) so the UI
  // re-attaches the (unchanged-by-reference) stream to its <video> element.
  streamEpoch: 0,

  // internal (not for UI): the RTCPeerConnection, the pending incoming offer,
  // and ICE candidates that arrived before the remote description was set.
  _peer: null,
  _incomingOffer: null,
  _pendingCandidates: [],

  // ── internal helpers ────────────────────────────────────────────────────
  _createPeer: (remoteUserId) => {
    const socket = getSocket();
    // iceCandidatePoolSize pre-gathers candidates so the connection forms a bit
    // faster once signaling completes.
    const peer = new RTCPeerConnection({ ...ICE_CONFIG, iceCandidatePoolSize: 10 });

    peer.onicecandidate = (event) => {
      if (event.candidate) {
        socket?.emit("call:ice", { to: remoteUserId, candidate: event.candidate });
      }
    };

    peer.ontrack = (event) => {
      set({ remoteStream: event.streams[0] });
    };

    // Only tear down on TERMINAL states. "disconnected" is frequently transient
    // (a brief network blip on mobile) and recovers on its own — tearing the
    // call down there would drop perfectly recoverable calls.
    peer.onconnectionstatechange = () => {
      if (["failed", "closed"].includes(peer.connectionState)) {
        if (get().callStatus !== "idle") get()._cleanup();
      }
    };

    // If ICE fails outright, ask the browser to restart it (re-gather candidates,
    // including relayed TURN paths) before giving up.
    peer.oniceconnectionstatechange = () => {
      if (peer.iceConnectionState === "failed") {
        try {
          peer.restartIce?.();
        } catch {
          // best effort
        }
      }
    };

    return peer;
  },

  _flushCandidates: async () => {
    const { _peer, _pendingCandidates } = get();
    if (!_peer) return;
    for (const candidate of _pendingCandidates) {
      try {
        await _peer.addIceCandidate(new RTCIceCandidate(candidate));
      } catch {
        // ignore candidates that fail to apply
      }
    }
    set({ _pendingCandidates: [] });
  },

  _cleanup: () => {
    const { _peer, localStream } = get();
    localStream?.getTracks().forEach((track) => track.stop());
    if (_peer) {
      _peer.onicecandidate = null;
      _peer.ontrack = null;
      _peer.onconnectionstatechange = null;
      _peer.oniceconnectionstatechange = null;
      _peer.close();
    }
    set({
      callStatus: "idle",
      callType: null,
      otherUser: null,
      localStream: null,
      remoteStream: null,
      isMuted: false,
      isCameraOff: false,
      audioInputId: null,
      videoInputId: null,
      streamEpoch: 0,
      _peer: null,
      _incomingOffer: null,
      _pendingCandidates: [],
      // audioOutputId / devices are kept as a cross-call user preference.
    });
  },

  // ── outgoing call ─────────────────────────────────────────────────────
  initiateCall: async (user, type) => {
    const socket = getSocket();
    if (!socket) return toast.error("Not connected");
    if (get().callStatus !== "idle") return;
    if (!hasMediaSupport()) {
      return toast.error("Calls need a secure connection (HTTPS or localhost).");
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === "video",
      });

      const peer = get()._createPeer(user._id);
      stream.getTracks().forEach((track) => peer.addTrack(track, stream));

      set({
        localStream: stream,
        _peer: peer,
        otherUser: { _id: user._id, fullName: user.fullName, profilePic: user.profilePic },
        callType: type,
        callStatus: "calling",
        isMuted: false,
        isCameraOff: false,
        audioInputId: stream.getAudioTracks()[0]?.getSettings().deviceId || null,
        videoInputId: stream.getVideoTracks()[0]?.getSettings().deviceId || null,
      });
      get().loadDevices();

      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      socket.emit("call:offer", { to: user._id, offer, callType: type });
    } catch (error) {
      console.log("initiateCall error:", error?.message);
      toast.error("Could not access your camera/microphone");
      get()._cleanup();
    }
  },

  // ── answering ───────────────────────────────────────────────────────────
  acceptCall: async () => {
    const socket = getSocket();
    const { otherUser, _incomingOffer, callType } = get();
    if (!socket || !otherUser || !_incomingOffer) return;
    if (!hasMediaSupport()) {
      toast.error("Calls need a secure connection (HTTPS or localhost).");
      socket.emit("call:reject", { to: otherUser._id });
      get()._cleanup();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callType === "video",
      });

      const peer = get()._createPeer(otherUser._id);
      stream.getTracks().forEach((track) => peer.addTrack(track, stream));

      await peer.setRemoteDescription(new RTCSessionDescription(_incomingOffer));
      set({
        _peer: peer,
        localStream: stream,
        audioInputId: stream.getAudioTracks()[0]?.getSettings().deviceId || null,
        videoInputId: stream.getVideoTracks()[0]?.getSettings().deviceId || null,
      });
      get().loadDevices();
      await get()._flushCandidates();

      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      socket.emit("call:answer", { to: otherUser._id, answer });

      set({ callStatus: "connected", _incomingOffer: null });
    } catch (error) {
      console.log("acceptCall error:", error?.message);
      toast.error("Could not access your camera/microphone");
      socket.emit("call:reject", { to: get().otherUser?._id });
      get()._cleanup();
    }
  },

  rejectCall: () => {
    const socket = getSocket();
    const { otherUser } = get();
    if (otherUser) socket?.emit("call:reject", { to: otherUser._id });
    get()._cleanup();
  },

  // Used to hang up an active or ringing-out call.
  endCall: () => {
    const socket = getSocket();
    const { otherUser } = get();
    if (otherUser) socket?.emit("call:end", { to: otherUser._id });
    get()._cleanup();
  },

  toggleMute: () => {
    const { localStream, isMuted } = get();
    localStream?.getAudioTracks().forEach((track) => (track.enabled = isMuted));
    set({ isMuted: !isMuted });
  },

  toggleCamera: () => {
    const { localStream, isCameraOff } = get();
    localStream?.getVideoTracks().forEach((track) => (track.enabled = isCameraOff));
    set({ isCameraOff: !isCameraOff });
  },

  // ── device selection ────────────────────────────────────────────────────
  // Enumerate available mics / speakers / cameras. Labels are only populated
  // once getUserMedia permission has been granted, so call this after a call
  // has acquired its local stream.
  loadDevices: async () => {
    try {
      const list = await navigator.mediaDevices.enumerateDevices();
      set({
        devices: {
          mics: list.filter((d) => d.kind === "audioinput"),
          speakers: list.filter((d) => d.kind === "audiooutput"),
          cameras: list.filter((d) => d.kind === "videoinput"),
        },
      });
    } catch (error) {
      console.log("loadDevices error:", error?.message);
    }
  },

  // Speaker is an output-only choice — applied by the <audio> element's
  // setSinkId in the UI, so we just remember the selection here.
  setAudioOutput: (deviceId) => set({ audioOutputId: deviceId }),

  // Switch microphone mid-call: grab a track from the chosen device, swap it
  // into the peer connection (no renegotiation) and into the local stream.
  setAudioInput: async (deviceId) => {
    const { _peer, localStream, isMuted } = get();
    if (!localStream) return set({ audioInputId: deviceId });
    try {
      const ns = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: { exact: deviceId } },
      });
      const newTrack = ns.getAudioTracks()[0];
      newTrack.enabled = !isMuted;

      const sender = _peer?.getSenders().find((s) => s.track?.kind === "audio");
      if (sender) await sender.replaceTrack(newTrack);

      localStream.getAudioTracks().forEach((t) => {
        localStream.removeTrack(t);
        t.stop();
      });
      localStream.addTrack(newTrack);

      set({ audioInputId: deviceId, streamEpoch: get().streamEpoch + 1 });
    } catch (error) {
      console.log("setAudioInput error:", error?.message);
      toast.error("Could not switch microphone");
    }
  },

  // Switch camera mid-call (video calls only).
  setVideoInput: async (deviceId) => {
    const { _peer, localStream, isCameraOff } = get();
    if (!localStream) return set({ videoInputId: deviceId });
    try {
      const ns = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: deviceId } },
      });
      const newTrack = ns.getVideoTracks()[0];
      newTrack.enabled = !isCameraOff;

      const sender = _peer?.getSenders().find((s) => s.track?.kind === "video");
      if (sender) await sender.replaceTrack(newTrack);

      localStream.getVideoTracks().forEach((t) => {
        localStream.removeTrack(t);
        t.stop();
      });
      localStream.addTrack(newTrack);

      set({ videoInputId: deviceId, streamEpoch: get().streamEpoch + 1 });
    } catch (error) {
      console.log("setVideoInput error:", error?.message);
      toast.error("Could not switch camera");
    }
  },

  // ── socket wiring ─────────────────────────────────────────────────────
  subscribeToCallEvents: () => {
    const socket = getSocket();
    if (!socket) return;
    CALL_EVENTS.forEach((event) => socket.off(event));

    socket.on("call:incoming", ({ from, offer, callType }) => {
      // Already busy → tell the caller we're on another call (accurate toast)
      // instead of a generic "declined".
      if (get().callStatus !== "idle") {
        socket.emit("call:busy", { to: from });
        return;
      }
      set({
        callStatus: "ringing",
        callType,
        otherUser: resolveUser(from),
        _incomingOffer: offer,
      });
    });

    socket.on("call:answered", async ({ answer }) => {
      const peer = get()._peer;
      if (!peer) return;
      try {
        await peer.setRemoteDescription(new RTCSessionDescription(answer));
        await get()._flushCandidates();
        set({ callStatus: "connected" });
      } catch (error) {
        console.log("call:answered error:", error?.message);
      }
    });

    socket.on("call:ice", async ({ candidate }) => {
      const peer = get()._peer;
      if (peer?.remoteDescription?.type) {
        try {
          await peer.addIceCandidate(new RTCIceCandidate(candidate));
        } catch {
          // ignore
        }
      } else {
        set((state) => ({ _pendingCandidates: [...state._pendingCandidates, candidate] }));
      }
    });

    socket.on("call:rejected", () => {
      toast(`${get().otherUser?.fullName || "User"} declined the call`);
      get()._cleanup();
    });

    socket.on("call:busy", () => {
      toast(`${get().otherUser?.fullName || "User"} is on another call`);
      get()._cleanup();
    });

    socket.on("call:unavailable", () => {
      toast.error(`${get().otherUser?.fullName || "User"} is offline`);
      get()._cleanup();
    });

    socket.on("call:ended", () => {
      if (get().callStatus !== "idle") {
        toast("Call ended");
        get()._cleanup();
      }
    });
  },

  unsubscribeFromCallEvents: () => {
    const socket = getSocket();
    if (!socket) return;
    CALL_EVENTS.forEach((event) => socket.off(event));
  },
}));
