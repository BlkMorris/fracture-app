import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Article } from '../../articles/entities/article.entity';
import { Source } from '../../articles/entities/source.entity';
import {
  ClusterStatus,
  StoryCluster,
  TopicCategoryEnum,
} from '../../articles/entities/story-cluster.entity';
import { DivergenceService } from './divergence.service';
import { TopicClassifierService } from './topic-classifier.service';

export type IntegritySeverity = 'critical' | 'warning' | 'info';
export type IntegrityDomain =
  | 'source'
  | 'article'
  | 'cluster'
  | 'category'
  | 'divergence'
  | 'framing';

export interface IntegrityIssue {
  severity: IntegritySeverity;
  domain: IntegrityDomain;
  code: string;
  message: string;
  entityType?: 'source' | 'article' | 'cluster';
  entityId?: string;
  context?: Record<string, unknown>;
}

export interface DataIntegrityAudit {
  generatedAt: string;
  sampledClusters: number;
  totals: {
    activeSources: number;
    activeClusters: number;
    recentArticles: number;
  };
  summary: {
    critical: number;
    warning: number;
    info: number;
    issueCount: number;
    status: 'pass' | 'review' | 'fail';
  };
  issues: IntegrityIssue[];
}

@Injectable()
export class DataIntegrityService {
  constructor(
    @InjectRepository(Article)
    private readonly articleRepo: Repository<Article>,
    @InjectRepository(Source)
    private readonly sourceRepo: Repository<Source>,
    @InjectRepository(StoryCluster)
    private readonly clusterRepo: Repository<StoryCluster>,
    private readonly divergence: DivergenceService,
    private readonly topicClassifier: TopicClassifierService,
  ) {}

  async audit(options?: {
    limit?: number;
    recomputeDivergence?: boolean;
  }): Promise<DataIntegrityAudit> {
    const limit = Math.min(Math.max(options?.limit ?? 50, 1), 200);
    const recomputeDivergence = options?.recomputeDivergence ?? false;
    const issues: IntegrityIssue[] = [];

    const [activeSources, activeClusters, recentArticles, clusters] =
      await Promise.all([
        this.sourceRepo.count({ where: { isActive: true } }),
        this.clusterRepo
          .createQueryBuilder('c')
          .where('c.status != :archived', { archived: ClusterStatus.ARCHIVED })
          .getCount(),
        this.articleRepo
          .createQueryBuilder('a')
          .where('a.ingestedAt >= :since', {
            since: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          })
          .getCount(),
        this.clusterRepo.find({
          where: { status: In([ClusterStatus.BREAKING, ClusterStatus.ACTIVE]) },
          order: { newestArticleAt: 'DESC', updatedAt: 'DESC' },
          take: limit,
        }),
      ]);

    await this.auditSources(issues);
    await this.auditRecentArticles(issues);
    await this.auditClusters(clusters, issues, recomputeDivergence);

    const summary = this.summarize(issues);

    return {
      generatedAt: new Date().toISOString(),
      sampledClusters: clusters.length,
      totals: {
        activeSources,
        activeClusters,
        recentArticles,
      },
      summary,
      issues,
    };
  }

  async auditCluster(clusterId: string, recomputeDivergence = true) {
    const cluster = await this.clusterRepo.findOne({
      where: { id: clusterId },
    });
    if (!cluster) {
      return this.buildSingleIssueAudit({
        severity: 'critical',
        domain: 'cluster',
        code: 'CLUSTER_NOT_FOUND',
        message: `Cluster ${clusterId} does not exist.`,
        entityType: 'cluster',
        entityId: clusterId,
      });
    }

    const issues: IntegrityIssue[] = [];
    await this.auditClusters([cluster], issues, recomputeDivergence);
    const summary = this.summarize(issues);

    return {
      generatedAt: new Date().toISOString(),
      sampledClusters: 1,
      totals: {
        activeSources: await this.sourceRepo.count({
          where: { isActive: true },
        }),
        activeClusters: 1,
        recentArticles: await this.articleRepo.count({
          where: { storyClusterId: clusterId },
        }),
      },
      summary,
      issues,
    };
  }

  private async auditSources(issues: IntegrityIssue[]) {
    const sources = await this.sourceRepo.find({ where: { isActive: true } });

    for (const source of sources) {
      if (!source.url || !this.looksLikeUrl(source.url)) {
        issues.push({
          severity: 'critical',
          domain: 'source',
          code: 'SOURCE_MISSING_URL',
          message: `${source.name} is active but has no valid outlet URL.`,
          entityType: 'source',
          entityId: source.id,
        });
      }

      if (!source.rssFeedUrl || !this.looksLikeUrl(source.rssFeedUrl)) {
        issues.push({
          severity: 'warning',
          domain: 'source',
          code: 'SOURCE_MISSING_FEED',
          message: `${source.name} is active but has no valid RSS/API feed URL.`,
          entityType: 'source',
          entityId: source.id,
        });
      }

      this.assertRange(issues, {
        value: source.politicalLeanPrior,
        min: -1,
        max: 1,
        domain: 'source',
        code: 'SOURCE_LEAN_OUT_OF_RANGE',
        message: `${source.name} has politicalLeanPrior outside [-1, 1].`,
        entityType: 'source',
        entityId: source.id,
      });
      this.assertRange(issues, {
        value: source.establishmentPrior,
        min: -1,
        max: 1,
        domain: 'source',
        code: 'SOURCE_ESTABLISHMENT_OUT_OF_RANGE',
        message: `${source.name} has establishmentPrior outside [-1, 1].`,
        entityType: 'source',
        entityId: source.id,
      });
      this.assertRange(issues, {
        value: source.reliabilityScore,
        min: 0,
        max: 1,
        domain: 'source',
        code: 'SOURCE_RELIABILITY_OUT_OF_RANGE',
        message: `${source.name} has reliabilityScore outside [0, 1].`,
        entityType: 'source',
        entityId: source.id,
      });
    }
  }

  private async auditRecentArticles(issues: IntegrityIssue[]) {
    const articles = await this.articleRepo.find({
      relations: ['source'],
      order: { ingestedAt: 'DESC' },
      take: 200,
    });

    for (const article of articles) {
      if (!article.title?.trim()) {
        issues.push({
          severity: 'critical',
          domain: 'article',
          code: 'ARTICLE_MISSING_TITLE',
          message: 'A recent article is missing a title.',
          entityType: 'article',
          entityId: article.id,
        });
      }

      if (!article.source && !article.sourceId) {
        issues.push({
          severity: 'critical',
          domain: 'article',
          code: 'ARTICLE_MISSING_SOURCE',
          message: `Article "${article.title}" is missing source attribution.`,
          entityType: 'article',
          entityId: article.id,
        });
      }

      this.assertRange(issues, {
        value: article.politicalLeanScore,
        min: -1,
        max: 1,
        domain: 'framing',
        code: 'ARTICLE_LEAN_OUT_OF_RANGE',
        message: `Article "${article.title}" has politicalLeanScore outside [-1, 1].`,
        entityType: 'article',
        entityId: article.id,
      });
      this.assertRange(issues, {
        value: article.headlineSentiment,
        min: -1,
        max: 1,
        domain: 'framing',
        code: 'ARTICLE_HEADLINE_SENTIMENT_OUT_OF_RANGE',
        message: `Article "${article.title}" has headlineSentiment outside [-1, 1].`,
        entityType: 'article',
        entityId: article.id,
      });
      this.assertRange(issues, {
        value: article.bodySentiment,
        min: -1,
        max: 1,
        domain: 'framing',
        code: 'ARTICLE_BODY_SENTIMENT_OUT_OF_RANGE',
        message: `Article "${article.title}" has bodySentiment outside [-1, 1].`,
        entityType: 'article',
        entityId: article.id,
      });
      this.assertRange(issues, {
        value: article.framingConfidence,
        min: 0,
        max: 1,
        domain: 'framing',
        code: 'ARTICLE_FRAMING_CONFIDENCE_OUT_OF_RANGE',
        message: `Article "${article.title}" has framingConfidence outside [0, 1].`,
        entityType: 'article',
        entityId: article.id,
      });

      if (article.storyClusterId && !article.framingType) {
        issues.push({
          severity: 'info',
          domain: 'framing',
          code: 'CLUSTERED_ARTICLE_MISSING_FRAME',
          message: `Clustered article "${article.title}" has no framingType yet.`,
          entityType: 'article',
          entityId: article.id,
        });
      }
    }
  }

  private async auditClusters(
    clusters: StoryCluster[],
    issues: IntegrityIssue[],
    recomputeDivergence: boolean,
  ) {
    for (const cluster of clusters) {
      const articles = await this.articleRepo.find({
        where: { storyClusterId: cluster.id },
        relations: ['source'],
      });
      const uniqueSources = new Set(
        articles
          .map((article) => article.source?.slug ?? article.sourceId)
          .filter(Boolean),
      );

      if (!cluster.topic?.trim()) {
        issues.push({
          severity: 'critical',
          domain: 'cluster',
          code: 'CLUSTER_MISSING_TOPIC',
          message: 'A cluster is missing its topic label.',
          entityType: 'cluster',
          entityId: cluster.id,
        });
      }

      if (cluster.articleCount !== articles.length) {
        issues.push({
          severity: 'warning',
          domain: 'cluster',
          code: 'CLUSTER_ARTICLE_COUNT_DRIFT',
          message: `Cluster "${cluster.topic}" stores articleCount=${cluster.articleCount}, but ${articles.length} articles are linked.`,
          entityType: 'cluster',
          entityId: cluster.id,
          context: { stored: cluster.articleCount, actual: articles.length },
        });
      }

      if (cluster.sourceCount !== uniqueSources.size) {
        issues.push({
          severity: 'warning',
          domain: 'cluster',
          code: 'CLUSTER_SOURCE_COUNT_DRIFT',
          message: `Cluster "${cluster.topic}" stores sourceCount=${cluster.sourceCount}, but ${uniqueSources.size} unique sources are linked.`,
          entityType: 'cluster',
          entityId: cluster.id,
          context: { stored: cluster.sourceCount, actual: uniqueSources.size },
        });
      }

      this.assertRange(issues, {
        value: cluster.divergenceScore,
        min: 0,
        max: 100,
        domain: 'divergence',
        code: 'CLUSTER_FDI_OUT_OF_RANGE',
        message: `Cluster "${cluster.topic}" has divergenceScore outside [0, 100].`,
        entityType: 'cluster',
        entityId: cluster.id,
      });

      const expectedFractured =
        (cluster.divergenceScore ?? 0) >= 40 && uniqueSources.size >= 2;
      if (cluster.isFractured !== expectedFractured) {
        issues.push({
          severity: 'warning',
          domain: 'divergence',
          code: 'CLUSTER_FRACTURED_FLAG_DRIFT',
          message: `Cluster "${cluster.topic}" has isFractured=${cluster.isFractured}, expected ${expectedFractured}.`,
          entityType: 'cluster',
          entityId: cluster.id,
          context: {
            divergenceScore: cluster.divergenceScore,
            sourceCount: uniqueSources.size,
          },
        });
      }

      this.auditClusterCategory(cluster, articles, issues);

      if (recomputeDivergence && articles.length >= 2) {
        const recomputed = await this.divergence.computeClusterDivergence(
          cluster.id,
        );
        const stored = cluster.divergenceScore ?? 0;
        const delta = Math.abs(stored - recomputed.fdi);

        if (delta > 5) {
          issues.push({
            severity: 'warning',
            domain: 'divergence',
            code: 'CLUSTER_FDI_RECOMPUTE_DRIFT',
            message: `Cluster "${cluster.topic}" stored FDI differs from recomputed FDI by ${delta.toFixed(1)} points.`,
            entityType: 'cluster',
            entityId: cluster.id,
            context: { stored, recomputed: recomputed.fdi, delta },
          });
        }
      }
    }
  }

  private auditClusterCategory(
    cluster: StoryCluster,
    articles: Article[],
    issues: IntegrityIssue[],
  ) {
    const storedCategory = cluster.topicCategory;
    const articleTitles = articles.map((article) => article.title);
    const classification = this.topicClassifier.classify(
      cluster.topic,
      cluster.topicKeywords ?? [],
      articleTitles,
    );

    if (
      !storedCategory ||
      storedCategory === String(TopicCategoryEnum.UNCATEGORIZED)
    ) {
      issues.push({
        severity: classification.confidence >= 2 ? 'warning' : 'info',
        domain: 'category',
        code: 'CLUSTER_UNCATEGORIZED',
        message:
          classification.confidence >= 2
            ? `Cluster "${cluster.topic}" is uncategorized but classifier suggests ${classification.category}.`
            : `Cluster "${cluster.topic}" is uncategorized.`,
        entityType: 'cluster',
        entityId: cluster.id,
        context: classification,
      });
      return;
    }

    if (
      classification.confidence >= 4 &&
      String(classification.category) !== storedCategory
    ) {
      issues.push({
        severity: 'info',
        domain: 'category',
        code: 'CLUSTER_CATEGORY_MISMATCH',
        message: `Cluster "${cluster.topic}" is categorized as ${cluster.topicCategory}, but classifier suggests ${classification.category}.`,
        entityType: 'cluster',
        entityId: cluster.id,
        context: classification,
      });
    }
  }

  private assertRange(
    issues: IntegrityIssue[],
    options: {
      value: number | null | undefined;
      min: number;
      max: number;
      domain: IntegrityDomain;
      code: string;
      message: string;
      entityType: IntegrityIssue['entityType'];
      entityId: string;
    },
  ) {
    if (options.value === null || options.value === undefined) return;
    if (options.value < options.min || options.value > options.max) {
      issues.push({
        severity: 'critical',
        domain: options.domain,
        code: options.code,
        message: options.message,
        entityType: options.entityType,
        entityId: options.entityId,
        context: {
          value: options.value,
          min: options.min,
          max: options.max,
        },
      });
    }
  }

  private summarize(issues: IntegrityIssue[]) {
    const critical = issues.filter(
      (issue) => issue.severity === 'critical',
    ).length;
    const warning = issues.filter(
      (issue) => issue.severity === 'warning',
    ).length;
    const info = issues.filter((issue) => issue.severity === 'info').length;

    return {
      critical,
      warning,
      info,
      issueCount: issues.length,
      status: critical > 0 ? 'fail' : warning > 0 ? 'review' : 'pass',
    } as const;
  }

  private buildSingleIssueAudit(issue: IntegrityIssue): DataIntegrityAudit {
    return {
      generatedAt: new Date().toISOString(),
      sampledClusters: 0,
      totals: {
        activeSources: 0,
        activeClusters: 0,
        recentArticles: 0,
      },
      summary: this.summarize([issue]),
      issues: [issue],
    };
  }

  private looksLikeUrl(value: string) {
    return /^https?:\/\/\S+\.\S+/.test(value);
  }
}
