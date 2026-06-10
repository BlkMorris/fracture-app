import {
  Controller,
  Post,
  Get,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ImagePipelineService } from './services/image-pipeline.service';
import {
  IMAGE_PIPELINE_QUEUE,
  ImagePipelineJobData,
} from './processors/image-pipeline.processor';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole } from '../auth/entities/user.entity';

@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('image-pipeline')
export class ImagePipelineController {
  private readonly logger = new Logger(ImagePipelineController.name);

  constructor(
    private readonly pipelineService: ImagePipelineService,
    @InjectQueue(IMAGE_PIPELINE_QUEUE)
    private readonly pipelineQueue: Queue<ImagePipelineJobData>,
  ) {}

  /**
   * POST /api/v1/image-pipeline/run
   * Manually trigger a synchronous batch pipeline run.
   * Returns full summary when complete.
   */
  @Post('run')
  @HttpCode(HttpStatus.OK)
  async run() {
    this.logger.log('Manual image pipeline run triggered');

    try {
      const summary = await this.pipelineService.runPipeline();
      return {
        status: 'completed',
        ...summary,
      };
    } catch (error) {
      this.logger.error(`Manual pipeline run failed: ${error.message}`);
      return {
        status: 'failed',
        error: error.message,
      };
    }
  }

  /**
   * POST /api/v1/image-pipeline/enqueue
   * Enqueue a batch pipeline job for async processing via BullMQ.
   * Returns immediately.
   */
  @Post('enqueue')
  @HttpCode(HttpStatus.ACCEPTED)
  async enqueue() {
    const job = await this.pipelineQueue.add(
      'batch',
      {},
      { attempts: 2, backoff: { type: 'exponential', delay: 30_000 } },
    );

    return {
      status: 'queued',
      jobId: job.id,
    };
  }

  /**
   * POST /api/v1/image-pipeline/enqueue/:articleId
   * Enqueue an image pipeline job for a single article.
   */
  @Post('enqueue/:articleId')
  @HttpCode(HttpStatus.ACCEPTED)
  async enqueueArticle(@Param('articleId') articleId: string) {
    const job = await this.pipelineQueue.add(
      'single',
      { articleId },
      { attempts: 3, backoff: { type: 'exponential', delay: 10_000 } },
    );

    return {
      status: 'queued',
      jobId: job.id,
      articleId,
    };
  }

  /**
   * GET /api/v1/image-pipeline/stats
   * Returns image counts and cumulative pipeline metrics.
   */
  @Public()
  @Get('stats')
  async stats() {
    const missingCount = await this.pipelineService.getMissingImageCount();
    const metrics = this.pipelineService.getMetrics();

    return {
      missingImages: missingCount,
      metrics: {
        totalProcessed: metrics.totalProcessed,
        retrievalSuccessRate: metrics.retrievalRate,
        generationFallbackRate: metrics.generationRate,
        clusterImageReuseRate: metrics.clusterReuseRate,
        avgSimilarityScore: metrics.avgSimilarityScore,
        totalRetrieved: metrics.totalRetrieved,
        totalGenerated: metrics.totalGenerated,
        totalClusterReused: metrics.totalClusterReused,
        totalSkipped: metrics.totalSkipped,
        totalFailed: metrics.totalFailed,
        runCount: metrics.runCount,
        firstRunAt: metrics.firstRunAt,
        lastRunAt: metrics.lastRunAt,
        duplicateImageAvoidedCount: metrics.duplicateImageAvoidedCount,
        clusterImageGenerationCount: metrics.clusterImageGenerationCount,
        clusterImageSkippedInvalidCount:
          metrics.clusterImageSkippedInvalidCount,
      },
    };
  }

  /**
   * GET /api/v1/image-pipeline/queue-status
   * Returns BullMQ queue health: waiting, active, completed, failed counts.
   */
  @Public()
  @Get('queue-status')
  async queueStatus() {
    const [waiting, active, completed, failed] = await Promise.all([
      this.pipelineQueue.getWaitingCount(),
      this.pipelineQueue.getActiveCount(),
      this.pipelineQueue.getCompletedCount(),
      this.pipelineQueue.getFailedCount(),
    ]);

    return {
      queue: IMAGE_PIPELINE_QUEUE,
      waiting,
      active,
      completed,
      failed,
    };
  }
}
