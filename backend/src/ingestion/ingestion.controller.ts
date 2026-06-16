import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { IngestionService } from './ingestion.service';
import { RawArticle } from './interfaces';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole } from '../auth/entities/user.entity';

@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('ingestion')
export class IngestionController {
  private readonly logger = new Logger(IngestionController.name);

  constructor(private readonly ingestionService: IngestionService) {}

  /**
   * POST /api/v1/ingestion/run
   * Manual trigger — fetches all sources, enqueues for processing,
   * and returns immediately with the number of articles queued.
   */
  @Public()
  @Post('run')
  @HttpCode(HttpStatus.OK)
  async run() {
    this.logger.log('Manual ingestion run triggered');
    const start = Date.now();
    try {
      const { queued } = await this.ingestionService.fetchAllSources();
      const durationMs = Date.now() - start;
      this.logger.log(
        `Manual ingestion run complete: ${queued} articles queued in ${durationMs}ms`,
      );
      return {
        status: queued > 0 ? 'started' : 'completed',
        articlesProcessed: queued,
        durationMs,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Manual ingestion run failed';
      this.logger.error(`Manual ingestion run failed: ${message}`);
      return {
        status: 'completed',
        articlesProcessed: 0,
        error: message,
      };
    }
  }

  /** Trigger a fetch cycle across all active sources */
  @Post('fetch-all')
  @HttpCode(HttpStatus.ACCEPTED)
  fetchAll() {
    // Fire and don't wait — return immediately
    void this.ingestionService.fetchAllSources();
    return { message: 'Fetch cycle triggered' };
  }

  /** Trigger a fetch for the newly expanded source set */
  @Post('fetch-expanded-sources')
  @HttpCode(HttpStatus.ACCEPTED)
  fetchExpandedSources() {
    return this.ingestionService.fetchExpandedSources();
  }

  /** Trigger a fetch for a controlled list of source slugs */
  @Post('fetch-sources')
  @HttpCode(HttpStatus.ACCEPTED)
  fetchSources(@Body() body: { slugs?: string[] }) {
    return this.ingestionService.fetchSources(body.slugs ?? []);
  }

  /** Trigger a fetch for a single source by slug */
  @Post('fetch/:slug')
  @HttpCode(HttpStatus.ACCEPTED)
  fetchSource(@Param('slug') slug: string) {
    return this.ingestionService.fetchSource(slug);
  }

  /** Manually submit articles to the ingestion pipeline */
  @Post('submit')
  submit(@Body() articles: RawArticle[]) {
    return this.ingestionService.ingestArticles(articles);
  }

  /** Get queue health stats */
  @Public()
  @Get('queue-stats')
  queueStats() {
    return this.ingestionService.getQueueStats();
  }
}
