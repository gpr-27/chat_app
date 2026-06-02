import { Link } from "react-router-dom";
import { MessageSquare, User, LogOut } from "lucide-react";
import { UserButton, SignUpButton } from "@clerk/clerk-react";
import ThemeToggle from "./ThemeToggle";
import { useAuthStore } from "../../store/useAuthStore";

// Rendered only when authed (account or guest).
const Navbar = () => {
  const { authUser, exitGuest } = useAuthStore();
  const isGuest = !!authUser?.isGuest;

  return (
    <header className="glass fixed top-0 z-40 w-full border-b border-base-content/10">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Brand */}
        <Link to="/" className="group flex items-center gap-3">
          <div className="relative grid size-9 place-items-center rounded-xl bg-gradient-to-br from-primary to-secondary text-primary-content shadow-lg shadow-primary/25 transition-transform group-hover:-rotate-6">
            <MessageSquare className="size-5" strokeWidth={2.5} />
          </div>
          <div className="leading-none">
            <h1 className="font-display text-xl font-bold tracking-tight">Chatty</h1>
            <p className="hidden text-[11px] font-medium text-base-content/50 sm:block">
              realtime messaging
            </p>
          </div>
        </Link>

        {/* Right actions */}
        <nav className="flex items-center gap-1.5">
          <ThemeToggle />

          {isGuest ? (
            <>
              <span className="chip hidden sm:inline-flex">Guest</span>
              {/* CTA: create an account to permanently save & sync work */}
              <SignUpButton mode="modal">
                <button
                  title="Create an account to permanently save and sync your work"
                  className="btn-grad h-9 rounded-full px-4 text-sm font-semibold text-white"
                >
                  <span className="sm:hidden">Save work</span>
                  <span className="hidden sm:inline">Create account</span>
                </button>
              </SignUpButton>
              <button
                onClick={exitGuest}
                className="btn btn-ghost btn-sm gap-2 rounded-full font-medium text-error/80 hover:bg-error/10 hover:text-error"
                aria-label="Exit guest session"
                title="Exit guest session"
              >
                <LogOut className="size-4" />
                <span className="hidden sm:inline">Exit</span>
              </button>
            </>
          ) : (
            <>
              <Link
                to="/profile"
                className="btn btn-ghost btn-sm gap-2 rounded-full font-medium"
              >
                <User className="size-4" />
                <span className="hidden sm:inline">Profile</span>
              </Link>
              {/* Clerk account menu (includes sign-out) */}
              <UserButton afterSignOutUrl="/" />
            </>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
