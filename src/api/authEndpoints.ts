import { authApi } from "./authClient";
import type { AuthUser, LoginRequest, TokenResponse } from "./authTypes";

// Sign-in only: this console never creates users. Accounts are provisioned in
// the account-management console (auth-service /auth/accounts + PATCH
// /auth/users/{user_id}/accounts), and people sign in with what they were
// given.
export const AuthApi = {
  login: (payload: LoginRequest) =>
    authApi.post<TokenResponse>("/auth/login", payload).then((r) => r.data),
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
