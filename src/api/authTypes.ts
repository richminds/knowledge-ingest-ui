// Types mirror auth-service's Pydantic DTOs (features/schemas.py).
// This is a separate identity service from knowledge-service — its JWT is
// NOT understood by knowledge-service's own auth (RAG_JWT_SECRET / static
// API keys), so it authenticates the human into this UI only. Requests to
// knowledge-service still go out under VITE_API_KEY (see api/client.ts).

// Mirrors auth-service's features/organization.py::GUEST_ORG_ID — the shared
// organization every signup lands on by default (see AuthScreen.tsx). Kept as
// one constant so the literal string isn't duplicated across components.
export const GUEST_ORG_ID = "Guest";

export interface AuthUser {
  user_id: string;
  email: string;
  name: string;
  org_id: string | null;
  is_portless: boolean;
  created_at?: string | null;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: AuthUser;
}

export interface RegisterRequest {
  email: string;
  name: string;
  password: string;
  org_id?: string | null;
}

export interface LoginRequest {
  email: string;
  password: string;
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
