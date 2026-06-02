import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ClerkProvider } from "@clerk/clerk-react";
// Imported first so configuration is loaded + validated before anything else
// (a missing VITE_* var — including the Clerk key — throws here with a clear message).
import config from "./config/index.js";
import { useThemeStore } from "./store/useThemeStore";
import { clerkAppearance } from "./lib/clerkAppearance";
import "./index.css";
import App from "./App.jsx";

// Wrapper so Clerk's modal/popover theming follows the live light/dark toggle.
const Root = () => {
  const theme = useThemeStore((state) => state.theme);
  return (
    <ClerkProvider
      publishableKey={config.clerk.publishableKey}
      afterSignOutUrl="/"
      appearance={clerkAppearance(theme)}
    >
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ClerkProvider>
  );
};

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Root />
  </StrictMode>
);
