import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { Article } from '../articles/entities/article.entity';

const INDEX_NAME = 'fracture-articles';

/**
 * Elasticsearch indexing and search per SYSTEM_DESIGN §2.6.
 *
 * Capabilities:
 * - Full-text search across headlines, summaries, and content
 * - Faceted filtering by source, bias score range, story cluster, time window
 * - Autocomplete on headlines
 */
@Injectable()
export class SearchService implements OnModuleInit {
  private readonly logger = new Logger(SearchService.name);

  constructor(private readonly es: ElasticsearchService) {}

  async onModuleInit() {
    await this.ensureIndex();
  }

  /**
   * Create the index with custom mappings if it doesn't exist.
   */
  private async ensureIndex(): Promise<void> {
    try {
      const exists = await this.es.indices.exists({ index: INDEX_NAME });
      if (exists) {
        this.logger.log(`ES index "${INDEX_NAME}" already exists`);
        return;
      }

      await this.es.indices.create({
        index: INDEX_NAME,
        body: {
          settings: {
            number_of_shards: 1,
            number_of_replicas: 0, // dev mode
            analysis: {
              analyzer: {
                headline_analyzer: {
                  type: 'custom',
                  tokenizer: 'standard',
                  filter: ['lowercase', 'asciifolding', 'headline_ngram'],
                },
              },
              filter: {
                headline_ngram: {
                  type: 'edge_ngram',
                  min_gram: 2,
                  max_gram: 20,
                },
              },
            },
          },
          mappings: {
            properties: {
              id: { type: 'keyword' },
              title: {
                type: 'text',
                analyzer: 'standard',
                fields: {
                  autocomplete: {
                    type: 'text',
                    analyzer: 'headline_analyzer',
                    search_analyzer: 'standard',
                  },
                  keyword: { type: 'keyword' },
                },
              },
              summary: { type: 'text' },
              content: { type: 'text' },
              url: { type: 'keyword' },
              author: { type: 'keyword' },
              sourceId: { type: 'keyword' },
              sourceName: { type: 'keyword' },
              sourceSlug: { type: 'keyword' },
              storyClusterId: { type: 'keyword' },
              publishedAt: { type: 'date' },
              ingestedAt: { type: 'date' },
              // Narrative metadata
              politicalLeanScore: { type: 'float' },
              establishmentScore: { type: 'float' },
              headlineSentiment: { type: 'float' },
              bodySentiment: { type: 'float' },
              framingType: { type: 'keyword' },
              framingConfidence: { type: 'float' },
              divergenceFromMedian: { type: 'float' },
              ledeType: { type: 'keyword' },
            },
          },
        },
      });

      this.logger.log(`ES index "${INDEX_NAME}" created`);
    } catch (error) {
      this.logger.error(
        `Failed to create ES index: ${error.message}`,
      );
    }
  }

  /**
   * Index a single article into Elasticsearch.
   */
  async indexArticle(article: Article): Promise<void> {
    try {
      await this.es.index({
        index: INDEX_NAME,
        id: article.id,
        body: {
          id: article.id,
          title: article.title,
          summary: article.summary,
          content: article.content?.slice(0, 5000), // limit content size
          url: article.url,
          author: article.author,
          sourceId: article.sourceId,
          sourceName: article.source?.name,
          sourceSlug: article.source?.slug,
          storyClusterId: article.storyClusterId,
          publishedAt: article.publishedAt,
          ingestedAt: article.ingestedAt,
          politicalLeanScore: article.politicalLeanScore,
          establishmentScore: article.establishmentScore,
          headlineSentiment: article.headlineSentiment,
          bodySentiment: article.bodySentiment,
          framingType: article.framingType,
          framingConfidence: article.framingConfidence,
          divergenceFromMedian: article.divergenceFromMedian,
          ledeType: article.ledeType,
        },
        refresh: true,
      });
    } catch (error) {
      this.logger.error(
        `Failed to index article ${article.id}: ${error.message}`,
      );
    }
  }

  /**
   * Bulk index multiple articles.
   */
  async bulkIndex(articles: Article[]): Promise<{ indexed: number }> {
    if (articles.length === 0) return { indexed: 0 };

    const body = articles.flatMap((article) => [
      { index: { _index: INDEX_NAME, _id: article.id } },
      {
        id: article.id,
        title: article.title,
        summary: article.summary,
        content: article.content?.slice(0, 5000),
        url: article.url,
        author: article.author,
        sourceId: article.sourceId,
        sourceName: article.source?.name,
        sourceSlug: article.source?.slug,
        storyClusterId: article.storyClusterId,
        publishedAt: article.publishedAt,
        ingestedAt: article.ingestedAt,
        politicalLeanScore: article.politicalLeanScore,
        establishmentScore: article.establishmentScore,
        headlineSentiment: article.headlineSentiment,
        bodySentiment: article.bodySentiment,
        framingType: article.framingType,
        framingConfidence: article.framingConfidence,
        divergenceFromMedian: article.divergenceFromMedian,
        ledeType: article.ledeType,
      },
    ]);

    const result = await this.es.bulk({ body, refresh: true });
    const indexed = articles.length - (result.errors ? 1 : 0);
    this.logger.log(`Bulk indexed ${indexed} articles to ES`);
    return { indexed };
  }

  /**
   * Full-text search with faceted filtering.
   */
  async search(params: {
    q?: string;
    sourceId?: string;
    storyClusterId?: string;
    framingType?: string;
    biasMin?: number;
    biasMax?: number;
    from?: string; // ISO date
    to?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    data: Array<Record<string, unknown>>;
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const {
      q,
      sourceId,
      storyClusterId,
      framingType,
      biasMin,
      biasMax,
      from,
      to,
      page = 1,
      limit = 20,
    } = params;

    const must: Array<Record<string, unknown>> = [];
    const filter: Array<Record<string, unknown>> = [];

    // Full-text query across title, summary, content
    if (q) {
      must.push({
        multi_match: {
          query: q,
          fields: ['title^3', 'summary^2', 'content'],
          type: 'best_fields',
          fuzziness: 'AUTO',
        },
      });
    }

    // Facet filters
    if (sourceId) filter.push({ term: { sourceId } });
    if (storyClusterId) filter.push({ term: { storyClusterId } });
    if (framingType) filter.push({ term: { framingType } });

    if (biasMin !== undefined || biasMax !== undefined) {
      const range: Record<string, number> = {};
      if (biasMin !== undefined) range.gte = biasMin;
      if (biasMax !== undefined) range.lte = biasMax;
      filter.push({ range: { politicalLeanScore: range } });
    }

    if (from || to) {
      const dateRange: Record<string, string> = {};
      if (from) dateRange.gte = from;
      if (to) dateRange.lte = to;
      filter.push({ range: { publishedAt: dateRange } });
    }

    const body: Record<string, unknown> = {
      from: (page - 1) * limit,
      size: limit,
      sort: [
        ...(q ? [{ _score: 'desc' }] : []),
        { ingestedAt: 'desc' },
      ],
      query: {
        bool: {
          must: must.length > 0 ? must : [{ match_all: {} }],
          filter,
        },
      },
      highlight: q
        ? {
            fields: {
              title: {},
              summary: {},
            },
            pre_tags: ['<mark>'],
            post_tags: ['</mark>'],
          }
        : undefined,
    };

    try {
      const result = await this.es.search({
        index: INDEX_NAME,
        body,
      });

      const hits = result.hits.hits;
      const totalValue = result.hits.total;
      const total =
        typeof totalValue === 'object'
          ? (totalValue as { value: number }).value
          : (totalValue as number);

      return {
        data: hits.map((hit) => ({
          ...(hit._source as Record<string, unknown>),
          _score: hit._score,
          _highlights: (hit as any).highlight || {},
        })),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      this.logger.error(`ES search failed: ${error.message}`);
      return {
        data: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
      };
    }
  }

  /**
   * Autocomplete on headlines.
   */
  async autocomplete(
    prefix: string,
    limit = 10,
  ): Promise<Array<{ id: string; title: string }>> {
    try {
      const result = await this.es.search({
        index: INDEX_NAME,
        body: {
          size: limit,
          _source: ['id', 'title'],
          query: {
            match: {
              'title.autocomplete': {
                query: prefix,
                analyzer: 'standard',
              },
            },
          },
        },
      });

      return result.hits.hits.map((hit) => {
        const source = hit._source as Record<string, unknown>;
        return {
          id: source.id as string,
          title: source.title as string,
        };
      });
    } catch (error) {
      this.logger.error(`Autocomplete failed: ${error.message}`);
      return [];
    }
  }
}
