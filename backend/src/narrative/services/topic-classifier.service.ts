import { Injectable, Logger } from '@nestjs/common';

/**
 * Major news categories that qualify for hero placement.
 * Clusters must belong to one of these to become hero stories.
 */
export enum TopicCategory {
  POLITICS = 'politics',
  WORLD = 'world',
  ECONOMY = 'economy',
  CONFLICT = 'conflict',
  ELECTIONS = 'elections',
  POLICY = 'policy',
  GEOPOLITICS = 'geopolitics',
  UNCATEGORIZED = 'uncategorized',
}

/** Categories eligible for hero placement */
export const HERO_ELIGIBLE_CATEGORIES = new Set<TopicCategory>([
  TopicCategory.POLITICS,
  TopicCategory.WORLD,
  TopicCategory.ECONOMY,
  TopicCategory.CONFLICT,
  TopicCategory.ELECTIONS,
  TopicCategory.POLICY,
  TopicCategory.GEOPOLITICS,
]);

interface CategoryRule {
  category: TopicCategory;
  keywords: string[];
  weight: number; // higher = more confident match
}

/**
 * Classifies story clusters into major news categories using
 * keyword matching against cluster topic, topicKeywords, and
 * article headlines.
 */
@Injectable()
export class TopicClassifierService {
  private readonly logger = new Logger(TopicClassifierService.name);

  private readonly rules: CategoryRule[] = [
    {
      category: TopicCategory.POLITICS,
      keywords: [
        'trump', 'biden', 'congress', 'senate', 'house', 'democrat',
        'republican', 'gop', 'dnc', 'rnc', 'political', 'politician',
        'governor', 'mayor', 'legislation', 'bipartisan', 'partisan',
        'liberal', 'conservative', 'caucus', 'filibuster', 'veto',
        'impeach', 'cabinet', 'white house', 'oval office', 'speaker',
        'majority leader', 'minority leader', 'scotus', 'supreme court',
        'attorney general', 'doj', 'fbi', 'cia', 'homeland',
        'newsom', 'desantis', 'pence', 'harris', 'pelosi', 'mccarthy',
        'schumer', 'gavin', 'hegseth', 'patel',
      ],
      weight: 1.0,
    },
    {
      category: TopicCategory.ELECTIONS,
      keywords: [
        'election', 'vote', 'voter', 'ballot', 'polling', 'poll',
        'primary', 'caucus', 'campaign', 'candidate', 'nominee',
        'electoral', 'swing state', 'battleground', 'runoff',
        'midterm', 'presidential race', '2024', '2026', '2028',
      ],
      weight: 1.2,
    },
    {
      category: TopicCategory.CONFLICT,
      keywords: [
        'war', 'strike', 'military', 'attack', 'bomb', 'missile',
        'invasion', 'troops', 'soldier', 'combat', 'airstrike',
        'drone strike', 'nato', 'pentagon', 'defense', 'ceasefire',
        'hostage', 'terrorism', 'terrorist', 'insurgent', 'siege',
        'iran', 'ukraine', 'russia', 'gaza', 'israel', 'hamas',
        'hezbollah', 'taliban', 'navy', 'aircraft carrier',
        'nuclear', 'sanctions', 'escalation', 'retaliation',
      ],
      weight: 1.1,
    },
    {
      category: TopicCategory.ECONOMY,
      keywords: [
        'market', 'stock', 'inflation', 'recession', 'gdp', 'fed',
        'federal reserve', 'interest rate', 'wall street', 'nasdaq',
        'dow jones', 's&p', 'treasury', 'debt', 'deficit', 'trade',
        'tariff', 'unemployment', 'jobs report', 'economic', 'economy',
        'fiscal', 'monetary', 'cpi', 'consumer', 'bank', 'financial',
        'crypto', 'bitcoin', 'housing market', 'oil price', 'opec',
      ],
      weight: 1.0,
    },
    {
      category: TopicCategory.WORLD,
      keywords: [
        'international', 'united nations', 'eu', 'european union',
        'foreign', 'diplomat', 'embassy', 'ambassador', 'summit',
        'g7', 'g20', 'brics', 'treaty', 'refugee', 'immigration',
        'border', 'asylum', 'deportation', 'cartel', 'extradition',
        'china', 'beijing', 'north korea', 'pyongyang', 'venezuela',
        'cuba', 'mexico', 'canada', 'uk', 'britain', 'france',
        'germany', 'japan', 'india', 'africa', 'middle east',
      ],
      weight: 0.9,
    },
    {
      category: TopicCategory.POLICY,
      keywords: [
        'policy', 'regulation', 'executive order', 'bill', 'law',
        'act', 'reform', 'mandate', 'healthcare', 'medicaid',
        'medicare', 'social security', 'infrastructure', 'climate',
        'environment', 'epa', 'education', 'gun control', 'abortion',
        'immigration policy', 'tax', 'budget', 'spending', 'subsidy',
        'stimulus', 'relief', 'funding', 'appropriation',
        'planned parenthood', 'obamacare', 'aca',
      ],
      weight: 0.9,
    },
    {
      category: TopicCategory.GEOPOLITICS,
      keywords: [
        'geopolitics', 'geopolitical', 'superpower', 'alliance',
        'cold war', 'proxy war', 'sphere of influence', 'regime',
        'coup', 'dictator', 'authoritarian', 'democracy',
        'sovereignty', 'territory', 'annex', 'occupation',
        'arms deal', 'weapons', 'proliferation', 'espionage',
      ],
      weight: 1.0,
    },
  ];

  /**
   * Classify a cluster based on its topic, keywords, and optional article titles.
   * Returns the best-matching category and confidence score.
   */
  classify(
    topic: string,
    topicKeywords: string[],
    articleTitles: string[] = [],
  ): { category: TopicCategory; confidence: number } {
    const text = [
      topic,
      ...topicKeywords,
      ...articleTitles,
    ]
      .join(' ')
      .toLowerCase();

    let bestCategory = TopicCategory.UNCATEGORIZED;
    let bestScore = 0;

    for (const rule of this.rules) {
      let hits = 0;
      for (const kw of rule.keywords) {
        if (text.includes(kw)) {
          hits++;
        }
      }

      const score = (hits / Math.max(rule.keywords.length, 1)) * rule.weight * 100;

      if (score > bestScore) {
        bestScore = score;
        bestCategory = rule.category;
      }
    }

    // Require at least 2 keyword hits (roughly 3-5% of a typical rule set)
    const confidence = Math.min(100, bestScore);
    if (confidence < 2) {
      return { category: TopicCategory.UNCATEGORIZED, confidence: 0 };
    }

    return { category: bestCategory, confidence: Math.round(confidence * 10) / 10 };
  }

  /**
   * Check whether a category qualifies for hero placement.
   */
  isHeroEligible(category: TopicCategory): boolean {
    return HERO_ELIGIBLE_CATEGORIES.has(category);
  }
}
