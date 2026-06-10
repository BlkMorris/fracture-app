import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ArticlesService } from './articles.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { QueryArticlesDto } from './dto/query-articles.dto';
import { CreateSourceDto } from './dto/create-source.dto';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole } from '../auth/entities/user.entity';

@Controller('articles')
export class ArticlesController {
  constructor(private readonly articlesService: ArticlesService) {}

  // ── Articles ────────────────────────────────────────

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ANALYST)
  create(@Body() dto: CreateArticleDto) {
    return this.articlesService.createArticle(dto);
  }

  @Public()
  @Get()
  findAll(@Query() query: QueryArticlesDto) {
    return this.articlesService.findAllArticles(query);
  }

  @Public()
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.articlesService.findArticleById(id);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateArticleDto,
  ) {
    return this.articlesService.updateArticle(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.articlesService.deleteArticle(id);
  }

  // ── Story cluster lookup ────────────────────────────

  @Public()
  @Get('cluster/:storyClusterId')
  findByCluster(@Param('storyClusterId', ParseUUIDPipe) storyClusterId: string) {
    return this.articlesService.findArticlesByCluster(storyClusterId);
  }
}

@Controller('sources')
export class SourcesController {
  constructor(private readonly articlesService: ArticlesService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ANALYST)
  create(@Body() dto: CreateSourceDto) {
    return this.articlesService.createSource(dto);
  }

  @Public()
  @Get()
  findAll() {
    return this.articlesService.findAllSources();
  }

  @Public()
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.articlesService.findSourceById(id);
  }
}
