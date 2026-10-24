import axios, { type AxiosError, type AxiosInstance } from "axios";

// Session storage, token refresh and the idle sign-out, shared by both axios
// instances (api/authClient.ts, api/client.ts) and lib/auth.tsx. Ported from
// makemerich-frontend's AuthContext.js. It lives in its own module so the two
// clients and the provider can all import it without importing each other.

export const TOKEN_KEY = "knowledge-ingest.token";
export const USER_KEY = "knowledge-ingest.userInfo";
export const LAST_ACTIVITY_KEY = "knowledge-ingest.lastActivityAt";
export const LOGOUT_REASON_KEY = "knowledge-ingest.logoutReason";

export type LogoutReason = "idle" | "expired";

export interface SessionUser {
  user_id: string;
  email: string;
  name: string;
  is_admin?: boolean;
}

// What we keep from auth-service's TokenResponse ({ access_token, token_type,
// user }). knowledge-service never sees any of it: it reads identity from the
// headers the API gateway injects after validating the token.
export function userInfoFrom(user: Partial<SessionUser> | undefined): SessionUser {
  return {
    user_id: user?.user_id ?? "",
    email: user?.email ?? "",
    name: user?.name ?? "",
    is_admin: user?.is_admin ?? false,
  };
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function readStoredUser(): SessionUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}

// ── Session lifetime ────────────────────────────────────────────────────────
//
// The ONLY automatic sign-out is inactivity: IDLE_TIMEOUT_MS with no mouse,
// keyboard, touch or scroll in ANY tab of this app (the timestamp lives in
// localStorage, so activity in one tab keeps the others alive). Token expiry
// is not a reason to sign out: an active user's token is refreshed silently.
export const IDLE_TIMEOUT_MS = 5 * 60 * 1000;

export function markActivity(at = Date.now()) {
  localStorage.setItem(LAST_ACTIVITY_KEY, String(at));
}

// No timestamp at all counts as active.
export function isIdleExpired(): boolean {
  const last = Number(localStorage.getItem(LAST_ACTIVITY_KEY));
  return Boolean(last) && Date.now() - last >= IDLE_TIMEOUT_MS;
}

// `storage` events only reach OTHER tabs; this tells this tab's provider that
// the token changed.
export const SESSION_EVENT = "knowledge-ingest:session";
const announceSession = () => window.dispatchEvent(new Event(SESSION_EVENT));

export function storeSession(accessToken: string, user: Partial<SessionUser> | undefined) {
  localStorage.setItem(TOKEN_KEY, accessToken);
  localStorage.setItem(USER_KEY, JSON.stringify(userInfoFrom(user)));
  announceSession();
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(LAST_ACTIVITY_KEY);
  announceSession();
}

/** Local sign-out with a full reload to /login, which also drops every cached
 *  query. `reason` is shown once by the login page. */
export function endSession(reason?: LogoutReason) {
  clearSession();
  if (reason) sessionStorage.setItem(LOGOUT_REASON_KEY, reason);
  window.location.href = "/login";
}

// ── Token refresh ───────────────────────────────────────────────────────────
//
// auth-service ROTATES on refresh: each token is exchangeable exactly once and
// the old one is revoked. So two refreshes of the same token (several requests
// 401ing together, or two tabs whose timers fire together) mean the second
// fails, and must not sign the user out. Every refresh therefore goes through
// here:
//   * single-flight within a tab: concurrent callers share one request;
//   * serialized across tabs with the Web Locks API where available;
//   * skipped when the token was already rotated by someone else;
//   * only an explicit 401/403 from auth-service ends the session. A network
//     blip or a 5xx leaves the user signed in.
export class SessionEndedError extends Error {}

const isRejectedByAuth = (error: unknown) =>
  [401, 403].includes((error as AxiosError)?.response?.status ?? 0);

function withRefreshLock<T>(fn: () => Promise<T>): Promise<T> {
  return navigator.locks?.request
    ? (navigator.locks.request("knowledge-ingest-token-refresh", fn) as Promise<T>)
    : fn();
}

let refreshInFlight: Promise<string> | null = null;

// Bare axios on purpose: the refresh call must not go through the 401
// interceptor that calls it.
const refreshClient = axios.create({ timeout: 15000 });

export function refreshAccessToken(staleToken?: string): Promise<string> {
  if (!refreshInFlight) {
    refreshInFlight = withRefreshLock(async () => {
      const current = getToken();
      if (!current) throw new SessionEndedError("Signed out");
      if (staleToken && current !== staleToken) return current;
      try {
        const { data } = await refreshClient.post("/auth/refresh-token", null, {
          headers: { Authorization: `Bearer ${current}` },
        });
        storeSession(data.access_token, data.user);
        return data.access_token as string;
      } catch (error) {
        // A tab without Web Locks may have rotated it while we were asking.
        const latest = getToken();
        if (latest && latest !== current) return latest;
        if (isRejectedByAuth(error)) throw new SessionEndedError("Session expired");
        throw error;
      }
    }).finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

/** Refresh a couple of minutes before `exp`; at least a minute out, so a
 *  transient failure retries a minute later rather than in a tight loop. */
export function msUntilRefresh(token: string): number {
  try {
    const { exp } = JSON.parse(atob(token.split(".")[1]));
    return Math.max(60 * 1000, exp * 1000 - Date.now() - 2 * 60 * 1000);
  } catch {
    return 45 * 60 * 1000;
  }
}

const AUTH_PATHS = ["/auth/login", "/auth/register", "/auth/refresh-token", "/auth/forgot-password", "/auth/reset-password"];

/** Attach the bearer token per request (read from storage, so every instance
 *  agrees about who is signed in), and on a 401 refresh once and retry. */
export function attachSession(instance: AxiosInstance) {
  instance.interceptors.request.use((config) => {
    const token = getToken();
    // A tab that slept past the idle limit (timers frozen) must not quietly
    // fetch data on wake before the idle check gets to run.
    if (token && isIdleExpired()) {
      endSession("idle");
      return Promise.reject(new Error("Signed out after inactivity"));
    }
    if (token) config.headers.Authorization = `Bearer ${token}`;
    else delete config.headers.Authorization;
    return config;
  });

  instance.interceptors.response.use(undefined, async (error: AxiosError) => {
    const config = error.config as (typeof error.config & { _retry?: boolean }) | undefined;
    const url = config?.url ?? "";
    if (
      error.response?.status !== 401 ||
      !config ||
      config._retry ||
      AUTH_PATHS.some((p) => url.includes(p))
    ) {
      return Promise.reject(error);
    }
    config._retry = true;
    if (!getToken()) {
      endSession();
      return Promise.reject(error);
    }
    try {
      const sent = String(config.headers?.Authorization ?? "").replace(/^Bearer\s+/i, "");
      const token = await refreshAccessToken(sent);
      config.headers.Authorization = `Bearer ${token}`;
      return instance.request(config);
    } catch (refreshError) {
      if (refreshError instanceof SessionEndedError) endSession("expired");
      return Promise.reject(error);
    }
  });
}
