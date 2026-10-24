import axios from "axios";
import { KNOWLEDGE_ACCOUNT_ID } from "@/config/accounts";
import { attachSession, type SessionUser } from "@/lib/session";

// A separate instance from api/client.ts, the same split makemerich-frontend
// makes: auth-service is reached at its OWN paths (/auth/login, not
// /api/auth/login), forwarded unchanged to the API gateway's /auth route (see
// vite.config.ts and vercel.json). This app never addresses auth-service
// directly; the gateway is its only caller.
export const authApi = axios.create({
  baseURL: "",
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});
attachSession(authApi);

// Mirrors auth-service's TokenResponse (features/schemas.py).
export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: SessionUser;
}

export interface MessageResponse {
  message?: string;
}

// Every call is pinned to KNOWLEDGE_ACCOUNT_ID: it names the application whose
// user is signing in, signing up or resetting a password. Taking it from the
// form instead would let anyone register into someone else's application.
export const AuthApi = {
  login: (email: string, password: string) =>
    authApi
      .post<TokenResponse>("/auth/login", { email, password, account_id: KNOWLEDGE_ACCOUNT_ID })
      .then((r) => r.data),
  register: (payload: { email: string; name: string; password: string }) =>
    authApi
      .post<TokenResponse>("/auth/register", { ...payload, account_id: KNOWLEDGE_ACCOUNT_ID })
      .then((r) => r.data),
  forgotPassword: (email: string) =>
    authApi
      .post<MessageResponse>("/auth/forgot-password", { email, account_id: KNOWLEDGE_ACCOUNT_ID })
      .then((r) => r.data),
  // 400 if the link is unknown, already used or expired; the message says which.
  resetPassword: (token: string, newPassword: string) =>
    authApi
      .post<MessageResponse>("/auth/reset-password", { token, new_password: newPassword })
      .then((r) => r.data),
  // auth-service revokes the token (204).
  logout: () => authApi.post<void>("/auth/logout").then(() => undefined),
};

/** One reader for every auth error. Two shapes arrive on this surface:
 *    { error: { code, message } }   auth-service's own errors, and the
 *                                   gateway's (401 at the door, 429 budgets)
 *    { detail: string | [...] }     FastAPI validation errors (422) */
export function authErrorMessage(err: unknown, fallback: string): string {
  const e = err as {
    message?: string;
    response?: { data?: { error?: { message?: string }; detail?: unknown } };
  };
  const data = e.response?.data;
  if (data?.error?.message) return data.error.message;
  if (typeof data?.detail === "string") return data.detail;
  if (Array.isArray(data?.detail)) {
    return data.detail
      .map((d) => (typeof d === "string" ? d : (d as { msg?: string }).msg || "Validation error"))
      .join(", ");
  }
  return e.response ? fallback : e.message || fallback;
}
