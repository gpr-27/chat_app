// Clerk UI theming matched to the app's "Soft Pastel Glass" palette so the
// sign-in / sign-up modal and the UserButton popover blend in — and follow the
// light/dark toggle instead of always rendering Clerk's default white card.
const shared = {
  colorPrimary: "#7c6cf0",
  borderRadius: "0.9rem",
  fontFamily: '"Nunito", ui-sans-serif, system-ui, sans-serif',
};

const dark = {
  ...shared,
  colorBackground: "#1f1b2e",
  colorText: "#ece9f7",
  colorTextSecondary: "rgba(236, 233, 247, 0.62)",
  colorInputBackground: "#2a2540",
  colorInputText: "#ece9f7",
  colorNeutral: "#ece9f7",
  colorTextOnPrimaryBackground: "#ffffff",
};

const light = {
  ...shared,
  colorBackground: "#ffffff",
  colorText: "#2e2a45",
  colorTextSecondary: "rgba(46, 42, 69, 0.6)",
  colorInputBackground: "#ffffff",
  colorInputText: "#2e2a45",
  colorTextOnPrimaryBackground: "#ffffff",
};

export const clerkAppearance = (theme) => ({
  variables: theme === "dark" ? dark : light,
});
