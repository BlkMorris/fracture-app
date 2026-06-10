import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Article } from '../../articles/entities/article.entity';
import { SentimentService } from '../services/sentiment.service';
import { BiasScoringService } from '../services/bias-scoring.service';
import { FramingDetectorService } from '../services/framing-detector.service';
import { ClusteringService } from '../services/clustering.service';
import { DivergenceService } from '../services/divergence.service';

export const NARRATIVE_QUEUE = 'narrative';

export interface NarrativeJobData {
  articleId: string;
}

/**
 * BullMQ worker that runs the full narrative intelligence pipeline
 * on a single article after ingestion.
 *
 * Pipeline order:
 *   1. Sentiment analysis (headline + body)
 *   2. Framing detection + structural features
 *   3. Bias scoring (composite)
 *   4. Story clustering
 *   5. Per-article divergence
 */
@Processor(NARRATIVE_QUEUE)
export class NarrativeProcessor extends WorkerHost {
  private readonly logger = new Logger(NarrativeProcessor.name);

  constructor(
    @InjectRepository(Article)
    private readonly articleRepo: Repository<Article>,
    private readonly sentiment: SentimentService,
    private readonly biasScoring: BiasScoringService,
    private readonly framingDetector: FramingDetectorService,
    private readonly clustering: ClusteringService,
    private readonly divergence: DivergenceService,
  ) {
    super();
  }

  async process(job: Job<NarrativeJobData>): Promise<{ status: string }> {
    const { articleId } = job.data;
    this.logger.log(`Narrative pipeline starting for article ${articleId}`);

    const article = await this.articleRepo.findOne({
      where: { id: articleId },
    });

    if (!article) {
      this.logger.warn(`Article ${articleId} not found — skipping`);
      return { status: 'not_found' };
    }

    try {
      // ── 1. Sentiment ──────────────────────────────────
      const headlineSentiment = this.sentiment.analyse(article.title);
      const bodySentiment = this.sentiment.analyse(article.content);
      const headlineBodySentimentGap = this.sentiment.computeSentimentGap(
        headlineSentiment,
        bodySentiment,
      );
      const emotionalValence = this.sentiment.computeEmotionalValence(
        [article.title, article.content].filter(Boolean).join(' '),
      );

      // ── 2. Framing + structural features ──────────────
      const framing = this.framingDetector.analyseArticle(article);

      // ── Save intermediate results before bias scoring ─
      // (bias scoring reads framing type and structural features)
      await this.articleRepo.update(article.id, {
        headlineSentiment:
          Math.round(headlineSentiment * 1000) / 1000,
        bodySentiment: Math.round(bodySentiment * 1000) / 1000,
        headlineBodySentimentGap:
          Math.round(headlineBodySentimentGap * 1000) / 1000,
        emotionalValence: Math.round(emotionalValence * 1000) / 1000,
        framingType: framing.framingType,
        framingConfidence: framing.framingConfidence,
        ledeType: framing.ledeType,
        paragraphCount: framing.paragraphCount,
        sourceCount: framing.sourceCount,
        namedSourceRatio: framing.namedSourceRatio,
        quoteToNarrativeRatio: framing.quoteToNarrativeRatio,
        attributionDensity: framing.attributionDensity,
        passiveVoiceRatio: framing.passiveVoiceRatio,
        certaintyLanguageScore: framing.certaintyLanguageScore,
      });

      // Reload with updated fields for bias scoring
      const updatedArticle = await this.articleRepo.findOne({
        where: { id: articleId },
      });

      // ── 3. Bias scoring ───────────────────────────────
      const bias = await this.biasScoring.scoreArticle(updatedArticle!);

      await this.articleRepo.update(article.id, {
        politicalLeanScore: bias.politicalLeanScore,
        establishmentScore: bias.establishmentScore,
      });

      // ── 4. Story clustering ───────────────────────────
      const reloadedArticle = await this.articleRepo.findOne({
        where: { id: articleId },
      });
      const cluster = await this.clustering.assignCluster(reloadedArticle!);

      if (cluster) {
        await this.articleRepo.update(article.id, {
          storyClusterId: cluster.storyClusterId,
          firstInCluster: cluster.firstInCluster,
          clusterCentroidDistance: cluster.clusterCentroidDistance,
        });

        // Update cluster aggregate stats (articleCount, sourceCount, velocity, status)
        await this.clustering.updateClusterStats(cluster.storyClusterId);
      } else {
        this.logger.debug(
          `Article "${article.title?.slice(0, 50)}" too old for clustering — skipped`,
        );
      }

      // ── 5. Per-article divergence ─────────────────────
      const finalArticle = await this.articleRepo.findOne({
        where: { id: articleId },
      });
      const div = await this.divergence.computeArticleDivergence(
        finalArticle!,
      );

      await this.articleRepo.update(article.id, {
        divergenceFromMedian: div.divergenceFromMedian,
        narrativeShiftDelta: div.narrativeShiftDelta,
      });

      // ── 6. Update cluster divergence score ────────────
      if (finalArticle?.storyClusterId) {
        await this.divergence.updateClusterDivergence(
          finalArticle.storyClusterId,
        );
      }

      this.logger.log(
        `Narrative pipeline complete for "${article.title}" — ` +
          `sentiment=${headlineSentiment.toFixed(3)}, ` +
          `framing=${framing.framingType}, ` +
          `bias=${bias.politicalLeanScore.toFixed(3)}, ` +
          `cluster=${cluster ? cluster.storyClusterId.slice(0, 8) + (cluster.firstInCluster ? ' (NEW)' : '') : 'SKIPPED (too old)'}`,
      );

      return { status: 'scored' };
    } catch (error) {
      this.logger.error(
        `Narrative pipeline failed for article ${articleId}: ${error.message}`,
        error.stack,
      );
      throw error; // BullMQ will retry
    }
  }
}
