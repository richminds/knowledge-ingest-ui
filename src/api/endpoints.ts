import { api } from "./client";
import type {
  ChatRequest,
  ChatResponse,
  DeleteResponse,
  ManifestEntry,
  RagModesResponse,
  ReadinessResponse,
  UploadIngestionResponse,
} from "./types";

// Thin wrappers around the RAG service's routes
// (src/app/api/v1/endpoints/*.py, mounted under /api/v1).
const V1 = "/api/v1";

export const KnowledgeApi = {
  // A 503 still carries the full readiness body (which check failed), so
  // treat it as data rather than an error.
  ready: () =>
    api
      .get<ReadinessResponse>(`${V1}/health/ready`, {
        validateStatus: (s) => s === 200 || s === 503,
      })
      .then((r) => r.data),

  modes: () => api.get<RagModesResponse>(`${V1}/rag/modes`).then((r) => r.data),

  manifest: (collection: string) =>
    api
      .get<ManifestEntry[]>(`${V1}/ingestion/manifest`, { params: { collection } })
      .then((r) => r.data),

  // Synchronous: the response arrives once the file is parsed, chunked,
  // embedded and indexed. The endpoint takes exactly one file, so callers
  // send one request per file (see useKnowledgeUpload).
  upload: (file: File, collection: string, targets: string[]) => {
    const form = new FormData();
    form.append("file", file);
    form.append("collection", collection);
    form.append("targets", targets.join(","));
    return api
      .post<UploadIngestionResponse>(`${V1}/ingestion/upload`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data);
  },

  // Removes one document from the vector index, the graph and the answer cache.
  deleteSource: (source: string, collection: string) =>
    api
      .delete<DeleteResponse>(`${V1}/ingestion/sources`, { params: { source, collection } })
      .then((r) => r.data),

  chat: (body: ChatRequest) => api.post<ChatResponse>(`${V1}/chat`, body).then((r) => r.data),
};
