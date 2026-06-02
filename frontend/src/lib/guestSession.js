// Anonymous guest session persistence (localStorage). Kept in its own module so
// both the axios layer and the auth store can use it without a circular import.
export const GUEST_TOKEN_KEY = "guest-token";
export const GUEST_ID_KEY = "guest-id";

export const getGuestToken = () => {
  try {
    return localStorage.getItem(GUEST_TOKEN_KEY);
  } catch {
    return null;
  }
};

export const setGuestSession = (token, guestId) => {
  try {
    localStorage.setItem(GUEST_TOKEN_KEY, token);
    localStorage.setItem(GUEST_ID_KEY, guestId);
  } catch {
    // localStorage unavailable (private mode) — guest session won't persist.
  }
};

export const clearGuestSession = () => {
  try {
    localStorage.removeItem(GUEST_TOKEN_KEY);
    localStorage.removeItem(GUEST_ID_KEY);
  } catch {
    // ignore
  }
};
