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

// POST /auth/me/account — exchange the current token for one scoped to a
// different account the same user belongs to.
export interface SelectAccountRequest {
  account_id: string;
}

export interface AuthApiErrorBody {
  error?: { code?: string; message?: string };
}
