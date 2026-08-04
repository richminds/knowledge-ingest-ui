import { authApi } from "./authClient";
import type {
  AuthUser,
  LoginRequest,
  OrganizationRecord,
  RegisterRequest,
  TokenResponse,
} from "./authTypes";

export const AuthApi = {
  // org_id is optional — omit it to sign up as a guest (see
  // auth-service/features/service.py::register). Passing one that doesn't
  // exist yet 404s (OrganizationNotFoundError).
  register: (payload: RegisterRequest) =>
    authApi.post<TokenResponse>("/auth/register", payload).then((r) => r.data),
  login: (payload: LoginRequest) =>
    authApi.post<TokenResponse>("/auth/login", payload).then((r) => r.data),
  me: () => authApi.get<AuthUser>("/auth/me").then((r) => r.data),
  logout: () => authApi.post<void>("/auth/logout").then(() => undefined),
};

export const OrganizationsApi = {
  // Public, no auth required — mints an org_id to hand out at signup.
  register: (name: string) =>
    authApi.post<OrganizationRecord>("/auth/organizations/register", { name }).then((r) => r.data),
  // Self-service: attach the caller's own still-guest account to an
  // organization. 409 if already assigned, 404 if org_id doesn't exist.
  join: (orgId: string) =>
    authApi.post<TokenResponse>("/auth/me/organization", { org_id: orgId }).then((r) => r.data),
};
