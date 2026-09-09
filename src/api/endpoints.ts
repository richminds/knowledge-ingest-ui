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

  // orgId/accountId scope the list to that org's/application's files (plus
  // unscoped ones); omit them to see only unscoped files — same fail-closed
  // default as query-time chunk filtering (see useKnowledgeFiles, which
  // passes the signed-in user's org and chosen account).
  files: (limit = 100, orgId?: string, accountId?: string) =>
    api
      .get<FilesListResponse>("/v1/files", {
        params: { limit, org_id: orgId, account_id: accountId },
      })
      .then((r) => r.data),

  // userId/orgId/accountId tag every resulting chunk's metadata
  // (uploaded_by/org_id/account_id) — org_id and account_id are what query()
  // below uses as hard isolation filters, so callers should always pass the
  // signed-in user's own values (see useKnowledgeUpload, which does this
  // automatically from auth state).
  upload: (
    files: File[],
    chunkStrategy = "recursive",
    userId?: string,
    orgId?: string,
    accountId?: string
  ) => {
    const form = new FormData();
    files.forEach((f) => form.append("files", f));
    form.append("chunk_strategy", chunkStrategy);
    if (userId) form.append("user_id", userId);
    if (orgId) form.append("org_id", orgId);
    if (accountId) form.append("account_id", accountId);
    return api
      .post<IngestResponse>("/v1/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data);
  },

  // Full retrieve -> rerank -> generate pipeline, used by the test chat.
  // orgId/accountId restrict results to that org's/application's chunks (plus
  // unscoped "*" ones); userId applies the (permissive, OR-based)
  // authorized_users check.
  query: (question: string, userId?: string, orgId?: string, accountId?: string) =>
    api
      .post<QueryResponse>("/v1/query", {
        question,
        user_id: userId,
        org_id: orgId,
        account_id: accountId,
      })
      .then((r) => r.data),
};
