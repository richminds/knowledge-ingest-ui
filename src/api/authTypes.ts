// Types mirror auth-service's Pydantic DTOs (features/schemas.py).
// This is a separate deployable from knowledge-service, but its JWT IS
// understood by knowledge-service's own auth when RAG_AUTH_ENABLED is set
// with a matching RAG_JWT_SECRET/RAG_JWT_ISSUER (see api/client.ts, which
// attaches this token as a Bearer header) — that's what lets knowledge-
// service derive account_id/user_id from the verified token instead of
// trusting the request body.

export interface AccountOption {
  account_id: string;
  name: string;
}

export interface AuthUser {
  user_id: string;
  email: string;
  name: string;
  // The account this session is scoped to — the user's ONLY scope.
  // knowledge-service filters every chunk and file on it.
  account_id: string | null;
  // Every account this user may sign in through.
  account_ids?: string[];
  // The same accounts with display names, for the sign-in picker. Returned
  // only after the password checks out.
  accounts?: AccountOption[];
  is_admin?: boolean;
  created_at?: string | null;
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
