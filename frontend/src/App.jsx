import { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Loader } from "lucide-react";
import { Toaster } from "react-hot-toast";
import { useAuth, useUser } from "@clerk/clerk-react";

import Navbar from "./components/layout/Navbar";
import ThemeToggle from "./components/layout/ThemeToggle";
import IncomingCallModal from "./components/call/IncomingCallModal";
import CallOverlay from "./components/call/CallOverlay";

import HomePage from "./pages/HomePage";
import ProfilePage from "./pages/ProfilePage";
import SignInPage from "./pages/SignInPage";

import { useAuthStore } from "./store/useAuthStore";
import { useChatStore } from "./store/useChatStore";
import { useCallStore } from "./store/useCallStore";
import { useThemeStore } from "./store/useThemeStore";

const Spinner = () => (
  <div className="app-bg flex h-screen items-center justify-center">
    <div className="blobs" aria-hidden="true" />
    <Loader className="size-10 animate-spin text-primary" />
  </div>
);

// Shown when a Clerk account is signed in but the app can't reach its backend.
const SyncErrorScreen = ({ error, onRetry }) => (
  <div className="app-bg flex h-screen items-center justify-center px-6">
    <div className="blobs" aria-hidden="true" />
    <div className="glass-card relative z-10 w-full max-w-sm rounded-3xl p-8 text-center">
      <h2 className="font-display text-lg font-bold">Can&apos;t load your chats</h2>
      <p className="mt-2 text-sm text-base-content/60">{error}</p>
      <button
        onClick={onRetry}
        className="btn-grad mt-5 h-11 w-full rounded-2xl font-semibold text-white"
      >
        Retry
      </button>
    </div>
  </div>
);

const App = () => {
  // Clerk owns account auth; the store also supports anonymous guest sessions.
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const {
    authUser,
    syncUser,
    syncError,
    restoreGuest,
    migrateGuestIfNeeded,
  } = useAuthStore();
  const { subscribeToMessages, unsubscribeFromMessages } = useChatStore();
  const { subscribeToCallEvents, unsubscribeFromCallEvents } = useCallStore();
  const { initTheme } = useThemeStore();

  const [booting, setBooting] = useState(true);
  const isGuest = !!authUser?.isGuest;

  const clerkProfile = {
    fullName: user?.fullName || user?.firstName || user?.username || "",
    email: user?.primaryEmailAddress?.emailAddress || "",
    profilePic: user?.imageUrl || "",
  };

  // Re-assert the persisted theme on the DOM (safety net for the no-flash script).
  useEffect(() => {
    initTheme();
  }, [initTheme]);

  // Resolve the session on startup / when Clerk auth changes:
  //  - Clerk signed in  → migrate any guest data, then sync the account.
  //  - otherwise        → try to restore a guest session from localStorage.
  useEffect(() => {
    if (!isLoaded) return;
    let cancelled = false;
    (async () => {
      try {
        if (isSignedIn) {
          await migrateGuestIfNeeded();
          await syncUser(clerkProfile);
        } else {
          await restoreGuest();
        }
      } finally {
        if (!cancelled) setBooting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, isSignedIn, user?.id]);

  // One global subscription drives live messages, typing, read receipts, deletes,
  // and call signaling — for accounts and guests alike.
  useEffect(() => {
    if (!authUser) return;
    subscribeToMessages();
    subscribeToCallEvents();
    return () => {
      unsubscribeFromMessages();
      unsubscribeFromCallEvents();
    };
  }, [
    authUser,
    subscribeToMessages,
    unsubscribeFromMessages,
    subscribeToCallEvents,
    unsubscribeFromCallEvents,
  ]);

  let content;
  if (!isLoaded || booting) {
    content = <Spinner />;
  } else if (authUser) {
    content = (
      <>
        <Navbar />
        <Routes>
          <Route path="/" element={<HomePage />} />
          {/* Guests can't manage a profile — bounce them home. */}
          <Route path="/profile" element={isGuest ? <Navigate to="/" /> : <ProfilePage />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
        <IncomingCallModal />
        <CallOverlay />
      </>
    );
  } else if (isSignedIn && syncError) {
    content = <SyncErrorScreen error={syncError} onRetry={() => syncUser(clerkProfile)} />;
  } else {
    content = (
      <>
        <ThemeToggle variant="floating" className="right-4 top-4 z-50" />
        <SignInPage />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-base-200 font-sans text-base-content">
      {content}

      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: "var(--toast-bg)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            color: "var(--toast-color)",
            border: "1px solid var(--toast-border)",
            borderRadius: "1rem",
            fontWeight: 600,
            boxShadow: "var(--toast-shadow)",
          },
        }}
      />
    </div>
  );
};

export default App;
