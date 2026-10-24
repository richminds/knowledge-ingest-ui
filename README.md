# Knowledge Ingest UI

Console for the [`knowledge-service`](../knowledge-service) RAG service:
upload documents into a collection, inspect what's indexed (and what was
skipped, quarantined or failed), remove documents, and test retrieval end to
end with a chat that shows exactly which passages an answer cited.

## Authentication

Sign-in works the same way as makemerich-frontend. The Login, Register,
Forgot Password and Reset Password pages talk to auth-service through the API
gateway's `/auth` route. Every call is pinned to one app account,
`VITE_KNOWLEDGE_ACCOUNT_ID`.

- **Register** creates the user in that account, then sends them to sign in.
- **Login** stores the access token. Every API call sends it as a bearer token.
- The gateway validates the token and passes identity to knowledge-service as
  `X-User-*` headers (`AUTH_MODE=gateway` on the service).
- **Token refresh:** the token is refreshed silently before it expires, and
  again on a 401. auth-service rotates tokens, so a refresh is shared within a
  tab and serialized across tabs.
- **Idle sign-out:** after 5 minutes with no activity in any tab, the user is
  signed out.
- **Reset links** from auth-service open `/reset-password?token=…`. Set this
  app's URL as the account's reset URL (or `AUTH_PASSWORD_RESET_URL`).

## Quick start

The console only works through the API gateway, so run the whole chain:

| Service | Port | Notes |
|---|---|---|
| api-gateway | 8000 | needs `POST:/auth/forgot-password`, `POST:/auth/reset-password` and `POST:/auth/refresh-token` in `GATEWAY_PUBLIC_PATHS` (its `.env.example` lists them) |
| auth-service | 8100 | |
| llm-gateway | 8080 | |
| knowledge-service | 8090 | `AUTH_MODE=gateway`, `API_GATEWAY_URL=http://localhost:8000` |

```bash
npm install
cp .env.example .env      # set VITE_KNOWLEDGE_ACCOUNT_ID
npm run dev               # http://localhost:5174
```

## Configuration

| Env var | Default | Purpose |
|---|---|---|
| `VITE_KNOWLEDGE_ACCOUNT_ID` | none (required) | auth-service app account for login, register and password reset |
| `GATEWAY_PROXY_TARGET` | `http://localhost:8000` | Dev-server proxy target for `/auth/*` and `/api/*` |

Deployed, [vercel.json](vercel.json) rewrites `/auth/*` and `/api/*` to the
gateway the same way.

## Endpoints used

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/auth/login`, `/auth/register`, `/auth/logout`, `/auth/refresh-token` | Session (auth-service) |
| `POST` | `/auth/forgot-password`, `/auth/reset-password` | Password reset (auth-service) |
| `GET` | `/api/v1/health/ready` | Service status card: config and each store |
| `GET` | `/api/v1/rag/modes` | Modes the test chat can pick from |
| `POST` | `/api/v1/ingestion/upload` | Ingest one file, synchronously (the console sends one request per file) |
| `GET` | `/api/v1/ingestion/manifest` | Per-document status for the selected collection |
| `DELETE` | `/api/v1/ingestion/sources` | Remove a document from every store |
| `POST` | `/api/v1/chat` | Grounded answer with citations, confidence and usage (`include_trace` on, for full passage text) |

## Stack

Vite 5 · React 18 · TypeScript · React Router 6 · Tailwind CSS v3 · TanStack
Query v5 · axios · lucide-react · sonner.

```
src/
  api/        RAG client, auth client, endpoints, React Query hooks, types
  components/ auth/AuthShell, rag/ChatPanel, ui/
  config/     accounts (VITE_KNOWLEDGE_ACCOUNT_ID)
  lib/        auth (AuthProvider), session (tokens, refresh, idle), utils
  pages/      KnowledgeIngest, auth/ (Login, Register, ForgotPassword, ResetPassword)
```

## Scripts

| Command | Does |
|---|---|
| `npm run dev` | Vite dev server on :5174 |
| `npm run build` | Type-check (`tsc -b`) + production build |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Type-check only (`tsc --noEmit`) |
