import type { Repository } from 'typeorm';
import type { Article } from '../../articles/entities/article.entity';
import type { Source } from '../../articles/entities/source.entity';
import {
  ClusterStatus,
  type StoryCluster,
} from '../../articles/entities/story-cluster.entity';
import { FramingType, SourceTier } from '../../common/enums';
import { DataIntegrityService } from './data-integrity.service';
import type { DivergenceService } from './divergence.service';
import { TopicClassifierService } from './topic-classifier.service';

interface ArticleFindOptions {
  where?: {
    storyClusterId?: string;
  };
}

function countQueryBuilder(count: number) {
  return {
    where: jest.fn().mockReturnThis(),
    getCount: jest.fn().mockResolvedValue(count),
  };
}

function buildService(overrides?: {
  sourceFind?: unknown[];
  articleFind?: (options?: any) => Promise<unknown[]>;
  clusterFind?: unknown[];
  recomputedFdi?: number;
}) {
  const sourceRepo = {
    count: jest.fn().mockResolvedValue(2),
    find: jest.fn().mockResolvedValue(overrides?.sourceFind ?? []),
  };
  const articleRepo = {
    count: jest.fn().mockResolvedValue(2),
    createQueryBuilder: jest.fn(() => countQueryBuilder(2)),
    find: overrides?.articleFind ?? jest.fn().mockResolvedValue([]),
  };
  const clusterRepo = {
    count: jest.fn().mockResolvedValue(1),
    createQueryBuilder: jest.fn(() => countQueryBuilder(1)),
    find: jest.fn().mockResolvedValue(overrides?.clusterFind ?? []),
    findOne: jest.fn(),
  };
  const divergence = {
    computeClusterDivergence: jest.fn().mockResolvedValue({
      fdi: overrides?.recomputedFdi ?? 24,
      headlineSentimentSpread: 0,
      framingTypeEntropy: 0,
      biasSpread: 0,
      linguisticSpread: 0,
      sourceSelectionVariance: 0,
      structuralDivergence: 0,
      articleCount: 2,
    }),
  };

  const service = new DataIntegrityService(
    articleRepo as unknown as Repository<Article>,
    sourceRepo as unknown as Repository<Source>,
    clusterRepo as unknown as Repository<StoryCluster>,
    divergence as unknown as DivergenceService,
    new TopicClassifierService(),
  );

  return { service, sourceRepo, articleRepo, clusterRepo, divergence };
}

const source = {
  id: 'source-1',
  name: 'Reuters',
  slug: 'reuters',
  url: 'https://www.reuters.com',
  rssFeedUrl: 'https://www.reutersagency.com/feed/',
  tier: SourceTier.TIER_1_STANDARD,
  politicalLeanPrior: 0,
  establishmentPrior: 0.7,
  reliabilityScore: 0.92,
  isActive: true,
};

const cluster = {
  id: 'cluster-1',
  topic: 'Oil prices slide after Pakistan announces deal between US and Iran',
  topicKeywords: ['oil', 'prices', 'iran', 'deal'],
  topicCategory: 'uncategorized',
  status: ClusterStatus.ACTIVE,
  articleCount: 2,
  sourceCount: 2,
  divergenceScore: 24,
  isFractured: false,
  newestArticleAt: new Date('2026-06-14T12:00:00Z'),
  updatedAt: new Date('2026-06-14T12:00:00Z'),
};

const articles = [
  {
    id: 'article-1',
    title: 'Oil prices slide after US and Iran deal announced',
    sourceId: 'source-1',
    source,
    storyClusterId: 'cluster-1',
    politicalLeanScore: 0,
    headlineSentiment: -0.1,
    bodySentiment: -0.1,
    framingType: FramingType.ECONOMIC,
    framingConfidence: 0.8,
    ingestedAt: new Date('2026-06-14T12:00:00Z'),
  },
  {
    id: 'article-2',
    title: 'Iran deal sends crude lower',
    sourceId: 'source-2',
    source: { ...source, id: 'source-2', slug: 'associated-press' },
    storyClusterId: 'cluster-1',
    politicalLeanScore: 0.1,
    headlineSentiment: -0.2,
    bodySentiment: -0.2,
    framingType: FramingType.ECONOMIC,
    framingConfidence: 0.8,
    ingestedAt: new Date('2026-06-14T12:00:00Z'),
  },
];

describe('DataIntegrityService', () => {
  it('flags uncategorized clusters when the classifier finds a likely category', async () => {
    const { service } = buildService({
      sourceFind: [source],
      clusterFind: [cluster],
      articleFind: jest.fn((options?: ArticleFindOptions) =>
        Promise.resolve(options?.where?.storyClusterId ? articles : articles),
      ),
    });

    const audit = await service.audit({ limit: 10 });

    expect(audit.summary.status).toBe('review');
    expect(audit.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'CLUSTER_UNCATEGORIZED',
          domain: 'category',
          severity: 'warning',
        }),
      ]),
    );
  });

  it('flags stored aggregate and FDI drift against linked articles', async () => {
    const driftedCluster = {
      ...cluster,
      articleCount: 4,
      sourceCount: 4,
      divergenceScore: 80,
      topicCategory: 'economy',
      isFractured: true,
    };
    const { service } = buildService({
      sourceFind: [source],
      clusterFind: [driftedCluster],
      articleFind: jest.fn((options?: ArticleFindOptions) =>
        Promise.resolve(options?.where?.storyClusterId ? articles : articles),
      ),
      recomputedFdi: 20,
    });

    const audit = await service.audit({
      limit: 10,
      recomputeDivergence: true,
    });

    expect(audit.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'CLUSTER_ARTICLE_COUNT_DRIFT' }),
        expect.objectContaining({ code: 'CLUSTER_SOURCE_COUNT_DRIFT' }),
        expect.objectContaining({ code: 'CLUSTER_FDI_RECOMPUTE_DRIFT' }),
      ]),
    );
  });

  it('fails when source or article analysis scores are outside allowed ranges', async () => {
    const badSource = {
      ...source,
      politicalLeanPrior: 2,
      reliabilityScore: 1.4,
    };
    const badArticles = [
      {
        ...articles[0],
        politicalLeanScore: -2,
        framingConfidence: 1.5,
      },
    ];
    const { service } = buildService({
      sourceFind: [badSource],
      clusterFind: [],
      articleFind: jest.fn().mockResolvedValue(badArticles),
    });

    const audit = await service.audit();

    expect(audit.summary.status).toBe('fail');
    expect(audit.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'SOURCE_LEAN_OUT_OF_RANGE' }),
        expect.objectContaining({ code: 'SOURCE_RELIABILITY_OUT_OF_RANGE' }),
        expect.objectContaining({ code: 'ARTICLE_LEAN_OUT_OF_RANGE' }),
        expect.objectContaining({
          code: 'ARTICLE_FRAMING_CONFIDENCE_OUT_OF_RANGE',
        }),
      ]),
    );
  });
});
