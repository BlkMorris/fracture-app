import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Article } from './entities/article.entity';
import { Source } from './entities/source.entity';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { QueryArticlesDto } from './dto/query-articles.dto';
import { CreateSourceDto } from './dto/create-source.dto';
import { PaginatedResult } from '../common/interfaces';

@Injectable()
export class ArticlesService {
  private readonly logger = new Logger(ArticlesService.name);

  constructor(
    @InjectRepository(Article)
    private readonly articleRepo: Repository<Article>,
    @InjectRepository(Source)
    private readonly sourceRepo: Repository<Source>,
  ) {}

  // ── Articles CRUD ───────────────────────────────────

  async createArticle(dto: CreateArticleDto): Promise<Article> {
    const existing = await this.articleRepo.findOne({
      where: { url: dto.url },
    });
    if (existing) {
      throw new ConflictException(`Article with URL already exists: ${dto.url}`);
    }

    const article = this.articleRepo.create({
      ...dto,
      publishedAt: dto.publishedAt ? new Date(dto.publishedAt) : undefined,
    });

    const saved = await this.articleRepo.save(article);
    this.logger.log(`Article created: ${saved.id} — ${saved.title}`);
    return saved;
  }

  async findAllArticles(
    query: QueryArticlesDto,
  ): Promise<PaginatedResult<Article>> {
    const {
      page = 1,
      limit = 20,
      sourceId,
      storyClusterId,
      framingType,
      biasMin,
      biasMax,
      search,
      sortBy = 'ingestedAt',
      sortOrder = 'DESC',
    } = query;

    const qb = this.articleRepo
      .createQueryBuilder('article')
      .leftJoinAndSelect('article.source', 'source');

    if (sourceId) {
      qb.andWhere('article.sourceId = :sourceId', { sourceId });
    }
    if (storyClusterId) {
      qb.andWhere('article.storyClusterId = :storyClusterId', {
        storyClusterId,
      });
    }
    if (framingType) {
      qb.andWhere('article.framingType = :framingType', { framingType });
    }
    if (biasMin !== undefined) {
      qb.andWhere('article.politicalLeanScore >= :biasMin', { biasMin });
    }
    if (biasMax !== undefined) {
      qb.andWhere('article.politicalLeanScore <= :biasMax', { biasMax });
    }
    if (search) {
      qb.andWhere('article.title ILIKE :search', { search: `%${search}%` });
    }

    // Whitelist sortable columns
    const allowedSortFields = [
      'ingestedAt',
      'publishedAt',
      'politicalLeanScore',
      'headlineSentiment',
      'divergenceFromMedian',
      'title',
    ];
    const safeSortBy = allowedSortFields.includes(sortBy)
      ? sortBy
      : 'ingestedAt';

    qb.orderBy(`article.${safeSortBy}`, sortOrder === 'ASC' ? 'ASC' : 'DESC');

    const skip = (page - 1) * limit;
    qb.skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findArticleById(id: string): Promise<Article> {
    const article = await this.articleRepo.findOne({
      where: { id },
      relations: ['source'],
    });
    if (!article) {
      throw new NotFoundException(`Article not found: ${id}`);
    }
    return article;
  }

  async findArticlesByCluster(storyClusterId: string): Promise<Article[]> {
    return this.articleRepo.find({
      where: { storyClusterId },
      relations: ['source'],
      order: { ingestedAt: 'DESC' },
    });
  }

  async updateArticle(id: string, dto: UpdateArticleDto): Promise<Article> {
    const article = await this.findArticleById(id);
    Object.assign(article, dto);
    if (dto.publishedAt) {
      article.publishedAt = new Date(dto.publishedAt);
    }
    const updated = await this.articleRepo.save(article);
    this.logger.log(`Article updated: ${updated.id}`);
    return updated;
  }

  async deleteArticle(id: string): Promise<void> {
    const article = await this.findArticleById(id);
    await this.articleRepo.remove(article);
    this.logger.log(`Article deleted: ${id}`);
  }

  // ── Sources CRUD ────────────────────────────────────

  async createSource(dto: CreateSourceDto): Promise<Source> {
    const existing = await this.sourceRepo.findOne({
      where: { slug: dto.slug },
    });
    if (existing) {
      throw new ConflictException(`Source with slug already exists: ${dto.slug}`);
    }
    const source = this.sourceRepo.create(dto);
    return this.sourceRepo.save(source);
  }

  async findAllSources(): Promise<Source[]> {
    return this.sourceRepo.find({ order: { name: 'ASC' } });
  }

  async findSourceById(id: string): Promise<Source> {
    const source = await this.sourceRepo.findOne({ where: { id } });
    if (!source) {
      throw new NotFoundException(`Source not found: ${id}`);
    }
    return source;
  }

  async findSourceBySlug(slug: string): Promise<Source> {
    const source = await this.sourceRepo.findOne({ where: { slug } });
    if (!source) {
      throw new NotFoundException(`Source not found: ${slug}`);
    }
    return source;
  }
}
