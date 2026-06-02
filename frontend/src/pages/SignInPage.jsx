import { SignInButton, SignUpButton } from "@clerk/clerk-react";
import { MessageSquare, Zap, Phone, Lock, UserRound } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";

const FEATURES = [
  { icon: Zap, label: "Realtime" },
  { icon: Phone, label: "Voice & video" },
  { icon: Lock, label: "Private" },
];

// Signed-out screen. Account auth is Clerk's prebuilt modal flows; guests get an
// anonymous, persisted session via "Continue as guest".
const SignInPage = () => {
  const { continueAsGuest, isSyncingUser } = useAuthStore();

  return (
    <div className="app-bg relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="blobs blobs--mint" aria-hidden="true" />

      {/* Soft glow behind the card for depth */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 size-[30rem] max-w-[92vw] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-70 blur-[90px]"
        style={{
          background:
            "radial-gradient(circle, rgba(124,108,240,0.45), rgba(255,158,128,0.22) 55%, transparent 72%)",
        }}
        aria-hidden="true"
      />

      <div className="glass-card relative z-10 w-full max-w-md rounded-[1.75rem] p-7 text-center animate-fade-in-up sm:rounded-[2rem] sm:p-10">
        {/* Logo with a soft gradient halo */}
        <div className="relative mx-auto mb-6 w-fit">
          <div
            className="absolute inset-0 -z-10 rounded-[1.4rem] bg-gradient-to-br from-primary to-secondary opacity-60 blur-xl"
            aria-hidden="true"
          />
          <div className="grid size-16 place-items-center rounded-[1.4rem] bg-gradient-to-br from-[#8b7bff] to-[#ff9e80] text-white shadow-lg shadow-primary/30">
            <MessageSquare className="size-8" strokeWidth={2.5} />
          </div>
        </div>

        <h1 className="font-display text-4xl font-extrabold tracking-tight">
          <span className="bg-gradient-to-r from-[#8b7bff] via-[#b9a4ff] to-[#ff9e80] bg-clip-text text-transparent">
            Chatty
          </span>
        </h1>
        <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-base-content/60">
          Real-time messaging with voice &amp; video. Sign in, or jump straight in as a guest.
        </p>

        {/* Feature chips */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {FEATURES.map(({ icon: Icon, label }) => (
            <span
              key={label}
              className="inline-flex items-center gap-1.5 rounded-full border border-base-content/10 bg-base-content/5 px-3 py-1 text-xs font-semibold text-base-content/70"
            >
              <Icon className="size-3.5 text-primary" />
              {label}
            </span>
          ))}
        </div>

        {/* Actions */}
        <div className="mt-8 flex flex-col gap-3">
          <SignInButton mode="modal">
            <button className="btn-grad h-12 w-full rounded-2xl text-base font-bold">
              Sign in
            </button>
          </SignInButton>
          <SignUpButton mode="modal">
            <button className="h-12 w-full rounded-2xl border border-base-content/15 bg-base-content/5 font-semibold text-base-content/80 transition-colors hover:bg-base-content/10">
              Create an account
            </button>
          </SignUpButton>

          <div className="my-1 flex items-center gap-3 text-xs font-semibold text-base-content/35">
            <span className="h-px flex-1 bg-base-content/10" />
            OR
            <span className="h-px flex-1 bg-base-content/10" />
          </div>

          <button
            onClick={continueAsGuest}
            disabled={isSyncingUser}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-base-content/25 font-semibold text-base-content/70 transition-colors hover:bg-base-content/5 disabled:opacity-50"
          >
            <UserRound className="size-4" />
            {isSyncingUser ? "Starting…" : "Continue as guest"}
          </button>
        </div>

        <p className="mx-auto mt-4 max-w-xs text-xs text-base-content/40">
          Guest chats are saved for 30 days. Create an account to keep them forever and sync across devices.
        </p>
      </div>
    </div>
  );
};

export default SignInPage;
