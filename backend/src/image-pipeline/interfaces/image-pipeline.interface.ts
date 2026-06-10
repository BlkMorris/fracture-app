/**
 * Shared interfaces for the image fallback pipeline.
 */

/** Structured context extracted from an article for image searching */
export interface ImageContext {
  /** Primary topic / headline subject */
  topic: string;
  /** Named entities: people, organisations, locations */
  entities: string[];
  /** News category: politics, conflict, economy, technology, etc. */
  category: string;
  /** Visual keywords for image search queries */
  visualKeywords: string[];
  /** The raw article title for similarity comparison */
  articleTitle: string;
  /** The raw article summary for similarity comparison */
  articleSummary: string;
}

/** A candidate image returned from a search API */
export interface ImageCandidate {
  /** URL of the image */
  url: string;
  /** Image description or alt text from the source */
  description: string;
  /** Tags/keywords associated with the image */
  tags: string[];
  /** Source provider: 'unsplash' | 'openverse' | 'wikimedia' */
  provider: string;
  /** Attribution / photographer credit (required for Unsplash) */
  attribution: string;
  /** Width in pixels (if available) */
  width?: number;
  /** Height in pixels (if available) */
  height?: number;
}

/** Result of the relevance validation step */
export interface ScoredCandidate extends ImageCandidate {
  /** Semantic similarity score 0–1 */
  similarityScore: number;
}

/** Outcome of the pipeline for a single article */
export interface ImagePipelineResult {
  articleId: string;
  /** The final image URL (remote or stored) */
  imageUrl: string;
  /** How the image was sourced */
  source: 'retrieved' | 'generated' | 'cluster-reuse' | 'skipped';
  /** Which provider was used: 'unsplash' | 'openverse' | 'wikimedia' | 'openai' | 'cluster' */
  provider: string;
  /** Similarity score (for retrieved images) */
  similarityScore: number | null;
  /** Search queries that were attempted */
  searchQueries: string[];
  /** Time taken in ms */
  durationMs: number;
}

/** Cumulative pipeline metrics (in-memory, reset on restart) */
export interface PipelineMetrics {
  /** Total articles processed across all runs */
  totalProcessed: number;
  /** Successfully retrieved from external APIs */
  totalRetrieved: number;
  /** Fell through to AI generation */
  totalGenerated: number;
  /** Reused an existing cluster image */
  totalClusterReused: number;
  /** Skipped or failed */
  totalSkipped: number;
  totalFailed: number;
  /** Sum of all similarity scores (for computing average) */
  similarityScoreSum: number;
  /** Number of scored images (for computing average) */
  similarityScoredCount: number;
  /** Timestamp of first run */
  firstRunAt: string | null;
  /** Timestamp of last run */
  lastRunAt: string | null;
  /** Number of pipeline runs */
  runCount: number;
  /** Times a duplicate image hash was detected and reused */
  duplicateImageAvoidedCount: number;
  /** Cluster-level image generations triggered */
  clusterImageGenerationCount: number;
  /** Clusters skipped for image gen because they failed sanity validation */
  clusterImageSkippedInvalidCount: number;
}

/** Image pipeline run summary */
export interface ImagePipelineRunSummary {
  totalProcessed: number;
  retrieved: number;
  generated: number;
  clusterReused: number;
  skipped: number;
  failed: number;
  avgSimilarityScore: number | null;
  durationMs: number;
  results: ImagePipelineResult[];
}
