import { authApi } from "./authClient";
import type { AuthUser, LoginRequest, RegisterRequest, TokenResponse } from "./authTypes";

// Sign-in, plus self-service sign-up into the guest account. APP ACCOUNTS are
// still provisioned only in the account-management console (auth-service
// /auth/accounts); what this console can do is put a new USER into the one
// guest account, which is a public endpoint.
export const AuthApi = {
  login: (payload: LoginRequest) =>
    authApi.post<TokenResponse>("/auth/login", payload).then((r) => r.data),
  // Returns a token like login does, so a new user is signed in immediately
  // rather than being bounced back to the sign-in form to retype what they
  // just typed.
  register: (payload: RegisterRequest) =>
    authApi.post<TokenResponse>("/auth/register", payload).then((r) => r.data),
  // Re-issues the token scoped to another of the caller's own accounts. A
  // separate call because the account is a token claim, not a client-side
  // preference — knowledge-service filters on the claim.
  selectAccount: (accountId: string) =>
    authApi.post<TokenResponse>("/auth/me/account", { account_id: accountId }).then((r) => r.data),
  me: () => authApi.get<AuthUser>("/auth/me").then((r) => r.data),
  logout: () => authApi.post<void>("/auth/logout").then(() => undefined),
};

// Account administration (list, create, rename, delete) lives in
// the standalone account-management-ui console, not here — see that repo's
// README.
