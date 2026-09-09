import { useMutation, useQuery } from "@tanstack/react-query";
import { KnowledgeApi } from "./endpoints";
import { useAuth } from "@/lib/auth";

// No automatic polling — stats hits MongoDB directly, so the only refetch
// triggers are the initial mount and the page's manual "Refresh" button.
export function useKnowledgeStats() {
  return useQuery({
    queryKey: ["knowledge", "stats"],
    queryFn: KnowledgeApi.stats,
    refetchInterval: false,
  });
}

// Tags every resulting chunk with the signed-in user's own user_id/org_id and
// the account they signed in under (see api/endpoints.ts::KnowledgeApi.upload)
// so query-time isolation (useRagQuery below) has something to filter on.
export function useKnowledgeUpload() {
  const { user, accountId } = useAuth();
  return useMutation({
    mutationFn: ({ files, chunkStrategy }: { files: File[]; chunkStrategy?: string }) =>
      KnowledgeApi.upload(
        files,
        chunkStrategy,
        user?.user_id,
        user?.org_id ?? undefined,
        accountId ?? undefined
      ),
  });
}

// Files durably persisted in MongoDB GridFS — proves ingestion survives
// restarts. Same policy as useKnowledgeStats: manual "Refresh" only. Scoped
// to the signed-in user's own org_id and account (plus unscoped files) — both
// are part of the query key so switching accounts never shows a stale cached
// list from another one.
export function useKnowledgeFiles() {
  const { user, accountId } = useAuth();
  return useQuery({
    queryKey: ["knowledge", "files", user?.org_id ?? null, accountId ?? null],
    queryFn: () => KnowledgeApi.files(100, user?.org_id ?? undefined, accountId ?? undefined),
    refetchInterval: false,
  });
}

// Test-chat: runs the full RAG pipeline for one question (no server-side
// history). Scopes results to the signed-in user's own org_id and account — a
// chunk tagged with a different one is never returned, regardless of question.
export function useRagQuery() {
  const { user, accountId } = useAuth();
  return useMutation({
    mutationFn: (question: string) =>
      KnowledgeApi.query(
        question,
        user?.user_id,
        user?.org_id ?? undefined,
        accountId ?? undefined
      ),
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
