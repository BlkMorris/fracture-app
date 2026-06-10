import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import type {
  ImageContext,
  ImageCandidate,
  ScoredCandidate,
} from '../interfaces';

/**
 * Validates retrieved image candidates against the article context
 * using **semantic similarity via OpenAI embeddings**.
 *
 * Pipeline:
 *   1. Build a text representation for the article and each candidate.
 *   2. Request embeddings for all texts in a single batched API call.
 *   3. Compute cosine similarity between the article embedding and each
 *      candidate embedding.
 *   4. Return candidates scoring above the configured threshold (default 0.75),
 *      sorted by score descending.
 *
 * Falls back to lightweight keyword overlap when the OpenAI API key is
 * not configured (local dev without API access).
 */
@Injectable()
export class ImageRelevanceService {
  private readonly logger = new Logger(ImageRelevanceService.name);
  private readonly defaultThreshold: number;
  private readonly categoryThresholds: Record<string, number>;
  private readonly apiKey: string;
  private readonly embeddingModel: string;

  constructor(private readonly config: ConfigService) {
    this.defaultThreshold = this.config.get<number>(
      'imagePipeline.similarityThreshold',
      0.75,
    );
    this.categoryThresholds = this.config.get<Record<string, number>>(
      'imagePipeline.categorySimilarityThresholds',
      {},
    );
    this.apiKey = this.config.get<string>('imagePipeline.openaiApiKey', '');
    this.embeddingModel = this.config.get<string>(
      'imagePipeline.openaiEmbeddingModel',
      'text-embedding-3-small',
    );
  }

  /** Whether the embedding API is configured */
  get embeddingsAvailable(): boolean {
    return this.apiKey.length > 0;
  }

  /**
   * Resolve the effective similarity threshold for a given category.
   * Falls back to the default threshold if the category has no override.
   */
  getThresholdForCategory(category: string): number {
    return this.categoryThresholds[category] ?? this.defaultThreshold;
  }

  // ── Public API ────────────────────────────────────────

  /**
   * Score and filter image candidates against article context.
   * Uses semantic embeddings when available, else falls back to keyword overlap.
   * Applies a **category-specific** similarity threshold.
   * Returns candidates that pass the threshold, sorted by score descending.
   */
  async validateCandidates(
    candidates: ImageCandidate[],
    context: ImageContext,
  ): Promise<ScoredCandidate[]> {
    if (candidates.length === 0) return [];

    const threshold = this.getThresholdForCategory(context.category);

    const scored: ScoredCandidate[] = this.embeddingsAvailable
      ? await this.scoreWithEmbeddings(candidates, context)
      : this.scoreWithKeywordOverlap(candidates, context);

    // Sort by score descending
    scored.sort((a, b) => b.similarityScore - a.similarityScore);

    // Diagnostic logging
    for (const s of scored) {
      this.logger.debug(
        `[IMG-RELEVANCE] ${s.provider} score=${s.similarityScore.toFixed(3)} ` +
          `threshold=${threshold.toFixed(2)} category=${context.category} ` +
          `${s.similarityScore >= threshold ? '✓' : '✗'} ` +
          `desc="${s.description?.slice(0, 60)}"`,
      );
    }

    return scored.filter((s) => s.similarityScore >= threshold);
  }

  // ── Embedding-based scoring ───────────────────────────

  /**
   * Score candidates using cosine similarity between OpenAI embeddings
   * of the article text and each image's description + tags.
   *
   * All texts are embedded in a single batched API call to minimise latency.
   */
  private async scoreWithEmbeddings(
    candidates: ImageCandidate[],
    context: ImageContext,
  ): Promise<ScoredCandidate[]> {
    // Build text representations
    const articleText = this.buildArticleText(context);
    const candidateTexts = candidates.map((c) => this.buildCandidateText(c));

    // All texts in one batch: [articleText, ...candidateTexts]
    const allTexts = [articleText, ...candidateTexts];

    try {
      const embeddings = await this.getEmbeddings(allTexts);

      if (!embeddings || embeddings.length !== allTexts.length) {
        this.logger.warn(
          '[IMG-RELEVANCE] Embedding response length mismatch — falling back to keyword overlap',
        );
        return this.scoreWithKeywordOverlap(candidates, context);
      }

      const articleEmbedding = embeddings[0];

      return candidates.map((candidate, i) => ({
        ...candidate,
        similarityScore: Math.round(
          this.cosineSimilarity(articleEmbedding, embeddings[i + 1]) * 1000,
        ) / 1000,
      }));
    } catch (error) {
      this.logger.warn(
        `[IMG-RELEVANCE] Embedding API failed: ${error.message} — falling back to keyword overlap`,
      );
      return this.scoreWithKeywordOverlap(candidates, context);
    }
  }

  /**
   * Call OpenAI Embeddings API with a batch of texts.
   * Returns an array of embedding vectors (one per input text).
   */
  private async getEmbeddings(texts: string[]): Promise<number[][]> {
    // Truncate each text to 8000 chars (model limit is ~8191 tokens)
    const truncated = texts.map((t) => t.slice(0, 8000));

    const res = await axios.post(
      'https://api.openai.com/v1/embeddings',
      {
        model: this.embeddingModel,
        input: truncated,
      },
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      },
    );

    const data = res.data?.data;
    if (!Array.isArray(data)) return [];

    // Sort by index to ensure order matches input
    data.sort((a: any, b: any) => a.index - b.index);
    return data.map((item: any) => item.embedding as number[]);
  }

  /**
   * Cosine similarity between two vectors.
   * Returns a value in [-1, 1]; higher = more similar.
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length || a.length === 0) return 0;

    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom === 0 ? 0 : dot / denom;
  }

  // ── Text builders ─────────────────────────────────────

  /**
   * Build a rich text representation of the article for embedding.
   * Combines title + summary for maximum semantic signal.
   */
  private buildArticleText(context: ImageContext): string {
    return [
      context.articleTitle,
      context.articleSummary,
      `Topic: ${context.topic}`,
      context.entities.length > 0
        ? `Entities: ${context.entities.join(', ')}`
        : '',
      `Category: ${context.category}`,
    ]
      .filter(Boolean)
      .join('. ');
  }

  /**
   * Build a text representation of an image candidate for embedding.
   * Combines description + tags for maximum semantic signal.
   */
  private buildCandidateText(candidate: ImageCandidate): string {
    return [
      candidate.description,
      candidate.tags.length > 0
        ? `Tags: ${candidate.tags.join(', ')}`
        : '',
    ]
      .filter(Boolean)
      .join('. ') || 'news editorial photograph';
  }

  // ── Keyword overlap fallback ──────────────────────────

  /**
   * Lightweight fallback when embeddings are not available.
   * Uses the same weighted term-overlap approach as the original v1 pipeline.
   */
  private scoreWithKeywordOverlap(
    candidates: ImageCandidate[],
    context: ImageContext,
  ): ScoredCandidate[] {
    return candidates.map((candidate) => ({
      ...candidate,
      similarityScore: this.computeKeywordSimilarity(candidate, context),
    }));
  }

  private computeKeywordSimilarity(
    candidate: ImageCandidate,
    context: ImageContext,
  ): number {
    const imageText = [
      candidate.description,
      ...candidate.tags,
      candidate.attribution,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    const imageTerms = this.tokenise(imageText);

    const entityScore = this.termOverlap(
      context.entities.map((e) => e.toLowerCase()),
      imageTerms,
    );
    const keywordScore = this.termOverlap(
      context.visualKeywords.map((k) => k.toLowerCase()),
      imageTerms,
    );
    const topicTerms = this.tokenise(context.topic.toLowerCase());
    const topicScore = this.termOverlap(topicTerms, imageTerms);
    const categoryScore = imageText.includes(context.category) ? 1.0 : 0.0;

    return Math.round(
      (entityScore * 0.4 + keywordScore * 0.3 + topicScore * 0.2 + categoryScore * 0.1) * 1000,
    ) / 1000;
  }

  private tokenise(text: string): string[] {
    return text
      .replace(/[^a-z0-9\s'-]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 2 && !STOP_WORDS.has(t));
  }

  private termOverlap(queryTerms: string[], imageTerms: string[]): number {
    if (queryTerms.length === 0 || imageTerms.length === 0) return 0;
    const imageSet = new Set(imageTerms);
    let hits = 0;
    for (const term of queryTerms) {
      if (imageSet.has(term)) {
        hits++;
      } else {
        for (const imgTerm of imageTerms) {
          if (imgTerm.includes(term) || term.includes(imgTerm)) {
            hits += 0.5;
            break;
          }
        }
      }
    }
    return Math.min(1.0, hits / Math.max(1, queryTerms.length));
  }
}

// ── Stop words (used only in keyword fallback) ──────────

const STOP_WORDS = new Set([
  'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'it',
  'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at', 'this',
  'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she',
  'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their',
  'what', 'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which',
  'go', 'me', 'when', 'make', 'can', 'like', 'time', 'no', 'just',
  'photo', 'image', 'picture', 'file', 'commons', 'wikimedia',
  'unsplash', 'photographer',
]);
