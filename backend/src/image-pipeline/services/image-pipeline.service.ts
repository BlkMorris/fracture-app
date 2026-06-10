import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Article } from '../../articles/entities/article.entity';
import { StoryCluster } from '../../articles/entities/story-cluster.entity';
import { ImageContextService } from './image-context.service';
import { ImageRetrievalService } from './image-retrieval.service';
import { ImageRelevanceService } from './image-relevance.service';
import {
  ImageGenerationService,
  ClusterImageContext,
} from './image-generation.service';
import { ImageStorageService } from './image-storage.service';
import type {
  ImageContext,
  ImagePipelineResult,
  ImagePipelineRunSummary,
  PipelineMetrics,
} from '../interfaces';

/**
 * Main orchestrator for the image fallback pipeline.
 *
 * Pipeline per article:
 *   0. Check cluster-level image cache (reuse if available)
 *   1. Extract structured context (topic, entities, category, visual keywords)
 *   2. Search for real editorial images (Unsplash → Openverse → Wikimedia)
 *   3. Validate image relevance via semantic similarity (embeddings)
 *   4. If no match: generate AI image (DALL-E 3)
 *   5. Download & store image permanently
 *   6. Update article.imageUrl + propagate to cluster & sibling articles
 *
 * Tracks cumulative metrics across runs for retrieval rate, generation rate,
 * cluster reuse rate, and average similarity score.
 */
@Injectable()
export class ImagePipelineService {
  private readonly logger = new Logger(ImagePipelineService.name);
  private readonly batchSize: number;
  private readonly minClusterArticlesForImage: number;

  /** Cumulative in-memory metrics (reset on process restart) */
  private readonly metrics: PipelineMetrics = {
    totalProcessed: 0,
    totalRetrieved: 0,
    totalGenerated: 0,
    totalClusterReused: 0,
    totalSkipped: 0,
    totalFailed: 0,
    similarityScoreSum: 0,
    similarityScoredCount: 0,
    firstRunAt: null,
    lastRunAt: null,
    runCount: 0,
    duplicateImageAvoidedCount: 0,
    clusterImageGenerationCount: 0,
    clusterImageSkippedInvalidCount: 0,
  };

  constructor(
    @InjectRepository(Article)
    private readonly articleRepo: Repository<Article>,
    @InjectRepository(StoryCluster)
    private readonly clusterRepo: Repository<StoryCluster>,
    private readonly contextService: ImageContextService,
    private readonly retrievalService: ImageRetrievalService,
    private readonly relevanceService: ImageRelevanceService,
    private readonly generationService: ImageGenerationService,
    private readonly storageService: ImageStorageService,
    private readonly config: ConfigService,
  ) {
    this.batchSize = this.config.get<number>(
      'imagePipeline.batchSize',
      50,
    );
    this.minClusterArticlesForImage = this.config.get<number>(
      'imagePipeline.minClusterArticlesForImage',
      3,
    );
  }

  // ── Public getters ────────────────────────────────────

  /** Return a snapshot of cumulative pipeline metrics */
  getMetrics(): PipelineMetrics & {
    retrievalRate: number;
    generationRate: number;
    clusterReuseRate: number;
    avgSimilarityScore: number | null;
  } {
    const total = this.metrics.totalProcessed || 1; // avoid div-by-zero
    return {
      ...this.metrics,
      retrievalRate:
        Math.round((this.metrics.totalRetrieved / total) * 1000) / 1000,
      generationRate:
        Math.round((this.metrics.totalGenerated / total) * 1000) / 1000,
      clusterReuseRate:
        Math.round((this.metrics.totalClusterReused / total) * 1000) / 1000,
      avgSimilarityScore:
        this.metrics.similarityScoredCount > 0
          ? Math.round(
              (this.metrics.similarityScoreSum /
                this.metrics.similarityScoredCount) *
                1000,
            ) / 1000
          : null,
      duplicateImageAvoidedCount: this.metrics.duplicateImageAvoidedCount,
      clusterImageGenerationCount: this.metrics.clusterImageGenerationCount,
      clusterImageSkippedInvalidCount:
        this.metrics.clusterImageSkippedInvalidCount,
    };
  }

  // ── Pipeline runner ───────────────────────────────────

  /**
   * Run the full pipeline for all articles missing images.
   * Processes up to `batchSize` articles per run.
   */
  async runPipeline(): Promise<ImagePipelineRunSummary> {
    const startTime = Date.now();
    const now = new Date().toISOString();
    if (!this.metrics.firstRunAt) this.metrics.firstRunAt = now;
    this.metrics.lastRunAt = now;
    this.metrics.runCount++;

    // Find articles missing images
    const articles = await this.articleRepo.find({
      where: { imageUrl: IsNull() },
      order: { publishedAt: 'DESC' },
      take: this.batchSize,
    });

    if (articles.length === 0) {
      this.logger.log(
        '[IMG-PIPELINE] No articles with missing images — nothing to do',
      );
      return this.buildSummary(0, 0, 0, 0, 0, 0, null, startTime, []);
    }

    this.logger.log(
      `[IMG-PIPELINE] Starting pipeline for ${articles.length} articles missing images`,
    );

    const results: ImagePipelineResult[] = [];
    let retrieved = 0;
    let generated = 0;
    let clusterReused = 0;
    let skipped = 0;
    let failed = 0;
    let simSum = 0;
    let simCount = 0;

    for (const article of articles) {
      try {
        const result = await this.processArticle(article);
        results.push(result);

        switch (result.source) {
          case 'retrieved':
            retrieved++;
            if (result.similarityScore !== null) {
              simSum += result.similarityScore;
              simCount++;
            }
            break;
          case 'generated':
            generated++;
            break;
          case 'cluster-reuse':
            clusterReused++;
            break;
          case 'skipped':
            skipped++;
            break;
        }
      } catch (error) {
        this.logger.error(
          `[IMG-PIPELINE] Failed for article ${article.id} ` +
            `"${article.title?.slice(0, 50)}": ${error.message}`,
        );
        failed++;
        results.push({
          articleId: article.id,
          imageUrl: '',
          source: 'skipped',
          provider: 'none',
          similarityScore: null,
          searchQueries: [],
          durationMs: 0,
        });
      }
    }

    // Update cumulative metrics
    this.metrics.totalProcessed += articles.length;
    this.metrics.totalRetrieved += retrieved;
    this.metrics.totalGenerated += generated;
    this.metrics.totalClusterReused += clusterReused;
    this.metrics.totalSkipped += skipped;
    this.metrics.totalFailed += failed;
    this.metrics.similarityScoreSum += simSum;
    this.metrics.similarityScoredCount += simCount;

    const summary = this.buildSummary(
      articles.length,
      retrieved,
      generated,
      clusterReused,
      skipped,
      failed,
      simCount > 0 ? Math.round((simSum / simCount) * 1000) / 1000 : null,
      startTime,
      results,
    );

    this.logger.log(
      `[IMG-PIPELINE] Run complete: ` +
        `processed=${summary.totalProcessed} retrieved=${retrieved} ` +
        `generated=${generated} clusterReused=${clusterReused} ` +
        `skipped=${skipped} failed=${failed} ` +
        `avgSim=${summary.avgSimilarityScore ?? 'N/A'} ` +
        `duration=${summary.durationMs}ms`,
    );

    return summary;
  }

  // ── Single article processing ─────────────────────────

  /**
   * Process a single article through the image pipeline.
   */
  async processArticle(article: Article): Promise<ImagePipelineResult> {
    const startTime = Date.now();

    // Double-check idempotency
    const current = await this.articleRepo.findOne({
      where: { id: article.id },
      select: ['id', 'imageUrl', 'storyClusterId'],
    });
    if (current?.imageUrl) {
      return this.skipResult(article.id, current.imageUrl, 'existing', startTime);
    }

    // ── Step 0: Cluster image cache ─────────────────────
    const clusterImage = await this.tryClusterReuse(current?.storyClusterId, article.id);
    if (clusterImage) {
      return {
        articleId: article.id,
        imageUrl: clusterImage,
        source: 'cluster-reuse',
        provider: 'cluster',
        similarityScore: null,
        searchQueries: [],
        durationMs: Date.now() - startTime,
      };
    }

    // ── Step 1: Extract context ─────────────────────────
    const context = this.contextService.extractContext(article);
    const searchQueries = this.retrievalService.buildSearchQueries(context);

    // ── Step 2: Search for editorial images ──────────────
    const candidates = await this.retrievalService.searchImages(context);

    // ── Step 3: Validate relevance (semantic similarity) ─
    if (candidates.length > 0) {
      const validCandidates = await this.relevanceService.validateCandidates(
        candidates,
        context,
      );

      if (validCandidates.length > 0) {
        const best = validCandidates[0];

        try {
          const { url: storedUrl, wasDuplicate } =
            await this.storageService.storeFromUrl(best.url, article.id);

          if (wasDuplicate) {
            this.metrics.duplicateImageAvoidedCount++;
          }

          await this.assignImage(article.id, current?.storyClusterId, storedUrl);
          this.logResult(article, 'retrieved', best.provider, best.similarityScore, storedUrl);

          return {
            articleId: article.id,
            imageUrl: storedUrl,
            source: 'retrieved',
            provider: best.provider,
            similarityScore: best.similarityScore,
            searchQueries,
            durationMs: Date.now() - startTime,
          };
        } catch (storeError) {
          this.logger.warn(
            `[IMG-PIPELINE] Failed to store retrieved image for ${article.id}: ` +
              `${storeError.message}. Falling through to generation.`,
          );
        }
      }
    }

    // ── Step 4: AI generation fallback ───────────────────
    if (this.generationService.isAvailable) {
      const generated = await this.tryGenerateImage(
        article,
        context,
        current?.storyClusterId,
      );

      if (generated) {
        try {
          const { url: storedUrl, wasDuplicate } =
            await this.storageService.storeFromUrl(generated.url, article.id);

          if (wasDuplicate) {
            this.metrics.duplicateImageAvoidedCount++;
          }

          await this.assignImage(article.id, current?.storyClusterId, storedUrl);
          this.logResult(article, 'generated', generated.provider, null, storedUrl);

          return {
            articleId: article.id,
            imageUrl: storedUrl,
            source: 'generated',
            provider: generated.provider,
            similarityScore: null,
            searchQueries,
            durationMs: Date.now() - startTime,
          };
        } catch (storeError) {
          this.logger.error(
            `[IMG-PIPELINE] Failed to store generated image for ${article.id}: ${storeError.message}`,
          );
        }
      }
    }

    // No image could be assigned
    this.logger.warn(
      `[IMG-PIPELINE] No image assigned for article ${article.id} ` +
        `"${article.title?.slice(0, 50)}" — all methods exhausted`,
    );

    return {
      articleId: article.id,
      imageUrl: '',
      source: 'skipped',
      provider: 'none',
      similarityScore: null,
      searchQueries,
      durationMs: Date.now() - startTime,
    };
  }

  // ── Cluster image caching ─────────────────────────────

  /**
   * Check if the article's cluster already has an image.
   * If so, assign it to this article and return the URL.
   */
  private async tryClusterReuse(
    clusterId: string | null | undefined,
    articleId: string,
  ): Promise<string | null> {
    if (!clusterId) return null;

    try {
      const cluster = await this.clusterRepo.findOne({
        where: { id: clusterId },
        select: ['id', 'imageUrl'],
      });

      if (cluster?.imageUrl) {
        // Assign the cluster's image to this article (idempotent)
        await this.articleRepo
          .createQueryBuilder()
          .update(Article)
          .set({ imageUrl: cluster.imageUrl })
          .where('id = :id', { id: articleId })
          .andWhere('imageUrl IS NULL')
          .execute();

        this.logger.log(
          `[IMG-CLUSTER-REUSE] article=${articleId} cluster=${clusterId} ` +
            `url=${cluster.imageUrl.slice(0, 80)}`,
        );
        return cluster.imageUrl;
      }
    } catch (error) {
      this.logger.warn(
        `[IMG-CLUSTER-REUSE] Failed for cluster ${clusterId}: ${error.message}`,
      );
    }

    return null;
  }

  /**
   * Attempt AI image generation, preferring cluster-level context when the
   * article belongs to a cluster with ≥ minClusterArticlesForImage articles.
   */
  private async tryGenerateImage(
    article: Article,
    articleContext: ImageContext,
    clusterId: string | null | undefined,
  ): Promise<{ url: string; provider: string } | null> {
    // Try cluster-level generation for valid clusters
    if (clusterId) {
      const cluster = await this.clusterRepo.findOne({
        where: { id: clusterId },
        select: [
          'id',
          'topic',
          'summary',
          'topicKeywords',
          'topicCategory',
          'articleCount',
        ],
      });

      if (
        cluster &&
        cluster.articleCount >= this.minClusterArticlesForImage
      ) {
        const clusterCtx = await this.buildClusterContext(cluster);
        const result =
          await this.generationService.generateClusterImage(clusterCtx);

        if (result) {
          this.metrics.clusterImageGenerationCount++;
          this.logger.debug(
            `[IMG-GEN-CLUSTER] Generated cluster image for cluster=${clusterId} ` +
              `articleCount=${cluster.articleCount} topic="${cluster.topic?.slice(0, 50)}"`,
          );
          return { url: result.url, provider: 'openai-cluster' };
        }
      } else if (
        cluster &&
        cluster.articleCount < this.minClusterArticlesForImage
      ) {
        this.metrics.clusterImageSkippedInvalidCount++;
        this.logger.debug(
          `[IMG-GEN-CLUSTER] Cluster ${clusterId} has ${cluster.articleCount} articles ` +
            `(min=${this.minClusterArticlesForImage}) — using per-article generation`,
        );
      }
    }

    // Fall back to per-article generation
    const result = await this.generationService.generateImage(articleContext);
    return result ? { url: result.url, provider: 'openai' } : null;
  }

  /**
   * Build an aggregated image generation context from the cluster's metadata
   * and its top articles.
   */
  private async buildClusterContext(
    cluster: StoryCluster,
  ): Promise<ClusterImageContext> {
    const articles = await this.articleRepo.find({
      where: { storyClusterId: cluster.id },
      select: ['id', 'title', 'summary'],
      order: { publishedAt: 'DESC' },
      take: 5,
    });

    const combinedSummary =
      cluster.summary ||
      articles
        .map((a) => a.summary || a.title)
        .filter(Boolean)
        .join('. ');

    const entities = (cluster.topicKeywords || []).slice(0, 10);

    return {
      topic: cluster.topic || 'News Story',
      combinedSummary: combinedSummary.slice(0, 500),
      entities,
      category: cluster.topicCategory || 'general',
      visualKeywords: (cluster.topicKeywords || []).slice(0, 5),
    };
  }

  /**
   * Assign an image to the article, its cluster, and all sibling articles
   * in the cluster that are still missing images.
   */
  private async assignImage(
    articleId: string,
    clusterId: string | null | undefined,
    imageUrl: string,
  ): Promise<void> {
    // Update this article (idempotent: only if still NULL)
    await this.articleRepo
      .createQueryBuilder()
      .update(Article)
      .set({ imageUrl })
      .where('id = :id', { id: articleId })
      .andWhere('imageUrl IS NULL')
      .execute();

    if (!clusterId) return;

    // Update the cluster's representative image (if not already set)
    try {
      await this.clusterRepo
        .createQueryBuilder()
        .update(StoryCluster)
        .set({ imageUrl })
        .where('id = :id', { id: clusterId })
        .andWhere('imageUrl IS NULL')
        .execute();

      // Propagate image to all sibling articles in the cluster missing images
      const result = await this.articleRepo
        .createQueryBuilder()
        .update(Article)
        .set({ imageUrl })
        .where('storyClusterId = :clusterId', { clusterId })
        .andWhere('imageUrl IS NULL')
        .execute();

      if (result.affected && result.affected > 0) {
        this.logger.log(
          `[IMG-CLUSTER-PROPAGATE] cluster=${clusterId} ` +
            `updated ${result.affected} sibling articles with cluster image`,
        );
      }
    } catch (error) {
      this.logger.warn(
        `[IMG-CLUSTER-PROPAGATE] Failed for cluster ${clusterId}: ${error.message}`,
      );
      // Non-fatal — the individual article was already updated
    }
  }

  // ── Query helpers ─────────────────────────────────────

  /** Get count of articles still missing images */
  async getMissingImageCount(): Promise<number> {
    return this.articleRepo.count({
      where: { imageUrl: IsNull() },
    });
  }

  // ── Logging ───────────────────────────────────────────

  private logResult(
    article: Article,
    source: string,
    provider: string,
    similarity: number | null,
    imageUrl: string,
  ): void {
    this.logger.log(
      `[IMG-ASSIGNED] article=${article.id} ` +
        `title="${article.title?.slice(0, 50)}" ` +
        `source=${source} provider=${provider} ` +
        `similarity=${similarity !== null ? similarity.toFixed(3) : 'N/A'} ` +
        `url=${imageUrl.slice(0, 80)}`,
    );
  }

  private skipResult(
    articleId: string,
    imageUrl: string,
    provider: string,
    startTime: number,
  ): ImagePipelineResult {
    return {
      articleId,
      imageUrl,
      source: 'skipped',
      provider,
      similarityScore: null,
      searchQueries: [],
      durationMs: Date.now() - startTime,
    };
  }

  private buildSummary(
    totalProcessed: number,
    retrieved: number,
    generated: number,
    clusterReused: number,
    skipped: number,
    failed: number,
    avgSimilarityScore: number | null,
    startTime: number,
    results: ImagePipelineResult[],
  ): ImagePipelineRunSummary {
    return {
      totalProcessed,
      retrieved,
      generated,
      clusterReused,
      skipped,
      failed,
      avgSimilarityScore,
      durationMs: Date.now() - startTime,
      results,
    };
  }
}
