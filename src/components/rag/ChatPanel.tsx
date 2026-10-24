import { useEffect, useRef, useState } from "react";
import {
  BrainCircuit,
  ChevronDown,
  ChevronRight,
  FileSearch,
  Loader2,
  MessageSquareText,
  RotateCcw,
  Send,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { errorMessage } from "@/api/client";
import { useRagChat, useRagModes } from "@/api/hooks";
import type {
  ChatResponse,
  ChatTurn,
  Citation,
  QualityReport,
  RagMode,
  RetrievedContext,
} from "@/api/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  response?: ChatResponse;
  isError?: boolean;
}

// The API accepts at most 20 prior turns of up to 8000 characters each
// (ChatRequest.history in schemas.py).
const MAX_HISTORY = 20;
const MAX_TURN_CHARS = 8000;

const SUGGESTIONS = [
  "Which file formats are supported?",
  "Summarize the key points across the knowledge base.",
  "What are the main topics covered by the ingested documents?",
];

const CONFIDENCE_COLOR = {
  high: "text-[#2ec28a] border-[#2ec28a]/30",
  medium: "text-[#f5a623] border-[#f5a623]/30",
  low: "text-[#ff5d6c] border-[#ff5d6c]/30",
} as const;

export function ChatPanel({ collection }: { collection: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  // null = let the server use its default RAG_MODE.
  const [mode, setMode] = useState<RagMode | null>(null);
  const [evaluate, setEvaluate] = useState(false);
  const modes = useRagModes();
  const chat = useRagChat();
  const scrollEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chat.isPending]);

  async function send(question: string) {
    const q = question.trim();
    if (!q || chat.isPending) return;

    // Errors are UI-only, not part of the conversation the model should see.
    const history: ChatTurn[] = messages
      .filter((m) => !m.isError)
      .slice(-MAX_HISTORY)
      .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_TURN_CHARS) }));

    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "user", content: q }]);
    setInput("");

    try {
      const res = await chat.mutateAsync({
        query: q,
        collection,
        history,
        rag_mode: mode ?? undefined,
        evaluate,
      });
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "assistant", content: res.answer, response: res },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: errorMessage(
            err,
            "Query failed — check the RAG service is reachable and try again."
          ),
          isError: true,
        },
      ]);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }

  const canPickMode = modes.data?.allow_override && modes.data.enabled.length > 1;

  return (
    <div className="flex flex-col h-full min-h-[520px] rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border shrink-0 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#2ec28a]/10">
            <MessageSquareText className="w-4 h-4 text-[#2ec28a]" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">Test Chat</p>
            <p className="text-[10px] text-muted-foreground">
              Query the RAG pipeline end-to-end ·{" "}
              <span className="font-mono">{collection}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canPickMode && (
            <select
              value={mode ?? ""}
              onChange={(e) => setMode((e.target.value || null) as RagMode | null)}
              className="h-7 rounded-md border border-border bg-background px-2 text-[10px] font-mono"
              aria-label="RAG mode"
            >
              <option value="">default ({modes.data!.default})</option>
              {modes.data!.enabled.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          )}
          <label
            className="flex items-center gap-1 text-[10px] text-muted-foreground cursor-pointer"
            title="Score each answer with the LLM judge (one extra LLM call)"
          >
            <input
              type="checkbox"
              checked={evaluate}
              onChange={(e) => setEvaluate(e.target.checked)}
              className="accent-[#2ec28a]"
            />
            Judge
          </label>
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 text-[10px] text-muted-foreground"
              onClick={() => setMessages([])}
            >
              <RotateCcw className="w-3 h-3" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="px-4 py-4 space-y-4">
          {messages.length === 0 ? (
            <EmptyState onPick={(q) => send(q)} />
          ) : (
            messages.map((m) => <MessageBubble key={m.id} message={m} />)
          )}

          {chat.isPending && (
            <div className="flex items-start gap-2.5">
              <AssistantAvatar />
              <div className="flex items-center gap-2 rounded-2xl rounded-tl-sm bg-secondary/60 px-3.5 py-2.5 text-xs text-muted-foreground">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Retrieving passages and generating an answer…
              </div>
            </div>
          )}
          <div ref={scrollEndRef} />
        </div>
      </ScrollArea>

      {/* Composer */}
      <div className="border-t border-border p-3 shrink-0">
        <div className="flex items-end gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question about the ingested documents…"
            className="min-h-[44px] max-h-32 text-xs resize-none"
            maxLength={4000}
            rows={1}
          />
          <Button
            size="icon"
            className="shrink-0"
            disabled={!input.trim() || chat.isPending}
            onClick={() => send(input)}
            aria-label="Send"
          >
            {chat.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
        <p className="text-[9px] text-muted-foreground mt-1.5">
          Enter to send · Shift+Enter for a new line
        </p>
      </div>
    </div>
  );
}

function EmptyState({ onPick }: { onPick: (q: string) => void }) {
  return (
    <div className="flex flex-col items-center text-center gap-3 py-8">
      <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-[#2ec28a]/10">
        <BrainCircuit className="w-6 h-6 text-[#2ec28a]" />
      </div>
      <div>
        <p className="text-sm font-medium">Test retrieval &amp; generation</p>
        <p className="text-[11px] text-muted-foreground mt-1 max-w-[260px]">
          Ask a question and see exactly which passages were retrieved and how the LLM cited them.
        </p>
      </div>
      <div className="flex flex-col gap-1.5 w-full max-w-[280px] mt-1">
        {SUGGESTIONS.map((q) => (
          <button
            key={q}
            onClick={() => onPick(q)}
            className="text-left text-[11px] px-3 py-2 rounded-lg border border-border hover:border-[#2ec28a]/50 hover:bg-secondary/40 transition-colors text-muted-foreground hover:text-foreground"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}

function AssistantAvatar() {
  return (
    <div className="flex items-center justify-center w-7 h-7 rounded-full bg-[#2ec28a]/10 shrink-0 mt-0.5">
      <BrainCircuit className="w-3.5 h-3.5 text-[#2ec28a]" />
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  if (message.role === "user") {
    return (
      <div className="flex items-start gap-2.5 justify-end">
        <div className="rounded-2xl rounded-tr-sm bg-primary/15 border border-primary/20 px-3.5 py-2.5 text-xs max-w-[85%] whitespace-pre-wrap">
          {message.content}
        </div>
        <div className="flex items-center justify-center w-7 h-7 rounded-full bg-secondary shrink-0 mt-0.5">
          <User className="w-3.5 h-3.5 text-muted-foreground" />
        </div>
      </div>
    );
  }

  const res = message.response;
  return (
    <div className="flex items-start gap-2.5">
      <AssistantAvatar />
      <div className="space-y-2 max-w-[88%] min-w-0">
        <div
          className={cn(
            "rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-xs whitespace-pre-wrap leading-relaxed",
            message.isError
              ? "bg-[#ff5d6c]/10 border border-[#ff5d6c]/30 text-[#ff5d6c]"
              : "bg-secondary/60"
          )}
        >
          {message.content}
        </div>

        {res && (
          <div className="flex flex-wrap gap-1.5">
            {res.quality && <ConfidenceBadge quality={res.quality} />}
            <Badge variant="outline" className="text-[9px] font-mono font-normal">
              {res.rag_mode}
              {res.vector_store && ` · ${res.vector_store}`}
            </Badge>
            {res.answer_type !== "answer" && (
              <Badge variant="warning" className="text-[9px] font-normal">
                {res.answer_type.replace(/_/g, " ")}
              </Badge>
            )}
            {res.cached && (
              <Badge variant="secondary" className="text-[9px] font-normal">
                cached
              </Badge>
            )}
            {res.review_required && (
              <Badge variant="warning" className="text-[9px] font-normal">
                review required
              </Badge>
            )}
            {res.quality?.judge && (
              <>
                <ScoreBadge label="Grounded" value={res.quality.judge.groundedness} />
                <ScoreBadge label="Answer rel." value={res.quality.judge.answer_relevance} />
                <ScoreBadge label="Context rel." value={res.quality.judge.context_relevance} />
              </>
            )}
            <Badge variant="outline" className="text-[9px] font-normal">
              {(res.latency_ms / 1000).toFixed(1)}s
              {res.usage && ` · ${res.usage.total_tokens} tok`}
            </Badge>
          </div>
        )}

        {res?.quality?.explanation && (
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            {res.quality.explanation}
          </p>
        )}

        {res && res.citations.length > 0 && (
          <RetrievedPassages citations={res.citations} retrieved={res.retrieved ?? []} />
        )}
      </div>
    </div>
  );
}

// Judge scores run 1 (poor) to 5 (excellent).
function ScoreBadge({ label, value }: { label: string; value: number }) {
  const color = value >= 4 ? CONFIDENCE_COLOR.high : value >= 3 ? CONFIDENCE_COLOR.medium : CONFIDENCE_COLOR.low;
  return (
    <Badge variant="outline" className={cn("text-[9px] font-normal gap-1", color)}>
      {label} {value}/5
    </Badge>
  );
}

function ConfidenceBadge({ quality }: { quality: QualityReport }) {
  return (
    <Badge
      variant="outline"
      className={cn("text-[9px] font-semibold gap-1 capitalize", CONFIDENCE_COLOR[quality.confidence])}
    >
      {quality.confidence} confidence · {Math.round(quality.signals.citation_coverage * 100)}% cited
    </Badge>
  );
}

function RetrievedPassages({
  citations,
  retrieved,
}: {
  citations: Citation[];
  retrieved: RetrievedContext[];
}) {
  const [open, setOpen] = useState(false);
  // Full passage text comes from the trace (include_trace); fall back to the
  // citation's snippet when the server has RAG_ALLOW_TRACE off.
  const fullText = new Map(retrieved.map((r) => [r.index, r.content]));
  const cited = citations.filter((c) => c.cited).length;

  return (
    <div className="rounded-lg border border-border bg-background/60">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-1.5 px-3 py-2 text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <FileSearch className="w-3 h-3" />
        Retrieved passages ({citations.length}, {cited} cited)
        {open ? <ChevronDown className="w-3 h-3 ml-auto" /> : <ChevronRight className="w-3 h-3 ml-auto" />}
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-2">
          <Separator />
          {citations.map((c) => (
            <PassageCard key={c.chunk_id || c.index} citation={c} content={fullText.get(c.index) || c.snippet} />
          ))}
        </div>
      )}
    </div>
  );
}

function PassageCard({ citation: c, content }: { citation: Citation; content: string }) {
  const [expanded, setExpanded] = useState(false);
  const label = c.title || c.source || "Untitled source";

  return (
    <div className={cn("rounded-md border px-2.5 py-2 space-y-1", c.cited ? "border-[#2ec28a]/40" : "border-border/70")}>
      <div className="flex items-center gap-1.5 flex-wrap">
        <Badge variant={c.cited ? "success" : "outline"} className="text-[9px] font-mono px-1.5">
          [{c.index}]
        </Badge>
        {c.url ? (
          <a href={c.url} target="_blank" rel="noreferrer" className="text-[11px] font-medium truncate hover:underline">
            {label}
          </a>
        ) : (
          <span className="text-[11px] font-medium truncate">{label}</span>
        )}
        {c.page != null && <span className="text-[9px] text-muted-foreground">p. {c.page}</span>}
        {c.section_path && <span className="text-[9px] text-muted-foreground">· {c.section_path}</span>}
        <span className="text-[9px] text-muted-foreground ml-auto font-mono">
          {c.retriever && `${c.retriever} · `}
          {c.score.toFixed(3)}
        </span>
      </div>
      {content && (
        <button
          onClick={() => setExpanded((e) => !e)}
          className={cn(
            "text-left text-[10px] text-muted-foreground leading-relaxed w-full whitespace-pre-wrap",
            !expanded && "line-clamp-2"
          )}
        >
          {content}
        </button>
      )}
    </div>
  );
}
