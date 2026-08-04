import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { AuthApi, OrganizationsApi } from "@/api/authEndpoints";
import { TOKEN_KEY, USER_KEY } from "@/api/authClient";
import type { AuthUser, LoginRequest, RegisterRequest } from "@/api/authTypes";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (payload: LoginRequest) => Promise<void>;
  register: (payload: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  joinOrganization: (orgId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

function persistSession(token: string, user: AuthUser) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(readStoredUser);
  // Only true during the initial silent re-validation of a stored session —
  // register()/login() below show their own inline pending state instead.
  const [loading, setLoading] = useState(Boolean(localStorage.getItem(TOKEN_KEY)));

  useEffect(() => {
    function onUnauthorized() {
      setUser(null);
    }
    window.addEventListener("auth:unauthorized", onUnauthorized);
    return () => window.removeEventListener("auth:unauthorized", onUnauthorized);
  }, []);

  useEffect(() => {
    // Re-validate a cached session against the server once on mount (catches
    // a token revoked or a user deleted since the last visit) without
    // blocking the UI on it — the optimistic cached user renders instantly.
    if (!localStorage.getItem(TOKEN_KEY)) {
      setLoading(false);
      return;
    }
    AuthApi.me()
      .then((fresh) => {
        setUser(fresh);
        localStorage.setItem(USER_KEY, JSON.stringify(fresh));
      })
      .catch(() => {
        clearSession();
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  async function login(payload: LoginRequest) {
    const res = await AuthApi.login(payload);
    persistSession(res.access_token, res.user);
    setUser(res.user);
  }

  async function register(payload: RegisterRequest) {
    const res = await AuthApi.register(payload);
    persistSession(res.access_token, res.user);
    setUser(res.user);
  }

  async function logout() {
    try {
      await AuthApi.logout();
    } finally {
      clearSession();
      setUser(null);
    }
  }

  // Self-service: attach the current (guest) account to an organization —
  // for a signup that skipped org_id. Only succeeds while org_id is still
  // unset server-side; otherwise 409 (see auth-service AlreadyAssignedError).
  async function joinOrganization(orgId: string) {
    const res = await OrganizationsApi.join(orgId);
    persistSession(res.access_token, res.user);
    setUser(res.user);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, joinOrganization }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
