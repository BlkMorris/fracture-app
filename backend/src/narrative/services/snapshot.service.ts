import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Article } from '../../articles/entities/article.entity';
import { StoryCluster } from '../../articles/entities/story-cluster.entity';

/**
 * Narrative Snapshot — a shareable summary of how different outlets
 * frame the same story, optimised for social media virality.
 */
export interface NarrativeSnapshot {
  headline: string;
  leftFrame: {
    summary: string;
    sources: string[];
    sentiment: number;
  };
  rightFrame: {
    summary: string;
    sources: string[];
    sentiment: number;
  };
  divergenceScore: number;
  articleCount: number;
  sourceCount: number;
  generatedAt: string;
}

@Injectable()
export class SnapshotService {
  private readonly logger = new Logger(SnapshotService.name);

  constructor(
    @InjectRepository(Article)
    private readonly articleRepo: Repository<Article>,
    @InjectRepository(StoryCluster)
    private readonly clusterRepo: Repository<StoryCluster>,
  ) {}

  /**
   * Generate a Narrative Snapshot for a story cluster.
   *
   * Algorithm:
   * 1. Load all articles with sources for the cluster
   * 2. Split by politicalLeanScore: left (<0) vs right (≥0)
   * 3. Pick most extreme article from each side
   * 4. Extract framing summary from headline + summary
   * 5. Collect source names for each side
   */
  async generateSnapshot(
    clusterId: string,
  ): Promise<NarrativeSnapshot | null> {
    const cluster = await this.clusterRepo.findOne({
      where: { id: clusterId },
    });
    if (!cluster) return null;

    const articles = await this.articleRepo.find({
      where: { storyClusterId: clusterId },
      relations: ['source'],
      order: { politicalLeanScore: 'ASC' },
    });

    if (articles.length < 2) return null;

    // Partition by political lean
    const leftArticles = articles.filter(
      (a) => (a.politicalLeanScore ?? 0) < 0,
    );
    const rightArticles = articles.filter(
      (a) => (a.politicalLeanScore ?? 0) >= 0,
    );

    // If all articles lean one way, split by median
    if (leftArticles.length === 0 || rightArticles.length === 0) {
      const sorted = [...articles].sort(
        (a, b) => (a.politicalLeanScore ?? 0) - (b.politicalLeanScore ?? 0),
      );
      const mid = Math.floor(sorted.length / 2);
      leftArticles.length = 0;
      rightArticles.length = 0;
      leftArticles.push(...sorted.slice(0, mid));
      rightArticles.push(...sorted.slice(mid));
    }

    // Most extreme on each side
    const mostLeft = leftArticles.reduce((best, a) =>
      (a.politicalLeanScore ?? 0) < (best.politicalLeanScore ?? 0) ? a : best,
    );
    const mostRight = rightArticles.reduce((best, a) =>
      (a.politicalLeanScore ?? 0) > (best.politicalLeanScore ?? 0) ? a : best,
    );

    // Collect unique source names per side
    const leftSources = [
      ...new Set(
        leftArticles
          .map((a) => a.source?.name)
          .filter((n): n is string => !!n),
      ),
    ];
    const rightSources = [
      ...new Set(
        rightArticles
          .map((a) => a.source?.name)
          .filter((n): n is string => !!n),
      ),
    ];

    // Extract framing summary: prefer summary, fall back to title
    const leftSummary = this.extractFrameSummary(mostLeft);
    const rightSummary = this.extractFrameSummary(mostRight);

    return {
      headline: cluster.topic,
      leftFrame: {
        summary: leftSummary,
        sources: leftSources,
        sentiment: mostLeft.headlineSentiment ?? 0,
      },
      rightFrame: {
        summary: rightSummary,
        sources: rightSources,
        sentiment: mostRight.headlineSentiment ?? 0,
      },
      divergenceScore: Math.round(cluster.divergenceScore ?? 0),
      articleCount: cluster.articleCount,
      sourceCount: cluster.sourceCount,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Extract a concise framing summary from an article.
   * Uses the article title as the primary frame label.
   * Falls back to truncated summary if available.
   */
  private extractFrameSummary(article: Article): string {
    // The headline IS the frame — it's how the outlet chose to present the story
    if (article.summary) {
      // Truncate summary to ~120 chars for social sharing
      const clean = article.summary.replace(/\s+/g, ' ').trim();
      return clean.length > 120 ? clean.slice(0, 117) + '…' : clean;
    }
    return article.title;
  }
}
