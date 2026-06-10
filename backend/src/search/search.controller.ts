import {
  Controller,
  Get,
  Post,
  Query,
  HttpCode,
  HttpStatus,
  Logger,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Article } from '../articles/entities/article.entity';
import { SearchService } from './search.service';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole } from '../auth/entities/user.entity';

@Controller('search')
export class SearchController {
  private readonly logger = new Logger(SearchController.name);

  constructor(
    @InjectRepository(Article)
    private readonly articleRepo: Repository<Article>,
    private readonly searchService: SearchService,
  ) {}

  /**
   * GET /api/v1/search
   * Full-text search with faceted filtering.
   */
  @Public()
  @Get()
  async search(
    @Query('q') q?: string,
    @Query('sourceId') sourceId?: string,
    @Query('storyClusterId') storyClusterId?: string,
    @Query('framingType') framingType?: string,
    @Query('biasMin') biasMin?: string,
    @Query('biasMax') biasMax?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.searchService.search({
      q,
      sourceId,
      storyClusterId,
      framingType,
      biasMin: biasMin ? parseFloat(biasMin) : undefined,
      biasMax: biasMax ? parseFloat(biasMax) : undefined,
      from,
      to,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  /**
   * GET /api/v1/search/autocomplete
   * Headline autocomplete for search-as-you-type.
   */
  @Public()
  @Get('autocomplete')
  async autocomplete(
    @Query('q') q: string,
    @Query('limit') limit?: string,
  ) {
    if (!q || q.length < 2) return [];
    return this.searchService.autocomplete(q, limit ? parseInt(limit, 10) : 10);
  }

  /**
   * POST /api/v1/search/reindex
   * Reindex all articles to Elasticsearch (admin action).
   */
  @Post('reindex')
  @HttpCode(HttpStatus.ACCEPTED)
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async reindex() {
    const articles = await this.articleRepo.find({
      relations: ['source'],
    });

    const BATCH_SIZE = 100;
    let totalIndexed = 0;

    for (let i = 0; i < articles.length; i += BATCH_SIZE) {
      const batch = articles.slice(i, i + BATCH_SIZE);
      const result = await this.searchService.bulkIndex(batch);
      totalIndexed += result.indexed;
    }

    return {
      message: `Reindexed ${totalIndexed} articles`,
      count: totalIndexed,
    };
  }
}
