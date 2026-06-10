import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { IngestionService } from './ingestion.service';

/**
 * Scheduled ingestion — runs on a cron interval (default: every 10 minutes).
 * Calls the same `fetchAllSources()` method used by the manual
 * POST /ingestion/run endpoint. No duplicated logic.
 */
@Injectable()
export class IngestionScheduler {
  private readonly logger = new Logger(IngestionScheduler.name);
  private readonly enabled: boolean;

  constructor(
    private readonly ingestionService: IngestionService,
    private readonly config: ConfigService,
  ) {
    this.enabled =
      this.config.get<string>('ingestion.schedulerEnabled', 'true') === 'true';
  }

  /**
   * Cron: every 10 minutes.
   * Uses the same service method as the manual trigger endpoint.
   */
  @Cron(CronExpression.EVERY_10_MINUTES, { name: 'ingestion-fetch-cycle' })
  async handleScheduledFetch(): Promise<void> {
    if (!this.enabled) {
      this.logger.debug('Scheduled ingestion is disabled — skipping');
      return;
    }

    const start = Date.now();
    this.logger.log('Scheduled ingestion cycle STARTED');

    try {
      const { queued } = await this.ingestionService.fetchAllSources();
      const durationMs = Date.now() - start;

      this.logger.log(
        `Scheduled ingestion cycle COMPLETED — ` +
          `articlesQueued=${queued}, durationMs=${durationMs}`,
      );
    } catch (error) {
      const durationMs = Date.now() - start;
      this.logger.error(
        `Scheduled ingestion cycle FAILED after ${durationMs}ms — ${error.message}`,
        error.stack,
      );
    }
  }
}
