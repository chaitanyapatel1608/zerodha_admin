import axios from "axios";

export const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  (typeof window !== "undefined" && window.location.hostname.includes("onrender.com")
    ? "https://zerodha-backend-xbtx.onrender.com"
    : "http://localhost:3002");

export function readCookie(name) {
  if (typeof document === "undefined" || !document.cookie) return "";
  const prefix = `${name}=`;
  const parts = document.cookie.split(";");
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.startsWith(prefix)) {
      return decodeURIComponent(trimmed.slice(prefix.length));
    }
  }
  return "";
}

let inMemoryCsrf = "";

export function setCsrfToken(token) {
  if (token) {
    inMemoryCsrf = token;
    try {
      if (typeof sessionStorage !== "undefined") sessionStorage.setItem("zerodha_csrf", token);
    } catch (e) {}
    try {
      if (typeof localStorage !== "undefined") localStorage.setItem("zerodha_csrf", token);
    } catch (e) {}
  }
}

export function getCsrfToken() {
  const cookieVal = readCookie("zerodha_csrf");
  if (cookieVal) return cookieVal;
  if (inMemoryCsrf) return inMemoryCsrf;
  try {
    if (typeof sessionStorage !== "undefined") {
      const s = sessionStorage.getItem("zerodha_csrf");
      if (s) return s;
    }
  } catch (e) {}
  try {
    if (typeof localStorage !== "undefined") {
      const l = localStorage.getItem("zerodha_csrf");
      if (l) return l;
    }
  } catch (e) {}
  return "";
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 15000,
});

const MUTATING_METHODS = new Set(["post", "put", "patch", "delete"]);

api.interceptors.request.use(async (config) => {
  const method = String(config.method || "get").toLowerCase();
  if (MUTATING_METHODS.has(method)) {
    let csrfToken = getCsrfToken();
    if (!csrfToken && !config.skipCsrfFetch && typeof window !== "undefined") {
      try {
        const res = await api.get("/csrf-token", { skipCsrfFetch: true });
        if (res?.data?.csrfToken) {
          csrfToken = res.data.csrfToken;
          setCsrfToken(csrfToken);
        }
      } catch (_) {}
    }
    if (csrfToken) {
      config.headers = config.headers || {};
      config.headers["X-CSRF-Token"] = csrfToken;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (
      error.response?.status === 403 &&
      typeof error.response?.data?.message === "string" &&
      error.response.data.message.includes("CSRF") &&
      !originalRequest?._csrfRetry
    ) {
      originalRequest._csrfRetry = true;
      try {
        const res = await api.get("/csrf-token", { skipCsrfFetch: true });
        if (res?.data?.csrfToken) {
          const freshToken = res.data.csrfToken;
          setCsrfToken(freshToken);
          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers["X-CSRF-Token"] = freshToken;
          return api(originalRequest);
        }
      } catch (_) {}
    }
    return Promise.reject(error);
  }
);

export default api;
