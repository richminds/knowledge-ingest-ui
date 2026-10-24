import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KnowledgeApi } from "./endpoints";
import type { ChatRequest } from "./types";

// No automatic polling — the only refetch triggers are the initial mount and
// the page's manual "Refresh" button.
export function useReadiness() {
  return useQuery({
    queryKey: ["rag", "ready"],
    queryFn: KnowledgeApi.ready,
    refetchInterval: false,
  });
}

export function useRagModes() {
  return useQuery({
    queryKey: ["rag", "modes"],
    queryFn: KnowledgeApi.modes,
    refetchInterval: false,
  });
}

// Per-document ingestion status for one collection. The collection is part of
// the key so switching it never shows a stale list from another one.
export function useManifest(collection: string) {
  return useQuery({
    queryKey: ["rag", "manifest", collection],
    queryFn: () => KnowledgeApi.manifest(collection),
    refetchInterval: false,
  });
}

export function useKnowledgeUpload() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      file,
      collection,
      targets,
    }: {
      file: File;
      collection: string;
      targets: string[];
    }) => KnowledgeApi.upload(file, collection, targets),
    onSuccess: (_data, { collection }) =>
      qc.invalidateQueries({ queryKey: ["rag", "manifest", collection] }),
  });
}

export function useDeleteSource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ source, collection }: { source: string; collection: string }) =>
      KnowledgeApi.deleteSource(source, collection),
    onSuccess: (_data, { collection }) =>
      qc.invalidateQueries({ queryKey: ["rag", "manifest", collection] }),
  });
}

// Test chat: one grounded answer per call. include_trace is always on so the
// panel can show the full text of every passage the answer was built from.
export function useRagChat() {
  return useMutation({
    mutationFn: (body: ChatRequest) => KnowledgeApi.chat({ include_trace: true, ...body }),
  });
}
