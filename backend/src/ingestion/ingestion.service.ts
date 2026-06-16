import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuid } from 'uuid';
import { Source } from '../articles/entities/source.entity';
import { PHASE_4_SOURCE_SLUGS } from '../articles/source-seeder.service';
import { RssAdapter } from './adapters/rss.adapter';
import { NewsApiAdapter } from './adapters/newsapi.adapter';
import { RawArticle } from './interfaces';
import { INGESTION_QUEUE } from './processors/ingestion.processor';

@Injectable()
export class IngestionService {
  private readonly logger = new Logger(IngestionService.name);

  constructor(
    @InjectQueue(INGESTION_QUEUE) private readonly ingestionQueue: Queue,
    @InjectRepository(Source) private readonly sourceRepo: Repository<Source>,
    private readonly rssAdapter: RssAdapter,
    private readonly newsApiAdapter: NewsApiAdapter,
  ) {}

  /**
   * Fetch from all active sources and enqueue for processing.
   */
  async fetchAllSources(): Promise<{ queued: number }> {
    const sources = await this.sourceRepo.find({
      where: { isActive: true },
    });

    this.logger.log(`Starting fetch cycle for ${sources.length} sources`);

    let totalQueued = 0;

    for (const source of sources) {
      try {
        const articles = await this.fetchArticlesForSource(source);

        if (articles.length > 0) {
          await this.enqueueArticles(articles);
          totalQueued += articles.length;
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Fetch failed';
        this.logger.error(`Fetch failed for source ${source.slug}: ${message}`);
      }
    }

    this.logger.log(`Fetch cycle complete: ${totalQueued} articles queued`);
    return { queued: totalQueued };
  }

  /**
   * Fetch only the newly expanded Phase 4 source set.
   * Useful for verifying new feeds without forcing a full-source cycle.
   */
  async fetchExpandedSources(): Promise<{
    queued: number;
    sources: SourceFetchResult[];
  }> {
    return this.fetchSources([...PHASE_4_SOURCE_SLUGS]);
  }

  /**
   * Fetch a controlled source set by slug.
   */
  async fetchSources(slugs: string[]): Promise<{
    queued: number;
    sources: SourceFetchResult[];
  }> {
    const uniqueSlugs = Array.from(
      new Set(slugs.map((slug) => slug.trim()).filter(Boolean)),
    );
    const sources = await this.sourceRepo.find({
      where: uniqueSlugs.map((slug) => ({ slug })),
    });
    const sourceMap = new Map(sources.map((source) => [source.slug, source]));
    const results: SourceFetchResult[] = [];
    let totalQueued = 0;

    for (const slug of uniqueSlugs) {
      const source = sourceMap.get(slug);
      if (!source) {
        results.push({
          slug,
          queued: 0,
          status: 'missing',
          message: 'Source is not seeded in the database.',
        });
        continue;
      }

      if (!source.isActive) {
        results.push({
          slug,
          queued: 0,
          status: 'inactive',
          message: 'Source exists but is inactive.',
        });
        continue;
      }

      try {
        const articles = await this.fetchArticlesForSource(source);
        if (articles.length > 0) {
          await this.enqueueArticles(articles);
          totalQueued += articles.length;
        }
        results.push({
          slug,
          queued: articles.length,
          status: 'queued',
        });
      } catch (error) {
        results.push({
          slug,
          queued: 0,
          status: 'error',
          message: error instanceof Error ? error.message : 'Fetch failed',
        });
      }
    }

    return { queued: totalQueued, sources: results };
  }

  /**
   * Fetch from a single source by slug.
   */
  async fetchSource(slug: string): Promise<{ queued: number }> {
    const source = await this.sourceRepo.findOne({ where: { slug } });
    if (!source) {
      throw new Error(`Source not found: ${slug}`);
    }

    const articles = await this.fetchArticlesForSource(source);

    if (articles.length > 0) {
      await this.enqueueArticles(articles);
    }

    return { queued: articles.length };
  }

  /**
   * Manually trigger ingestion of provided articles (for testing / API).
   */
  async ingestArticles(articles: RawArticle[]): Promise<{ batchId: string }> {
    const batchId = await this.enqueueArticles(articles);
    return { batchId };
  }

  private async enqueueArticles(articles: RawArticle[]): Promise<string> {
    const batchId = uuid();
    await this.ingestionQueue.add(
      'process-articles',
      { articles, batchId },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    );
    this.logger.log(`Enqueued batch ${batchId}: ${articles.length} articles`);
    return batchId;
  }

  private async fetchArticlesForSource(source: Source): Promise<RawArticle[]> {
    if (source.rssFeedUrl) {
      return this.rssAdapter.fetchArticles(source.slug, source.rssFeedUrl);
    }

    if (!source.url) {
      throw new Error(`Source ${source.slug} has no RSS feed or outlet URL.`);
    }

    return this.newsApiAdapter.fetchArticles(
      source.slug,
      `everything?domains=${new URL(source.url).hostname}`,
    );
  }

  /**
   * Get queue health stats.
   */
  async getQueueStats() {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.ingestionQueue.getWaitingCount(),
      this.ingestionQueue.getActiveCount(),
      this.ingestionQueue.getCompletedCount(),
      this.ingestionQueue.getFailedCount(),
      this.ingestionQueue.getDelayedCount(),
    ]);
    return { waiting, active, completed, failed, delayed };
  }
}

export interface SourceFetchResult {
  slug: string;
  queued: number;
  status: 'queued' | 'missing' | 'inactive' | 'error';
  message?: string;
}
