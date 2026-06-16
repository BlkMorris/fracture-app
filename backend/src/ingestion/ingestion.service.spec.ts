import type { Repository } from 'typeorm';
import type { Queue } from 'bullmq';
import { SourceTier } from '../common/enums';
import type { Source } from '../articles/entities/source.entity';
import { PHASE_4_SOURCE_SLUGS } from '../articles/source-seeder.service';
import { IngestionService } from './ingestion.service';
import type { RssAdapter } from './adapters/rss.adapter';
import type { NewsApiAdapter } from './adapters/newsapi.adapter';

jest.mock('uuid', () => ({ v4: () => 'test-batch-id' }));

function buildService(sources: Source[]) {
  const ingestionQueue = {
    add: jest.fn().mockResolvedValue(undefined),
  };
  const sourceRepo = {
    find: jest.fn(({ where }: { where: Array<{ slug: string }> }) => {
      const slugs = new Set(where.map((item) => item.slug));
      return Promise.resolve(
        sources.filter((source) => slugs.has(source.slug)),
      );
    }),
    findOne: jest.fn(({ where }: { where: { slug: string } }) =>
      Promise.resolve(sources.find((source) => source.slug === where.slug)),
    ),
  };
  const rssAdapter = {
    fetchArticles: jest.fn((sourceSlug: string) =>
      Promise.resolve([
        {
          url: `https://example.com/${sourceSlug}/1`,
          title: `${sourceSlug} headline`,
          publishedAt: new Date().toISOString(),
          sourceSlug,
        },
      ]),
    ),
  };
  const newsApiAdapter = {
    fetchArticles: jest.fn(),
  };

  const service = new IngestionService(
    ingestionQueue as unknown as Queue,
    sourceRepo as unknown as Repository<Source>,
    rssAdapter as unknown as RssAdapter,
    newsApiAdapter as unknown as NewsApiAdapter,
  );

  return { service, ingestionQueue, sourceRepo, rssAdapter, newsApiAdapter };
}

function source(slug: string, options?: Partial<Source>): Source {
  return {
    id: `${slug}-id`,
    name: slug,
    slug,
    url: `https://${slug}.example.com`,
    rssFeedUrl: `https://${slug}.example.com/rss.xml`,
    tier: SourceTier.TIER_2,
    politicalLeanPrior: 0,
    establishmentPrior: 0,
    reliabilityScore: 0.7,
    country: 'US',
    region: 'North America',
    isActive: true,
    fetchIntervalSeconds: 300,
    articles: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...options,
  };
}

describe('IngestionService expanded sources', () => {
  it('fetches every Phase 4 source through the RSS ingestion path', async () => {
    const sources = PHASE_4_SOURCE_SLUGS.map((slug) => source(slug));
    const { service, ingestionQueue, rssAdapter, newsApiAdapter } =
      buildService(sources);

    const result = await service.fetchExpandedSources();

    expect(result.queued).toBe(PHASE_4_SOURCE_SLUGS.length);
    expect(result.sources).toHaveLength(PHASE_4_SOURCE_SLUGS.length);
    expect(result.sources.every((item) => item.status === 'queued')).toBe(true);
    expect(rssAdapter.fetchArticles).toHaveBeenCalledTimes(
      PHASE_4_SOURCE_SLUGS.length,
    );
    expect(newsApiAdapter.fetchArticles).not.toHaveBeenCalled();
    expect(ingestionQueue.add).toHaveBeenCalledTimes(
      PHASE_4_SOURCE_SLUGS.length,
    );
  });

  it('reports missing and inactive sources without blocking active sources', async () => {
    const { service, ingestionQueue } = buildService([
      source('abc-news'),
      source('cbs-news', { isActive: false }),
    ]);

    const result = await service.fetchSources([
      'abc-news',
      'cbs-news',
      'missing-source',
    ]);

    expect(result.queued).toBe(1);
    expect(result.sources).toEqual([
      expect.objectContaining({ slug: 'abc-news', status: 'queued' }),
      expect.objectContaining({ slug: 'cbs-news', status: 'inactive' }),
      expect.objectContaining({ slug: 'missing-source', status: 'missing' }),
    ]);
    expect(ingestionQueue.add).toHaveBeenCalledTimes(1);
  });

  it('deduplicates requested source slugs before fetching', async () => {
    const { service, rssAdapter } = buildService([source('abc-news')]);

    const result = await service.fetchSources(['abc-news', 'abc-news', '  ']);

    expect(result.queued).toBe(1);
    expect(result.sources).toHaveLength(1);
    expect(rssAdapter.fetchArticles).toHaveBeenCalledTimes(1);
  });
});
