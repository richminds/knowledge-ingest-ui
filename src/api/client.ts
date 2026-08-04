import axios from "axios";

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
const apiKey = import.meta.env.VITE_API_KEY || "";
if (apiKey) {
  api.defaults.headers.common["X-API-Key"] = apiKey;
}
