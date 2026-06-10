/**
 * Curated lexicon of politically-loaded terms with lean assignments.
 *
 * Per SYSTEM_DESIGN §4.1:
 *   "Curated lexicon of politically-loaded terms with lean assignments.
 *    Example: 'undocumented immigrants' (lean: -0.3) vs. 'illegal aliens' (lean: +0.6).
 *    Lexicon maintained by editorial team, versioned, auditable.
 *    Weighted by TF-IDF to account for term salience in context."
 *
 * Values: negative = left-leaning phrasing, positive = right-leaning phrasing.
 * Range: [-1.0, +1.0].
 */

export interface LexiconEntry {
  lean: number;
  /** Higher weight = stronger framing signal */
  weight: number;
}

export const POLITICAL_KEYWORD_LEXICON: Record<string, LexiconEntry> = {
  // ── Immigration ─────────────────────────────────────
  'undocumented immigrants': { lean: -0.3, weight: 0.8 },
  'undocumented workers': { lean: -0.25, weight: 0.7 },
  'unauthorized immigrants': { lean: -0.15, weight: 0.6 },
  'illegal aliens': { lean: 0.6, weight: 0.9 },
  'illegal immigrants': { lean: 0.35, weight: 0.8 },
  'illegals': { lean: 0.7, weight: 0.9 },
  'open borders': { lean: 0.5, weight: 0.7 },
  'border crisis': { lean: 0.4, weight: 0.7 },
  'border security': { lean: 0.2, weight: 0.5 },
  'path to citizenship': { lean: -0.3, weight: 0.6 },
  'amnesty': { lean: 0.4, weight: 0.7 },
  'dreamers': { lean: -0.3, weight: 0.6 },
  'asylum seekers': { lean: -0.2, weight: 0.5 },
  'migrant caravan': { lean: 0.35, weight: 0.6 },

  // ── Guns ────────────────────────────────────────────
  'gun control': { lean: -0.3, weight: 0.7 },
  'gun safety': { lean: -0.35, weight: 0.7 },
  'gun violence': { lean: -0.3, weight: 0.7 },
  'second amendment rights': { lean: 0.4, weight: 0.7 },
  'gun rights': { lean: 0.35, weight: 0.7 },
  'assault weapons': { lean: -0.35, weight: 0.7 },
  'assault-style rifles': { lean: -0.3, weight: 0.6 },
  'ar-15': { lean: 0.0, weight: 0.3 },
  'gun reform': { lean: -0.25, weight: 0.6 },
  'gun grab': { lean: 0.5, weight: 0.8 },
  'law-abiding gun owners': { lean: 0.35, weight: 0.6 },

  // ── Healthcare ──────────────────────────────────────
  'universal healthcare': { lean: -0.4, weight: 0.7 },
  'medicare for all': { lean: -0.5, weight: 0.8 },
  'single-payer': { lean: -0.45, weight: 0.7 },
  'socialized medicine': { lean: 0.5, weight: 0.8 },
  'government-run healthcare': { lean: 0.4, weight: 0.7 },
  'healthcare reform': { lean: -0.2, weight: 0.5 },
  'obamacare': { lean: 0.2, weight: 0.5 },
  'affordable care act': { lean: -0.15, weight: 0.5 },
  'free market healthcare': { lean: 0.4, weight: 0.7 },

  // ── Economy / Taxes ─────────────────────────────────
  'tax relief': { lean: 0.35, weight: 0.7 },
  'tax cuts': { lean: 0.25, weight: 0.6 },
  'tax breaks for the wealthy': { lean: -0.4, weight: 0.7 },
  'trickle-down': { lean: -0.35, weight: 0.7 },
  'wealth inequality': { lean: -0.35, weight: 0.7 },
  'income inequality': { lean: -0.3, weight: 0.6 },
  'fair share': { lean: -0.3, weight: 0.6 },
  'job creators': { lean: 0.4, weight: 0.7 },
  'big government': { lean: 0.4, weight: 0.7 },
  'government overreach': { lean: 0.45, weight: 0.7 },
  'deregulation': { lean: 0.3, weight: 0.6 },
  'living wage': { lean: -0.3, weight: 0.6 },
  'welfare state': { lean: 0.35, weight: 0.7 },
  'safety net': { lean: -0.2, weight: 0.5 },
  'entitlements': { lean: 0.25, weight: 0.6 },
  'social programs': { lean: -0.15, weight: 0.5 },
  'fiscal responsibility': { lean: 0.2, weight: 0.5 },

  // ── Climate / Environment ───────────────────────────
  'climate crisis': { lean: -0.4, weight: 0.8 },
  'climate emergency': { lean: -0.45, weight: 0.8 },
  'climate change': { lean: -0.15, weight: 0.4 },
  'global warming': { lean: -0.1, weight: 0.4 },
  'green new deal': { lean: -0.5, weight: 0.8 },
  'clean energy': { lean: -0.2, weight: 0.5 },
  'climate alarmism': { lean: 0.5, weight: 0.8 },
  'energy independence': { lean: 0.25, weight: 0.5 },
  'war on energy': { lean: 0.5, weight: 0.7 },
  'job-killing regulations': { lean: 0.5, weight: 0.8 },
  'environmental regulations': { lean: -0.1, weight: 0.4 },
  'fossil fuels': { lean: 0.1, weight: 0.3 },
  'renewable energy': { lean: -0.15, weight: 0.4 },

  // ── Social Issues ───────────────────────────────────
  'pro-choice': { lean: -0.4, weight: 0.7 },
  'reproductive rights': { lean: -0.4, weight: 0.7 },
  "women's rights": { lean: -0.25, weight: 0.6 },
  'pro-life': { lean: 0.4, weight: 0.7 },
  'right to life': { lean: 0.35, weight: 0.7 },
  'unborn': { lean: 0.35, weight: 0.6 },
  'abortion on demand': { lean: 0.4, weight: 0.7 },
  'lgbtq+ rights': { lean: -0.3, weight: 0.6 },
  'religious freedom': { lean: 0.3, weight: 0.6 },
  'religious liberty': { lean: 0.35, weight: 0.6 },
  'traditional values': { lean: 0.4, weight: 0.7 },
  'family values': { lean: 0.35, weight: 0.7 },
  'woke': { lean: 0.5, weight: 0.8 },
  'cancel culture': { lean: 0.45, weight: 0.7 },
  'political correctness': { lean: 0.35, weight: 0.6 },
  'social justice': { lean: -0.3, weight: 0.6 },
  'systemic racism': { lean: -0.4, weight: 0.7 },
  'structural racism': { lean: -0.4, weight: 0.7 },
  'racial justice': { lean: -0.35, weight: 0.6 },
  'race card': { lean: 0.5, weight: 0.8 },
  'critical race theory': { lean: 0.4, weight: 0.7 },
  'dei': { lean: 0.3, weight: 0.6 },
  'diversity equity inclusion': { lean: -0.15, weight: 0.5 },
  'affirmative action': { lean: -0.2, weight: 0.5 },

  // ── Law Enforcement / Justice ───────────────────────
  'defund the police': { lean: -0.55, weight: 0.9 },
  'police reform': { lean: -0.25, weight: 0.6 },
  'police brutality': { lean: -0.35, weight: 0.7 },
  'law and order': { lean: 0.35, weight: 0.7 },
  'tough on crime': { lean: 0.3, weight: 0.6 },
  'back the blue': { lean: 0.4, weight: 0.7 },
  'criminal justice reform': { lean: -0.2, weight: 0.5 },
  'mass incarceration': { lean: -0.35, weight: 0.7 },

  // ── Media / Institutions ────────────────────────────
  'mainstream media': { lean: 0.35, weight: 0.6 },
  'fake news': { lean: 0.5, weight: 0.8 },
  'liberal media': { lean: 0.45, weight: 0.7 },
  'right-wing media': { lean: -0.3, weight: 0.6 },
  'deep state': { lean: 0.55, weight: 0.8 },
  'establishment': { lean: 0.15, weight: 0.4 },
  'elites': { lean: 0.25, weight: 0.5 },
  'coastal elites': { lean: 0.4, weight: 0.7 },
  'big tech': { lean: 0.3, weight: 0.6 },
  'censorship': { lean: 0.25, weight: 0.5 },
  'free speech': { lean: 0.2, weight: 0.5 },
  'misinformation': { lean: -0.15, weight: 0.4 },
  'disinformation': { lean: -0.15, weight: 0.4 },

  // ── Foreign Policy / National Security ──────────────
  'regime change': { lean: -0.2, weight: 0.5 },
  'nation building': { lean: -0.15, weight: 0.4 },
  'military intervention': { lean: -0.1, weight: 0.4 },
  'peace through strength': { lean: 0.35, weight: 0.6 },
  'america first': { lean: 0.5, weight: 0.8 },
  'national security': { lean: 0.15, weight: 0.4 },
  'homeland security': { lean: 0.15, weight: 0.4 },
};

/**
 * Flat array of all multi-word phrases sorted longest-first
 * so we can do greedy matching.
 */
export const LEXICON_PHRASES_SORTED = Object.keys(POLITICAL_KEYWORD_LEXICON)
  .sort((a, b) => b.length - a.length);
