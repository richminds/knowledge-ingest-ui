import { useRef, useState } from "react";
import { toast } from "sonner";
import {
  UploadCloud,
  FileText,
  X,
  Database,
  CheckCircle2,
  XCircle,
  Loader2,
  BrainCircuit,
  RefreshCw,
  Waypoints,
  Trash2,
  FolderOpen,
} from "lucide-react";
import { bytes, cn, formatDate } from "@/lib/utils";
import { errorMessage } from "@/api/client";
import { useDeleteSource, useKnowledgeUpload, useManifest, useReadiness } from "@/api/hooks";
import type { ManifestEntry } from "@/api/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ChatPanel } from "@/components/rag/ChatPanel";

// The RAG service's default INGESTION_UPLOAD_EXTENSIONS (src/app/core/config.py).
// The server re-checks by extension and content, so a deployment that narrows
// the list still answers 415 with the reason.
const ACCEPTED = ".pdf,.docx,.xlsx,.txt,.json,.xml,.png,.jpg,.jpeg";
// Same charset the API enforces on collection names (COLLECTION_PATTERN).
const COLLECTION_RE = /^[A-Za-z0-9_-]{1,64}$/;

type UploadResult =
  | { name: string; ok: true; chunks: number; entities: number }
  | { name: string; ok: false; error: string };

const STATUS_VARIANT: Record<string, "success" | "warning" | "destructive" | "secondary"> = {
  indexed: "success",
  skipped: "secondary",
  quarantined: "warning",
  failed: "destructive",
  deleted: "secondary",
};

export function KnowledgeIngest() {
  const [collection, setCollection] = useState("default");
  const [collectionDraft, setCollectionDraft] = useState("default");
  const [graph, setGraph] = useState(true);
  const [files, setFiles] = useState<File[]>([]);
  const [results, setResults] = useState<UploadResult[]>([]);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // No automatic refetching — only the initial mount, a finished upload and
  // the manual "Refresh" button below update these.
  const ready = useReadiness();
  const manifest = useManifest(collection);
  const upload = useKnowledgeUpload();
  const remove = useDeleteSource();
  const uploading = progress !== null;

  function addFiles(list: FileList | null) {
    if (!list) return;
    const incoming = Array.from(list);
    setFiles((prev) => {
      const seen = new Set(prev.map((f) => f.name + f.size));
      return [...prev, ...incoming.filter((f) => !seen.has(f.name + f.size))];
    });
  }

  function removeFile(idx: number) {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  function applyCollection() {
    const next = collectionDraft.trim();
    if (!COLLECTION_RE.test(next)) {
      toast.error("Invalid collection", {
        description: "Use 1–64 letters, digits, '-' or '_'",
      });
      return;
    }
    setCollection(next);
  }

  // The upload endpoint takes one file and ingests it synchronously, so send
  // them one at a time: a large batch in parallel would just queue on the
  // server's embedding calls, and sequential results arrive in a stable order.
  async function handleUpload() {
    if (files.length === 0) return;
    const batch = files;
    const targets = graph ? ["vector", "graph"] : ["vector"];
    const out: UploadResult[] = [];
    setResults([]);
    setProgress({ done: 0, total: batch.length });
    for (const file of batch) {
      try {
        const res = await upload.mutateAsync({ file, collection, targets });
        out.push({ name: file.name, ok: true, chunks: res.chunk_count, entities: res.entity_count });
      } catch (err) {
        out.push({ name: file.name, ok: false, error: errorMessage(err, "Upload failed") });
      }
      setResults([...out]);
      setProgress({ done: out.length, total: batch.length });
    }
    setProgress(null);
    setFiles([]);
    const failed = out.filter((r) => !r.ok).length;
    if (failed === 0) toast.success(`Ingested ${out.length} file${out.length !== 1 ? "s" : ""}`);
    else toast.error(`${failed} of ${out.length} file${out.length !== 1 ? "s" : ""} failed`);
  }

  async function handleDelete(entry: ManifestEntry) {
    if (!window.confirm(`Remove "${entry.title || entry.source}" from every store?`)) return;
    try {
      const res = await remove.mutateAsync({ source: entry.source, collection });
      toast.success("Document removed", {
        description: `${res.deleted_chunks} chunk(s) deleted`,
      });
    } catch (err) {
      toast.error("Delete failed", { description: errorMessage(err, "Check the RAG service") });
    }
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[460px_minmax(0,1fr)] gap-6 items-start xl:items-stretch w-full xl:h-full xl:min-h-0">
      <div className="flex flex-col gap-4 min-w-0 xl:h-full xl:min-h-0">
        <div className="space-y-4 shrink-0">
          {/* Header */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-br from-[#8b5cf6]/20 to-[#2ec28a]/10 ring-1 ring-[#8b5cf6]/20">
                <BrainCircuit className="w-5 h-5 text-[#8b5cf6]" />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight">Knowledge Ingest</h1>
                <p className="text-xs text-muted-foreground">
                  Upload documents into the OISSA knowledge RAG
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={() => {
                ready.refetch();
                manifest.refetch();
              }}
            >
              <RefreshCw
                className={cn("w-3.5 h-3.5", (ready.isFetching || manifest.isFetching) && "animate-spin")}
              />
              Refresh
            </Button>
          </div>

          {/* Service status */}
          <Card className="overflow-hidden">
            <CardContent className="flex items-center gap-3 pt-4 pb-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#8b5cf6]/10 shrink-0">
                <Database className="w-5 h-5 text-[#8b5cf6]" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] text-muted-foreground">RAG service</p>
                {ready.isLoading ? (
                  <Skeleton className="h-6 w-20 mt-1" />
                ) : ready.isError ? (
                  <p className="text-sm text-[#ff5d6c]">Unreachable</p>
                ) : (
                  <p
                    className={cn(
                      "text-xl font-bold",
                      ready.data?.status === "ready" ? "text-[#2ec28a]" : "text-[#f5a623]"
                    )}
                  >
                    {ready.data?.status === "ready" ? "Ready" : "Not ready"}
                  </p>
                )}
              </div>
              {ready.data && (
                <div className="text-right">
                  <p className="text-[10px] text-muted-foreground">Default mode</p>
                  <p className="text-xs font-mono">{ready.data.rag_mode}</p>
                </div>
              )}
            </CardContent>
            {ready.data && (
              <CardContent className="flex flex-wrap items-center gap-2 pt-0 pb-4">
                {Object.entries(ready.data.checks).map(([name, value]) => (
                  <Badge
                    key={name}
                    variant={value === "ok" ? "outline" : "destructive"}
                    className="text-[10px] font-normal max-w-full"
                    title={value}
                  >
                    <span className="truncate">
                      {name}
                      {value !== "ok" && `: ${value}`}
                    </span>
                  </Badge>
                ))}
              </CardContent>
            )}
          </Card>

          {/* Collection */}
          <div className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="text-xs text-muted-foreground">Collection:</span>
            <input
              value={collectionDraft}
              onChange={(e) => setCollectionDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applyCollection()}
              onBlur={applyCollection}
              className="h-8 flex-1 min-w-0 rounded-md border border-border bg-background px-2.5 text-xs font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Collection"
            />
          </div>

          {/* Dropzone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              addFiles(e.dataTransfer.files);
            }}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "flex flex-col items-center justify-center gap-2 py-10 rounded-xl border-2 border-dashed cursor-pointer transition-colors",
              dragging
                ? "border-[#8b5cf6] bg-[#8b5cf6]/5"
                : "border-border hover:border-[#8b5cf6]/50 hover:bg-secondary/40"
            )}
          >
            <UploadCloud className="w-8 h-8 text-muted-foreground" />
            <p className="text-sm font-medium">Drop files here or click to browse</p>
            <p className="text-[10px] text-muted-foreground">
              PDF, DOCX, XLSX, TXT, JSON, XML, PNG or JPG
            </p>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept={ACCEPTED}
              className="hidden"
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </div>

          {/* Selected files */}
          {files.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                {files.length} file{files.length !== 1 ? "s" : ""} selected
              </p>
              {files.map((f, i) => (
                <div
                  key={f.name + f.size}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg border border-border bg-card"
                >
                  <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="flex-1 text-sm truncate">{f.name}</span>
                  <span className="text-[10px] text-muted-foreground shrink-0">{bytes(f.size)}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(i);
                    }}
                    disabled={uploading}
                    className="p-1 rounded text-muted-foreground hover:text-[#ff5d6c] hover:bg-secondary"
                    aria-label="Remove file"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Targets + submit */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={graph}
                onChange={(e) => setGraph(e.target.checked)}
                className="accent-[#8b5cf6]"
              />
              <Waypoints className="w-3.5 h-3.5 text-[#f5a623]" />
              Also build knowledge graph
              <span className="text-[10px]">(LLM extraction, slower)</span>
            </label>
            <Button
              size="sm"
              className="h-8 gap-1.5 text-xs"
              disabled={files.length === 0 || uploading}
              onClick={handleUpload}
            >
              {progress ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Ingesting {progress.done + 1}/
                  {progress.total}…
                </>
              ) : (
                <>
                  <UploadCloud className="w-3.5 h-3.5" /> Ingest {files.length || ""}
                </>
              )}
            </Button>
          </div>

          {/* Upload results */}
          {results.length > 0 && (
            <Card className="animate-fade-in">
              <CardContent className="pt-4 pb-4 space-y-2">
                {results.map((r, i) => (
                  <div key={`${r.name}-${i}`} className="flex items-start gap-2.5">
                    {r.ok ? (
                      <CheckCircle2 className="w-4 h-4 text-[#2ec28a] shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-4 h-4 text-[#ff5d6c] shrink-0 mt-0.5" />
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate">{r.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {r.ok
                          ? `${r.chunks} chunk(s) indexed${r.entities ? ` · ${r.entities} entities` : ""}`
                          : r.error}
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Indexed documents (the ingestion manifest). This section, not the
            page, scrolls when the list overflows. */}
        <div className="flex flex-col gap-2 min-h-0 xl:flex-1">
          <div className="flex items-center justify-between shrink-0">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Documents
            </p>
            {manifest.data && (
              <span className="text-[10px] text-muted-foreground">
                {manifest.data.length} in <span className="font-mono">{collection}</span>
              </span>
            )}
          </div>

          {manifest.isLoading ? (
            <Skeleton className="h-16 w-full rounded-xl shrink-0" />
          ) : manifest.isError ? (
            <Card className="shrink-0">
              <CardContent className="py-4 text-sm text-[#ff5d6c]">
                {errorMessage(
                  manifest.error,
                  "Could not load documents — check the RAG service is reachable."
                )}
              </CardContent>
            </Card>
          ) : !manifest.data || manifest.data.length === 0 ? (
            <Card className="shrink-0">
              <CardContent className="py-6 text-center text-xs text-muted-foreground">
                No documents in this collection yet.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-1.5 overflow-y-auto scrollbar-thin pr-1 xl:flex-1 xl:min-h-0">
              {manifest.data.map((d) => (
                <div
                  key={d.doc_id || d.source}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg border border-border bg-card"
                  title={[d.source, d.error, ...d.reasons].filter(Boolean).join("\n")}
                >
                  <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="flex-1 text-sm truncate">{d.title || d.source}</span>
                  <span className="text-[10px] text-muted-foreground shrink-0 hidden sm:inline">
                    {formatDate(d.updated_at)}
                  </span>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {d.chunk_count} chunk{d.chunk_count !== 1 ? "s" : ""}
                  </span>
                  <Badge
                    variant={STATUS_VARIANT[d.status] ?? "outline"}
                    className="text-[9px] shrink-0 capitalize"
                  >
                    {d.status}
                  </Badge>
                  {d.status !== "deleted" && (
                    <button
                      onClick={() => handleDelete(d)}
                      disabled={remove.isPending}
                      className="p-1 rounded text-muted-foreground hover:text-[#ff5d6c] hover:bg-secondary shrink-0"
                      aria-label="Delete document"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Test chat — query the pipeline and inspect retrieved passages */}
      <div className="min-h-[520px] xl:h-full">
        <ChatPanel collection={collection} />
      </div>
    </div>
  );
}
