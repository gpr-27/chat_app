import axios from "axios";
import config from "../config/index.js";
import logger from "./logger.js";
import { getGuestToken } from "./guestSession.js";

export const axiosInstance = axios.create({
  baseURL: config.apiUrl,
  withCredentials: true,
  // Tunnel-bypass header (e.g. ngrok) is centralized in config; harmless on
  // any other host.
  headers: { ...config.http.tunnelHeaders },
});

// Attach a session token (Bearer) to every request: a Clerk token for accounts,
// or the anonymous guest token. The backend verifies whichever it receives.
axiosInstance.interceptors.request.use(async (request) => {
  try {
    let token = null;
    try {
      token = await window.Clerk?.session?.getToken();
    } catch {
      // Clerk not ready / no session — fall through to the guest token.
    }
    if (!token) token = getGuestToken();
    if (token) request.headers.Authorization = `Bearer ${token}`;
  } catch (error) {
    logger.warn("Could not attach auth token:", error.message);
  }
  return request;
});

// Centralized logging for API + network failures.
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      logger.error(
        `API error ${error.response.status}: ${error.config?.method?.toUpperCase()} ${error.config?.url}`,
        error.response.data?.message || ""
      );
    } else {
      logger.error("Network error:", error.message);
    }
    return Promise.reject(error);
  }
);
