// Types mirror wbg-oissaagent-knowledge's Pydantic DTOs (src/app/models/schemas.py).

export type RagMode = "semantic" | "hybrid" | "hybrid_graph" | "graph" | "agentic" | "auto";

// GET /api/v1/health/ready — 200 when every check is "ok", 503 otherwise
// (same body either way; see endpoints.ts::KnowledgeApi.ready).
export interface ReadinessResponse {
  status: "ready" | "not_ready";
  rag_mode: RagMode;
  enabled_modes: RagMode[];
  checks: Record<string, string>;
}

// GET /api/v1/rag/modes
export interface RagModesResponse {
  default: RagMode;
  enabled: RagMode[];
  allow_override: boolean;
  vector_stores: string[];
  default_vector_store: string;
}

// POST /api/v1/ingestion/upload — synchronous, one file per request.
export interface UploadIngestionResponse {
  source: string;
  collection: string;
  targets: string[];
  chunk_count: number;
  entity_count: number;
  relation_count: number;
}

// GET /api/v1/ingestion/manifest — one row per document.
export interface ManifestEntry {
  source: string;
  doc_id: string;
  // indexed | skipped | quarantined | failed | deleted
  status: string;
  title: string;
  chunk_count: number;
  entity_count: number;
  acl: string[];
  duplicate_of: string;
  error: string;
  reasons: string[];
  run_id: string;
  updated_at: string;
}

// DELETE /api/v1/ingestion/sources
export interface DeleteResponse {
  collection: string;
  deleted_chunks: number;
  deleted_graph_nodes: number;
}

// POST /api/v1/chat request
export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface ChatRequest {
  query: string;
  collection?: string;
  history?: ChatTurn[];
  rag_mode?: RagMode;
  include_trace?: boolean;
  evaluate?: boolean;
}

export interface Citation {
  index: number;
  chunk_id: string;
  source: string;
  score: number;
  title?: string | null;
  retriever?: string | null;
  cited: boolean;
  doc_id: string;
  section_path: string;
  page?: number | null;
  url?: string | null;
  snippet: string;
}

// Full passage text; only returned when include_trace is set.
export interface RetrievedContext {
  index: number;
  chunk_id: string;
  kind: string;
  title: string;
  section_path: string;
  source: string;
  page?: number | null;
  score: number;
  retriever?: string | null;
  cited: boolean;
  content: string;
}

export interface QualitySignals {
  answered: boolean;
  contexts_retrieved: number;
  cited_passages: number[];
  invalid_citations: number[];
  citation_coverage: number;
  cited_context_ratio: number;
}

// LLM-as-judge scores, 1 (poor) to 5 (excellent).
export interface JudgeScores {
  groundedness: number;
  answer_relevance: number;
  context_relevance: number;
  reasoning: string;
  unsupported_claims: string[];
}

export interface QualityReport {
  confidence: "high" | "medium" | "low";
  explanation: string;
  evaluated_by: "signals" | "signals+llm_judge";
  signals: QualitySignals;
  judge?: JudgeScores | null;
}

export interface Usage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  llm_calls: number;
}

export type AnswerType =
  | "answer"
  | "not_found"
  | "chitchat"
  | "out_of_scope"
  | "blocked"
  | "clarification";

// POST /api/v1/chat response
export interface ChatResponse {
  response_id: string;
  answer: string;
  answer_type: AnswerType;
  citations: Citation[];
  rag_mode: RagMode;
  vector_store: string;
  cached: boolean;
  review_required: boolean;
  quality?: QualityReport | null;
  usage?: Usage | null;
  latency_ms: number;
  retrieved?: RetrievedContext[] | null;
}
