import axios from "axios";
import { attachSession } from "@/lib/session";

// The knowledge-service RAG API (routes under /api/v1), reached through the
// API gateway like everything else this console calls. Requests stay
// same-origin (/api/v1/...); the rewrite layer forwards /api/* to
// <gateway>/api/knowledge/api/*, and the gateway strips /api/knowledge:
//
//   dev        vite.config.ts (GATEWAY_PROXY_TARGET)
//   deployed   vercel.json
//
// There is deliberately no variable naming the gateway or the service in the
// bundle: an absolute URL would make every call cross-origin, and
// knowledge-service answers 401 to anything that does not come through the
// gateway (it reads identity from the headers the gateway injects).
export const api = axios.create({
  baseURL: "",
  // RAG answers (query analysis -> retrieve -> rerank -> generate -> judge),
  // and synchronous uploads of large documents, can legitimately run well
  // past 15s, so give every request up to 2 minutes rather than aborting
  // client-side.
  timeout: 120000,
});

// The signed-in user's auth-service token, attached per request and refreshed
// on a 401 (lib/session.ts). It is the only credential this app sends.
attachSession(api);

// knowledge-service errors come back as {"detail": "..."} (or a list of
// validation errors for 422s); the gateway's own rejections (401, 429, 502) as
// {"error": {"message": "..."}}. Surface either rather than axios's generic
// message.
export function errorMessage(err: unknown, fallback: string): string {
  const data = (
    err as { response?: { data?: { detail?: unknown; error?: { message?: string } } } }
  )?.response?.data;
  const detail = data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail[0]?.msg) return String(detail[0].msg);
  if (data?.error?.message) return data.error.message;
  return fallback;
}
