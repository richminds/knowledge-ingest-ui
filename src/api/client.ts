import axios from "axios";

// This console talks directly to the wbg-oissaagent-knowledge RAG API
// (FastAPI, routes under /api/v1). Empty baseURL means relative /api/v1/...
// requests, which the Vite dev proxy forwards to http://localhost:8000 (see
// vite.config.ts); set VITE_API_BASE_URL to point at a deployed instance
// instead — that instance must then list this app's origin in
// CORS_ALLOW_ORIGINS.
const baseURL = import.meta.env.VITE_API_BASE_URL || "";

// The RAG service's AUTH_MODE decides what it accepts:
//   none     — local dev; no credential, ACLs not enforced
//   api_key  — a shared X-API-Key; the caller gets API_KEY_PRINCIPALS
// There is no user sign-in here, so for api_key deployments the key below is
// the only credential. It is inlined into the bundle at build time — anyone
// who can load the page can read it, so only use it for internal consoles.
const apiKey = import.meta.env.VITE_RAG_API_KEY || "";

export const api = axios.create({
  baseURL,
  // RAG answers (query analysis -> retrieve -> rerank -> generate -> judge),
  // and synchronous uploads of large documents, can legitimately run well
  // past 15s, so give every request up to 2 minutes rather than aborting
  // client-side.
  timeout: 120000,
  headers: apiKey ? { "X-API-Key": apiKey } : undefined,
});

// FastAPI errors come back as {"detail": "..."} (or a list of validation
// errors for 422s); surface that rather than axios's generic message.
export function errorMessage(err: unknown, fallback: string): string {
  const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail[0]?.msg) return String(detail[0].msg);
  return fallback;
}
