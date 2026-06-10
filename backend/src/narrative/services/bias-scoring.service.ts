import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Article } from '../../articles/entities/article.entity';
import { Source } from '../../articles/entities/source.entity';
import { SentimentService } from './sentiment.service';
import {
  POLITICAL_KEYWORD_LEXICON,
  LEXICON_PHRASES_SORTED,
} from './keyword-lexicon';
import { FramingType } from '../../common/enums';

/**
 * Deterministic composite bias scorer per SYSTEM_DESIGN §4.1.
 *
 * PoliticalLean(article) =
 *   0.40 × source_prior(outlet)
 * + 0.20 × keyword_lean(article)
 * + 0.15 × entity_sentiment(article)
 * + 0.15 × framing_lean(article)
 * + 0.10 × source_selection_lean(article)
 */
@Injectable()
export class BiasScoringService {
  private readonly logger = new Logger(BiasScoringService.name);

  constructor(
    @InjectRepository(Source)
    private readonly sourceRepo: Repository<Source>,
    private readonly sentiment: SentimentService,
  ) {}

  /**
   * Compute bias coordinates for a single article.
   * Returns { politicalLeanScore, establishmentScore }.
   */
  async scoreArticle(article: Article): Promise<{
    politicalLeanScore: number;
    establishmentScore: number;
  }> {
    // Resolve source for priors
    let source: Source | null = null;
    if (article.sourceId) {
      source = await this.sourceRepo.findOne({
        where: { id: article.sourceId },
      });
    }

    const sourcePrior = source?.politicalLeanPrior ?? 0;
    const establishmentPrior = source?.establishmentPrior ?? 0;

    const fullText = [article.title, article.summary, article.content]
      .filter(Boolean)
      .join(' ');

    // ── 1. Source prior (40%) ──────────────────────────
    const sourcePriorWeight = 0.4;

    // ── 2. Keyword lean (20%) ──────────────────────────
    const keywordLean = this.computeKeywordLean(fullText);
    const keywordWeight = 0.2;

    // ── 3. Entity sentiment lean (15%) ─────────────────
    // Approximation: sentiment toward politically-charged entities
    const entityLean = this.computeEntitySentimentLean(fullText);
    const entityWeight = 0.15;

    // ── 4. Framing lean (15%) ──────────────────────────
    const framingLean = this.computeFramingLean(article.framingType);
    const framingWeight = 0.15;

    // ── 5. Source selection lean (10%) ──────────────────
    const sourceSelectionLean = this.computeSourceSelectionLean(fullText);
    const sourceSelectionWeight = 0.1;

    // ── Composite ──────────────────────────────────────
    const politicalLeanScore = this.clamp(
      sourcePriorWeight * sourcePrior +
        keywordWeight * keywordLean +
        entityWeight * entityLean +
        framingWeight * framingLean +
        sourceSelectionWeight * sourceSelectionLean,
      -1,
      1,
    );

    // Establishment score: primarily from source prior + linguistic markers
    const establishmentScore = this.clamp(
      0.5 * establishmentPrior +
        0.2 * this.computeEstablishmentLinguistic(fullText) +
        0.15 * (article.attributionDensity ?? 0.5) +
        0.15 * (article.namedSourceRatio ?? 0.5),
      -1,
      1,
    );

    return {
      politicalLeanScore: Math.round(politicalLeanScore * 1000) / 1000,
      establishmentScore: Math.round(establishmentScore * 1000) / 1000,
    };
  }

  /**
   * Keyword lean: scan text for politically-loaded phrases,
   * weight by TF-IDF-like salience + position boost.
   */
  private computeKeywordLean(text: string): number {
    const lower = text.toLowerCase();
    let totalLean = 0;
    let totalWeight = 0;

    for (const phrase of LEXICON_PHRASES_SORTED) {
      const entry = POLITICAL_KEYWORD_LEXICON[phrase];
      let searchFrom = 0;
      while (true) {
        const idx = lower.indexOf(phrase, searchFrom);
        if (idx === -1) break;

        // Position boost: headline-area (first 200 chars) gets 2×
        const positionBoost = idx < 200 ? 2.0 : 1.0;
        totalLean += entry.lean * entry.weight * positionBoost;
        totalWeight += entry.weight * positionBoost;
        searchFrom = idx + phrase.length;
      }
    }

    if (totalWeight === 0) return 0;
    return this.clamp(totalLean / totalWeight, -1, 1);
  }

  /**
   * Entity sentiment lean: detect mentions of political entities
   * and measure the surrounding sentiment.
   */
  private computeEntitySentimentLean(text: string): number {
    const lower = text.toLowerCase();

    // Political entities with expected lean valence
    const leftEntities = [
      'democrat',
      'democrats',
      'democratic party',
      'liberal',
      'progressive',
      'left-wing',
      'biden',
      'harris',
      'obama',
      'pelosi',
      'aoc',
      'sanders',
      'warren',
    ];
    const rightEntities = [
      'republican',
      'republicans',
      'gop',
      'conservative',
      'right-wing',
      'trump',
      'desantis',
      'mcconnell',
      'cruz',
      'greene',
      'gaetz',
    ];

    let leftSentiment = 0;
    let leftCount = 0;
    let rightSentiment = 0;
    let rightCount = 0;

    for (const entity of leftEntities) {
      const idx = lower.indexOf(entity);
      if (idx !== -1) {
        // Extract a ±60 char window around the entity mention
        const start = Math.max(0, idx - 60);
        const end = Math.min(text.length, idx + entity.length + 60);
        const window = text.slice(start, end);
        leftSentiment += this.sentiment.analyse(window);
        leftCount++;
      }
    }

    for (const entity of rightEntities) {
      const idx = lower.indexOf(entity);
      if (idx !== -1) {
        const start = Math.max(0, idx - 60);
        const end = Math.min(text.length, idx + entity.length + 60);
        const window = text.slice(start, end);
        rightSentiment += this.sentiment.analyse(window);
        rightCount++;
      }
    }

    // If positive sentiment around left-entities → left-leaning
    // If positive sentiment around right-entities → right-leaning
    const avgLeft = leftCount > 0 ? leftSentiment / leftCount : 0;
    const avgRight = rightCount > 0 ? rightSentiment / rightCount : 0;

    // Net lean: positive right sentiment or negative left sentiment → right-lean
    return this.clamp((avgRight - avgLeft) * 0.5, -1, 1);
  }

  /**
   * Framing type correlation with political lean.
   * Per media studies: CONFLICT and ECONOMIC frames tend right,
   * HUMAN_INTEREST and MORAL tend left, RESPONSIBILITY is neutral.
   */
  private computeFramingLean(framingType: FramingType | null): number {
    if (!framingType) return 0;
    const FRAMING_LEAN_MAP: Record<FramingType, number> = {
      [FramingType.CONFLICT]: 0.15,
      [FramingType.HUMAN_INTEREST]: -0.15,
      [FramingType.ECONOMIC]: 0.1,
      [FramingType.MORAL]: -0.1,
      [FramingType.RESPONSIBILITY]: 0,
    };
    return FRAMING_LEAN_MAP[framingType] ?? 0;
  }

  /**
   * Source selection lean: who they quote.
   * Approximation: detect citations of partisan think-tanks / organisations.
   */
  private computeSourceSelectionLean(text: string): number {
    const lower = text.toLowerCase();

    const leftSources = [
      'center for american progress',
      'brookings institution',
      'brennan center',
      'aclu',
      'planned parenthood',
      'sierra club',
      'naacp',
      'southern poverty law center',
      'media matters',
    ];
    const rightSources = [
      'heritage foundation',
      'cato institute',
      'american enterprise institute',
      'federalist society',
      'nra',
      'national rifle association',
      'freedom caucus',
      'turning point',
      'daily wire',
      'project veritas',
    ];

    let leftHits = 0;
    let rightHits = 0;
    for (const s of leftSources)
      if (lower.includes(s)) leftHits++;
    for (const s of rightSources)
      if (lower.includes(s)) rightHits++;

    const total = leftHits + rightHits;
    if (total === 0) return 0;
    return this.clamp((rightHits - leftHits) / total, -1, 1);
  }

  /**
   * Establishment linguistic markers.
   * High establishment: institutional language, official sources.
   * Low establishment: populist language, anti-elite rhetoric.
   */
  private computeEstablishmentLinguistic(text: string): number {
    const lower = text.toLowerCase();

    const establishmentMarkers = [
      'official',
      'officials say',
      'according to',
      'government sources',
      'the administration',
      'state department',
      'the pentagon',
      'federal reserve',
      'experts say',
      'analysts say',
      'bipartisan',
      'moderate',
    ];
    const outsiderMarkers = [
      'the people',
      'grassroots',
      'the elite',
      'elites',
      'establishment',
      'drain the swamp',
      'rigged',
      'corrupt',
      'ruling class',
      'deep state',
      'big pharma',
      'big tech',
      'mainstream media',
      'wake up',
    ];

    let estHits = 0;
    let outHits = 0;
    for (const m of establishmentMarkers)
      if (lower.includes(m)) estHits++;
    for (const m of outsiderMarkers)
      if (lower.includes(m)) outHits++;

    const total = estHits + outHits;
    if (total === 0) return 0;
    return this.clamp((estHits - outHits) / total, -1, 1);
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }
}
