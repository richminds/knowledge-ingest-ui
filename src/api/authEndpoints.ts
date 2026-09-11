import { authApi } from "./authClient";
import { GUEST_ACCOUNT_ID } from "./authTypes";
import type {
  AuthUser,
  ForgotPasswordResponse,
  LoginRequest,
  RegisterRequest,
  ResetPasswordResponse,
  TokenResponse,
} from "./authTypes";

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

  // Password reset. Both endpoints are public (the gateway lists them in
  // GATEWAY_PUBLIC_PATHS) — a user who can't sign in obviously can't present a
  // token to ask for help signing in.
  //
  // Pinned to GUEST_ACCOUNT_ID for the same reason register() is: it names the
  // application whose password is being reset.
  forgotPassword: (email: string) =>
    authApi
      .post<ForgotPasswordResponse>("/auth/forgot-password", {
        email,
        account_id: GUEST_ACCOUNT_ID,
      })
      .then((r) => r.data),

  // 400 if the link is unknown, already used, or expired — the message
  // distinguishes them.
  resetPassword: (token: string, newPassword: string) =>
    authApi
      .post<ResetPasswordResponse>("/auth/reset-password", {
        token,
        new_password: newPassword,
      })
      .then((r) => r.data),
};

// Account administration (list, create, rename, delete) lives in
// the standalone account-management-ui console, not here — see that repo's
// README.
