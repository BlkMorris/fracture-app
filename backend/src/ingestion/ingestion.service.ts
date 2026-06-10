import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuid } from 'uuid';
import { Source } from '../articles/entities/source.entity';
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
        let articles: RawArticle[] = [];

        if (source.rssFeedUrl) {
          articles = await this.rssAdapter.fetchArticles(
            source.slug,
            source.rssFeedUrl,
          );
        } else if (source.url) {
          // Fallback to NewsAPI for sources without RSS
          articles = await this.newsApiAdapter.fetchArticles(
            source.slug,
            `everything?domains=${new URL(source.url).hostname}`,
          );
        }

        if (articles.length > 0) {
          await this.enqueueArticles(articles);
          totalQueued += articles.length;
        }
      } catch (error) {
        this.logger.error(
          `Fetch failed for source ${source.slug}: ${error.message}`,
        );
      }
    }

    this.logger.log(`Fetch cycle complete: ${totalQueued} articles queued`);
    return { queued: totalQueued };
  }

  /**
   * Fetch from a single source by slug.
   */
  async fetchSource(slug: string): Promise<{ queued: number }> {
    const source = await this.sourceRepo.findOne({ where: { slug } });
    if (!source) {
      throw new Error(`Source not found: ${slug}`);
    }

    let articles: RawArticle[] = [];

    if (source.rssFeedUrl) {
      articles = await this.rssAdapter.fetchArticles(
        source.slug,
        source.rssFeedUrl,
      );
    } else {
      articles = await this.newsApiAdapter.fetchArticles(
        source.slug,
        `everything?domains=${new URL(source.url).hostname}`,
      );
    }

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
    this.logger.log(
      `Enqueued batch ${batchId}: ${articles.length} articles`,
    );
    return batchId;
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
