# Knowledge Ingest UI

Standalone console for the
[`wbg-oissaagent-knowledge`](../../SAC/projects/wbg-oissaagent-knowledge) RAG
service: upload documents into a collection, inspect what's indexed (and
what was skipped, quarantined or failed), remove documents, and test
retrieval end to end with a chat that shows exactly which passages an answer
cited.

Talks to the RAG API directly — every call is under `/api/v1`.

## Authentication

There is no sign-in screen. What the console sends depends on the RAG
service's `AUTH_MODE`:

| `AUTH_MODE` | Console setting | Effect |
|---|---|---|
| `none` (local dev) | leave `VITE_RAG_API_KEY` empty | No credential; ACLs are not enforced |
| `api_key` | `VITE_RAG_API_KEY` = the service's `API_KEY` | Sent as `X-API-Key`; the caller gets `API_KEY_PRINCIPALS` (default `*`) |
| `entra` | not supported | Every request gets a 401 |

`VITE_RAG_API_KEY` is baked into the bundle, so anyone who can load the page
can read it. Only use it for internal consoles.

## Quick start

```bash
npm install

# Terminal 1 — the RAG service on :8000 (see its README for .env setup)
cd ../../SAC/projects/wbg-oissaagent-knowledge && make dev

# Terminal 2 — this console on :5174
npm run dev
```

Then open http://localhost:5174.

> The Vite proxy forwards `/api/*` to `localhost:8000`. Set
> `RAG_PROXY_TARGET` to proxy to a deployed instance instead.

## Configuration

| Env var | Default | Purpose |
|---|---|---|
| `RAG_PROXY_TARGET` | `http://localhost:8000` | Dev-server proxy target for `/api/*` |
| `VITE_API_BASE_URL` | `""` → same origin / dev proxy | RAG service base URL for a deployed build. The service must list this app's origin in `CORS_ALLOW_ORIGINS`. |
| `VITE_RAG_API_KEY` | `""` | `X-API-Key` for `AUTH_MODE=api_key` |

## Endpoints used

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/v1/health/ready` | Service status card: config and each store |
| `GET` | `/api/v1/rag/modes` | Modes the test chat can pick from |
| `POST` | `/api/v1/ingestion/upload` | Ingest one file, synchronously (the console sends one request per file) |
| `GET` | `/api/v1/ingestion/manifest` | Per-document status for the selected collection |
| `DELETE` | `/api/v1/ingestion/sources` | Remove a document from every store |
| `POST` | `/api/v1/chat` | Grounded answer with citations, confidence and usage (`include_trace` on, for full passage text) |

## Stack

Vite 5 · React 18 · TypeScript · Tailwind CSS v3 · TanStack Query v5 · axios ·
lucide-react · sonner.

```
src/
  api/        RAG client, endpoints, React Query hooks, types
  components/ rag/ChatPanel, ui/
  lib/        utils
  pages/      KnowledgeIngest
```

## Scripts

| Command | Does |
|---|---|
| `npm run dev` | Vite dev server on :5174 |
| `npm run build` | Type-check (`tsc -b`) + production build |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Type-check only (`tsc --noEmit`) |
