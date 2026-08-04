import { useMutation, useQuery } from "@tanstack/react-query";
import { KnowledgeApi } from "./endpoints";

// No automatic polling — stats hits MongoDB directly, so the only refetch
// triggers are the initial mount and the page's manual "Refresh" button.
export function useKnowledgeStats() {
  return useQuery({
    queryKey: ["knowledge", "stats"],
    queryFn: KnowledgeApi.stats,
    refetchInterval: false,
  });
}

export function useKnowledgeUpload() {
  return useMutation({
    mutationFn: ({ files, chunkStrategy }: { files: File[]; chunkStrategy?: string }) =>
      KnowledgeApi.upload(files, chunkStrategy),
  });
}

// Files durably persisted in MongoDB GridFS — proves ingestion survives
// restarts. Same policy as useKnowledgeStats: manual "Refresh" only.
export function useKnowledgeFiles() {
  return useQuery({
    queryKey: ["knowledge", "files"],
    queryFn: () => KnowledgeApi.files(),
    refetchInterval: false,
  });
}

// Test-chat: runs the full RAG pipeline for one question (no server-side history).
export function useRagQuery() {
  return useMutation({
    mutationFn: (question: string) => KnowledgeApi.query(question),
  });
}

// Polls a running ingestion job until it completes or fails.
export function useIngestJob(jobId: string | null) {
  return useQuery({
    queryKey: ["knowledge", "job", jobId],
    queryFn: () => KnowledgeApi.jobStatus(jobId as string),
    enabled: Boolean(jobId),
    // A 404 (e.g. the service restarted and the in-memory job registry was
    // wiped — see app/services/ingest_service.py) is definitive; retrying
    // can't fix it.
    retry: false,
    refetchInterval: (query) => {
      // React Query keeps the last *successful* data around even once a
      // later fetch starts failing — without this check, a stale
      // "pending"/"running" snapshot from before a 404 would freeze `status`
      // forever and this would never stop polling.
      if (query.state.status === "error") return false;
      const s = query.state.data?.status;
      if (s === "completed" || s === "failed") return false;
      return 1500;
    },
  });
}
