import axios from "axios";

// Separate instance from api/client.ts (knowledge-service) — this one talks
// to auth-service, a different deployable with its own base URL, CORS
// allowlist, and token format.
const baseURL = import.meta.env.VITE_AUTH_BASE_URL || "";

export const TOKEN_KEY = "knowledge-ingest.auth_token";
export const USER_KEY = "knowledge-ingest.auth_user";

export const authApi = axios.create({
  baseURL,
  timeout: 15000,
});

authApi.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On 401 (expired/invalid/revoked token), clear the stored session and let
// AuthProvider (which owns app-level state) react — broadcast rather than
// import the provider here, to avoid a client.ts <-> auth.tsx import cycle.
authApi.interceptors.response.use(
  (res) => res,
  (error) => {
    const url: string = error.config?.url ?? "";
    if (error.response?.status === 401 && !url.includes("/auth/login") && !url.includes("/auth/register")) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      window.dispatchEvent(new CustomEvent("auth:unauthorized"));
    }
    return Promise.reject(error);
  }
);

export function authErrorMessage(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { error?: { message?: string } }; status?: number } };
  return e.response?.data?.error?.message ?? fallback;
}
