import { Injectable, Logger } from '@nestjs/common';

/**
 * Deterministic lexicon-based sentiment analyser (VADER-inspired).
 *
 * MVP implementation per SYSTEM_DESIGN §4.3:
 *   "MVP: VADER sentiment + TextBlob subjectivity as dual-signal."
 *
 * Scores a text on [-1.0, +1.0] using a curated word-level valence
 * lexicon plus simple amplifier / negation heuristics.
 */
@Injectable()
export class SentimentService {
  private readonly logger = new Logger(SentimentService.name);

  // ── Lexicon ────────────────────────────────────────────
  // Each word maps to a base valence in [-1, +1].
  // Curated subset of VADER + media-specific terms.
  private readonly LEXICON: Record<string, number> = {
    // Strongly positive
    excellent: 0.85,
    outstanding: 0.85,
    triumph: 0.8,
    breakthrough: 0.75,
    heroic: 0.75,
    celebrate: 0.7,
    wonderful: 0.7,
    remarkable: 0.7,
    successful: 0.65,
    victory: 0.65,
    progress: 0.6,
    support: 0.5,
    benefit: 0.5,
    improve: 0.5,
    growth: 0.45,
    positive: 0.45,
    hope: 0.4,
    gain: 0.4,
    agree: 0.35,
    good: 0.35,
    approve: 0.35,
    safe: 0.3,
    protect: 0.3,
    opportunity: 0.3,
    resolve: 0.25,
    recover: 0.25,
    boost: 0.25,
    secure: 0.2,

    // Mildly positive
    new: 0.1,
    plan: 0.1,
    lead: 0.1,
    announce: 0.05,

    // Mildly negative
    concern: -0.2,
    question: -0.15,
    challenge: -0.15,
    issue: -0.1,
    slow: -0.15,
    decline: -0.25,
    fall: -0.2,
    drop: -0.2,
    cut: -0.15,
    risk: -0.25,
    delay: -0.2,
    lose: -0.3,
    miss: -0.2,
    oppose: -0.3,
    reject: -0.35,
    deny: -0.3,
    problem: -0.3,
    fail: -0.4,
    failure: -0.45,
    warning: -0.35,
    fear: -0.4,
    threat: -0.4,
    damage: -0.45,

    // Strongly negative
    crisis: -0.55,
    attack: -0.55,
    destroy: -0.65,
    kill: -0.7,
    killed: -0.7,
    death: -0.65,
    dead: -0.65,
    murder: -0.75,
    disaster: -0.7,
    catastrophe: -0.75,
    catastrophic: -0.75,
    devastating: -0.7,
    horrific: -0.8,
    terrible: -0.7,
    tragedy: -0.7,
    tragic: -0.7,
    violence: -0.65,
    violent: -0.65,
    war: -0.55,
    bomb: -0.65,
    explosion: -0.55,
    crash: -0.55,
    collapse: -0.55,
    scandal: -0.5,
    corrupt: -0.6,
    corruption: -0.6,
    fraud: -0.55,
    abuse: -0.6,
    outrage: -0.55,
    fury: -0.55,
    chaos: -0.5,
    panic: -0.55,
    suffer: -0.5,
    suffering: -0.5,

    // Emotional amplifiers (media-specific)
    breaking: 0.0, // neutral but high-arousal
    shocking: -0.45,
    stunning: 0.15,
    unprecedented: -0.1,
    explosive: -0.35,
    urgent: -0.25,
    alarming: -0.45,
    dramatic: -0.15,
    controversial: -0.2,
    divisive: -0.25,
    polarizing: -0.2,
    massive: 0.1,
    huge: 0.1,
    major: 0.05,
  };

  // Words that invert or dampen the next word's valence
  private readonly NEGATORS = new Set([
    'not',
    "n't",
    'no',
    'never',
    'neither',
    'nor',
    'hardly',
    'barely',
    'scarcely',
    'without',
    'lack',
    'lacks',
    'lacking',
    'isn',
    'aren',
    'wasn',
    'weren',
    'doesn',
    'didn',
    'won',
    'wouldn',
    'shouldn',
    'couldn',
    'hasn',
    'haven',
    'hadn',
  ]);

  // Words that amplify the next word's valence
  private readonly AMPLIFIERS: Record<string, number> = {
    very: 1.3,
    extremely: 1.5,
    incredibly: 1.4,
    absolutely: 1.4,
    deeply: 1.3,
    highly: 1.25,
    most: 1.2,
    completely: 1.3,
    totally: 1.3,
    particularly: 1.15,
    especially: 1.15,
    somewhat: 0.7,
    slightly: 0.6,
    barely: 0.5,
    relatively: 0.8,
  };

  /**
   * Score a text block.  Returns [-1.0, +1.0].
   * Returns 0 if the text is empty or has no lexicon hits.
   */
  analyse(text: string | null | undefined): number {
    if (!text || text.trim().length === 0) return 0;

    const tokens = this.tokenise(text);
    if (tokens.length === 0) return 0;

    let totalValence = 0;
    let hits = 0;

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      const baseValence = this.LEXICON[token];

      if (baseValence === undefined) continue;

      let valence = baseValence;

      // Check preceding token for negation (window of 3 tokens back)
      for (let j = Math.max(0, i - 3); j < i; j++) {
        if (this.NEGATORS.has(tokens[j])) {
          valence *= -0.75;
          break;
        }
      }

      // Check preceding token for amplification
      if (i > 0) {
        const amp = this.AMPLIFIERS[tokens[i - 1]];
        if (amp) valence *= amp;
      }

      totalValence += valence;
      hits++;
    }

    if (hits === 0) return 0;

    // Normalise using a sigmoid-like compression
    // so the raw sum maps into [-1, +1] without hard clipping
    const raw = totalValence / Math.sqrt(hits);
    return this.compress(raw);
  }

  /**
   * Returns the absolute sentiment gap between headline and body.
   * High values indicate clickbait / editorialised headlines.
   */
  computeSentimentGap(
    headlineSentiment: number,
    bodySentiment: number,
  ): number {
    return Math.abs(headlineSentiment - bodySentiment);
  }

  /**
   * Estimate emotional valence (arousal).
   * Uses count of high-magnitude words normalised by text length.
   * Returns [0.0, 1.0].
   */
  computeEmotionalValence(text: string | null | undefined): number {
    if (!text || text.trim().length === 0) return 0;

    const tokens = this.tokenise(text);
    if (tokens.length === 0) return 0;

    let highArousal = 0;
    for (const token of tokens) {
      const v = this.LEXICON[token];
      if (v !== undefined && Math.abs(v) >= 0.5) highArousal++;
    }

    // Normalise to [0,1]
    const ratio = highArousal / tokens.length;
    return Math.min(1, ratio * 10); // scale so 10% high-arousal → 1.0
  }

  // ── Helpers ───────────────────────────────────────────

  private tokenise(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9'\s-]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 1);
  }

  /** Sigmoid-like compression into [-1, +1] */
  private compress(x: number): number {
    return x / Math.sqrt(1 + x * x);
  }
}
