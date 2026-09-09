import axios from "axios";
import { TOKEN_KEY } from "./authClient";

// This console talks directly to a knowledge-service instance (no gateway/BFF
// in front). Empty baseURL means relative /v1/... requests, which the Vite
// dev proxy forwards to http://localhost:8090 (see vite.config.ts); set
// VITE_API_BASE_URL to point at a deployed instance instead.
const baseURL = import.meta.env.VITE_API_BASE_URL || "";

export const api = axios.create({
  baseURL,
  // RAG queries (embed -> hybrid search -> rerank -> LLM generate) can
  // legitimately run well past 15s, so give every request up to 2 minutes
  // rather than aborting client-side.
  timeout: 120000,
});

// Static API key, if the target knowledge-service has KNOWLEDGE_API_KEYS
// configured (see app/middleware/auth.py — X-API-Key or Bearer, either works).
// NOTE: a static key is checked BEFORE the Bearer JWT below and, when it
// matches, wins outright — knowledge-service then trusts whatever account_id/
// user_id this app puts in the request body instead of deriving them from
// the signed-in user's token. Only set this for a deployment that
// intentionally wants every request treated as one shared service principal
// (no per-user org isolation), not alongside real end-user login.
const apiKey = import.meta.env.VITE_API_KEY || "";
if (apiKey) {
  api.defaults.headers.common["X-API-Key"] = apiKey;
}

// The signed-in user's auth-service access token (see lib/auth.tsx). Sent as
// a normal Bearer JWT — knowledge-service validates it (shared secret/issuer
// with auth-service, see rag/auth.py + app/middleware/auth.py) and derives
// account_id/user_id from its verified claims rather than trusting the request
// body, so this is what makes org-scoped requests (query/upload/files)
// actually enforce tenant isolation instead of taking the caller's word for it.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
