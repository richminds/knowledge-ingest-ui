import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { AuthApi, authErrorMessage } from "@/api/authClient";
import {
  IDLE_TIMEOUT_MS,
  LAST_ACTIVITY_KEY,
  LOGOUT_REASON_KEY,
  SessionEndedError,
  TOKEN_KEY,
  clearSession,
  endSession,
  getToken,
  isIdleExpired,
  markActivity,
  msUntilRefresh,
  readStoredUser,
  refreshAccessToken,
  storeSession,
  userInfoFrom,
  type LogoutReason,
  type SessionUser,
} from "@/lib/session";

// Ported from makemerich-frontend's contexts/AuthContext.js: sign-in, sign-up,
// password reset and sign-out against auth-service (through the API gateway's
// /auth route), a silent token refresh before expiry, and the inactivity
// sign-out shared by every tab.

export interface Result {
  success: boolean;
  error?: string;
  message?: string;
}

interface AuthContextValue {
  user: SessionUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<Result>;
  register: (payload: { email: string; name: string; password: string }) => Promise<Result>;
  forgotPassword: (email: string) => Promise<Result>;
  resetPassword: (token: string, newPassword: string) => Promise<Result>;
  logout: (opts?: { reason?: LogoutReason }) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const ACTIVITY_WRITE_THROTTLE_MS = 5 * 1000;
const IDLE_CHECK_INTERVAL_MS = 15 * 1000;
const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "touchstart", "wheel", "scroll"];

let refreshTimer: ReturnType<typeof setTimeout> | null = null;

function cancelRefresh() {
  if (refreshTimer) clearTimeout(refreshTimer);
  refreshTimer = null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const loggingOut = useRef(false);

  // auth-service tokens are short-lived. Refresh shortly before `exp`, then
  // reschedule from the NEW token's `exp`. The 401 interceptor in
  // lib/session.ts remains the fallback for a tab whose timer was frozen.
  function scheduleRefresh() {
    cancelRefresh();
    const scheduledFor = getToken();
    if (!scheduledFor) return;
    refreshTimer = setTimeout(async () => {
      refreshTimer = null;
      try {
        await refreshAccessToken(scheduledFor);
        setUser(readStoredUser());
      } catch (error) {
        if (error instanceof SessionEndedError) {
          setUser(null);
          endSession("expired");
          return;
        }
        // Transient: keep the session; the reschedule below retries in a minute.
      }
      scheduleRefresh();
    }, msUntilRefresh(scheduledFor));
  }

  useEffect(() => {
    const stored = readStoredUser();
    if (getToken() && stored) {
      if (isIdleExpired()) {
        // The app was closed (or the machine asleep) past the idle limit.
        clearSession();
        sessionStorage.setItem(LOGOUT_REASON_KEY, "idle");
      } else {
        setUser(stored);
        markActivity();
        scheduleRefresh();
      }
    }
    setLoading(false);
    return cancelRefresh;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signedIn = Boolean(user);

  // Inactivity sign-out, shared by every tab through LAST_ACTIVITY_KEY.
  useEffect(() => {
    if (!signedIn) return undefined;
    let lastWrite = 0;
    const checkIdle = () => {
      if (isIdleExpired()) void logout({ reason: "idle" });
    };
    const onActivity = () => {
      const now = Date.now();
      if (now - lastWrite < ACTIVITY_WRITE_THROTTLE_MS) return;
      // Activity AFTER the limit does not revive the session.
      if (isIdleExpired()) {
        void logout({ reason: "idle" });
        return;
      }
      lastWrite = now;
      markActivity(now);
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") checkIdle();
    };
    const opts = { capture: true, passive: true } as const;
    ACTIVITY_EVENTS.forEach((name) => window.addEventListener(name, onActivity, opts));
    document.addEventListener("visibilitychange", onVisibility);
    const timer = setInterval(checkIdle, IDLE_CHECK_INTERVAL_MS);
    return () => {
      ACTIVITY_EVENTS.forEach((name) => window.removeEventListener(name, onActivity, opts));
      document.removeEventListener("visibilitychange", onVisibility);
      clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedIn]);

  // Another tab signed in, refreshed or signed out.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== TOKEN_KEY && e.key !== null) return;
      if (!getToken()) {
        cancelRefresh();
        setUser(null);
      } else if (signedIn) {
        scheduleRefresh();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedIn]);

  async function login(email: string, password: string): Promise<Result> {
    try {
      // `account_id` (KNOWLEDGE_ACCOUNT_ID, added by AuthApi) names the
      // application; a user with no record in it is refused with the same 401
      // as a wrong password.
      const { access_token, user: account } = await AuthApi.login(email.trim().toLowerCase(), password);
      storeSession(access_token, account);
      markActivity();
      sessionStorage.removeItem(LOGOUT_REASON_KEY);
      setUser(userInfoFrom(account));
      scheduleRefresh();
      toast.success("Login successful!");
      return { success: true };
    } catch (error) {
      const message = authErrorMessage(error, "Login failed");
      toast.error(message);
      return { success: false, error: message };
    }
  }

  async function register(payload: { email: string; name: string; password: string }): Promise<Result> {
    try {
      // POST /auth/register returns a token (registering signs you in). As in
      // makemerich, it is discarded and the user is sent to sign in, keeping
      // one way into a session. knowledge-service learns about the new user on
      // their first request, from the identity headers the gateway injects.
      await AuthApi.register({ ...payload, email: payload.email.trim().toLowerCase() });
      toast.success("Registration successful! Please login.");
      return { success: true };
    } catch (error) {
      const message = authErrorMessage(error, "Registration failed");
      toast.error(message);
      return { success: false, error: message };
    }
  }

  async function forgotPassword(email: string): Promise<Result> {
    try {
      const data = await AuthApi.forgotPassword(email.trim().toLowerCase());
      toast.success(data?.message || "Reset link sent if the email is registered.");
      return { success: true, message: data?.message };
    } catch (error) {
      const message = authErrorMessage(error, "Could not request password reset");
      toast.error(message);
      return { success: false, error: message };
    }
  }

  async function resetPassword(token: string, newPassword: string): Promise<Result> {
    try {
      const data = await AuthApi.resetPassword(token, newPassword);
      toast.success(data?.message || "Password reset successful");
      return { success: true, message: data?.message };
    } catch (error) {
      const message = authErrorMessage(error, "Password reset failed");
      toast.error(message);
      return { success: false, error: message };
    }
  }

  // `reason: 'idle'` is the inactivity sign-out; the login page explains it.
  async function logout({ reason }: { reason?: LogoutReason } = {}) {
    if (loggingOut.current) return;
    loggingOut.current = true;
    try {
      // A failure here still clears the session below.
      await AuthApi.logout();
    } catch {
      // ignore
    }
    cancelRefresh();
    clearSession();
    setUser(null);
    if (reason) sessionStorage.setItem(LOGOUT_REASON_KEY, reason);
    else toast.success("Logged out successfully");
    // Full reload drops every cached query and component state.
    setTimeout(() => {
      window.location.href = "/login";
    }, 100);
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, forgotPassword, resetPassword, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}

export { IDLE_TIMEOUT_MS, LAST_ACTIVITY_KEY, LOGOUT_REASON_KEY };
