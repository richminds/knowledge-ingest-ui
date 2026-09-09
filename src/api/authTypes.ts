// Types mirror auth-service's Pydantic DTOs (features/schemas.py).
// This is a separate deployable from knowledge-service, but its JWT IS
// understood by knowledge-service's own auth when RAG_AUTH_ENABLED is set
// with a matching RAG_JWT_SECRET/RAG_JWT_ISSUER (see api/client.ts, which
// attaches this token as a Bearer header) — that's what lets knowledge-
// service derive org_id/user_id from the verified token instead of trusting
// the request body.

// Mirrors auth-service's features/organization.py::GUEST_ORG_ID — the shared
// organization every signup lands on by default (see AuthScreen.tsx). Kept as
// one constant so the literal string isn't duplicated across components.
export const GUEST_ORG_ID = "Guest";

export interface AuthUser {
  user_id: string;
  email: string;
  name: string;
  account_id: string | null;
  account_ids?: string[];
  org_id: string | null;
  is_portless: boolean;
  created_at?: string | null;
}

// One application (auth-service app account) the signed-in user may work
// under. Returned by /auth/login only AFTER the password checks out — which
// accounts an email belongs to isn't public information.
export interface AccountOption {
  account_id: string;
  name: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: AuthUser;
  // The account this token is scoped to — knowledge-service reads it from
  // the token's claims and filters every chunk/file on it.
  account_id: string | null;
  accounts: AccountOption[];
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

// POST /auth/organizations/register (self-serve, no auth required)
export interface OrganizationRecord {
  org_id: string;
  name: string;
  created_by: string;
  known_emails: string[];
  created_at: string;
}

export interface AuthApiErrorBody {
  error?: { code?: string; message?: string };
}
