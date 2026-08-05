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

  files: (limit = 100) =>
    api.get<FilesListResponse>("/v1/files", { params: { limit } }).then((r) => r.data),

  // userId/orgId tag every resulting chunk's metadata (uploaded_by/org_id) —
  // org_id is what query() below uses as a hard tenant-isolation filter, so
  // callers should always pass the signed-in user's own org_id here (see
  // useKnowledgeUpload, which does this automatically from auth state).
  upload: (files: File[], chunkStrategy = "recursive", userId?: string, orgId?: string) => {
    const form = new FormData();
    files.forEach((f) => form.append("files", f));
    form.append("chunk_strategy", chunkStrategy);
    if (userId) form.append("user_id", userId);
    if (orgId) form.append("org_id", orgId);
    return api
      .post<IngestResponse>("/v1/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data);
  },

  // Full retrieve -> rerank -> generate pipeline, used by the test chat.
  // orgId restricts results to that org's chunks (plus unscoped "*" ones);
  // userId applies the (permissive, OR-based) authorized_users check.
  query: (question: string, userId?: string, orgId?: string) =>
    api
      .post<QueryResponse>("/v1/query", { question, user_id: userId, org_id: orgId })
      .then((r) => r.data),
};
