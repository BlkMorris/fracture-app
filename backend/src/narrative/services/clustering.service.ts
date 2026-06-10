import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Article } from '../../articles/entities/article.entity';
import {
  StoryCluster,
  ClusterStatus,
} from '../../articles/entities/story-cluster.entity';
import { TopicExtractionService } from './topic-extraction.service';

/**
 * Topic-based story clustering engine.
 *
 * Groups articles into real-world story clusters using three signals:
 *   1. Topic keyword similarity (40%) — shared keywords and named entities
 *   2. Headline word overlap   (35%) — significant terms from titles
 *   3. Time proximity           (25%) — decay based on article/cluster age
 *
 * Articles must score ≥ 0.30 composite to join an existing cluster.
 * Clusters accept new articles for up to 14 days before being archived.
 */
@Injectable()
export class ClusteringService implements OnModuleInit {
  private readonly logger = new Logger(ClusteringService.name);

  /** Minimum composite score for cluster assignment */
  private readonly COMPOSITE_THRESHOLD = 0.45;
  /** Minimum topical score (keyword + headline combined) to avoid time-only matches */
  private readonly MIN_TOPICAL_SCORE = 0.15;
  /** Maximum cluster age (days) to accept new articles */
  private readonly LOOKBACK_DAYS = 14;
  /** Max clusters to evaluate per article (performance cap) */
  private readonly MAX_CLUSTERS = 100;

  // ── Signal weights (must sum to 1.0) ───────────────────
  private readonly W_KEYWORDS = 0.40;
  private readonly W_HEADLINE = 0.35;
  private readonly W_TIME = 0.25;

  constructor(
    @InjectRepository(Article)
    private readonly articleRepo: Repository<Article>,
    @InjectRepository(StoryCluster)
    private readonly clusterRepo: Repository<StoryCluster>,
    private readonly topicExtraction: TopicExtractionService,
  ) {}

  /**
   * Clean up orphaned storyClusterId values that reference
   * clusters which no longer exist in the story_clusters table.
   */
  async onModuleInit(): Promise<void> {
    try {
      const result = await this.articleRepo
        .createQueryBuilder()
        .update(Article)
        .set({
          storyClusterId: null as unknown as string,
          firstInCluster: false,
        })
        .where('"storyClusterId" IS NOT NULL')
        .andWhere(
          '"storyClusterId" NOT IN (SELECT id FROM story_clusters)',
        )
        .execute();

      if (result.affected && result.affected > 0) {
        this.logger.warn(
          `Cleared ${result.affected} orphaned storyClusterId values (referenced non-existent clusters)`,
        );
      }
    } catch (error) {
      this.logger.warn(
        `Could not check for orphaned cluster IDs: ${error.message}`,
      );
    }
  }

  /**
   * Assign an article to the best-matching story cluster,
   * or create a new cluster if no match is found.
   */
  async assignCluster(article: Article): Promise<{
    storyClusterId: string;
    firstInCluster: boolean;
    clusterCentroidDistance: number;
  } | null> {
    // ── Time gate: reject articles older than 14 days ──
    const articleDate = article.publishedAt || article.ingestedAt;
    if (articleDate) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - this.LOOKBACK_DAYS);
      if (new Date(articleDate) < cutoff) {
        this.logger.debug(
          `Skipping clustering for old article: "${article.title?.slice(0, 50)}" (${new Date(articleDate).toISOString().slice(0, 10)})`,
        );
        return null;
      }
    }

    const articleKeywords = this.topicExtraction.extractKeywords(article);

    // Fetch recent non-archived clusters within the lookback window
    const since = new Date();
    since.setDate(since.getDate() - this.LOOKBACK_DAYS);

    const recentClusters = await this.clusterRepo
      .createQueryBuilder('c')
      .where('c.status != :archived', { archived: ClusterStatus.ARCHIVED })
      .andWhere('c.createdAt >= :since', { since })
      .orderBy('c.updatedAt', 'DESC')
      .limit(this.MAX_CLUSTERS)
      .getMany();

    if (recentClusters.length === 0) {
      const cluster = await this.createCluster(article, articleKeywords);
      this.logger.debug(
        `First cluster created: "${article.title?.slice(0, 60)}" (${articleKeywords.length} keywords)`,
      );
      return {
        storyClusterId: cluster.id,
        firstInCluster: true,
        clusterCentroidDistance: 0,
      };
    }

    // Score each candidate cluster
    let bestCluster: StoryCluster | null = null;
    let bestScore = 0;

    for (const cluster of recentClusters) {
      const score = this.computeCompositeScore(
        article,
        articleKeywords,
        cluster,
      );
      if (score > bestScore && score >= this.COMPOSITE_THRESHOLD) {
        bestCluster = cluster;
        bestScore = score;
      }
    }

    if (bestCluster) {
      // Merge article keywords into the cluster's keyword set
      await this.mergeKeywords(bestCluster, articleKeywords);

      this.logger.debug(
        `Matched "${article.title?.slice(0, 50)}" → ` +
          `"${bestCluster.topic?.slice(0, 50)}" (score=${bestScore.toFixed(3)})`,
      );

      return {
        storyClusterId: bestCluster.id,
        firstInCluster: false,
        clusterCentroidDistance:
          Math.round((1 - bestScore) * 1000) / 1000,
      };
    }

    // No match — create a new cluster
    const cluster = await this.createCluster(article, articleKeywords);
    this.logger.debug(
      `New cluster: "${article.title?.slice(0, 60)}" (${articleKeywords.length} keywords)`,
    );
    return {
      storyClusterId: cluster.id,
      firstInCluster: true,
      clusterCentroidDistance: 0,
    };
  }

  /**
   * Update denormalised aggregate stats on a cluster.
   * Call AFTER saving the article's storyClusterId to the database.
   */
  async updateClusterStats(clusterId: string): Promise<void> {
    const cluster = await this.clusterRepo.findOne({
      where: { id: clusterId },
    });
    if (!cluster) return;

    const stats = await this.articleRepo
      .createQueryBuilder('a')
      .select('COUNT(*)', 'articleCount')
      .addSelect('COUNT(DISTINCT a.sourceId)', 'sourceCount')
      .addSelect('MAX(a.publishedAt)', 'newestArticleAt')
      .addSelect('MIN(a.publishedAt)', 'minPublishedAt')
      .where('a.storyClusterId = :id', { id: clusterId })
      .getRawOne();

    const articleCount = parseInt(stats?.articleCount ?? '1', 10);
    const sourceCount = parseInt(stats?.sourceCount ?? '1', 10);
    const newestArticleAt = stats?.newestArticleAt ? new Date(stats.newestArticleAt) : null;
    const oldestArticleAt = stats?.minPublishedAt ? new Date(stats.minPublishedAt) : null;

    // Velocity: articles per hour since cluster creation
    const hoursAlive = Math.max(
      0.5,
      (Date.now() - cluster.createdAt.getTime()) / (1000 * 60 * 60),
    );
    const velocityScore =
      Math.round((articleCount / hoursAlive) * 100) / 100;

    // Lifecycle status
    const hoursOld =
      (Date.now() - cluster.createdAt.getTime()) / (1000 * 60 * 60);
    let status: ClusterStatus;
    if (hoursOld <= 24) {
      status = ClusterStatus.BREAKING;
    } else if (hoursOld <= this.LOOKBACK_DAYS * 24) {
      status = ClusterStatus.ACTIVE;
    } else {
      status = ClusterStatus.ARCHIVED;
    }

    await this.clusterRepo.update(clusterId, {
      articleCount,
      sourceCount,
      velocityScore,
      status,
      newestArticleAt,
      oldestArticleAt,
    });
  }

  // ── Scoring ─────────────────────────────────────────────

  private computeCompositeScore(
    article: Article,
    articleKeywords: string[],
    cluster: StoryCluster,
  ): number {
    const articleTime =
      article.publishedAt || article.ingestedAt || new Date();

    // Time proximity first — reject immediately if outside window
    const timeScore = this.timeProximity(articleTime, cluster.createdAt);
    if (timeScore === 0) return 0;

    // Topic keyword overlap
    const keywordScore = this.topicExtraction.keywordOverlap(
      articleKeywords,
      cluster.topicKeywords || [],
    );

    // Headline word overlap
    const headlineScore = this.topicExtraction.headlineSimilarity(
      article.title || '',
      cluster.topic || '',
    );

    // ── Topical gate: require minimum content overlap ──
    // Prevents time-proximity-only matches from joining clusters
    const topicalScore = this.W_KEYWORDS * keywordScore + this.W_HEADLINE * headlineScore;
    if (topicalScore < this.MIN_TOPICAL_SCORE) {
      this.logger.debug(
        `[CLUSTER-REJECT] "${article.title?.slice(0, 50)}" ✗ "${cluster.topic?.slice(0, 50)}" ` +
          `topical=${topicalScore.toFixed(3)} < ${this.MIN_TOPICAL_SCORE} ` +
          `(kw=${keywordScore.toFixed(3)}, hl=${headlineScore.toFixed(3)}, time=${timeScore.toFixed(2)})`,
      );
      return 0;
    }

    const composite = topicalScore + this.W_TIME * timeScore;

    // Diagnostic logging for cluster similarity evaluation
    this.logger.debug(
      `[CLUSTER-EVAL] "${article.title?.slice(0, 50)}" → "${cluster.topic?.slice(0, 50)}" ` +
        `composite=${composite.toFixed(3)} (kw=${keywordScore.toFixed(3)}, hl=${headlineScore.toFixed(3)}, ` +
        `time=${timeScore.toFixed(2)}) threshold=${this.COMPOSITE_THRESHOLD} ` +
        `${composite >= this.COMPOSITE_THRESHOLD ? '✓ MATCH' : '✗ BELOW'}`,
    );

    return composite;
  }

  /**
   * Time proximity score — decays as the article gets further
   * from the cluster's creation time.
   *
   *  ≤ 24 h  → 1.00
   *  ≤ 72 h  → 0.85
   *  ≤  7 d  → 0.65
   *  ≤ 14 d  → 0.40
   *  > 14 d  → 0.00 (reject)
   */
  private timeProximity(
    articleTime: Date,
    clusterCreatedAt: Date,
  ): number {
    const hoursDiff =
      Math.abs(articleTime.getTime() - clusterCreatedAt.getTime()) /
      (1000 * 60 * 60);

    if (hoursDiff <= 24) return 1.0;
    if (hoursDiff <= 72) return 0.85;
    if (hoursDiff <= 168) return 0.65;
    if (hoursDiff <= 336) return 0.4;
    return 0;
  }

  // ── Cluster lifecycle helpers ───────────────────────────

  private async createCluster(
    article: Article,
    keywords: string[],
  ): Promise<StoryCluster> {
    const articleDate = article.publishedAt || article.ingestedAt || new Date();
    const cluster = this.clusterRepo.create({
      topic: article.title || 'Untitled Story',
      topicKeywords: keywords,
      status: ClusterStatus.BREAKING,
      articleCount: 1,
      sourceCount: 1,
      newestArticleAt: new Date(articleDate),
      oldestArticleAt: new Date(articleDate),
    });
    const saved = await this.clusterRepo.save(cluster);
    this.logger.log(
      `[CLUSTER-CREATE] id=${saved.id.slice(0, 8)} topic="${article.title?.slice(0, 60)}" ` +
        `keywords=[${keywords.slice(0, 10).join(', ')}${keywords.length > 10 ? '...' : ''}]`,
    );
    return saved;
  }

  /**
   * Merge new article keywords into an existing cluster's keyword set.
   * Only merges keywords that co-occur with at least one existing keyword
   * (i.e., the article already matched on content). Caps at 50 keywords.
   */
  private async mergeKeywords(
    cluster: StoryCluster,
    newKeywords: string[],
  ): Promise<void> {
    const existing = new Set(cluster.topicKeywords || []);
    // Only add genuinely new keywords — the article already passed
    // the similarity threshold, so its keywords are topically valid
    const added: string[] = [];
    for (const kw of newKeywords) {
      if (!existing.has(kw)) {
        existing.add(kw);
        added.push(kw);
      }
    }
    const merged = [...existing].slice(0, 50);

    if (added.length > 0) {
      this.logger.debug(
        `[CLUSTER-KEYWORDS] ${cluster.id.slice(0, 8)} merged ${added.length} new: ` +
          `[${added.slice(0, 8).join(', ')}${added.length > 8 ? '...' : ''}] ` +
          `(total: ${merged.length})`,
      );
    }

    await this.clusterRepo.update(cluster.id, {
      topicKeywords: merged,
    });
  }
}
