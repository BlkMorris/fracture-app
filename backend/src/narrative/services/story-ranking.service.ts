import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Article } from '../../articles/entities/article.entity';
import {
  StoryCluster,
  ClusterStatus,
  TopicCategoryEnum,
} from '../../articles/entities/story-cluster.entity';
import { TopicClassifierService, HERO_ELIGIBLE_CATEGORIES, TopicCategory } from './topic-classifier.service';
import { TrendSignalService } from './trend-signal.service';

// Re-use the string values for comparison
const HERO_ELIGIBLE_STRINGS = new Set<string>(
  [...HERO_ELIGIBLE_CATEGORIES].map(c => c as string),
);

// ─── Public interfaces ──────────────────────────────────────

export interface VelocityMetrics {
  articleVelocity: number;
  sourceVelocity: number;
  divergenceSpike: number;
  velocityScore: number;
  isBreaking: boolean;
}

export interface RankedStory {
  cluster: StoryCluster;
  storyScore: number;
  heroScore: number;
  headline: string;
  velocity: VelocityMetrics;
  trendBoost: number;
  topicCategory: string;
  articleCountNorm: number;
  sourceDiversityNorm: number;
  recencyNorm: number;
  divergenceNorm: number;
}

// ─── Low-quality headline patterns (Part 7) ────────────────

const LOW_QUALITY_PATTERNS = [
  'video shows',
  'viral video',
  'caught on camera',
  'watch:',
  'shocking video',
  'hilarious video',
  'heartwarming video',
  'bizarre moment',
  'you won\'t believe',
  'jaw-dropping',
];

// ─── Service ────────────────────────────────────────────────

@Injectable()
export class StoryRankingService {
  private readonly logger = new Logger(StoryRankingService.name);

  // Normalisation caps
  private static readonly MAX_ARTICLE_COUNT = 30;
  private static readonly MAX_SOURCE_COUNT = 10;

  // Strict hero filters (Part 1)
  // Relaxed from 6/4 to 3/2 to allow meaningful clusters to surface
  // with a moderate number of active sources.
  private static readonly HERO_MIN_ARTICLES = 3;
  private static readonly HERO_MIN_SOURCES = 2;
  private static readonly HERO_MAX_HOURS = 12;

  // Fallback filters
  private static readonly FALLBACK_MAX_HOURS = 48;

  // Velocity thresholds
  private static readonly VELOCITY_WINDOW_MIN = 30;
  private static readonly VELOCITY_BREAKING_THRESHOLD = 5;

  constructor(
    @InjectRepository(StoryCluster)
    private readonly clusterRepo: Repository<StoryCluster>,
    @InjectRepository(Article)
    private readonly articleRepo: Repository<Article>,
    private readonly topicClassifier: TopicClassifierService,
    private readonly trendSignals: TrendSignalService,
  ) {}

  /**
   * Main entry: return clusters ranked by heroScore.
   * Applies strict hero filters, falls back to relaxed if nothing qualifies.
   */
  async getRankedStories(limit = 20): Promise<RankedStory[]> {
    // Fetch a generous pool of non-archived clusters
    const pool = await this.clusterRepo
      .createQueryBuilder('c')
      .where('c.status != :archived', { archived: ClusterStatus.ARCHIVED })
      .orderBy('c."newestArticleAt"', 'DESC', 'NULLS LAST')
      .take(300)
      .getMany();

    if (pool.length === 0) return [];

    // ── Classify topics + pick cluster images in parallel ──
    await this.enrichClusters(pool);

    // Compute velocity for all clusters in parallel
    const velocityMap = new Map<string, VelocityMetrics>();
    await Promise.all(
      pool.map(async (c) => {
        const v = await this.computeVelocity(c);
        velocityMap.set(c.id, v);
      }),
    );

    // Compute trend boost for all clusters
    const trendMap = new Map<string, number>();
    await Promise.all(
      pool.map(async (c) => {
        const boost = await this.trendSignals.computeTrendBoost(
          c.topic,
          c.topicKeywords ?? [],
        );
        trendMap.set(c.id, boost);
      }),
    );

    // ── Strict hero filter (Part 1) ──
    const heroSince = new Date();
    heroSince.setHours(heroSince.getHours() - StoryRankingService.HERO_MAX_HOURS);

    const strict = pool.filter((c) => {
      if (c.articleCount < StoryRankingService.HERO_MIN_ARTICLES) return false;
      if (c.sourceCount < StoryRankingService.HERO_MIN_SOURCES) return false;

      // Use newestArticleAt (actual article freshness), fall back to updatedAt
      const freshness = c.newestArticleAt ?? c.updatedAt;
      if (new Date(freshness) < heroSince) return false;

      // Topic must be a major news category
      if (!HERO_ELIGIBLE_STRINGS.has(c.topicCategory ?? '')) return false;

      return true;
    });

    // ── Broad trending pool: any cluster with ≥ 2 articles within 48h ──
    // This ensures trending/more-stories sections are never starved,
    // even when few clusters pass the strict hero filter.
    const broadSince = new Date();
    broadSince.setHours(broadSince.getHours() - StoryRankingService.FALLBACK_MAX_HOURS);

    const broadPool = pool.filter((c) => {
      if (c.articleCount < 2) return false;
      const freshness = c.newestArticleAt ?? c.updatedAt;
      return new Date(freshness) >= broadSince;
    });

    if (strict.length > 0) {
      const strictScored = await this.scoreAndSort(strict, velocityMap, trendMap, limit);

      // If strict pool fills the limit, return as-is
      if (strictScored.length >= limit) {
        return strictScored;
      }

      // Supplement with broader pool to fill trending/more stories slots
      const usedIds = new Set(strictScored.map((r) => r.cluster.id));
      const supplement = broadPool.filter((c) => !usedIds.has(c.id));

      if (supplement.length > 0) {
        this.logger.log(
          `Strict pool yielded ${strictScored.length}/${limit} — supplementing with ${supplement.length} broader clusters`,
        );
        const extras = await this.scoreAndSort(
          supplement,
          velocityMap,
          trendMap,
          limit - strictScored.length,
        );
        return [...strictScored, ...extras];
      }

      return strictScored;
    }

    // ── Relaxed fallback: 48h window, eligible categories only ──
    this.logger.warn('No clusters pass strict hero filters — using relaxed fallback');

    const relaxed = broadPool
      .filter((c) => HERO_ELIGIBLE_STRINGS.has(c.topicCategory ?? ''))
      .sort((a, b) => b.articleCount - a.articleCount);

    if (relaxed.length > 0) {
      return this.scoreAndSort(relaxed, velocityMap, trendMap, limit);
    }

    // ── Ultimate fallback: any cluster, sorted by article count ──
    this.logger.warn('No eligible-category clusters — using raw fallback');
    const fallback = broadPool.sort((a, b) => b.articleCount - a.articleCount);

    return this.scoreAndSort(
      fallback.length > 0 ? fallback : pool.slice(0, 20),
      velocityMap,
      trendMap,
      limit,
    );
  }

  // ─── Cluster enrichment ──────────────────────────────────

  /**
   * Classify topics and select representative images for clusters
   * that don't yet have them.
   */
  private async enrichClusters(clusters: StoryCluster[]): Promise<void> {
    for (const c of clusters) {
      // ── Topic classification ──
      if (!c.topicCategory || c.topicCategory === 'uncategorized') {
        const { category } = this.topicClassifier.classify(
          c.topic,
          c.topicKeywords ?? [],
        );
        if (category !== 'uncategorized') {
          c.topicCategory = category as string as TopicCategoryEnum;
          await this.clusterRepo.update(c.id, { topicCategory: category as string as TopicCategoryEnum });
        }
      }

      // ── Cluster image selection (Part 5) ──
      if (!c.imageUrl) {
        const imageUrl = await this.selectClusterImage(c.id);
        if (imageUrl) {
          c.imageUrl = imageUrl;
          await this.clusterRepo.update(c.id, { imageUrl });
        }
      }
    }
  }

  /**
   * Part 5: Select representative image for a cluster.
   * 1. Most recent article with imageUrl
   * 2. If multiple, prefer highest authority source (reliabilityScore)
   * 3. Fallback to stock image
   */
  private async selectClusterImage(clusterId: string): Promise<string | null> {
    const articles = await this.articleRepo
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.source', 'source')
      .where('a.storyClusterId = :cid', { cid: clusterId })
      .andWhere('a.imageUrl IS NOT NULL')
      .andWhere("a.imageUrl != ''")
      .orderBy('source.reliabilityScore', 'DESC', 'NULLS LAST')
      .addOrderBy('a.publishedAt', 'DESC')
      .take(1)
      .getMany();

    if (articles.length > 0 && articles[0].imageUrl) {
      return articles[0].imageUrl;
    }

    // No articles with images found — return null (frontend handles gracefully)
    return null;
  }

  // ─── Velocity detection ──────────────────────────────────

  private async computeVelocity(cluster: StoryCluster): Promise<VelocityMetrics> {
    const now = new Date();
    const windowMs = StoryRankingService.VELOCITY_WINDOW_MIN * 60 * 1000;
    const since30m = new Date(now.getTime() - windowMs);

    const recentArticles = await this.articleRepo
      .createQueryBuilder('a')
      .where('a.storyClusterId = :cid', { cid: cluster.id })
      .andWhere('a.ingestedAt >= :since', { since: since30m })
      .getCount();

    const recentSources = await this.articleRepo
      .createQueryBuilder('a')
      .select('COUNT(DISTINCT a.sourceId)', 'cnt')
      .where('a.storyClusterId = :cid', { cid: cluster.id })
      .andWhere('a.ingestedAt >= :since', { since: since30m })
      .getRawOne();
    const sourceVelocity = parseInt(recentSources?.cnt ?? '0', 10);

    const divergenceSpike = 0; // placeholder

    const velocityScore =
      recentArticles * 0.5 + sourceVelocity * 0.3 + divergenceSpike * 0.2;

    const isBreaking =
      velocityScore >= StoryRankingService.VELOCITY_BREAKING_THRESHOLD;

    return {
      articleVelocity: recentArticles,
      sourceVelocity,
      divergenceSpike,
      velocityScore: Math.round(velocityScore * 10) / 10,
      isBreaking,
    };
  }

  // ─── Headline generation ──────────────────────────────────

  private async generateHeadline(cluster: StoryCluster): Promise<string> {
    if (cluster.topic && cluster.topic.length > 10) {
      return cluster.topic;
    }

    const topArticles = await this.articleRepo.find({
      where: { storyClusterId: cluster.id },
      order: { publishedAt: 'DESC' },
      take: 5,
      select: ['title'],
    });

    if (topArticles.length === 0) return cluster.topic ?? 'Breaking Story';

    const stopWords = new Set([
      'the', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'of', 'and', 'or',
      'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has',
      'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
      'may', 'might', 'shall', 'can', 'with', 'from', 'by', 'about',
      'into', 'through', 'during', 'before', 'after', 'above', 'below',
      'between', 'under', 'again', 'further', 'then', 'once', 'here',
      'there', 'when', 'where', 'why', 'how', 'all', 'each', 'every',
      'both', 'few', 'more', 'most', 'other', 'some', 'such', 'no',
      'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just',
      'but', 'if', 'its', 'it', 'this', 'that', 'these', 'those', 'his',
      'her', 'he', 'she', 'they', 'their', 'we', 'our', 'you', 'your',
      'my', 'me', 'us', 'him', 'them', 'who', 'which', 'what', 'as',
      'up', 'out', 'over', 'says', 'said', 'new', 'also', "'s",
    ]);

    const freq = new Map<string, number>();
    for (const a of topArticles) {
      const words = a.title
        .toLowerCase()
        .replace(/[^a-z0-9\s'-]/g, '')
        .split(/\s+/)
        .filter((w) => w.length > 2 && !stopWords.has(w));

      const seen = new Set<string>();
      for (const w of words) {
        if (!seen.has(w)) {
          seen.add(w);
          freq.set(w, (freq.get(w) ?? 0) + 1);
        }
      }
    }

    const common = [...freq.entries()]
      .filter(([, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([word]) => word);

    if (common.length === 0) return topArticles[0].title;

    let bestTitle = topArticles[0].title;
    let bestScore = 0;
    for (const a of topArticles) {
      const lower = a.title.toLowerCase();
      const score = common.filter((k) => lower.includes(k)).length;
      if (score > bestScore) {
        bestScore = score;
        bestTitle = a.title;
      }
    }

    return bestTitle;
  }

  // ─── Low-quality content penalty (Part 7) ─────────────────

  private computeQualityPenalty(headline: string, topic: string): number {
    const text = `${headline} ${topic}`.toLowerCase();
    let penalty = 0;

    for (const pattern of LOW_QUALITY_PATTERNS) {
      if (text.includes(pattern)) {
        penalty += 20;
      }
    }

    return Math.min(40, penalty); // cap at 40 total penalty
  }

  // ─── Scoring and sorting ──────────────────────────────────

  private async scoreAndSort(
    clusters: StoryCluster[],
    velocityMap: Map<string, VelocityMetrics>,
    trendMap: Map<string, number>,
    limit: number,
  ): Promise<RankedStory[]> {
    const now = Date.now();

    const scored = await Promise.all(
      clusters.map(async (c) => {
        // Normalise article count (0–100)
        const articleCountNorm = Math.min(
          100,
          (c.articleCount / StoryRankingService.MAX_ARTICLE_COUNT) * 100,
        );

        // Normalise source diversity (0–100)
        const sourceDiversityNorm = Math.min(
          100,
          (c.sourceCount / StoryRankingService.MAX_SOURCE_COUNT) * 100,
        );

        // Recency: 100 = just published, 0 = 24h+ ago
        // Use newestArticleAt (actual article freshness) instead of updatedAt
        const freshnessDate = c.newestArticleAt ?? c.updatedAt;
        const ageMs = now - new Date(freshnessDate).getTime();
        const ageMinutes = ageMs / 60000;
        const recencyNorm = Math.max(0, Math.min(100, 100 - ageMinutes / 30));

        // Divergence: already 0–100 scale
        const divergenceNorm = c.divergenceScore ?? 0;

        // Trend boost (Part 2/3): 0–100
        const trendBoost = trendMap.get(c.id) ?? 0;

        // Velocity
        const velocity = velocityMap.get(c.id) ?? {
          articleVelocity: 0,
          sourceVelocity: 0,
          divergenceSpike: 0,
          velocityScore: 0,
          isBreaking: false,
        };

        // Generate headline
        const headline = await this.generateHeadline(c);

        // ── Part 3: New hero ranking formula ──
        // heroScore = articles*0.25 + sources*0.25 + recency*0.20 + divergence*0.15 + trendBoost*0.15
        let heroScore =
          articleCountNorm * 0.25 +
          sourceDiversityNorm * 0.25 +
          recencyNorm * 0.20 +
          divergenceNorm * 0.15 +
          trendBoost * 0.15;

        // Velocity bonus (small additive)
        const velocityNorm = Math.min(100, velocity.velocityScore * 10);
        heroScore += velocityNorm * 0.05;

        // ── Part 7: Low-quality penalty ──
        const penalty = this.computeQualityPenalty(headline, c.topic);
        heroScore -= penalty;

        // Ensure non-negative
        heroScore = Math.max(0, heroScore);

        // Base story score (without trend/penalty adjustments)
        const storyScore =
          articleCountNorm * 0.3 +
          sourceDiversityNorm * 0.25 +
          recencyNorm * 0.3 +
          divergenceNorm * 0.15;

        return {
          cluster: c,
          storyScore: Math.round(storyScore * 10) / 10,
          heroScore: Math.round(heroScore * 10) / 10,
          headline,
          velocity,
          trendBoost: Math.round(trendBoost * 10) / 10,
          topicCategory: c.topicCategory ?? TopicCategoryEnum.UNCATEGORIZED,
          articleCountNorm: Math.round(articleCountNorm),
          sourceDiversityNorm: Math.round(sourceDiversityNorm),
          recencyNorm: Math.round(recencyNorm),
          divergenceNorm: Math.round(divergenceNorm),
        };
      }),
    );

    // Sort by heroScore descending
    scored.sort((a, b) => {
      if (b.heroScore !== a.heroScore) return b.heroScore - a.heroScore;
      // Tiebreak by actual article freshness
      const bFresh = (b.cluster.newestArticleAt ?? b.cluster.updatedAt).getTime();
      const aFresh = (a.cluster.newestArticleAt ?? a.cluster.updatedAt).getTime();
      return bFresh - aFresh;
    });

    // Deduplicate by cluster ID
    const seenIds = new Set<string>();
    const deduped: RankedStory[] = [];
    for (const s of scored) {
      if (!seenIds.has(s.cluster.id)) {
        seenIds.add(s.cluster.id);
        deduped.push(s);
      }
    }

    const result = deduped.slice(0, limit);

    // Debug logging for hero selection
    if (result.length > 0) {
      const hero = result[0];
      this.logger.log(
        `Hero Selected:\n` +
        `  clusterId: ${hero.cluster.id}\n` +
        `  headline: "${hero.headline}"\n` +
        `  category: ${hero.topicCategory}\n` +
        `  articles: ${hero.cluster.articleCount}\n` +
        `  sources: ${hero.cluster.sourceCount}\n` +
        `  divergence: ${hero.divergenceNorm}\n` +
        `  trendBoost: ${hero.trendBoost}\n` +
        `  velocityScore: ${hero.velocity.velocityScore}\n` +
        `  heroScore: ${hero.heroScore}\n` +
        `  imageUrl: ${hero.cluster.imageUrl ?? 'none'}\n` +
        `  breaking: ${hero.velocity.isBreaking}`,
      );
    }

    return result;
  }
}
