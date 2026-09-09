# Knowledge Ingest UI

Standalone console for [`knowledge-service`](../knowledge-service): upload
documents into the RAG vector store, inspect what's indexed, and test
retrieval end to end with a chat that shows exactly which chunks an answer
came from.

Signs in through [`auth-service`](../auth-service). Talks to both services
directly — there is no gateway/BFF in front.

## Sign-in only — no sign-up

This console **never creates users**. Accounts and their application
memberships are provisioned elsewhere (auth-service `/auth/accounts` +
`PATCH /auth/users/{id}/accounts`, administered from
[`account-management-ui`](../account-management-ui)); people sign in with the
credentials they were given.

A user can belong to more than one application. The sign-in flow reflects that:

1. **Email + password.** On success, auth-service returns the session token
   plus the `accounts` the user may work under — but only after the password
   verifies, so memberships stay private (see auth-service's
   [multi-account login](../auth-service/README.md#users-who-belong-to-more-than-one-application)).
2. **One account** → straight into the console, scoped to it.
3. **Two or more** → the same screen switches to an account dropdown. The
   session already exists but is held back (`pendingAccountChoice`) until the
   user picks one; choosing calls `POST /auth/me/account`, which re-issues the
   token scoped to that application.

The chosen account is what [`knowledge-service`](../knowledge-service/README.md#account-and-tenant-isolation)
filters every chunk and file on, so it is a signed token claim, not a
client-side preference. To switch accounts, sign out and back in.

## Account scoping

Every request carries the signed-in user's scope so isolation is enforced
server-side:

- **Uploads** tag each chunk and the GridFS file with the user's `user_id`,
  `org_id`, and the `account_id` they signed in under.
- **Queries** and the **file list** pass the same `org_id`/`account_id`, so a
  chunk or file from another tenant or application is never returned.

The active account and org are shown as badges in the header. React Query
cache keys include both, so switching sessions never shows a stale list from a
different scope.

## Quick start

```bash
npm install

# Terminal 1 — auth-service on :8100
cd ../auth-service && python run.py

# Terminal 2 — knowledge-service on :8090
cd ../knowledge-service && python run.py

# Terminal 3 — this console on :5174
npm run dev
```

Then open http://localhost:5174 and sign in.

> **Local dev talks to whatever services you point at.** Leave
> `VITE_API_BASE_URL` / `VITE_AUTH_BASE_URL` unset and the Vite proxy targets
> `localhost:8090` (knowledge-service) and `localhost:8100` (auth-service).
> Set them to administer/ingest against a deployed instance instead.

## Configuration

| Env var | Default (dev proxy) | Purpose |
|---|---|---|
| `VITE_API_BASE_URL` | `""` → proxy to `localhost:8090` | knowledge-service base URL |
| `VITE_AUTH_BASE_URL` | `""` → proxy to `localhost:8100` | auth-service base URL |
| `VITE_API_KEY` | unset | Static `X-API-Key` for knowledge-service. **Bypasses per-user JWT scoping** — only for a deployment that intentionally treats every request as one shared service principal, never alongside real end-user login. |

## Endpoints used

| Service | Method | Path | Purpose |
|---|---|---|---|
| auth | `POST` | `/auth/login` | Sign in; returns the `accounts` the user may work under |
| auth | `POST` | `/auth/me/account` | Re-scope the token to a chosen application |
| auth | `GET` | `/auth/me` | Re-validate a stored session |
| auth | `POST` | `/auth/logout` | Revoke the current token |
| knowledge | `POST` | `/v1/upload` | Upload + ingest files (scoped by `org_id`/`account_id`) |
| knowledge | `GET` | `/v1/ingest/{job_id}` | Poll ingestion job status |
| knowledge | `GET` | `/v1/files` | List persisted files for the caller's scope |
| knowledge | `POST` | `/v1/query` | Run the RAG pipeline for the test chat |

## Stack

Vite 5 · React 18 · TypeScript · Tailwind CSS v3 · TanStack Query v5 · axios ·
lucide-react · sonner.

```
src/
  api/        auth + knowledge clients, endpoints, React Query hooks, types
  components/ GuestBanner, rag/ChatPanel, ui/
  lib/        auth context (auth.tsx), utils
  pages/      AuthScreen (sign-in + account picker), KnowledgeIngest
```

## Scripts

| Command | Does |
|---|---|
| `npm run dev` | Vite dev server on :5174 |
| `npm run build` | Type-check (`tsc -b`) + production build |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Type-check only (`tsc --noEmit`) |
