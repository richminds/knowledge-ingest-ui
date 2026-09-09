import { api } from "./client";
import type {
  FilesListResponse,
  IngestResponse,
  JobStatusResponse,
  KnowledgeStats,
  QueryResponse,
} from "./types";

// Thin wrappers around knowledge-service's own routes (app/controllers/*.py) —
// there is no gateway in front, so these paths are exactly what the service
// exposes.

export const KnowledgeApi = {
  // Admin-role only (403 for a "user"-role key) — see require_admin.
  stats: () => api.get<KnowledgeStats>("/v1/stats").then((r) => r.data),

  jobStatus: (jobId: string) =>
    api.get<JobStatusResponse>(`/v1/ingest/${jobId}`).then((r) => r.data),

  // accountId scopes the list to that application's files (plus unscoped
  // ones); omit it to see only unscoped files — same fail-closed default as
  // query-time chunk filtering (see useKnowledgeFiles, which passes the
  // signed-in user's chosen account).
  files: (limit = 100, accountId?: string) =>
    api
      .get<FilesListResponse>("/v1/files", {
        params: { limit, account_id: accountId },
      })
      .then((r) => r.data),

  // userId/accountId tag every resulting chunk's metadata
  // (uploaded_by/account_id) — account_id is what query() below uses as the
  // hard isolation filter, so callers should always pass the signed-in user's
  // own values (see useKnowledgeUpload, which does this automatically from
  // auth state).
  upload: (
    files: File[],
    chunkStrategy = "recursive",
    userId?: string,
    accountId?: string
  ) => {
    const form = new FormData();
    files.forEach((f) => form.append("files", f));
    form.append("chunk_strategy", chunkStrategy);
    if (userId) form.append("user_id", userId);
    if (accountId) form.append("account_id", accountId);
    return api
      .post<IngestResponse>("/v1/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data);
  },

  // Full retrieve -> rerank -> generate pipeline, used by the test chat.
  // accountId restricts results to that application's chunks (plus unscoped
  // "*" ones); userId applies the (permissive, OR-based) authorized_users
  // check.
  query: (question: string, userId?: string, accountId?: string) =>
    api
      .post<QueryResponse>("/v1/query", {
        question,
        user_id: userId,
        account_id: accountId,
      })
      .then((r) => r.data),
};
