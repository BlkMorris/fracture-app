import { Injectable, Logger } from '@nestjs/common';
import { Article } from '../../articles/entities/article.entity';
import type { ImageContext } from '../interfaces';

/**
 * Extracts structured visual context from an article
 * to drive image search and generation.
 *
 * Signals extracted:
 *  - Primary topic (headline distilled)
 *  - Named entities (people, organisations, locations)
 *  - News category
 *  - Visual keywords for image search
 */
@Injectable()
export class ImageContextService {
  private readonly logger = new Logger(ImageContextService.name);

  extractContext(article: Article): ImageContext {
    const title = article.title || '';
    const summary = article.summary || '';
    const body = article.content?.slice(0, 2000) || '';
    const fullText = `${title} ${summary} ${body}`;

    const entities = this.extractEntities(fullText);
    const category = this.classifyCategory(fullText);
    const topic = this.extractTopic(title, entities);
    const visualKeywords = this.buildVisualKeywords(
      topic,
      entities,
      category,
      title,
    );

    this.logger.debug(
      `[IMG-CONTEXT] "${title.slice(0, 50)}" → ` +
        `topic="${topic}" category=${category} ` +
        `entities=[${entities.slice(0, 5).join(', ')}] ` +
        `visual=[${visualKeywords.slice(0, 5).join(', ')}]`,
    );

    return {
      topic,
      entities,
      category,
      visualKeywords,
      articleTitle: title,
      articleSummary: summary,
    };
  }

  // ── Topic extraction ──────────────────────────────────

  private extractTopic(title: string, entities: string[]): string {
    // Remove common news prefixes
    let topic = title
      .replace(
        /^(breaking|exclusive|update|developing|opinion|analysis|watch|video):\s*/i,
        '',
      )
      .trim();

    // If short enough, use cleaned title directly
    if (topic.length <= 80) return topic;

    // Otherwise, distil to key noun phrases + top entity
    const significantTerms = this.extractSignificantTerms(topic);
    const topEntity = entities[0];
    const distilled = topEntity
      ? `${topEntity} ${significantTerms.slice(0, 4).join(' ')}`
      : significantTerms.slice(0, 5).join(' ');

    return distilled || topic.slice(0, 80);
  }

  // ── Entity extraction ─────────────────────────────────

  private extractEntities(text: string): string[] {
    const entities = new Set<string>();

    // Multi-word capitalised phrases (e.g. "White House", "Donald Trump")
    const multiWordPattern =
      /([A-Z][a-zA-Z]+(?:\s+(?:of|the|and|for|in|on)\s+)?[A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)/g;
    let match: RegExpExecArray | null;
    while ((match = multiWordPattern.exec(text)) !== null) {
      const entity = match[1].trim();
      if (
        entity.length > 3 &&
        !COMMON_PREFIXES.has(entity.split(' ')[0].toLowerCase())
      ) {
        entities.add(entity);
      }
    }

    // Single proper nouns mid-sentence
    const singlePattern = /(?<=[a-z,;:'")\]]\s)([A-Z][a-z]{2,})/g;
    while ((match = singlePattern.exec(text)) !== null) {
      const noun = match[1];
      if (
        !COMMON_SENTENCE_STARTERS.has(noun.toLowerCase()) &&
        !STOP_WORDS.has(noun.toLowerCase())
      ) {
        entities.add(noun);
      }
    }

    // Location/country detection
    for (const loc of KNOWN_LOCATIONS) {
      if (text.toLowerCase().includes(loc.toLowerCase())) {
        entities.add(loc);
      }
    }

    return [...entities].slice(0, 15);
  }

  // ── Category classification ───────────────────────────

  private classifyCategory(text: string): string {
    const lower = text.toLowerCase();
    let bestCategory = 'general';
    let bestScore = 0;

    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      let score = 0;
      for (const kw of keywords) {
        if (lower.includes(kw)) score++;
      }
      if (score > bestScore) {
        bestScore = score;
        bestCategory = category;
      }
    }

    return bestCategory;
  }

  // ── Visual keyword generation ─────────────────────────

  private buildVisualKeywords(
    topic: string,
    entities: string[],
    category: string,
    title: string,
  ): string[] {
    const keywords: string[] = [];

    // Add significant terms from the topic
    for (const term of this.extractSignificantTerms(topic)) {
      keywords.push(term);
    }

    // Add top entities (people/places are highly visual)
    for (const entity of entities.slice(0, 5)) {
      keywords.push(entity.toLowerCase());
    }

    // Add category-specific visual terms
    const categoryVisuals = CATEGORY_VISUAL_TERMS[category];
    if (categoryVisuals) {
      // Pick terms that actually appear in the title
      const lower = title.toLowerCase();
      for (const term of categoryVisuals) {
        if (lower.includes(term.split(' ')[0])) {
          keywords.push(term);
        }
      }
      // Always add at least the first category visual as fallback
      if (
        keywords.length < 3 &&
        categoryVisuals.length > 0
      ) {
        keywords.push(categoryVisuals[0]);
      }
    }

    // Deduplicate and cap
    return [...new Set(keywords)].slice(0, 12);
  }

  // ── Helpers ───────────────────────────────────────────

  private extractSignificantTerms(text: string): string[] {
    return text
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
}

// ── Word lists ──────────────────────────────────────────

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
  'very', 'may', 'still', 'own', 'should', 'being',
]);

const NEWS_FILLER = new Set([
  'says', 'said', 'report', 'reports', 'news', 'update', 'latest',
  'breaking', 'live', 'watch', 'video', 'read', 'here', 'today',
  'yesterday', 'opinion', 'analysis', 'exclusive', 'developing',
]);

const COMMON_PREFIXES = new Set([
  'the', 'this', 'that', 'these', 'those', 'it', 'its', 'there',
  'here', 'however', 'meanwhile', 'furthermore', 'moreover', 'also',
  'but', 'yet', 'still', 'then', 'now', 'so', 'while', 'after',
  'before', 'since', 'although', 'because', 'when', 'where', 'if',
]);

const COMMON_SENTENCE_STARTERS = new Set([
  'the', 'this', 'that', 'these', 'those', 'it', 'its', 'there',
  'here', 'however', 'meanwhile', 'furthermore', 'moreover', 'also',
  'but', 'yet', 'still', 'then', 'now', 'so', 'while', 'after',
  'before', 'since', 'although', 'because', 'when', 'where', 'if',
  'some', 'many', 'several', 'other', 'another', 'each', 'every',
]);

const KNOWN_LOCATIONS = [
  'United States', 'China', 'Russia', 'Ukraine', 'Israel', 'Gaza',
  'Iran', 'Iraq', 'Syria', 'Afghanistan', 'North Korea', 'Taiwan',
  'Europe', 'Middle East', 'Washington', 'Moscow', 'Beijing',
  'London', 'Paris', 'Berlin', 'Tokyo', 'Jerusalem', 'Kyiv',
  'Kabul', 'Tehran', 'Baghdad', 'Delhi', 'Mumbai', 'Seoul',
  'Brussels', 'Geneva', 'New York', 'Los Angeles', 'Chicago',
  'Mexico', 'Brazil', 'India', 'Pakistan', 'Turkey', 'Saudi Arabia',
  'Egypt', 'South Africa', 'Nigeria', 'Venezuela', 'Cuba',
];

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  politics: [
    'president', 'congress', 'senate', 'democrat', 'republican',
    'legislation', 'political', 'governor', 'mayor', 'bipartisan',
    'white house', 'cabinet', 'impeach', 'veto',
  ],
  conflict: [
    'war', 'military', 'attack', 'bomb', 'missile', 'troops',
    'airstrike', 'ceasefire', 'hostage', 'terrorism', 'invasion',
    'soldier', 'drone', 'combat', 'strike',
  ],
  economy: [
    'market', 'stock', 'inflation', 'recession', 'gdp', 'trade',
    'tariff', 'unemployment', 'interest rate', 'wall street',
    'federal reserve', 'economic', 'fiscal',
  ],
  technology: [
    'ai', 'artificial intelligence', 'tech', 'startup', 'silicon valley',
    'software', 'hardware', 'smartphone', 'algorithm', 'data',
    'cyber', 'robot', 'machine learning', 'crypto', 'blockchain',
  ],
  health: [
    'health', 'hospital', 'vaccine', 'pandemic', 'disease', 'medical',
    'doctor', 'patient', 'drug', 'fda', 'treatment', 'virus',
  ],
  environment: [
    'climate', 'environment', 'pollution', 'carbon', 'renewable',
    'emission', 'wildfire', 'hurricane', 'flood', 'drought',
    'sustainable', 'fossil fuel', 'ocean',
  ],
  elections: [
    'election', 'vote', 'voter', 'ballot', 'polling', 'poll',
    'primary', 'campaign', 'candidate', 'nominee', 'electoral',
  ],
  world: [
    'international', 'united nations', 'diplomat', 'embassy',
    'summit', 'refugee', 'immigration', 'border', 'asylum',
    'foreign', 'treaty',
  ],
};

const CATEGORY_VISUAL_TERMS: Record<string, string[]> = {
  politics: ['capitol building', 'podium', 'government', 'press conference'],
  conflict: ['military', 'soldiers', 'damaged buildings', 'protest'],
  economy: ['stock market', 'currency', 'office buildings', 'financial district'],
  technology: ['technology', 'computer', 'digital', 'circuit board'],
  health: ['hospital', 'medical', 'laboratory', 'healthcare'],
  environment: ['nature', 'industrial', 'landscape', 'weather'],
  elections: ['voting', 'ballot box', 'campaign rally', 'debate stage'],
  world: ['globe', 'diplomacy', 'united nations', 'international'],
  general: ['newsroom', 'newspaper', 'journalism'],
};
