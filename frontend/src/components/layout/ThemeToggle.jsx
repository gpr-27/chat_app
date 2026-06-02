import { Moon, Sun } from "lucide-react";
import { useThemeStore } from "../../store/useThemeStore";

// Animated sun/moon toggle. `variant="floating"` gives it a frosted glass
// pill so it reads well on the auth pages (which have no navbar).
const ThemeToggle = ({ variant = "ghost", className = "" }) => {
  const { theme, toggleTheme } = useThemeStore();
  const isDark = theme === "dark";

  // The floating variant must be `fixed` (it's offset with right-4/top-4 by the
  // caller); the navbar variant is `relative`. Both give the absolutely-
  // positioned sun/moon icons a positioning context. (Hardcoding `relative`
  // here previously overrode the caller's `fixed`, collapsing it to top-left.)
  const position = variant === "floating" ? "fixed" : "relative";
  const base =
    variant === "floating"
      ? "glass shadow-soft hover:scale-105"
      : "hover:bg-base-content/10";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={`${position} grid size-10 place-items-center overflow-hidden rounded-full text-base-content/70 transition-all duration-200 active:scale-90 ${base} ${className}`}
    >
      {/* Sun (light mode) */}
      <Sun
        className={`absolute size-5 text-amber-500 transition-all duration-300 ${
          isDark ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"
        }`}
        strokeWidth={2.25}
      />
      {/* Moon (dark mode) */}
      <Moon
        className={`absolute size-5 text-primary transition-all duration-300 ${
          isDark ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0"
        }`}
        strokeWidth={2.25}
      />
    </button>
  );
};

export default ThemeToggle;
