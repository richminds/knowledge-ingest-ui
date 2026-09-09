import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { AuthApi } from "@/api/authEndpoints";
import { ACCOUNT_KEY, TOKEN_KEY, USER_KEY } from "@/api/authClient";
import type { AccountOption, AuthUser, LoginRequest, TokenResponse } from "@/api/authTypes";

interface AuthContextValue {
  user: AuthUser | null;
  /** The app account the current token is scoped to — what knowledge-service
   *  filters every chunk and file on. */
  accountId: string | null;
  /** Every account the signed-in user may work under. */
  accounts: AccountOption[];
  /** True only while a multi-account user still has to pick one; App renders
   *  the picker instead of the console until then. */
  pendingAccountChoice: boolean;
  loading: boolean;
  login: (payload: LoginRequest) => Promise<AccountOption[]>;
  selectAccount: (accountId: string) => Promise<void>;
  logout: () => Promise<void>;
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

function persistSession(res: TokenResponse) {
  localStorage.setItem(TOKEN_KEY, res.access_token);
  localStorage.setItem(USER_KEY, JSON.stringify(res.user));
  if (res.user.account_id) localStorage.setItem(ACCOUNT_KEY, res.user.account_id);
  else localStorage.removeItem(ACCOUNT_KEY);
}

function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(ACCOUNT_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(readStoredUser);
  const [accountId, setAccountId] = useState<string | null>(() =>
    localStorage.getItem(ACCOUNT_KEY)
  );
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [pendingAccountChoice, setPendingAccountChoice] = useState(false);
  // Only true during the initial silent re-validation of a stored session —
  // login() below shows its own inline pending state instead.
  const [loading, setLoading] = useState(Boolean(localStorage.getItem(TOKEN_KEY)));

  useEffect(() => {
    function onUnauthorized() {
      setUser(null);
      setAccountId(null);
      setAccounts([]);
      setPendingAccountChoice(false);
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
        setAccountId(null);
      })
      .finally(() => setLoading(false));
  }, []);

  /** Sign in and return the accounts this user may work under. The session is
   *  established immediately, scoped to their default account; when there is
   *  more than one, `pendingAccountChoice` holds the console back until
   *  selectAccount() confirms which one. */
  async function login(payload: LoginRequest): Promise<AccountOption[]> {
    const res = await AuthApi.login(payload);
    persistSession(res);
    setUser(res.user);
    setAccountId(res.user.account_id);
    setAccounts(res.user.accounts ?? []);
    setPendingAccountChoice((res.user.accounts ?? []).length > 1);
    return res.user.accounts ?? [];
  }

  async function selectAccount(nextAccountId: string) {
    const res = await AuthApi.selectAccount(nextAccountId);
    persistSession(res);
    setUser(res.user);
    setAccountId(res.user.account_id);
    setAccounts(res.user.accounts ?? []);
    setPendingAccountChoice(false);
  }

  async function logout() {
    try {
      await AuthApi.logout();
    } finally {
      clearSession();
      setUser(null);
      setAccountId(null);
      setAccounts([]);
      setPendingAccountChoice(false);
    }
  }


  return (
    <AuthContext.Provider
      value={{
        user,
        accountId,
        accounts,
        pendingAccountChoice,
        loading,
        login,
        selectAccount,
        logout,
      }}
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
