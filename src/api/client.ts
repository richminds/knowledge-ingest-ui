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

// The signed-in user's auth-service access token (see lib/auth.tsx), sent as a
// Bearer JWT. It is the ONLY credential this app sends: the API gateway
// verifies it and routes the request, and knowledge-service derives
// account_id/user_id from its claims rather than trusting the request body —
// which is what makes account-scoped requests (query/upload/files) actually
// enforce tenant isolation instead of taking the caller's word for it.
//
// A static VITE_API_KEY used to be sent as X-API-Key alongside this. It is
// gone: knowledge-service no longer accepts one, and it had defeated exactly
// the isolation described above by winning over the JWT.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
