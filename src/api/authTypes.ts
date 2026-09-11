// Types mirror auth-service's Pydantic DTOs (features/schemas.py).
// This is a separate deployable from knowledge-service, but its JWT IS
// understood by knowledge-service's own auth when RAG_AUTH_ENABLED is set
// with a matching RAG_JWT_SECRET/RAG_JWT_ISSUER (see api/client.ts, which
// attaches this token as a Bearer header) — that's what lets knowledge-
// service derive account_id/user_id from the verified token instead of
// trusting the request body.

export interface AccountOption {
  // A UUID minted by auth-service, not a readable slug.
  account_id: string;
  name: string;
  // True on the account this session's token is scoped to. This replaced the
  // flat `AuthUser.account_id`: the list says which accounts the user may work
  // under, this says which one they are working under right now.
  selected: boolean;
}

export interface AuthUser {
  user_id: string;
  email: string;
  name: string;
  // Every account this user may sign in through, with the active one marked.
  // The ONLY account information in the response — auth-service no longer
  // repeats it as flat account_id/account_ids fields. knowledge-service
  // filters every chunk and file on the selected one.
  //
  // Returned only after the password checks out, so an unauthenticated caller
  // can't probe an email's memberships.
  accounts?: AccountOption[];
  is_admin?: boolean;
  created_at?: string | null;
}

/** The account a session is scoped to, or null when the user belongs to none.
 *  Every read of "which account am I in" goes through here so the answer is
 *  derived one way. */
export function selectedAccountId(user: AuthUser | null): string | null {
  return user?.accounts?.find((a) => a.selected)?.account_id ?? null;
}


// Account membership lives on `user` and nowhere else — it used to be
// repeated at this level too, which meant two copies that could disagree.
export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: AuthUser;
}

export interface LoginRequest {
  email: string;
  password: string;
  account_id?: string | null;
}

/** The app account self-service sign-ups land in.
 *
 *  A UUID like every account ID, but a DERIVED one (auth-service
 *  features/account_ids.py) back when auth-service bootstrapped a guest
 *  account at startup, which made the value knowable before the account
 *  existed — this console has to name it from a form with no session.
 *
 *  THAT BOOTSTRAP IS GONE. auth-service now seeds only the admin account, and
 *  accounts registered through POST /auth/accounts get a RANDOM uuid, so this
 *  literal matches nothing on a current deployment and register 404s. It is
 *  kept only so an older database still works.
 *
 *  Every deployment must therefore set VITE_GUEST_ACCOUNT_ID to the id of the
 *  account its sign-ups belong to. Vite inlines it at BUILD time, so changing
 *  it means restarting the dev server or redeploying — setting it in a running
 *  environment does nothing. */
export const GUEST_ACCOUNT_ID =
  import.meta.env.VITE_GUEST_ACCOUNT_ID || "1990b268-3b12-50ab-9be3-09970c1bcfc8";

// POST /auth/register — public, unlike account administration. `account_id`
// names the app account the new user belongs to; auth-service 404s if it
// doesn't exist and refuses self-registration into the ADMIN account once one
// admin exists, so this can only ever create ordinary guest users.
export interface RegisterRequest {
  email: string;
  name: string;
  password: string;
  account_id?: string | null;
}

// POST /auth/me/account — exchange the current token for one scoped to a
// different account the same user belongs to.
export interface SelectAccountRequest {
  account_id: string;
}

export interface AuthApiErrorBody {
  error?: { code?: string; message?: string };
}


// ───────────────────────────────────────────────────────── password reset

/** POST /auth/forgot-password.
 *
 *  `account_id` is REQUIRED. auth-service keys users on (email, account_id)
 *  with a password hash per record, so an address alone doesn't identify the
 *  password being reset. This console always sends GUEST_ACCOUNT_ID — the same
 *  account it registers sign-ups into — so a reset started here only ever
 *  touches that record, never the same person's record in another
 *  application. */
export interface ForgotPasswordRequest {
  email: string;
  account_id: string;
}

export interface ForgotPasswordResponse {
  /** Identical whether or not the address is registered. The endpoint must not
   *  be usable to enumerate addresses, so the UI shows this same confirmation
   *  either way and never reports "no such user". */
  message: string;
  /** Development only: the raw token, present when auth-service has no SMTP
   *  configured AND AUTH_EXPOSE_RESET_TOKEN is on. Never set in production. */
  debug_token?: string | null;
}

export interface ResetPasswordRequest {
  token: string;
  new_password: string;
}

export interface ResetPasswordResponse {
  message: string;
}
