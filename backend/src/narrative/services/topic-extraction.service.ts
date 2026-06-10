import { Injectable } from '@nestjs/common';
import { Article } from '../../articles/entities/article.entity';

/**
 * Extracts topic keywords and named entities from articles
 * for use in story cluster matching.
 *
 * Extraction signals (ordered by reliability):
 *  1. Significant terms from headlines
 *  2. Multi-word named entities (proper noun phrases)
 *  3. Single proper nouns appearing mid-sentence
 *  4. Acronyms (all-caps tokens)
 *  5. Titled / honorific names
 */
@Injectable()
export class TopicExtractionService {
  /**
   * Extract topic keywords from an article for clustering.
   * Returns up to 40 lowercased keyword strings.
   */
  extractKeywords(article: Article): string[] {
    const keywords = new Set<string>();

    const title = article.title || '';
    const body = [article.summary, article.content?.slice(0, 3000)]
      .filter(Boolean)
      .join(' ');
    const fullText = `${title} ${body}`;

    // 1. Significant title terms (highest signal for news headlines)
    for (const term of this.extractSignificantTerms(title)) {
      keywords.add(term);
    }

    // 2. Multi-word proper nouns (e.g. "White House", "Donald Trump")
    for (const entity of this.extractMultiWordEntities(fullText)) {
      keywords.add(entity);
    }

    // 3. Single proper nouns not at sentence start
    for (const noun of this.extractSingleProperNouns(fullText)) {
      keywords.add(noun);
    }

    // 4. Acronyms (e.g. "NATO", "FBI", "CDC")
    for (const acro of this.extractAcronyms(fullText)) {
      keywords.add(acro);
    }

    // 5. Titled names (e.g. "President Biden")
    for (const name of this.extractTitledNames(fullText)) {
      keywords.add(name);
    }

    return [...keywords].slice(0, 40);
  }

  // ── Similarity scoring ──────────────────────────────────

  /**
   * Compute headline similarity using significant word overlap.
   * Uses overlap coefficient: |A ∩ B| / min(|A|, |B|).
   * @returns 0.0 – 1.0
   */
  headlineSimilarity(titleA: string, titleB: string): number {
    const wordsA = new Set(this.extractSignificantTerms(titleA));
    const wordsB = new Set(this.extractSignificantTerms(titleB));
    if (wordsA.size === 0 || wordsB.size === 0) return 0;

    let intersection = 0;
    for (const w of wordsA) {
      if (wordsB.has(w)) intersection++;
    }

    return intersection / Math.min(wordsA.size, wordsB.size);
  }

  /**
   * Compute keyword overlap between article keywords and cluster keywords.
   * Uses Jaccard index: |A ∩ B| / |A ∪ B| to prevent short lists
   * from inflating the score. Requires at least 2 shared keywords
   * for a non-zero score.
   * @returns 0.0 – 1.0
   */
  keywordOverlap(
    articleKeywords: string[],
    clusterKeywords: string[],
  ): number {
    if (articleKeywords.length === 0 || clusterKeywords.length === 0) {
      return 0;
    }

    const articleSet = new Set(articleKeywords);
    const clusterSet = new Set(clusterKeywords);
    let intersection = 0;
    for (const k of articleSet) {
      if (clusterSet.has(k)) intersection++;
    }

    // Require at least 2 overlapping keywords to avoid
    // single-word false positives (e.g. "iran" alone)
    if (intersection < 2) return 0;

    // Jaccard index: intersection / union
    const union = articleSet.size + clusterSet.size - intersection;
    return union > 0 ? intersection / union : 0;
  }

  // ── Extraction helpers ──────────────────────────────────

  /**
   * Extract significant terms from a headline by removing
   * stop words and news filler, returning lowercased tokens.
   */
  extractSignificantTerms(title: string): string[] {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s'-]/g, ' ')
      .split(/\s+/)
      .filter(
        (t) =>
          t.length > 2 &&
          !STOP_WORDS.has(t) &&
          !NEWS_FILLER.has(t),
      );
  }

  /**
   * Multi-word capitalized phrases: "White House", "Supreme Court",
   * "Donald Trump", "United States", etc.
   */
  private extractMultiWordEntities(text: string): string[] {
    // 2+ consecutive capitalised words, optionally linked by short connectors
    const pattern =
      /([A-Z][a-zA-Z]+(?:\s+(?:of|the|and|for|in|on|de|al|bin|von)\s+)?[A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)/g;
    const entities: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      const entity = match[1].toLowerCase();
      const firstWord = entity.split(' ')[0];
      if (entity.length > 3 && !COMMON_PREFIXES.has(firstWord)) {
        entities.push(entity);
      }
    }
    return [...new Set(entities)];
  }

  /**
   * Single capitalised words appearing mid-sentence (after lowercase
   * text), indicating proper nouns: "Trump", "Gaza", "Ukraine", etc.
   */
  private extractSingleProperNouns(text: string): string[] {
    const pattern = /(?<=[a-z,;:'")\]]\s)([A-Z][a-z]{2,})/g;
    const nouns: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      const noun = match[1].toLowerCase();
      if (!COMMON_SENTENCE_STARTERS.has(noun) && !STOP_WORDS.has(noun)) {
        nouns.push(noun);
      }
    }
    return [...new Set(nouns)];
  }

  /**
   * All-caps tokens of 2–6 characters: "NATO", "FBI", "CDC", "GDP", etc.
   */
  private extractAcronyms(text: string): string[] {
    const pattern = /\b([A-Z]{2,6})\b/g;
    const acronyms: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      const acro = match[1].toLowerCase();
      if (!COMMON_ABBREVIATIONS.has(acro)) {
        acronyms.push(acro);
      }
    }
    return [...new Set(acronyms)];
  }

  /**
   * Names preceded by titles / honorifics:
   * "President Biden", "Secretary Austin", "Dr. Fauci", etc.
   */
  private extractTitledNames(text: string): string[] {
    const pattern =
      /(?:President|Vice\s+President|Senator|Rep\.|Gov\.|Secretary|Minister|Premier|Mayor|Chief|Director|General|Justice|Judge|King|Queen|Prince|Princess|Pope|Dr\.|Mr\.|Mrs\.|Ms\.)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi;
    const names: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      names.push(match[1].toLowerCase());
    }
    return [...new Set(names)];
  }
}

// ── Word lists ──────────────────────────────────────────────

const STOP_WORDS = new Set([
  'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'it',
  'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at', 'this',
  'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she',
  'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their',
  'what', 'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which',
  'go', 'me', 'when', 'make', 'can', 'like', 'time', 'no', 'just',
  'him', 'know', 'take', 'into', 'year', 'your', 'some', 'could',
  'them', 'see', 'other', 'than', 'then', 'now', 'look', 'only',
  'come', 'its', 'over', 'think', 'also', 'back', 'after', 'use',
  'how', 'our', 'work', 'first', 'well', 'way', 'even', 'new',
  'want', 'because', 'any', 'these', 'give', 'day', 'most', 'us',
  'was', 'has', 'had', 'are', 'been', 'said', 'did', 'were', 'more',
  'very', 'may', 'still', 'own', 'should', 'being', 'each', 'much',
  'between', 'does', 'such', 'through', 'while', 'where', 'before',
  'both', 'same', 'those', 'people', 'two', 'good',
]);

const NEWS_FILLER = new Set([
  'says', 'said', 'report', 'reports', 'news', 'update',
  'latest', 'breaking', 'live', 'watch', 'video', 'read',
  'here', 'today', 'yesterday', 'tomorrow', 'week', 'month',
  'ago', 'also', 'how', 'why', 'what', 'when',
  'where', 'who', 'which', 'could', 'would', 'should', 'will',
  'can', 'may', 'might', 'must', 'shall', 'opinion', 'analysis',
  'exclusive', 'developing', 'updated',
]);

const COMMON_SENTENCE_STARTERS = new Set([
  'the', 'this', 'that', 'these', 'those', 'it', 'its', 'there',
  'here', 'however', 'meanwhile', 'furthermore', 'moreover', 'also',
  'but', 'yet', 'still', 'then', 'now', 'so', 'while', 'after',
  'before', 'since', 'although', 'because', 'when', 'where', 'if',
  'some', 'many', 'several', 'other', 'another', 'each', 'every',
  'both', 'all', 'most', 'few', 'more', 'less',
]);

const COMMON_ABBREVIATIONS = new Set([
  'am', 'pm', 'et', 'pt', 'st', 'nd', 'rd', 'th', 'vs', 'ie', 'eg',
  'ad', 'bc', 'ph', 'id', 'tv', 'ok', 'dc', 'us', 'uk', 'ap',
]);

const COMMON_PREFIXES = new Set([
  'the', 'this', 'that', 'some', 'many', 'several', 'however',
  'meanwhile', 'furthermore', 'although', 'because', 'after', 'before',
  'according', 'another', 'every', 'last', 'next', 'former', 'other',
]);
