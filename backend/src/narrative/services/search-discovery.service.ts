import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Article } from '../../articles/entities/article.entity';
import { StoryCluster } from '../../articles/entities/story-cluster.entity';

/**
 * Lightweight discovery search across story clusters and articles.
 *
 * Uses PostgreSQL ILIKE for filtering + application-layer relevance scoring.
 * Designed as a read-only discovery layer that does not modify
 * any existing ingestion, clustering, or analysis pipelines.
 */

export interface DiscoveryClusterResult {
  id: string;
  title: string;
  summary: string | null;
  articleCount: number;
  sourceCount: number;
  divergenceScore: number | null;
  isFractured: boolean;
  topicKeywords: string[];
  topicCategory: string;
  imageUrl: string | null;
  velocityScore: number | null;
  updatedAt: string;
  createdAt: string;
  /** Relevance score computed in application layer */
  relevanceScore: number;
}

export interface DiscoveryArticleResult {
  id: string;
  title: string;
  summary: string | null;
  url: string;
  publishedAt: string | null;
  sourceId: string | null;
  sourceName: string | null;
  sourceSlug: string | null;
  storyClusterId: string | null;
  clusterTitle: string | null;
  politicalLeanScore: number | null;
  framingType: string | null;
  imageUrl: string | null;
  relevanceScore: number;
}

export interface DiscoverySearchResult {
  query: string;
  clusters: DiscoveryClusterResult[];
  articles: DiscoveryArticleResult[];
  relatedTopics: string[];
  totalClusters: number;
  totalArticles: number;
}

@Injectable()
export class SearchDiscoveryService {
  private readonly logger = new Logger(SearchDiscoveryService.name);

  constructor(
    @InjectRepository(Article)
    private readonly articleRepo: Repository<Article>,
    @InjectRepository(StoryCluster)
    private readonly clusterRepo: Repository<StoryCluster>,
  ) {}

  /**
   * Search clusters and articles, return ranked results with related topics.
   */
  async search(
    q: string,
    page = 1,
    limit = 20,
  ): Promise<DiscoverySearchResult> {
    const trimmed = q.trim();
    if (!trimmed) {
      return {
        query: q,
        clusters: [],
        articles: [],
        relatedTopics: [],
        totalClusters: 0,
        totalArticles: 0,
      };
    }

    // Split query into individual terms for multi-signal scoring
    const terms = trimmed
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length > 1);
    const likePattern = `%${trimmed}%`;

    // ── Search clusters ───────────────────────────────────
    // Use raw SQL to avoid TypeORM QueryBuilder metadata issues
    // with jsonb columns and entity relations.
    const termConditions = terms
      .map((_, i) => `OR EXISTS (SELECT 1 FROM jsonb_array_elements_text("topicKeywords") kw WHERE LOWER(kw) LIKE $${i + 2})`)
      .join(' ');
    const termParams = terms.map((t) => `%${t}%`);

    const clusterSql = `
      SELECT id, topic, summary, "articleCount", "sourceCount",
             "divergenceScore", "isFractured", "topicKeywords",
             "topicCategory", "imageUrl", "velocityScore",
             "newestArticleAt", "oldestArticleAt", "updatedAt", "createdAt"
      FROM story_clusters
      WHERE "articleCount" >= 2
        AND status != 'ARCHIVED'
        AND (
          topic ILIKE $1
          OR summary ILIKE $1
          ${termConditions}
        )
      ORDER BY "articleCount" DESC, "updatedAt" DESC
      LIMIT 50
    `;

    const clusterRows: any[] = await this.clusterRepo.query(
      clusterSql,
      [likePattern, ...termParams],
    );

    // Score and rank clusters
    const scoredClusters = clusterRows.map((c) => {
      let score = 0;
      const topicLower = (c.topic ?? '').toLowerCase();
      const summaryLower = (c.summary ?? '').toLowerCase();
      const queryLower = trimmed.toLowerCase();

      if (topicLower.includes(queryLower)) score += 100;
      if (topicLower.startsWith(queryLower)) score += 20;
      for (const t of terms) {
        if (topicLower.includes(t)) score += 30;
      }
      const keywords = (c.topicKeywords ?? []).map((k: string) => k.toLowerCase());
      for (const t of terms) {
        if (keywords.some((kw: string) => kw.includes(t))) score += 25;
      }
      for (const t of terms) {
        if (summaryLower.includes(t)) score += 15;
      }
      score += Math.min(20, c.articleCount * 2);
      if (c.divergenceScore) score += Math.min(10, c.divergenceScore / 10);

      return {
        id: c.id,
        title: c.topic,
        summary: c.summary,
        articleCount: c.articleCount,
        sourceCount: c.sourceCount,
        divergenceScore: c.divergenceScore,
        isFractured: c.isFractured,
        topicKeywords: c.topicKeywords ?? [],
        topicCategory: c.topicCategory ?? 'uncategorized',
        imageUrl: c.imageUrl,
        velocityScore: c.velocityScore,
        updatedAt: (c.newestArticleAt ?? c.updatedAt)?.toISOString?.()
          ?? (c.newestArticleAt ?? c.updatedAt ?? new Date().toISOString()),
        createdAt: (c.oldestArticleAt ?? c.createdAt)?.toISOString?.()
          ?? (c.oldestArticleAt ?? c.createdAt ?? new Date().toISOString()),
        relevanceScore: score,
      } as DiscoveryClusterResult;
    });

    scoredClusters.sort((a, b) => b.relevanceScore - a.relevanceScore);
    const totalClusters = scoredClusters.length;
    const paginatedClusters = scoredClusters.slice(0, limit);

    // ── Search articles ───────────────────────────────────
    // Use raw SQL to avoid TypeORM metadata resolution issues.
    const articleSql = `
      SELECT a.id, a.title, a.summary, a.url,
             a."publishedAt", a."ingestedAt",
             a."sourceId", a."storyClusterId",
             a."politicalLeanScore", a."framingType", a."imageUrl",
             s.name AS "sourceName", s.slug AS "sourceSlug",
             sc.topic AS "clusterTitle"
      FROM articles a
      LEFT JOIN sources s ON s.id = a."sourceId"
      LEFT JOIN story_clusters sc ON sc.id = a."storyClusterId"
      WHERE a.title ILIKE $1 OR a.summary ILIKE $1
      ORDER BY a."publishedAt" DESC NULLS LAST, a."ingestedAt" DESC
      LIMIT 50
    `;

    const articleRows: any[] = await this.articleRepo.query(
      articleSql,
      [likePattern],
    );

    // Score and rank articles
    const scoredArticles = articleRows.map((a) => {
      let score = 0;
      const titleLower = (a.title ?? '').toLowerCase();
      const summaryLower = (a.summary ?? '').toLowerCase();
      const queryLower = trimmed.toLowerCase();

      if (titleLower.includes(queryLower)) score += 60;
      if (titleLower.startsWith(queryLower)) score += 15;
      for (const t of terms) {
        if (titleLower.includes(t)) score += 20;
      }
      for (const t of terms) {
        if (summaryLower.includes(t)) score += 10;
      }

      const pubDate = a.publishedAt ?? a.ingestedAt ?? null;
      return {
        id: a.id,
        title: a.title,
        summary: a.summary,
        url: a.url,
        publishedAt: pubDate instanceof Date ? pubDate.toISOString() : pubDate,
        sourceId: a.sourceId,
        sourceName: a.sourceName ?? null,
        sourceSlug: a.sourceSlug ?? null,
        storyClusterId: a.storyClusterId,
        clusterTitle: a.clusterTitle ?? null,
        politicalLeanScore: a.politicalLeanScore,
        framingType: a.framingType,
        imageUrl: a.imageUrl,
        relevanceScore: score,
      } as DiscoveryArticleResult;
    });

    scoredArticles.sort((a, b) => b.relevanceScore - a.relevanceScore);
    const totalArticles = scoredArticles.length;
    const paginatedArticles = scoredArticles.slice(0, limit);

    // ── Extract related topics ────────────────────────────
    const topicSet = new Set<string>();
    for (const c of scoredClusters.slice(0, 20)) {
      for (const kw of c.topicKeywords) {
        // Skip single-char keywords and the search terms themselves
        if (kw.length > 2 && !terms.includes(kw.toLowerCase())) {
          topicSet.add(kw);
        }
      }
    }
    const relatedTopics = Array.from(topicSet).slice(0, 12);

    return {
      query: trimmed,
      clusters: paginatedClusters,
      articles: paginatedArticles,
      relatedTopics,
      totalClusters,
      totalArticles,
    };
  }

  /**
   * Get trending topic keywords for empty-state suggestions.
   */
  async getTrendingTopics(limit = 8): Promise<string[]> {
    const since = new Date();
    since.setHours(since.getHours() - 48);

    const rows: any[] = await this.clusterRepo.query(
      `SELECT "topicKeywords"
       FROM story_clusters
       WHERE "articleCount" >= 3
         AND status != 'ARCHIVED'
         AND "updatedAt" >= $1
       ORDER BY "articleCount" DESC
       LIMIT 20`,
      [since],
    );

    const topicCounts = new Map<string, number>();
    for (const row of rows) {
      for (const kw of row.topicKeywords ?? []) {
        if (kw.length > 2) {
          topicCounts.set(kw, (topicCounts.get(kw) ?? 0) + 1);
        }
      }
    }

    return Array.from(topicCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([topic]) => topic);
  }
}
