import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Article } from '../../articles/entities/article.entity';
import {
  StoryCluster,
} from '../../articles/entities/story-cluster.entity';
import { FramingType } from '../../common/enums';

/**
 * Fracture Divergence Index (FDI) per SYSTEM_DESIGN §4.2.
 *
 * FDI(cluster, window) =
 *   25 × normalized(headline_sentiment_spread)
 * + 20 × normalized(framing_type_entropy)
 * + 20 × normalized(entity_framing_divergence)
 * + 15 × normalized(linguistic_embedding_spread)
 * + 10 × normalized(source_selection_variance)
 * + 10 × normalized(structural_divergence)
 *
 * Normalised against rolling 30-day baseline per topic.
 * Score: 0-100.
 */
@Injectable()
export class DivergenceService {
  private readonly logger = new Logger(DivergenceService.name);

  constructor(
    @InjectRepository(Article)
    private readonly articleRepo: Repository<Article>,
    @InjectRepository(StoryCluster)
    private readonly clusterRepo: Repository<StoryCluster>,
  ) {}

  /**
   * Compute FDI for a story cluster.
   * Returns all 6 sub-metrics normalised to 0–100 scale for frontend consumption.
   */
  async computeClusterDivergence(storyClusterId: string): Promise<{
    fdi: number;
    headlineSentimentSpread: number;
    framingTypeEntropy: number;
    biasSpread: number;
    linguisticSpread: number;
    sourceSelectionVariance: number;
    structuralDivergence: number;
    articleCount: number;
  }> {
    const articles = await this.articleRepo.find({
      where: { storyClusterId },
    });

    if (articles.length < 2) {
      return {
        fdi: 0,
        headlineSentimentSpread: 0,
        framingTypeEntropy: 0,
        biasSpread: 0,
        linguisticSpread: 0,
        sourceSelectionVariance: 0,
        structuralDivergence: 0,
        articleCount: articles.length,
      };
    }

    // ── 1. Headline sentiment spread (25%) ────────────
    const headlineSentiments = articles
      .map((a) => a.headlineSentiment)
      .filter((s): s is number => s !== null && s !== undefined);
    const rawHeadlineSpread =
      headlineSentiments.length >= 2
        ? this.standardDeviation(headlineSentiments)
        : 0;

    // ── 2. Framing type entropy (20%) ─────────────────
    const framingTypes = articles
      .map((a) => a.framingType)
      .filter((f): f is FramingType => f !== null && f !== undefined);
    const rawFramingEntropy = this.shannonEntropy(framingTypes);

    // ── 3. Entity framing divergence / bias spread (20%) ──
    const biasScores = articles
      .map((a) => a.politicalLeanScore)
      .filter((s): s is number => s !== null && s !== undefined);
    const rawBiasSpread =
      biasScores.length >= 2 ? this.standardDeviation(biasScores) : 0;

    // ── 4. Linguistic embedding spread (15%) ──────────
    // MVP approximation: body sentiment variance as proxy
    const bodySentiments = articles
      .map((a) => a.bodySentiment)
      .filter((s): s is number => s !== null && s !== undefined);
    const rawLinguisticSpread =
      bodySentiments.length >= 2
        ? this.standardDeviation(bodySentiments)
        : 0;

    // ── 5. Source selection variance (10%) ─────────────
    // Proxy: variance in attribution density
    const attrDensities = articles
      .map((a) => a.attributionDensity)
      .filter((d): d is number => d !== null && d !== undefined);
    const rawSourceSelectionVariance =
      attrDensities.length >= 2
        ? this.standardDeviation(attrDensities)
        : 0;

    // ── 6. Structural divergence (10%) ────────────────
    // Proxy: variance in quote-to-narrative ratio + passive voice
    const structuralMetrics = articles
      .map((a) => (a.quoteToNarrativeRatio ?? 0) + (a.passiveVoiceRatio ?? 0))
      .filter((v) => v > 0);
    const rawStructuralDivergence =
      structuralMetrics.length >= 2
        ? this.standardDeviation(structuralMetrics)
        : 0;

    // ── Normalised 0–1 components ─────────────────────
    const normHeadline = this.normalise(rawHeadlineSpread, 0, 1.0);
    const normFraming = this.normalise(rawFramingEntropy, 0, Math.log2(5));
    const normBias = this.normalise(rawBiasSpread, 0, 1.0);
    const normLinguistic = this.normalise(rawLinguisticSpread, 0, 1.0);
    const normSourceSel = this.normalise(rawSourceSelectionVariance, 0, 0.5);
    const normStructural = this.normalise(rawStructuralDivergence, 0, 0.5);

    // ── Composite FDI (0–100 scale) ───────────────────
    const rawFdi =
      25 * normHeadline +
      20 * normFraming +
      20 * normBias +
      15 * normLinguistic +
      10 * normSourceSel +
      10 * normStructural;

    const fdi = Math.round(Math.min(100, Math.max(0, rawFdi)) * 10) / 10;

    // Diagnostic logging for FDI computation
    this.logger.debug(
      `[FDI] cluster=${storyClusterId.slice(0, 8)} fdi=${fdi} articles=${articles.length} | ` +
        `headline=${(normHeadline * 100).toFixed(1)} framing=${(normFraming * 100).toFixed(1)} ` +
        `bias=${(normBias * 100).toFixed(1)} linguistic=${(normLinguistic * 100).toFixed(1)} ` +
        `sourceSel=${(normSourceSel * 100).toFixed(1)} structural=${(normStructural * 100).toFixed(1)} | ` +
        `raw: hlSpread=${rawHeadlineSpread.toFixed(3)} framingEntropy=${rawFramingEntropy.toFixed(3)} ` +
        `biasSpread=${rawBiasSpread.toFixed(3)} lingSpread=${rawLinguisticSpread.toFixed(3)}`,
    );

    // Return all sub-metrics on 0–100 scale for frontend consumption
    return {
      fdi,
      headlineSentimentSpread: Math.round(normHeadline * 100),
      framingTypeEntropy: Math.round(normFraming * 100),
      biasSpread: Math.round(normBias * 100),
      linguisticSpread: Math.round(normLinguistic * 100),
      sourceSelectionVariance: Math.round(normSourceSel * 100),
      structuralDivergence: Math.round(normStructural * 100),
      articleCount: articles.length,
    };
  }

  /**
   * Compute per-article divergence from cluster median.
   */
  async computeArticleDivergence(
    article: Article,
  ): Promise<{ divergenceFromMedian: number; narrativeShiftDelta: number }> {
    if (!article.storyClusterId) {
      return { divergenceFromMedian: 0, narrativeShiftDelta: 0 };
    }

    const clusterArticles = await this.articleRepo.find({
      where: { storyClusterId: article.storyClusterId },
    });

    if (clusterArticles.length < 2) {
      return { divergenceFromMedian: 0, narrativeShiftDelta: 0 };
    }

    // Median bias score
    const biasScores = clusterArticles
      .map((a) => a.politicalLeanScore)
      .filter((s): s is number => s !== null && s !== undefined)
      .sort((a, b) => a - b);

    const medianBias =
      biasScores.length > 0
        ? biasScores[Math.floor(biasScores.length / 2)]
        : 0;

    const divergenceFromMedian =
      article.politicalLeanScore !== null &&
      article.politicalLeanScore !== undefined
        ? Math.abs(article.politicalLeanScore - medianBias)
        : 0;

    // Narrative shift: difference from same source's previous coverage
    let narrativeShiftDelta = 0;
    if (article.sourceId) {
      const previousFromSameSource = await this.articleRepo
        .createQueryBuilder('a')
        .where('a.sourceId = :sourceId', { sourceId: article.sourceId })
        .andWhere('a.storyClusterId = :clusterId', {
          clusterId: article.storyClusterId,
        })
        .andWhere('a.id != :id', { id: article.id })
        .andWhere('a.ingestedAt < :ingestedAt', {
          ingestedAt: article.ingestedAt,
        })
        .orderBy('a.ingestedAt', 'DESC')
        .limit(1)
        .getOne();

      if (
        previousFromSameSource?.politicalLeanScore != null &&
        article.politicalLeanScore != null
      ) {
        narrativeShiftDelta = Math.abs(
          article.politicalLeanScore -
            previousFromSameSource.politicalLeanScore,
        );
      }
    }

    return {
      divergenceFromMedian: Math.round(divergenceFromMedian * 1000) / 1000,
      narrativeShiftDelta: Math.round(narrativeShiftDelta * 1000) / 1000,
    };
  }

  /**
   * Compute cluster FDI and persist divergenceScore + isFractured
   * on the StoryCluster entity.
   */
  async updateClusterDivergence(storyClusterId: string): Promise<void> {
    try {
      const cluster = await this.clusterRepo.findOne({
        where: { id: storyClusterId },
      });
      if (!cluster || cluster.articleCount < 2) return;

      const result = await this.computeClusterDivergence(storyClusterId);

      await this.clusterRepo.update(storyClusterId, {
        divergenceScore: result.fdi,
        isFractured: result.fdi >= 40 && cluster.sourceCount >= 2,
      });
    } catch (error) {
      this.logger.warn(
        `Failed to update cluster divergence for ${storyClusterId}: ${error.message}`,
      );
    }
  }

  // ── Math helpers ──────────────────────────────────────

  private standardDeviation(values: number[]): number {
    if (values.length < 2) return 0;
    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    const variance =
      values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
    return Math.sqrt(variance);
  }

  private shannonEntropy(values: string[]): number {
    if (values.length === 0) return 0;
    const counts = new Map<string, number>();
    for (const v of values) {
      counts.set(v, (counts.get(v) || 0) + 1);
    }

    let entropy = 0;
    for (const count of counts.values()) {
      const p = count / values.length;
      if (p > 0) {
        entropy -= p * Math.log2(p);
      }
    }
    return entropy;
  }

  private normalise(value: number, min: number, max: number): number {
    if (max <= min) return 0;
    return Math.max(0, Math.min(1, (value - min) / (max - min)));
  }
}
