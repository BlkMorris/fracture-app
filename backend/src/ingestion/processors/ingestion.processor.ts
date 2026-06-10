import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Article } from '../../articles/entities/article.entity';
import { Source } from '../../articles/entities/source.entity';
import { DeduplicationService } from '../services/deduplication.service';
import { ImageValidationService } from '../services/image-validation.service';
import { SearchService } from '../../search/search.service';
import { RawArticle } from '../interfaces';

export const INGESTION_QUEUE = 'ingestion';
const NARRATIVE_QUEUE = 'narrative';
const IMAGE_PIPELINE_QUEUE = 'image-pipeline';

export interface IngestionJobData {
  articles: RawArticle[];
  batchId: string;
}

@Processor(INGESTION_QUEUE)
export class IngestionProcessor extends WorkerHost {
  private readonly logger = new Logger(IngestionProcessor.name);

  constructor(
    @InjectRepository(Article)
    private readonly articleRepo: Repository<Article>,
    @InjectRepository(Source)
    private readonly sourceRepo: Repository<Source>,
    private readonly dedup: DeduplicationService,
    private readonly imageValidation: ImageValidationService,
    private readonly searchService: SearchService,
    @InjectQueue(NARRATIVE_QUEUE)
    private readonly narrativeQueue: Queue,
    @InjectQueue(IMAGE_PIPELINE_QUEUE)
    private readonly imagePipelineQueue: Queue,
  ) {
    super();
  }

  async process(job: Job<IngestionJobData>): Promise<{ saved: number; skipped: number }> {
    const { articles, batchId } = job.data;
    this.logger.log(
      `Processing batch ${batchId}: ${articles.length} articles`,
    );

    let saved = 0;
    let skipped = 0;
    const savedArticles: Article[] = [];

    for (const raw of articles) {
      try {
        // ── Guardrail: require publishedAt ──────────────
        if (!raw.publishedAt) {
          this.logger.debug(
            `Skipping article without publishedAt: "${raw.title?.slice(0, 60)}"`,
          );
          skipped++;
          continue;
        }

        // ── Guardrail: reject articles older than 30 days ─
        const publishedDate = new Date(raw.publishedAt);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        if (publishedDate < thirtyDaysAgo) {
          this.logger.debug(
            `Skipping stale article (${publishedDate.toISOString().slice(0, 10)}): "${raw.title?.slice(0, 60)}"`,
          );
          skipped++;
          continue;
        }

        // Canonicalize URL
        const canonicalUrl = this.dedup.canonicalizeUrl(raw.url);

        // Check deduplication
        const isDuplicate = await this.dedup.isDuplicate(
          canonicalUrl,
          raw.title,
          raw.content,
        );

        if (isDuplicate) {
          skipped++;
          continue;
        }

        // Resolve source
        const source = await this.sourceRepo.findOne({
          where: { slug: raw.sourceSlug },
        });

        if (!source) {
          this.logger.warn(
            `No source found for slug "${raw.sourceSlug}" — article will have no source attribution`,
          );
        }

        // Compute SimHash if content available
        let simhash: string | undefined;
        if (raw.content && raw.content.length > 100) {
          simhash = this.dedup.computeSimHash(raw.content).toString();
        }

        // ── Image validation & upgrade ──────────────────
        // Runs BEFORE persistence so only quality images are stored.
        const imageResult = await this.imageValidation.validateAndUpgradeImage(
          raw.imageUrl,
          raw.url,
        );
        const validatedImageUrl = imageResult.imageUrl ?? undefined;

        // Persist article
        const article = this.articleRepo.create({
          url: canonicalUrl,
          title: raw.title,
          summary: raw.summary,
          content: raw.content,
          author: raw.author,
          imageUrl: validatedImageUrl,
          publishedAt: raw.publishedAt ? new Date(raw.publishedAt) : undefined,
          sourceId: source?.id,
          simhash,
        });

        const savedArticle = await this.articleRepo.save(article);
        // Re-attach source relation for ES indexing
        if (source) {
          savedArticle.source = source;
        }
        savedArticles.push(savedArticle);
        saved++;

        // Enqueue for narrative analysis pipeline
        await this.narrativeQueue.add(
          'analyse-article',
          { articleId: article.id },
          {
            attempts: 3,
            backoff: { type: 'exponential', delay: 2000 },
            removeOnComplete: 100,
            removeOnFail: 500,
          },
        );

        // Enqueue for image pipeline if no valid image was found
        if (
          imageResult.action === 'fallback' ||
          imageResult.action === 'no-image'
        ) {
          await this.imagePipelineQueue.add(
            'single',
            { articleId: article.id },
            {
              attempts: 2,
              backoff: { type: 'exponential', delay: 10_000 },
              removeOnComplete: 100,
              removeOnFail: 200,
              // Slight delay so narrative pipeline can assign cluster first
              delay: 30_000,
            },
          );
        }

        this.logger.debug(`Saved article: ${article.title}`);
      } catch (error) {
        // Log and continue — don't fail the batch for one article
        this.logger.error(
          `Failed to process article "${raw.title}": ${error.message}`,
        );
        skipped++;
      }
    }

    // Bulk-index saved articles to Elasticsearch
    if (savedArticles.length > 0) {
      try {
        const { indexed } = await this.searchService.bulkIndex(savedArticles);
        this.logger.log(
          `Batch ${batchId}: indexed ${indexed} articles in Elasticsearch`,
        );
      } catch (error) {
        this.logger.error(
          `Batch ${batchId}: ES bulk index failed — ${error.message}`,
        );
      }
    }

    this.logger.log(
      `Batch ${batchId} complete: saved=${saved}, skipped=${skipped}`,
    );
    return { saved, skipped };
  }
}
