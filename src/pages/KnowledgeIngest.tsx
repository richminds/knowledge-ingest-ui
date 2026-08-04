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
  HardDrive,
  Waypoints,
  Globe2,
} from "lucide-react";
import { bytes, cn, formatDate } from "@/lib/utils";
import { useKnowledgeStats, useKnowledgeUpload, useIngestJob, useKnowledgeFiles } from "@/api/hooks";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ChatPanel } from "@/components/rag/ChatPanel";

// knowledge-service's loader only handles these three (rag/loader.py::SUPPORTED_EXTENSIONS).
const ACCEPTED = ".pdf,.txt,.md";
const STRATEGIES = ["recursive", "semantic"] as const;
type Strategy = (typeof STRATEGIES)[number];

const FILE_STORE_LABEL: Record<string, string> = {
  mongodb: "MongoDB GridFS",
};

export function KnowledgeIngest() {
  const [jobId, setJobId] = useState<string | null>(null);
  const job = useIngestJob(jobId);
  // job.isError (e.g. a 404 from a job the service no longer knows about)
  // must short-circuit this — React Query keeps the last successful
  // "pending"/"running" snapshot around even after the query starts
  // erroring, which would otherwise freeze `running` true forever.
  const running = !job.isError && (job.data?.status === "pending" || job.data?.status === "running");

  // No automatic refetching — only the initial mount and the manual
  // "Refresh" button below update these (both hit MongoDB directly).
  const stats = useKnowledgeStats();
  const persistedFiles = useKnowledgeFiles();
  const upload = useKnowledgeUpload();
  const [files, setFiles] = useState<File[]>([]);
  const [strategy, setStrategy] = useState<Strategy>("recursive");
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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

  async function handleUpload() {
    if (files.length === 0) return;
    try {
      const res = await upload.mutateAsync({ files, chunkStrategy: strategy });
      setJobId(res.job_id);
      setFiles([]);
      toast.success("Upload accepted", { description: res.message });
    } catch {
      toast.error("Upload failed", { description: "Check the knowledge service is reachable" });
    }
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[460px_minmax(0,1fr)] gap-6 items-start w-full">
      <div className="space-y-4 min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-br from-[#8b5cf6]/20 to-[#2ec28a]/10 ring-1 ring-[#8b5cf6]/20">
              <BrainCircuit className="w-5 h-5 text-[#8b5cf6]" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">Knowledge Ingest</h1>
              <p className="text-xs text-muted-foreground">Upload documents into the RAG vector store</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => {
              stats.refetch();
              persistedFiles.refetch();
            }}
          >
            <RefreshCw className={cn("w-3.5 h-3.5", stats.isFetching && "animate-spin")} />
            Refresh
          </Button>
        </div>

        {/* Stats */}
        <Card className="overflow-hidden">
          <CardContent className="flex items-center gap-3 pt-4 pb-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#8b5cf6]/10 shrink-0">
              <Database className="w-5 h-5 text-[#8b5cf6]" />
            </div>
            <div className="flex-1">
              <p className="text-[10px] text-muted-foreground">Indexed Chunks</p>
              {stats.isLoading ? (
                <Skeleton className="h-6 w-20 mt-1" />
              ) : stats.isError ? (
                <p className="text-sm text-[#ff5d6c]">
                  {(stats.error as { response?: { status?: number } })?.response?.status === 403
                    ? "Admin-role API key required for stats"
                    : "Knowledge service unavailable"}
                </p>
              ) : (
                <p className="text-xl font-bold">{stats.data?.total_chunks ?? 0}</p>
              )}
            </div>
            {stats.data && (
              <div className="text-right">
                <p className="text-[10px] text-muted-foreground">Collection</p>
                <p className="text-xs font-mono">
                  {stats.data.db}.{stats.data.collection}
                </p>
              </div>
            )}
          </CardContent>
          {stats.data && (
            <CardContent className="flex flex-wrap items-center gap-2 pt-0 pb-4">
              <Badge variant="outline" className="gap-1.5 text-[10px] font-normal">
                <HardDrive className="w-3 h-3 text-[#2ec28a]" />
                {FILE_STORE_LABEL[stats.data.file_store_backend] ?? stats.data.file_store_backend}
              </Badge>
              {stats.data.graph_retrieval_enabled && (
                <Badge variant="outline" className="gap-1.5 text-[10px] font-normal">
                  <Waypoints className="w-3 h-3 text-[#f5a623]" />
                  Graph retrieval ({stats.data.graph_db_backend})
                </Badge>
              )}
              {stats.data.web_search_enabled && (
                <Badge variant="outline" className="gap-1.5 text-[10px] font-normal">
                  <Globe2 className="w-3 h-3 text-[#8b5cf6]" />
                  Web search on
                </Badge>
              )}
            </CardContent>
          )}
        </Card>

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
          <p className="text-[10px] text-muted-foreground">PDF, TXT, or MD</p>
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
                  className="p-1 rounded text-muted-foreground hover:text-[#ff5d6c] hover:bg-secondary"
                  aria-label="Remove file"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Chunk strategy + submit */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Chunking:</span>
            {STRATEGIES.map((s) => (
              <button
                key={s}
                onClick={() => setStrategy(s)}
                className={cn(
                  "text-xs px-3 py-1 rounded-md border capitalize transition-colors",
                  strategy === s
                    ? "bg-primary/15 text-primary border-primary/30"
                    : "border-border text-muted-foreground hover:bg-secondary"
                )}
              >
                {s}
              </button>
            ))}
          </div>
          <Button
            size="sm"
            className="h-8 gap-1.5 text-xs"
            disabled={files.length === 0 || upload.isPending}
            onClick={handleUpload}
          >
            {upload.isPending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading…
              </>
            ) : (
              <>
                <UploadCloud className="w-3.5 h-3.5" /> Ingest {files.length || ""}
              </>
            )}
          </Button>
        </div>

        {/* Job status */}
        {jobId && job.data && (
          <Card className="animate-fade-in">
            <CardContent className="flex items-center gap-3 pt-4 pb-4">
              {running ? (
                <Loader2 className="w-5 h-5 text-[#f5a623] animate-spin shrink-0" />
              ) : job.data.status === "completed" ? (
                <CheckCircle2 className="w-5 h-5 text-[#2ec28a] shrink-0" />
              ) : (
                <XCircle className="w-5 h-5 text-[#ff5d6c] shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold capitalize">{job.data.status}</p>
                  <Badge variant="outline" className="text-[9px] font-mono">
                    {jobId.slice(0, 8)}
                  </Badge>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {job.data.status === "completed"
                    ? `${job.data.inserted_count ?? 0} chunk(s) indexed`
                    : job.data.status === "failed"
                    ? job.data.error ?? "Ingestion failed"
                    : "Processing documents…"}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Persisted documents — proves uploads survive restarts in MongoDB GridFS */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Persisted Documents
            </p>
            {persistedFiles.data && (
              <span className="text-[10px] text-muted-foreground">
                {persistedFiles.data.count} file{persistedFiles.data.count !== 1 ? "s" : ""} in{" "}
                {FILE_STORE_LABEL[persistedFiles.data.backend] ?? persistedFiles.data.backend}
              </span>
            )}
          </div>

          {persistedFiles.isLoading ? (
            <Skeleton className="h-16 w-full rounded-xl" />
          ) : persistedFiles.isError ? (
            <Card>
              <CardContent className="py-4 text-sm text-[#ff5d6c]">
                Could not load persisted documents — check the knowledge service is reachable.
              </CardContent>
            </Card>
          ) : !persistedFiles.data || persistedFiles.data.files.length === 0 ? (
            <Card>
              <CardContent className="py-6 text-center text-xs text-muted-foreground">
                No documents persisted yet. Uploaded files are written to MongoDB GridFS before
                ingestion, so they survive a service restart.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-1.5">
              {persistedFiles.data.files.map((f) => (
                <div
                  key={f.file_id}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg border border-border bg-card"
                >
                  <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="flex-1 text-sm truncate">{f.filename}</span>
                  <span className="text-[10px] text-muted-foreground shrink-0 hidden sm:inline">
                    {formatDate(f.uploaded_at)}
                  </span>
                  <span className="text-[10px] text-muted-foreground shrink-0">{bytes(f.size)}</span>
                  <Badge variant="outline" className="text-[9px] font-mono shrink-0">
                    {f.file_id.slice(0, 10)}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Test chat — query the pipeline and inspect retrieved chunks */}
      <div className="xl:sticky xl:top-4 h-[calc(100vh-6rem)] min-h-[520px]">
        <ChatPanel />
      </div>
    </div>
  );
}
