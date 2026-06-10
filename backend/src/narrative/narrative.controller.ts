import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Res,
  HttpCode,
  HttpStatus,
  Logger,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import type { Response } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Article } from '../articles/entities/article.entity';
import { Source } from '../articles/entities/source.entity';
import {
  StoryCluster,
  ClusterStatus,
} from '../articles/entities/story-cluster.entity';
import { TrendingService } from './services/trending.service';
import { DivergenceService } from './services/divergence.service';
import { StoryRankingService } from './services/story-ranking.service';
import { SnapshotService } from './services/snapshot.service';
import { SnapshotImageService } from './services/snapshot-image.service';
import { SearchDiscoveryService } from './services/search-discovery.service';
import {
  QueryStoriesDto,
  QueryTrendingDto,
} from './dto/query-stories.dto';
import {
  NARRATIVE_QUEUE,
  NarrativeJobData,
} from './processors/narrative.processor';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole } from '../auth/entities/user.entity';

@Controller('narrative')
export class NarrativeController {
  private readonly logger = new Logger(NarrativeController.name);

  constructor(
    @InjectRepository(Article)
    private readonly articleRepo: Repository<Article>,
    @InjectRepository(Source)
    private readonly sourceRepo: Repository<Source>,
    @InjectRepository(StoryCluster)
    private readonly clusterRepo: Repository<StoryCluster>,
    @InjectQueue(NARRATIVE_QUEUE)
    private readonly narrativeQueue: Queue,
    private readonly trending: TrendingService,
    private readonly divergence: DivergenceService,
    private readonly ranking: StoryRankingService,
    private readonly snapshot: SnapshotService,
    private readonly snapshotImage: SnapshotImageService,
    private readonly searchDiscovery: SearchDiscoveryService,
  ) {}

  // ────────────────────────────────────────────────────
  // DISCOVERY SEARCH — unified cluster + article search
  // ────────────────────────────────────────────────────

  /**
   * GET /api/v1/narrative/discover
   *
   * Unified search across story clusters and articles.
   * Returns ranked results with clusters first, articles second,
   * plus related topic suggestions.
   */
  @Public()
  @Get('discover')
  async discover(
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    if (!q || q.trim().length < 2) {
      return {
        query: q ?? '',
        clusters: [],
        articles: [],
        relatedTopics: [],
        totalClusters: 0,
        totalArticles: 0,
      };
    }
    return this.searchDiscovery.search(
      q,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  /**
   * GET /api/v1/narrative/trending-topics
   *
   * Returns trending topic keywords for search suggestions.
   */
  @Public()
  @Get('trending-topics')
  async trendingTopics(
    @Query('limit') limit?: string,
  ) {
    return this.searchDiscovery.getTrendingTopics(
      limit ? parseInt(limit, 10) : 8,
    );
  }

  // ────────────────────────────────────────────────────
  // HOMEPAGE — single endpoint powering the entire homepage
  // ────────────────────────────────────────────────────

  /**
   * GET /api/v1/narrative/homepage
   *
   * Returns pre-ranked sections:
   *   hero       — top-ranked story with same-cluster opposing articles
   *   trending   — top 6 by story_score
   *   fractured  — single most fractured story (highest FDI)
   *   latest     — 20 most recent articles
   */
  @Public()
  @Get('homepage')
  async getHomepage() {
    const ranked = await this.ranking.getRankedStories(10);

    if (ranked.length === 0) {
      return {
        hero: null,
        trending: [],
        fractured: null,
        latest: await this.getLatestArticles(10),
      };
    }

    // ── HERO: top-ranked story + opposing articles from SAME cluster ──
    const heroRanked = ranked[0];
    const heroArticles = await this.articleRepo.find({
      where: { storyClusterId: heroRanked.cluster.id },
      relations: ['source'],
      order: { politicalLeanScore: 'ASC' },
    });

    const validArticles = heroArticles.filter(
      (a) => a.politicalLeanScore !== null && a.source,
    );

    let leftArticle = validArticles[0] ?? heroArticles[0];
    let rightArticle =
      validArticles[validArticles.length - 1] ??
      heroArticles[heroArticles.length - 1];

    if (leftArticle?.id === rightArticle?.id && heroArticles.length >= 2) {
      leftArticle = heroArticles[0];
      rightArticle = heroArticles[1];
    }

    const heroDivergence = await this.divergence.computeClusterDivergence(
      heroRanked.cluster.id,
    );

    const hero = {
      cluster: this.formatClusterSummary(heroRanked),
      divergence: heroDivergence,
      leftArticle: leftArticle ? this.formatArticle(leftArticle) : null,
      rightArticle: rightArticle ? this.formatArticle(rightArticle) : null,
      articles: heroArticles.map((a) => this.formatArticle(a)),
      headline: heroRanked.headline,
      heroScore: heroRanked.heroScore,
      isBreaking: heroRanked.velocity.isBreaking,
      velocity: heroRanked.velocity,
      imageUrl: heroRanked.cluster.imageUrl ?? null,
      topicCategory: heroRanked.topicCategory,
      trendBoost: heroRanked.trendBoost,
    };

    // ── TRENDING: next stories by story_score ──
    // Serve up to 20 so both the sidebar (8) and More Stories (12) have data
    const trendingItems = ranked.slice(1, 21).map((r) => this.formatClusterSummary(r));

    // ── MOST FRACTURED: highest FDI (not the hero) ──
    // Quality gates: require sufficient coverage and filter low-quality content
    const FRACTURED_MIN_ARTICLES = 4;
    const FRACTURED_MIN_SOURCES = 3;
    const LOW_QUALITY_PATTERNS = [
      'video shows', 'viral video', 'caught on camera', 'watch:',
      'shocking video', 'hilarious video', 'heartwarming video',
      'bizarre moment', "you won't believe", 'jaw-dropping',
    ];

    const fracturedCandidate = ranked
      .slice(1)
      .filter((r) => {
        // Must have a divergence score
        if (r.cluster.divergenceScore === null) return false;
        // Must have enough articles and sources for meaningful divergence
        if (r.cluster.articleCount < FRACTURED_MIN_ARTICLES) return false;
        if (r.cluster.sourceCount < FRACTURED_MIN_SOURCES) return false;
        // Reject low-quality / clickbait cluster topics
        const topic = (r.cluster.topic ?? '').toLowerCase();
        if (LOW_QUALITY_PATTERNS.some((p) => topic.includes(p))) return false;
        return true;
      })
      .sort(
        (a, b) =>
          (b.cluster.divergenceScore ?? 0) - (a.cluster.divergenceScore ?? 0),
      )[0];

    if (fracturedCandidate) {
      this.logger.log(
        `[MOST-FRACTURED] Selected: "${fracturedCandidate.cluster.topic?.slice(0, 60)}" ` +
          `FDI=${fracturedCandidate.cluster.divergenceScore} ` +
          `articles=${fracturedCandidate.cluster.articleCount} ` +
          `sources=${fracturedCandidate.cluster.sourceCount}`,
      );
    }

    let fractured: Record<string, any> | null = null;
    if (fracturedCandidate) {
      const fArticles = await this.articleRepo.find({
        where: { storyClusterId: fracturedCandidate.cluster.id },
        relations: ['source'],
        order: { politicalLeanScore: 'ASC' },
      });

      const fValid = fArticles.filter(
        (a) => a.politicalLeanScore !== null && a.source,
      );
      const fLeft = fValid[0] ?? fArticles[0];
      const fRight = fValid[fValid.length - 1] ?? fArticles[fArticles.length - 1];

      const fDivergence = await this.divergence.computeClusterDivergence(
        fracturedCandidate.cluster.id,
      );

      fractured = {
        cluster: this.formatClusterSummary(fracturedCandidate),
        divergence: fDivergence,
        leftArticle: fLeft ? this.formatArticle(fLeft) : null,
        rightArticle: fRight ? this.formatArticle(fRight) : null,
      };
    }

    // ── LATEST: 20 most recent articles ──
    const latest = await this.getLatestArticles(20);

    return { hero, trending: trendingItems, fractured, latest };
  }

  // ────────────────────────────────────────────────────
  // SNAPSHOT — Narrative Snapshot for social sharing
  // ────────────────────────────────────────────────────

  /**
   * GET /api/v1/narrative/cluster/:id/snapshot
   */
  @Public()
  @Get('cluster/:id/snapshot')
  async getSnapshot(@Param('id') clusterId: string) {
    const data = await this.snapshot.generateSnapshot(clusterId);
    if (!data) {
      throw new NotFoundException('Cluster not found or has insufficient data');
    }
    return data;
  }

  /**
   * GET /api/v1/narrative/cluster/:id/snapshot.svg
   */
  @Public()
  @Get('cluster/:id/snapshot.svg')
  async getSnapshotSvg(
    @Param('id') clusterId: string,
    @Res() res: Response,
  ) {
    const data = await this.snapshot.generateSnapshot(clusterId);
    if (!data) {
      throw new NotFoundException('Cluster not found or has insufficient data');
    }

    const svg = this.snapshotImage.renderSvg(data);
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.send(svg);
  }

  /**
   * GET /api/v1/narrative/cluster/:id/snapshot.png
   */
  @Public()
  @Get('cluster/:id/snapshot.png')
  async getSnapshotPng(
    @Param('id') clusterId: string,
    @Res() res: Response,
  ) {
    const data = await this.snapshot.generateSnapshot(clusterId);
    if (!data) {
      throw new NotFoundException('Cluster not found or has insufficient data');
    }

    const png = await this.snapshotImage.renderPng(data);
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.send(png);
  }

  // ────────────────────────────────────────────────────
  // EXISTING ENDPOINTS
  // ────────────────────────────────────────────────────

  /** GET /api/v1/narrative/stats */
  @Public()
  @Get('stats')
  async getStats() {
    const activeStories = await this.clusterRepo
      .createQueryBuilder('c')
      .where('c.status != :archived', { archived: ClusterStatus.ARCHIVED })
      .andWhere('c.articleCount >= 2')
      .getCount();

    const sourceStats = await this.sourceRepo
      .createQueryBuilder('s')
      .select('COUNT(*)', 'sourcesTracked')
      .where('s.isActive = true')
      .getRawOne();

    const avgDivResult = await this.clusterRepo
      .createQueryBuilder('c')
      .select('AVG(c.divergenceScore)', 'avgDiv')
      .where('c.divergenceScore IS NOT NULL')
      .andWhere('c.status != :archived', { archived: ClusterStatus.ARCHIVED })
      .getRawOne();

    const avgDivergence =
      Math.round(parseFloat(avgDivResult?.avgDiv ?? '0') * 10) / 10;

    return {
      activeStories,
      avgDivergence,
      sourcesTracked: parseInt(sourceStats?.sourcesTracked ?? '0', 10),
    };
  }

  /** GET /api/v1/narrative/stories */
  @Public()
  @Get('stories')
  async getStories(@Query() query: QueryStoriesDto) {
    const { page = 1, limit = 20, hours = 168, search } = query;

    const since = new Date();
    since.setHours(since.getHours() - hours);

    const qb = this.clusterRepo
      .createQueryBuilder('c')
      .where('c.articleCount >= 2')
      .andWhere('c.status != :archived', { archived: ClusterStatus.ARCHIVED })
      .andWhere('(c.newestArticleAt >= :since OR (c.newestArticleAt IS NULL AND c.updatedAt >= :since))', { since });

    if (search) {
      qb.andWhere('c.topic ILIKE :search', { search: `%${search}%` });
    }

    const [clusters, total] = await qb
      .orderBy('c."newestArticleAt"', 'DESC', 'NULLS LAST')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    if (total === 0) {
      return this.getRecentArticlesAsPseudoStories(page, limit, since, search);
    }

    return {
      data: clusters.map((c) => ({
        storyClusterId: c.id,
        title: c.topic,
        articleCount: c.articleCount,
        sourceCount: c.sourceCount,
        avgBias: null,
        avgSentiment: null,
        latestArticleAt: c.newestArticleAt ?? c.updatedAt,
        oldestArticleAt: c.oldestArticleAt ?? c.createdAt,
        divergenceScore: c.divergenceScore,
        isFractured: c.isFractured,
        status: c.status,
        topicKeywords: c.topicKeywords,
        velocityScore: c.velocityScore,
        imageUrl: c.imageUrl ?? null,
      })),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  private async getRecentArticlesAsPseudoStories(
    page: number,
    limit: number,
    since: Date,
    search?: string,
  ) {
    const qb = this.articleRepo
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.source', 'source')
      .where('a.ingestedAt >= :since', { since });

    if (search) {
      qb.andWhere('a.title ILIKE :search', { search: `%${search}%` });
    }

    const [articles, total] = await qb
      .orderBy('a.publishedAt', 'DESC')
      .addOrderBy('a.ingestedAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      data: articles.map((a) => ({
        storyClusterId: a.id,
        title: a.title,
        articleCount: 1,
        sourceCount: 1,
        avgBias: a.politicalLeanScore,
        avgSentiment: a.headlineSentiment,
        latestArticleAt: a.publishedAt || a.ingestedAt,
        oldestArticleAt: a.publishedAt || a.ingestedAt,
        divergenceScore: null,
        isFractured: false,
        status: 'ACTIVE',
        topicKeywords: [],
        velocityScore: null,
        _fallback: true,
      })),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  /** GET /api/v1/narrative/trending */
  @Public()
  @Get('trending')
  async getTrending(@Query() query: QueryTrendingDto) {
    const { hours = 24, limit = 20 } = query;
    return this.trending.getTrending(hours, limit);
  }

  /** GET /api/v1/narrative/cluster/:id */
  @Public()
  @Get('cluster/:id')
  async getCluster(@Param('id') clusterId: string) {
    const cluster = await this.clusterRepo.findOne({
      where: { id: clusterId },
    });

    const articles = await this.articleRepo.find({
      where: { storyClusterId: clusterId },
      relations: ['source'],
      order: { publishedAt: 'ASC', ingestedAt: 'ASC' },
    });

    const divergenceMetrics =
      await this.divergence.computeClusterDivergence(clusterId);

    // ── Narrative Spectrum: group articles by source, compute lean stats ──
    const sourceMap = new Map<
      string,
      { name: string; slug: string; lean: number; articleCount: number }
    >();
    for (const a of articles) {
      if (!a.source) continue;
      const key = a.source.slug;
      if (!sourceMap.has(key)) {
        sourceMap.set(key, {
          name: a.source.name,
          slug: a.source.slug,
          lean: a.source.politicalLeanPrior ?? 0,
          articleCount: 0,
        });
      }
      sourceMap.get(key)!.articleCount++;
    }
    const spectrumSources = [...sourceMap.values()].sort(
      (a, b) => a.lean - b.lean,
    );
    const leans = spectrumSources.map((s) => s.lean);
    const averageLean =
      leans.length > 0
        ? leans.reduce((sum, l) => sum + l, 0) / leans.length
        : 0;
    const spread =
      leans.length > 1 ? Math.max(...leans) - Math.min(...leans) : 0;

    // ── Narrative Frames: cluster articles by framing type + sentiment ──
    const narrativeFrames = this.detectNarrativeFrames(articles);

    // ── Headline Comparison: one headline per source, sorted by lean ──
    const headlineComparison = this.buildHeadlineComparison(articles);

    // ── Narrative Timeline: all articles sorted by publishedAt with lean ──
    const timeline = this.buildTimeline(articles);

    // ── Global Narrative Map: group sources by region ──
    const narrativeMap = this.buildNarrativeMap(articles);

    return {
      storyClusterId: clusterId,
      topic: cluster?.topic,
      summary: cluster?.summary ?? null,
      status: cluster?.status,
      articleCount: cluster?.articleCount ?? articles.length,
      sourceCount: cluster?.sourceCount ?? sourceMap.size,
      isFractured: cluster?.isFractured,
      topicKeywords: cluster?.topicKeywords,
      topicCategory: cluster?.topicCategory,
      newestArticleAt: cluster?.newestArticleAt ?? null,
      oldestArticleAt: cluster?.oldestArticleAt ?? null,
      createdAt: cluster?.createdAt,
      updatedAt: cluster?.updatedAt,
      divergenceScore: cluster?.divergenceScore ?? divergenceMetrics.fdi,
      velocityScore: cluster?.velocityScore,
      imageUrl: cluster?.imageUrl ?? null,
      divergence: divergenceMetrics,
      narrativeSpectrum: {
        averageLean: Math.round(averageLean * 100) / 100,
        spread: Math.round(spread * 100) / 100,
        sources: spectrumSources,
      },
      narrativeFrames: { frames: narrativeFrames },
      headlineComparison,
      timeline,
      narrativeMap,
      articles: articles.map((a) => this.formatArticle(a)),
    };
  }

  /** POST /api/v1/narrative/analyse/:id */
  @Post('analyse/:id')
  @HttpCode(HttpStatus.ACCEPTED)
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async analyseArticle(@Param('id') articleId: string) {
    const article = await this.articleRepo.findOne({
      where: { id: articleId },
    });
    if (!article) return { error: 'Article not found' };

    await this.narrativeQueue.add(
      'analyse-article',
      { articleId } as NarrativeJobData,
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    );
    return { message: 'Analysis queued', articleId };
  }

  /** POST /api/v1/narrative/analyse-all */
  @Post('analyse-all')
  @HttpCode(HttpStatus.ACCEPTED)
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async analyseAll() {
    const needsAnalysis = await this.articleRepo
      .createQueryBuilder('a')
      .where('a.headlineSentiment IS NULL OR a.storyClusterId IS NULL')
      .select('a.id')
      .getMany();

    for (const article of needsAnalysis) {
      await this.narrativeQueue.add(
        'analyse-article',
        { articleId: article.id } as NarrativeJobData,
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
          removeOnComplete: 100,
          removeOnFail: 500,
        },
      );
    }

    return {
      message: `Queued ${needsAnalysis.length} articles for analysis`,
      count: needsAnalysis.length,
    };
  }

  /** GET /api/v1/narrative/queue-stats */
  @Get('queue-stats')
  async getQueueStats() {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.narrativeQueue.getWaitingCount(),
      this.narrativeQueue.getActiveCount(),
      this.narrativeQueue.getCompletedCount(),
      this.narrativeQueue.getFailedCount(),
      this.narrativeQueue.getDelayedCount(),
    ]);
    return { waiting, active, completed, failed, delayed };
  }

  // ────────────────────────────────────────────────────
  // HELPERS
  // ────────────────────────────────────────────────────

  /**
   * MVP Narrative Frame Detection.
   *
   * Strategy:
   *  1. Primary grouping by article framingType (CONFLICT, ECONOMIC, etc.)
   *  2. Within each group, further split by headline sentiment polarity
   *     (positive vs. negative) when the group is large enough.
   *  3. Generate a human-readable frame title + summary from the group
   *     characteristics.
   *  4. Enforce: min 2 articles per frame, max 4 frames total.
   *
   * This gives us a keyword-free clustering that leverages the NLP
   * analysis we already run on every article.
   */
  private detectNarrativeFrames(
    articles: Article[],
  ): Array<{
    id: string;
    title: string;
    summary: string;
    sources: { name: string; slug: string }[];
    articleIds: string[];
  }> {
    if (articles.length < 2) return [];

    // ── Human-readable labels for each framing × sentiment combo ──
    const FRAME_LABELS: Record<
      string,
      { title: string; summaryTemplate: string }
    > = {
      CONFLICT_negative: {
        title: 'Conflict & Confrontation',
        summaryTemplate:
          'Coverage emphasizes disputes, clashes, and adversarial dynamics.',
      },
      CONFLICT_positive: {
        title: 'Resolution & Negotiation',
        summaryTemplate:
          'Coverage frames the conflict through attempts at resolution or compromise.',
      },
      CONFLICT_neutral: {
        title: 'Political Conflict',
        summaryTemplate:
          'Coverage highlights political tensions and competing positions.',
      },
      HUMAN_INTEREST_negative: {
        title: 'Human Cost',
        summaryTemplate:
          'Coverage centres on personal stories and the human toll of events.',
      },
      HUMAN_INTEREST_positive: {
        title: 'Human Triumph',
        summaryTemplate:
          'Coverage highlights resilience, personal stories, and positive outcomes.',
      },
      HUMAN_INTEREST_neutral: {
        title: 'Human Interest',
        summaryTemplate:
          'Coverage takes a personal, human-centred angle on the story.',
      },
      ECONOMIC_negative: {
        title: 'Economic Risk',
        summaryTemplate:
          'Coverage focuses on financial threats, costs, and economic downsides.',
      },
      ECONOMIC_positive: {
        title: 'Economic Opportunity',
        summaryTemplate:
          'Coverage emphasizes economic benefits, growth, or market opportunity.',
      },
      ECONOMIC_neutral: {
        title: 'Economic Impact',
        summaryTemplate:
          'Coverage analyses the financial and economic dimensions of the story.',
      },
      MORAL_negative: {
        title: 'Moral Criticism',
        summaryTemplate:
          'Coverage frames the story through ethical concerns and moral failings.',
      },
      MORAL_positive: {
        title: 'Moral Imperative',
        summaryTemplate:
          'Coverage appeals to shared values and ethical principles.',
      },
      MORAL_neutral: {
        title: 'Ethics & Values',
        summaryTemplate:
          'Coverage evaluates the story through a moral and ethical lens.',
      },
      RESPONSIBILITY_negative: {
        title: 'Accountability Narrative',
        summaryTemplate:
          'Coverage demands accountability and scrutinises who is responsible.',
      },
      RESPONSIBILITY_positive: {
        title: 'Policy Response',
        summaryTemplate:
          'Coverage focuses on proposed solutions and responsible policy action.',
      },
      RESPONSIBILITY_neutral: {
        title: 'Institutional Responsibility',
        summaryTemplate:
          'Coverage examines institutional roles and policy implications.',
      },
    };

    function sentimentBucket(s: number): 'positive' | 'negative' | 'neutral' {
      if (s > 0.15) return 'positive';
      if (s < -0.15) return 'negative';
      return 'neutral';
    }

    // ── Step 1: bucket articles by framingType ──
    const framingBuckets = new Map<string, Article[]>();
    for (const a of articles) {
      const key = a.framingType ?? 'RESPONSIBILITY';
      if (!framingBuckets.has(key)) framingBuckets.set(key, []);
      framingBuckets.get(key)!.push(a);
    }

    // ── Step 2: optionally sub-split large buckets by sentiment ──
    const candidateFrames: Array<{ key: string; articles: Article[] }> = [];

    for (const [framingType, bucket] of framingBuckets) {
      if (bucket.length >= 4) {
        // Try sentiment sub-split
        const sentBuckets = new Map<string, Article[]>();
        for (const a of bucket) {
          const sk = sentimentBucket(a.headlineSentiment ?? 0);
          if (!sentBuckets.has(sk)) sentBuckets.set(sk, []);
          sentBuckets.get(sk)!.push(a);
        }
        // Only keep sub-buckets with ≥ 2 articles
        const viable = [...sentBuckets.entries()].filter(
          ([, arts]) => arts.length >= 2,
        );
        if (viable.length > 1) {
          for (const [sent, arts] of viable) {
            candidateFrames.push({
              key: `${framingType}_${sent}`,
              articles: arts,
            });
          }
        } else {
          // Sub-split not useful; use dominant sentiment
          const avgSent =
            bucket.reduce((s, a) => s + (a.headlineSentiment ?? 0), 0) /
            bucket.length;
          candidateFrames.push({
            key: `${framingType}_${sentimentBucket(avgSent)}`,
            articles: bucket,
          });
        }
      } else if (bucket.length >= 2) {
        const avgSent =
          bucket.reduce((s, a) => s + (a.headlineSentiment ?? 0), 0) /
          bucket.length;
        candidateFrames.push({
          key: `${framingType}_${sentimentBucket(avgSent)}`,
          articles: bucket,
        });
      }
      // buckets with < 2 articles are dropped
    }

    // ── Step 3: sort by size descending, take top 4 ──
    candidateFrames.sort((a, b) => b.articles.length - a.articles.length);
    const topFrames = candidateFrames.slice(0, 4);

    // ── Step 4: build response objects ──
    return topFrames.map((frame, idx) => {
      const label = FRAME_LABELS[frame.key] ?? {
        title: frame.key.replace('_', ' — '),
        summaryTemplate: 'Coverage takes a distinct narrative angle on this story.',
      };

      // Deduplicated sources
      const sourceMap = new Map<string, { name: string; slug: string }>();
      for (const a of frame.articles) {
        if (a.source && !sourceMap.has(a.source.slug)) {
          sourceMap.set(a.source.slug, {
            name: a.source.name,
            slug: a.source.slug,
          });
        }
      }

      return {
        id: `frame-${idx}`,
        title: label.title,
        summary: label.summaryTemplate,
        sources: [...sourceMap.values()],
        articleIds: frame.articles.map((a) => a.id),
      };
    });
  }

  private formatArticle(a: Article) {
    return {
      id: a.id,
      title: a.title,
      summary: a.summary,
      content: a.content,
      url: a.url,
      author: a.author,
      imageUrl: a.imageUrl,
      source: a.source
        ? {
            id: a.source.id,
            name: a.source.name,
            slug: a.source.slug,
            url: a.source.url,
            tier: a.source.tier,
            politicalLeanPrior: a.source.politicalLeanPrior,
            establishmentPrior: a.source.establishmentPrior,
            reliabilityScore: a.source.reliabilityScore,
            country: a.source.country ?? null,
            region: a.source.region ?? null,
          }
        : null,
      sourceId: a.sourceId,
      storyClusterId: a.storyClusterId,
      publishedAt: a.publishedAt,
      ingestedAt: a.ingestedAt,
      politicalLeanScore: a.politicalLeanScore,
      establishmentScore: a.establishmentScore,
      headlineSentiment: a.headlineSentiment,
      bodySentiment: a.bodySentiment,
      headlineBodySentimentGap: a.headlineBodySentimentGap,
      emotionalValence: a.emotionalValence,
      framingType: a.framingType,
      framingConfidence: a.framingConfidence,
      divergenceFromMedian: a.divergenceFromMedian,
      ledeType: a.ledeType,
      sourceCount: a.sourceCount,
      namedSourceRatio: a.namedSourceRatio,
      quoteToNarrativeRatio: a.quoteToNarrativeRatio,
      clusterCentroidDistance: a.clusterCentroidDistance,
      firstInCluster: a.firstInCluster,
      paragraphCount: a.paragraphCount,
    };
  }

  /**
   * Headline Comparison: pick the most recent article per source,
   * return one headline per source sorted by political lean.
   */
  private buildHeadlineComparison(articles: Article[]) {
    const bySource = new Map<
      string,
      {
        sourceName: string;
        sourceSlug: string;
        lean: number;
        headline: string;
        sentiment: number;
        publishedAt: string | null;
        articleId: string;
        url: string;
      }
    >();

    // Articles are sorted ASC so later entries overwrite → newest per source
    for (const a of articles) {
      if (!a.source) continue;
      bySource.set(a.source.slug, {
        sourceName: a.source.name,
        sourceSlug: a.source.slug,
        lean: a.source.politicalLeanPrior ?? 0,
        headline: a.title,
        sentiment: a.headlineSentiment ?? 0,
        publishedAt: a.publishedAt?.toISOString?.() ?? a.publishedAt,
        articleId: a.id,
        url: a.url,
      });
    }

    return [...bySource.values()].sort((a, b) => a.lean - b.lean);
  }

  /**
   * Narrative Timeline: all articles with time + lean data for scatter plot.
   */
  private buildTimeline(articles: Article[]) {
    return articles
      .filter((a) => a.source && a.publishedAt)
      .map((a) => ({
        articleId: a.id,
        sourceName: a.source.name,
        sourceSlug: a.source.slug,
        lean: a.source.politicalLeanPrior ?? 0,
        headline: a.title,
        sentiment: a.headlineSentiment ?? 0,
        publishedAt: a.publishedAt?.toISOString?.() ?? a.publishedAt,
        framingType: a.framingType ?? null,
        url: a.url,
      }))
      .sort(
        (a, b) =>
          new Date(a.publishedAt).getTime() -
          new Date(b.publishedAt).getTime(),
      );
  }

  /**
   * Global Narrative Map: group sources by region, compute average lean
   * and article count per region.
   */
  private buildNarrativeMap(articles: Article[]) {
    const regionMap = new Map<
      string,
      {
        region: string;
        sources: Map<string, { name: string; slug: string; lean: number; articleCount: number }>;
        totalLean: number;
        articleCount: number;
      }
    >();

    for (const a of articles) {
      if (!a.source) continue;
      const region = a.source.region ?? 'Unknown';
      if (!regionMap.has(region)) {
        regionMap.set(region, {
          region,
          sources: new Map(),
          totalLean: 0,
          articleCount: 0,
        });
      }
      const entry = regionMap.get(region)!;
      entry.articleCount++;
      entry.totalLean += a.source.politicalLeanPrior ?? 0;

      const srcKey = a.source.slug;
      if (!entry.sources.has(srcKey)) {
        entry.sources.set(srcKey, {
          name: a.source.name,
          slug: a.source.slug,
          lean: a.source.politicalLeanPrior ?? 0,
          articleCount: 0,
        });
      }
      entry.sources.get(srcKey)!.articleCount++;
    }

    return {
      regions: [...regionMap.values()].map((r) => ({
        region: r.region,
        averageLean:
          r.articleCount > 0
            ? Math.round((r.totalLean / r.articleCount) * 100) / 100
            : 0,
        articleCount: r.articleCount,
        sources: [...r.sources.values()],
      })),
    };
  }

  private formatClusterSummary(r: {
    cluster: StoryCluster;
    storyScore: number;
    trendBoost?: number;
    topicCategory?: string;
  }) {
    const c = r.cluster;
    return {
      storyClusterId: c.id,
      title: c.topic,
      articleCount: c.articleCount,
      sourceCount: c.sourceCount,
      divergenceScore: c.divergenceScore,
      isFractured: c.isFractured,
      status: c.status,
      topicKeywords: c.topicKeywords,
      velocityScore: c.velocityScore,
      storyScore: r.storyScore,
      latestArticleAt: c.newestArticleAt ?? c.updatedAt,
      oldestArticleAt: c.oldestArticleAt ?? c.createdAt,
      imageUrl: c.imageUrl ?? null,
      topicCategory: c.topicCategory ?? 'uncategorized',
      trendBoost: r.trendBoost ?? 0,
    };
  }

  /**
   * Source-balanced "latest" articles.
   *
   * Instead of a raw ORDER BY publishedAt DESC (which lets high-volume
   * publishers dominate), we:
   *   1. Fetch the most recent articles per source (capped at MAX_PER_SOURCE).
   *   2. Round-robin interleave them so every active source gets
   *      representation in the final list.
   *   3. Fill any remaining slots with the newest leftover articles.
   *
   * This keeps the feed fresh while preventing single-source dominance.
   */
  private async getLatestArticles(limit: number) {
    const MAX_PER_SOURCE = 4; // no single source may exceed this
    const since = new Date();
    since.setDate(since.getDate() - 14);

    // Fetch a generous pool, sorted by recency
    const pool = await this.articleRepo.find({
      where: { publishedAt: MoreThanOrEqual(since) },
      relations: ['source'],
      order: { publishedAt: 'DESC' },
      take: limit * 5, // over-fetch so every source has candidates
    });

    const withSource = pool.filter((a) => a.source);

    // Bucket articles by source slug
    const buckets = new Map<string, Article[]>();
    for (const a of withSource) {
      const key = a.source.slug;
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key)!.push(a); // already sorted by publishedAt DESC
    }

    // Round-robin interleave (up to MAX_PER_SOURCE per source)
    const result: Article[] = [];
    const sourceKeys = [...buckets.keys()];
    const cursors = new Map<string, number>(sourceKeys.map((k) => [k, 0]));
    const counts = new Map<string, number>(sourceKeys.map((k) => [k, 0]));

    let added = true;
    while (result.length < limit && added) {
      added = false;
      for (const key of sourceKeys) {
        if (result.length >= limit) break;
        const bucket = buckets.get(key)!;
        const cursor = cursors.get(key)!;
        const count = counts.get(key)!;
        if (cursor < bucket.length && count < MAX_PER_SOURCE) {
          result.push(bucket[cursor]);
          cursors.set(key, cursor + 1);
          counts.set(key, count + 1);
          added = true;
        }
      }
    }

    // If we still have slots, fill with remaining articles (any source)
    if (result.length < limit) {
      const usedIds = new Set(result.map((a) => a.id));
      for (const a of withSource) {
        if (result.length >= limit) break;
        if (!usedIds.has(a.id)) {
          result.push(a);
          usedIds.add(a.id);
        }
      }
    }

    return result.map((a) => this.formatArticle(a));
  }
}
