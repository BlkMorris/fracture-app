import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { ImagePipelineService } from '../services/image-pipeline.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Article } from '../../articles/entities/article.entity';

export const IMAGE_PIPELINE_QUEUE = 'image-pipeline';

export interface ImagePipelineJobData {
  /** Process a specific article, or omit to run batch */
  articleId?: string;
}

/**
 * BullMQ worker that processes image pipeline jobs.
 *
 * Supports two modes:
 *   • Single article: job.data.articleId is set  → process only that article
 *   • Batch mode:     job.data.articleId is null → run full pipeline batch
 */
@Processor(IMAGE_PIPELINE_QUEUE)
export class ImagePipelineProcessor extends WorkerHost {
  private readonly logger = new Logger(ImagePipelineProcessor.name);

  constructor(
    private readonly pipelineService: ImagePipelineService,
    @InjectRepository(Article)
    private readonly articleRepo: Repository<Article>,
  ) {
    super();
  }

  async process(job: Job<ImagePipelineJobData>): Promise<{ status: string; summary?: any }> {
    const { articleId } = job.data ?? {};

    if (articleId) {
      // ── Single article mode ──────────────────────────
      this.logger.log(
        `[IMG-PROCESSOR] Processing single article ${articleId}`,
      );

      const article = await this.articleRepo.findOne({
        where: { id: articleId },
      });

      if (!article) {
        this.logger.warn(
          `[IMG-PROCESSOR] Article ${articleId} not found — skipping`,
        );
        return { status: 'not_found' };
      }

      if (article.imageUrl) {
        this.logger.debug(
          `[IMG-PROCESSOR] Article ${articleId} already has image — skipping`,
        );
        return { status: 'already_has_image' };
      }

      try {
        const result = await this.pipelineService.processArticle(article);
        return {
          status: 'completed',
          summary: {
            source: result.source,
            provider: result.provider,
            imageUrl: result.imageUrl,
            durationMs: result.durationMs,
          },
        };
      } catch (error) {
        this.logger.error(
          `[IMG-PROCESSOR] Failed for article ${articleId}: ${error.message}`,
          error.stack,
        );
        throw error; // Let BullMQ retry logic handle it
      }
    }

    // ── Batch mode ───────────────────────────────────
    this.logger.log('[IMG-PROCESSOR] Starting batch pipeline run');

    try {
      const summary = await this.pipelineService.runPipeline();
      return {
        status: 'completed',
        summary: {
          totalProcessed: summary.totalProcessed,
          retrieved: summary.retrieved,
          generated: summary.generated,
          clusterReused: summary.clusterReused,
          skipped: summary.skipped,
          failed: summary.failed,
          avgSimilarityScore: summary.avgSimilarityScore,
          durationMs: summary.durationMs,
        },
      };
    } catch (error) {
      this.logger.error(
        `[IMG-PROCESSOR] Batch pipeline failed: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
