import { Injectable, Logger } from '@nestjs/common';
import { Article } from '../../articles/entities/article.entity';
import { FramingType, LedeType } from '../../common/enums';

/**
 * Structural framing detection per SYSTEM_DESIGN §4.4.
 *
 * Detects framing type (CONFLICT, HUMAN_INTEREST, ECONOMIC, MORAL, RESPONSIBILITY),
 * lede classification, and structural features (paragraph count, quote ratio, etc.).
 */
@Injectable()
export class FramingDetectorService {
  private readonly logger = new Logger(FramingDetectorService.name);

  // ── Framing type keyword patterns ───────────────────
  private readonly FRAMING_KEYWORDS: Record<FramingType, string[]> = {
    [FramingType.CONFLICT]: [
      'battle',
      'fight',
      'clash',
      'attack',
      'oppose',
      'debate',
      'controversy',
      'dispute',
      'confrontation',
      'rival',
      'accuse',
      'blame',
      'challenge',
      'disagree',
      'feud',
      'war of words',
      'showdown',
      'standoff',
      'face off',
      'heated',
      'tensions',
      'divided',
      'versus',
      ' vs ',
      'backlash',
      'retaliate',
      'denounce',
      'condemn',
      'slams',
      'fires back',
    ],
    [FramingType.HUMAN_INTEREST]: [
      'family',
      'child',
      'children',
      'mother',
      'father',
      'parent',
      'survivor',
      'victim',
      'personal',
      'story of',
      'journey',
      'struggle',
      'overcome',
      'heartbreak',
      'emotional',
      'tears',
      'grief',
      'hope',
      'dream',
      'inspire',
      'community',
      'neighbor',
      'everyday',
      'ordinary',
      'real people',
      'human cost',
      'faces of',
      'life of',
    ],
    [FramingType.ECONOMIC]: [
      'economy',
      'economic',
      'market',
      'stock',
      'gdp',
      'inflation',
      'recession',
      'budget',
      'deficit',
      'spending',
      'cost',
      'price',
      'tax',
      'revenue',
      'profit',
      'loss',
      'trade',
      'tariff',
      'jobs',
      'employment',
      'unemployment',
      'wage',
      'salary',
      'financial',
      'fiscal',
      'billion',
      'million',
      'dollar',
      'investor',
      'wall street',
      'industry',
    ],
    [FramingType.MORAL]: [
      'right',
      'wrong',
      'moral',
      'ethical',
      'justice',
      'injustice',
      'fair',
      'unfair',
      'integrity',
      'values',
      'principle',
      'conscience',
      'duty',
      'obligation',
      'sacred',
      'sin',
      'virtue',
      'evil',
      'righteous',
      'compassion',
      'dignity',
      'freedom',
      'liberty',
      'rights',
      'equality',
      'should',
      'must',
      'ought',
    ],
    [FramingType.RESPONSIBILITY]: [
      'responsible',
      'accountability',
      'blame',
      'fault',
      'cause',
      'caused by',
      'failure to',
      'negligence',
      'oversight',
      'investigate',
      'inquiry',
      'probe',
      'demanded',
      'called for',
      'resign',
      'step down',
      'hold accountable',
      'take responsibility',
      'in charge',
      'leadership',
      'administration',
      'government',
      'agency',
      'regulator',
      'watchdog',
    ],
  };

  /**
   * Analyse a full article and return framing + structural features.
   */
  analyseArticle(article: Article): {
    framingType: FramingType;
    framingConfidence: number;
    ledeType: LedeType;
    paragraphCount: number;
    sourceCount: number;
    namedSourceRatio: number;
    quoteToNarrativeRatio: number;
    attributionDensity: number;
    passiveVoiceRatio: number;
    certaintyLanguageScore: number;
  } {
    const fullText = [article.title, article.summary, article.content]
      .filter(Boolean)
      .join('\n\n');

    const paragraphs = this.extractParagraphs(fullText);
    const lede = paragraphs[0] || article.title || '';

    return {
      ...this.detectFramingType(fullText),
      ledeType: this.classifyLede(lede),
      paragraphCount: paragraphs.length,
      sourceCount: this.countSources(fullText),
      namedSourceRatio: this.computeNamedSourceRatio(fullText),
      quoteToNarrativeRatio: this.computeQuoteRatio(fullText),
      attributionDensity: this.computeAttributionDensity(
        fullText,
        paragraphs.length,
      ),
      passiveVoiceRatio: this.computePassiveVoiceRatio(fullText),
      certaintyLanguageScore: this.computeCertaintyScore(fullText),
    };
  }

  /**
   * Detect the dominant framing type using keyword frequency analysis.
   */
  private detectFramingType(text: string): {
    framingType: FramingType;
    framingConfidence: number;
  } {
    const lower = text.toLowerCase();
    const scores: Record<FramingType, number> = {
      [FramingType.CONFLICT]: 0,
      [FramingType.HUMAN_INTEREST]: 0,
      [FramingType.ECONOMIC]: 0,
      [FramingType.MORAL]: 0,
      [FramingType.RESPONSIBILITY]: 0,
    };

    let totalHits = 0;

    for (const [type, keywords] of Object.entries(this.FRAMING_KEYWORDS)) {
      for (const kw of keywords) {
        let searchFrom = 0;
        while (true) {
          const idx = lower.indexOf(kw, searchFrom);
          if (idx === -1) break;
          // Position boost: headline area (first 200 chars) worth 3×
          const boost = idx < 200 ? 3 : 1;
          scores[type as FramingType] += boost;
          totalHits += boost;
          searchFrom = idx + kw.length;
        }
      }
    }

    if (totalHits === 0) {
      return {
        framingType: FramingType.RESPONSIBILITY,
        framingConfidence: 0.2,
      };
    }

    // Find the dominant frame
    let maxType = FramingType.RESPONSIBILITY;
    let maxScore = 0;
    for (const [type, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        maxType = type as FramingType;
      }
    }

    // Confidence: dominant share of total hits
    const confidence = Math.min(0.95, maxScore / totalHits + 0.1);

    return {
      framingType: maxType,
      framingConfidence: Math.round(confidence * 100) / 100,
    };
  }

  /**
   * Classify the lede paragraph type per SYSTEM_DESIGN §3.1:
   *   SUMMARY, ANECDOTAL, SCENIC, QUESTION
   */
  private classifyLede(lede: string): LedeType {
    const trimmed = lede.trim();

    // Question lede: ends with ? or starts with interrogative
    if (
      trimmed.endsWith('?') ||
      /^(who|what|where|when|why|how|is|are|was|were|can|could|will|would|should|do|does|did)\b/i.test(
        trimmed,
      )
    ) {
      return LedeType.QUESTION;
    }

    // Scenic lede: starts with setting/atmosphere language
    const scenicPatterns =
      /^(the (sun|moon|sky|rain|wind|fog|smoke|crowd|room|street)|as (the|dawn|dusk|night)|on a|in the|beneath|above|outside|inside|standing|sitting|walking|looking)/i;
    if (scenicPatterns.test(trimmed)) {
      return LedeType.SCENIC;
    }

    // Anecdotal lede: starts with a person's name or personal pronoun, narrative voice
    const anecdotalPatterns =
      /^(she|he|they|it was|[A-Z][a-z]+ [A-Z][a-z]+ (was|had|could|would|sat|stood|walked|looked|remember|never|always))/;
    if (anecdotalPatterns.test(trimmed)) {
      return LedeType.ANECDOTAL;
    }

    // Default: summary lede (inverted pyramid — most common in news)
    return LedeType.SUMMARY;
  }

  /**
   * Count attributed sources in the text (quote attributions).
   */
  private countSources(text: string): number {
    // Match attribution patterns: "said X", "according to X", "X told", etc.
    const attributionPatterns =
      /(?:said|told|according to|stated|reported|confirmed|denied|argued|claimed|explained|noted|warned|added|insisted|suggested|announced)\s/gi;
    const matches = text.match(attributionPatterns);
    return matches ? matches.length : 0;
  }

  /**
   * Ratio of named (identified) sources vs total attributions.
   * Named sources: "John Smith said" vs anonymous: "sources say"
   */
  private computeNamedSourceRatio(text: string): number {
    const totalSources = this.countSources(text);
    if (totalSources === 0) return 0;

    const anonymousPatterns =
      /(?:sources?|officials?|people|insiders?|aides?|those)\s+(?:familiar|close to|who|say|said|told|speaking|requesting)/gi;
    const anonMatches = text.match(anonymousPatterns);
    const anonCount = anonMatches ? anonMatches.length : 0;

    const namedCount = Math.max(0, totalSources - anonCount);
    return Math.round((namedCount / totalSources) * 100) / 100;
  }

  /**
   * Ratio of quoted text to total text.
   */
  private computeQuoteRatio(text: string): number {
    if (!text || text.length === 0) return 0;

    // Match text inside quotation marks
    const quotePattern = /"[^"]{5,}"|"[^"]{5,}"|'[^']{5,}'/g;
    const matches = text.match(quotePattern);
    if (!matches) return 0;

    const quotedLength = matches.reduce((sum, m) => sum + m.length, 0);
    return Math.round((quotedLength / text.length) * 100) / 100;
  }

  /**
   * Attribution density: quote attributions per paragraph.
   */
  private computeAttributionDensity(
    text: string,
    paragraphCount: number,
  ): number {
    if (paragraphCount === 0) return 0;
    const sources = this.countSources(text);
    return Math.round((sources / paragraphCount) * 100) / 100;
  }

  /**
   * Passive voice ratio: approximate detection.
   */
  private computePassiveVoiceRatio(text: string): number {
    if (!text || text.length === 0) return 0;

    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 3);
    if (sentences.length === 0) return 0;

    let passiveCount = 0;
    const passivePattern =
      /\b(was|were|been|being|is|are|am|get|got|gotten)\s+\w+ed\b/gi;

    for (const sentence of sentences) {
      if (passivePattern.test(sentence)) {
        passiveCount++;
      }
      passivePattern.lastIndex = 0; // reset regex
    }

    return Math.round((passiveCount / sentences.length) * 100) / 100;
  }

  /**
   * Certainty language score.
   * Measures hedge words vs certainty words.
   * High score = high certainty language.
   */
  private computeCertaintyScore(text: string): number {
    const lower = text.toLowerCase();
    const tokens = lower.split(/\s+/);
    if (tokens.length === 0) return 0.5;

    const certaintyWords = [
      'definitely',
      'certainly',
      'clearly',
      'obviously',
      'undoubtedly',
      'absolutely',
      'always',
      'never',
      'every',
      'none',
      'must',
      'proven',
      'fact',
      'conclusive',
      'indisputable',
      'without question',
      'no doubt',
    ];
    const hedgeWords = [
      'maybe',
      'perhaps',
      'possibly',
      'might',
      'could',
      'may',
      'likely',
      'unlikely',
      'appear',
      'appears',
      'seem',
      'seems',
      'suggest',
      'suggests',
      'alleged',
      'reportedly',
      'apparently',
      'somewhat',
      'roughly',
      'approximately',
      'about',
    ];

    let certainty = 0;
    let hedge = 0;

    for (const word of tokens) {
      if (certaintyWords.includes(word)) certainty++;
      if (hedgeWords.includes(word)) hedge++;
    }

    // Also check multi-word patterns
    for (const phrase of [
      'without question',
      'no doubt',
      'it is clear',
    ]) {
      if (lower.includes(phrase)) certainty++;
    }

    const total = certainty + hedge;
    if (total === 0) return 0.5; // neutral
    return Math.round((certainty / total) * 100) / 100;
  }

  private extractParagraphs(text: string): string[] {
    return text
      .split(/\n\s*\n|\n/)
      .map((p) => p.trim())
      .filter((p) => p.length > 20);
  }
}
