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

  upload: (files: File[], chunkStrategy = "recursive") => {
    const form = new FormData();
    files.forEach((f) => form.append("files", f));
    form.append("chunk_strategy", chunkStrategy);
    return api
      .post<IngestResponse>("/v1/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data);
  },

  // Full retrieve -> rerank -> generate pipeline, used by the test chat.
  query: (question: string) =>
    api.post<QueryResponse>("/v1/query", { question }).then((r) => r.data),
};
