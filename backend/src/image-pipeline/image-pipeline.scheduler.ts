import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { ImagePipelineService } from './services/image-pipeline.service';

/**
 * Scheduled image pipeline — runs every 30 minutes.
 * Processes a batch of articles with missing images.
 *
 * Enable/disable via IMAGE_PIPELINE_SCHEDULER_ENABLED env var.
 */
@Injectable()
export class ImagePipelineScheduler {
  private readonly logger = new Logger(ImagePipelineScheduler.name);
  private readonly enabled: boolean;

  constructor(
    private readonly pipelineService: ImagePipelineService,
    private readonly config: ConfigService,
  ) {
    this.enabled =
      this.config.get<string>(
        'imagePipeline.schedulerEnabled',
        'true',
      ) === 'true';
  }

  /**
   * Cron: every 30 minutes.
   * Runs a batch of the image fallback pipeline.
   */
  @Cron(CronExpression.EVERY_30_MINUTES, {
    name: 'image-pipeline-cycle',
  })
  async handleScheduledRun(): Promise<void> {
    if (!this.enabled) {
      this.logger.debug('Scheduled image pipeline is disabled — skipping');
      return;
    }

    const start = Date.now();
    this.logger.log('Scheduled image pipeline cycle STARTED');

    try {
      const summary = await this.pipelineService.runPipeline();
      const durationMs = Date.now() - start;

      this.logger.log(
        `Scheduled image pipeline cycle COMPLETED — ` +
          `processed=${summary.totalProcessed} retrieved=${summary.retrieved} ` +
          `generated=${summary.generated} skipped=${summary.skipped} ` +
          `failed=${summary.failed} durationMs=${durationMs}`,
      );
    } catch (error) {
      this.logger.error(
        `Scheduled image pipeline cycle FAILED: ${error.message}`,
        error.stack,
      );
    }
  }
}
