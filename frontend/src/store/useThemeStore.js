import { create } from "zustand";

// Two daisyUI themes back the light/dark experience (see tailwind.config.js).
const THEMES = { light: "pastel-glass", dark: "pastel-night" };
// Matches the <head> no-flash script in index.html so the store and the
// pre-React paint always agree on the active theme.
const STORAGE_KEY = "chat-theme";
const PAGE_BG = { light: "#F4F3FA", dark: "#14111F" };

const getInitialMode = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    // localStorage unavailable (private mode / SSR) — fall through to OS pref.
  }
  if (typeof window !== "undefined" && window.matchMedia) {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return "light";
};

const applyMode = (mode) => {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", THEMES[mode]);
  document.documentElement.style.colorScheme = mode;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", PAGE_BG[mode]);
};

export const useThemeStore = create((set, get) => ({
  // "light" | "dark"
  theme: getInitialMode(),

  // Re-assert the DOM state from the store (called once on app mount as a
  // safety net in case the inline <head> script was blocked).
  initTheme: () => applyMode(get().theme),

  setTheme: (mode) => {
    if (mode !== "light" && mode !== "dark") return;
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // ignore persistence failures
    }
    applyMode(mode);
    set({ theme: mode });
  },

  toggleTheme: () => {
    get().setTheme(get().theme === "dark" ? "light" : "dark");
  },
}));
