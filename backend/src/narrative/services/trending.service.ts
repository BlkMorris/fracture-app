import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Article } from '../../articles/entities/article.entity';
import {
  StoryCluster,
  ClusterStatus,
} from '../../articles/entities/story-cluster.entity';
import { DivergenceService } from './divergence.service';

/**
 * Trending story detection per SYSTEM_DESIGN §7.1 / §5.2.
 *
 * Computes a "heat" score combining:
 *   - Volume: article count in cluster
 *   - Velocity: rate of new articles (articles per hour)
 *   - Divergence: FDI score
 *   - Recency: time-decay penalty
 */
export interface TrendingStory {
  storyClusterId: string;
  title: string; // headline from first article
  articleCount: number;
  sourceCount: number;
  heatScore: number;
  fdi: number;
  latestArticleAt: Date;
  oldestArticleAt: Date;
  velocityPerHour: number;
}

@Injectable()
export class TrendingService {
  private readonly logger = new Logger(TrendingService.name);

  constructor(
    @InjectRepository(Article)
    private readonly articleRepo: Repository<Article>,
    @InjectRepository(StoryCluster)
    private readonly clusterRepo: Repository<StoryCluster>,
    private readonly divergence: DivergenceService,
  ) {}

  /**
   * Get trending stories sorted by heat score.
   * Now queries StoryCluster directly instead of GROUP BY on articles.
   * @param hours lookback window (default 24)
   * @param limit max results (default 20)
   */
  async getTrending(
    hours = 24,
    limit = 20,
  ): Promise<TrendingStory[]> {
    const since = new Date();
    since.setHours(since.getHours() - hours);

    // Query clusters directly — much more efficient than GROUP BY on articles
    const clusters = await this.clusterRepo
      .createQueryBuilder('c')
      .where('c.articleCount >= 2')
      .andWhere('c.updatedAt >= :since', { since })
      .orderBy('c.articleCount', 'DESC')
      .limit(50)
      .getMany();

    const trending: TrendingStory[] = clusters.map((c) => {
      const fdi = c.divergenceScore ?? 0;
      const velocityPerHour = c.velocityScore ?? 0;

      // Recency decay: hours since last update
      const hoursSinceUpdate =
        (Date.now() - c.updatedAt.getTime()) / (1000 * 60 * 60);
      const recencyFactor = Math.exp(-0.1 * hoursSinceUpdate);

      // Heat score composite
      const heatScore =
        Math.round(
          (30 * Math.min(1, c.articleCount / 20) + // volume (30%)
            25 * Math.min(1, velocityPerHour / 5) + // velocity (25%)
            25 * (fdi / 100) + // divergence (25%)
            20 * recencyFactor) * // recency (20%)
            10,
        ) / 10;

      return {
        storyClusterId: c.id,
        title: c.topic,
        articleCount: c.articleCount,
        sourceCount: c.sourceCount,
        heatScore,
        fdi,
        latestArticleAt: c.updatedAt,
        oldestArticleAt: c.createdAt,
        velocityPerHour: Math.round(velocityPerHour * 100) / 100,
      };
    });

    // Sort by heat score descending
    trending.sort((a, b) => b.heatScore - a.heatScore);

    return trending.slice(0, limit);
  }
}
