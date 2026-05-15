import axios from "axios";

const BASE = process.env.REACT_APP_BACKEND_URL;
export const API = `${BASE}/api`;

const client = axios.create({
  baseURL: API,
  timeout: 30000,
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem("auth_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      // If unauthenticated and we have a token, clear it
      if (localStorage.getItem("auth_token")) {
        localStorage.removeItem("auth_token");
        if (!window.location.pathname.startsWith("/login") && !window.location.pathname.startsWith("/setup-password") && !window.location.pathname.startsWith("/reset-password") && !window.location.pathname.startsWith("/forgot-password")) {
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(err);
  }
);

export function apiErrorMessage(err, fallback = "Si è verificato un errore.") {
  const d = err?.response?.data?.detail;
  if (!d) return err?.message || fallback;
  if (typeof d === "string") return d;
  if (Array.isArray(d)) return d.map((e) => e?.msg || JSON.stringify(e)).join(" • ");
  if (d.msg) return d.msg;
  return JSON.stringify(d);
}

export default client;
