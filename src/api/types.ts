// Types mirror knowledge-service's Pydantic DTOs (app/models/*.py).

// GET /v1/stats (admin role required — see app/dependencies.py::require_admin)
export interface KnowledgeStats {
  total_chunks: number;
  collection: string;
  db: string;
  file_store_backend: string;
  graph_retrieval_enabled: boolean;
  graph_db_backend: string;
  web_search_enabled: boolean;
  gateway_base_url: string;
}

// POST /v1/upload, POST /v1/ingest
export interface IngestResponse {
  job_id: string;
  status: string;
  message: string;
}

// GET /v1/ingest/{job_id}
export interface JobStatusResponse {
  job_id: string;
  status: "pending" | "running" | "completed" | "failed";
  inserted_count?: number | null;
  graph_inserted_count?: number | null;
  error?: string | null;
  started_at: string;
  completed_at?: string | null;
}

// A file persisted in the RAG file store (MongoDB GridFS — the sole backend).
export interface KnowledgeFile {
  file_id: string;
  filename: string;
  size: number;
  backend: string;
  content_type?: string | null;
  uploaded_at?: string | null;
  uploaded_by?: string | null;
}

// GET /v1/files
export interface FilesListResponse {
  backend: string;
  count: number;
  files: KnowledgeFile[];
}

// POST /v1/query response.sources[] shape — built in
// app/services/query_service.py::run_query, one entry per retrieved chunk.
export interface RagSourceChunk {
  source?: string | null;
  title?: string | null;
  section?: string | null;
  page_number?: number | null;
  chunk_id?: string | null;
  content?: string | null;
}

// response.citation_validation shape — see rag/citations.py.
export interface RagCitationValidation {
  valid: boolean;
  cited_numbers: number[];
  missing_citations: boolean;
  invalid_citations: number[];
  available_citations: number[];
}

// response.evaluation_metrics shape — see rag/evaluation.py::evaluate_answer.
export interface RagEvaluationMetrics {
  faithfulness: number;
  precision: number;
  recall: number;
  answer_relevance: number;
  confidence_score: number;
  confidence_level: "high" | "medium" | "low";
  evaluator: string;
  advanced_notes: string;
}

// POST /v1/query — full retrieve -> rerank -> generate pipeline.
export interface QueryResponse {
  question: string;
  answer: string;
  sources: RagSourceChunk[];
  citation_validation: RagCitationValidation;
  evaluation_metrics: RagEvaluationMetrics;
}
