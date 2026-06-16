import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Source } from './entities/source.entity';
import { SourceTier } from '../common/enums';

/**
 * Default source definitions for Fracture.
 *
 * On startup, every entry is upserted by slug:
 *  - New slugs → INSERT
 *  - Existing slugs → UPDATE rssFeedUrl, url, and other metadata
 *
 * This ensures feed-URL fixes (e.g. CNN) propagate automatically
 * without manual DB intervention.
 */
export interface DefaultSourceDefinition {
  name: string;
  slug: string;
  url: string;
  rssFeedUrl: string;
  tier: SourceTier;
  politicalLeanPrior: number;
  establishmentPrior: number;
  reliabilityScore: number;
  country: string;
  region: string;
}

export const PHASE_4_SOURCE_SLUGS = [
  'abc-news',
  'cbs-news',
  'nbc-news',
  'pbs-newshour',
  'new-york-times',
  'time',
  'propublica',
  'al-jazeera',
  'vox',
  'reason',
  'washington-times',
  'marketwatch',
] as const;

export const DEFAULT_SOURCES: DefaultSourceDefinition[] = [
  // ── Existing sources (with corrected feeds) ───────────
  {
    name: 'BBC News',
    slug: 'bbc-news',
    url: 'https://www.bbc.com/news',
    rssFeedUrl: 'https://feeds.bbci.co.uk/news/rss.xml',
    tier: SourceTier.TIER_1_STANDARD,
    politicalLeanPrior: 0.0,
    establishmentPrior: 0.6,
    reliabilityScore: 0.85,
    country: 'GB',
    region: 'Europe',
  },
  {
    name: 'CNN',
    slug: 'cnn',
    url: 'https://www.cnn.com',
    // Previous feed (http://rss.cnn.com/rss/edition.rss) was returning 2023 content.
    // cnn_latest.rss is the freshest available CNN feed.
    rssFeedUrl: 'http://rss.cnn.com/rss/cnn_latest.rss',
    tier: SourceTier.TIER_1_STANDARD,
    politicalLeanPrior: -0.3,
    establishmentPrior: 0.5,
    reliabilityScore: 0.7,
    country: 'US',
    region: 'North America',
  },
  {
    name: 'Fox News',
    slug: 'fox-news',
    url: 'https://www.foxnews.com',
    rssFeedUrl: 'https://moxie.foxnews.com/google-publisher/latest.xml',
    tier: SourceTier.TIER_1_STANDARD,
    politicalLeanPrior: 0.6,
    establishmentPrior: 0.4,
    reliabilityScore: 0.55,
    country: 'US',
    region: 'North America',
  },
  {
    name: 'NPR',
    slug: 'npr',
    url: 'https://www.npr.org',
    rssFeedUrl: 'https://feeds.npr.org/1001/rss.xml',
    tier: SourceTier.TIER_1_STANDARD,
    politicalLeanPrior: -0.1,
    establishmentPrior: 0.6,
    reliabilityScore: 0.85,
    country: 'US',
    region: 'North America',
  },

  // ── New sources (Part 2 — Expand Source Diversity) ─────
  {
    name: 'Associated Press',
    slug: 'associated-press',
    url: 'https://apnews.com',
    rssFeedUrl: 'https://feedx.net/rss/ap.xml',
    tier: SourceTier.TIER_1_STANDARD,
    politicalLeanPrior: 0.0,
    establishmentPrior: 0.7,
    reliabilityScore: 0.9,
    country: 'US',
    region: 'North America',
  },
  {
    name: 'The Guardian',
    slug: 'the-guardian',
    url: 'https://www.theguardian.com',
    rssFeedUrl: 'https://www.theguardian.com/us-news/rss',
    tier: SourceTier.TIER_1_STANDARD,
    politicalLeanPrior: -0.4,
    establishmentPrior: 0.5,
    reliabilityScore: 0.8,
    country: 'GB',
    region: 'Europe',
  },
  {
    name: 'Washington Post',
    slug: 'washington-post',
    url: 'https://www.washingtonpost.com',
    rssFeedUrl: 'https://feeds.washingtonpost.com/rss/national',
    tier: SourceTier.TIER_1_STANDARD,
    politicalLeanPrior: -0.2,
    establishmentPrior: 0.6,
    reliabilityScore: 0.8,
    country: 'US',
    region: 'North America',
  },

  // ── Part 3 — Narrative Spectrum expansion ──────────────
  {
    name: 'Reuters',
    slug: 'reuters',
    url: 'https://www.reuters.com',
    rssFeedUrl: 'https://www.reutersagency.com/feed/',
    tier: SourceTier.TIER_1_STANDARD,
    politicalLeanPrior: 0.0,
    establishmentPrior: 0.7,
    reliabilityScore: 0.92,
    country: 'GB',
    region: 'Europe',
  },
  {
    name: 'Politico',
    slug: 'politico',
    url: 'https://www.politico.com',
    rssFeedUrl: 'https://www.politico.com/rss/politics08.xml',
    tier: SourceTier.TIER_1_STANDARD,
    politicalLeanPrior: -0.2,
    establishmentPrior: 0.6,
    reliabilityScore: 0.78,
    country: 'US',
    region: 'North America',
  },
  {
    name: 'Axios',
    slug: 'axios',
    url: 'https://www.axios.com',
    rssFeedUrl: 'https://api.axios.com/feed/',
    tier: SourceTier.TIER_1_STANDARD,
    politicalLeanPrior: -0.1,
    establishmentPrior: 0.5,
    reliabilityScore: 0.8,
    country: 'US',
    region: 'North America',
  },
  {
    name: 'The Hill',
    slug: 'the-hill',
    url: 'https://thehill.com',
    rssFeedUrl: 'https://thehill.com/feed/',
    tier: SourceTier.TIER_1_STANDARD,
    politicalLeanPrior: 0.1,
    establishmentPrior: 0.5,
    reliabilityScore: 0.75,
    country: 'US',
    region: 'North America',
  },
  {
    name: 'HuffPost',
    slug: 'huffpost',
    url: 'https://www.huffpost.com',
    rssFeedUrl: 'https://www.huffpost.com/section/politics/feed',
    tier: SourceTier.TIER_1_STANDARD,
    politicalLeanPrior: -0.6,
    establishmentPrior: 0.3,
    reliabilityScore: 0.6,
    country: 'US',
    region: 'North America',
  },
  {
    name: 'National Review',
    slug: 'national-review',
    url: 'https://www.nationalreview.com',
    rssFeedUrl: 'https://www.nationalreview.com/feed/',
    tier: SourceTier.TIER_1_STANDARD,
    politicalLeanPrior: 0.7,
    establishmentPrior: 0.5,
    reliabilityScore: 0.65,
    country: 'US',
    region: 'North America',
  },
  {
    name: 'The Federalist',
    slug: 'the-federalist',
    url: 'https://thefederalist.com',
    rssFeedUrl: 'https://thefederalist.com/feed/',
    tier: SourceTier.TIER_1_STANDARD,
    politicalLeanPrior: 0.8,
    establishmentPrior: 0.3,
    reliabilityScore: 0.55,
    country: 'US',
    region: 'North America',
  },

  // ── Phase 4 — Broader live source coverage ────────────
  {
    name: 'ABC News',
    slug: 'abc-news',
    url: 'https://abcnews.com',
    rssFeedUrl: 'https://abcnews.com/abcnews/topstories',
    tier: SourceTier.TIER_1_STANDARD,
    politicalLeanPrior: -0.1,
    establishmentPrior: 0.6,
    reliabilityScore: 0.75,
    country: 'US',
    region: 'North America',
  },
  {
    name: 'CBS News',
    slug: 'cbs-news',
    url: 'https://www.cbsnews.com',
    rssFeedUrl: 'https://www.cbsnews.com/latest/rss/main',
    tier: SourceTier.TIER_1_STANDARD,
    politicalLeanPrior: -0.1,
    establishmentPrior: 0.6,
    reliabilityScore: 0.75,
    country: 'US',
    region: 'North America',
  },
  {
    name: 'NBC News',
    slug: 'nbc-news',
    url: 'https://www.nbcnews.com',
    rssFeedUrl: 'https://feeds.nbcnews.com/nbcnews/public/news',
    tier: SourceTier.TIER_1_STANDARD,
    politicalLeanPrior: -0.2,
    establishmentPrior: 0.6,
    reliabilityScore: 0.75,
    country: 'US',
    region: 'North America',
  },
  {
    name: 'PBS NewsHour',
    slug: 'pbs-newshour',
    url: 'https://www.pbs.org/newshour',
    rssFeedUrl: 'https://www.pbs.org/newshour/feeds/rss/headlines',
    tier: SourceTier.TIER_1_STANDARD,
    politicalLeanPrior: -0.1,
    establishmentPrior: 0.7,
    reliabilityScore: 0.9,
    country: 'US',
    region: 'North America',
  },
  {
    name: 'The New York Times',
    slug: 'new-york-times',
    url: 'https://www.nytimes.com',
    rssFeedUrl: 'https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml',
    tier: SourceTier.TIER_1_STANDARD,
    politicalLeanPrior: -0.35,
    establishmentPrior: 0.75,
    reliabilityScore: 0.85,
    country: 'US',
    region: 'North America',
  },
  {
    name: 'TIME',
    slug: 'time',
    url: 'https://time.com',
    rssFeedUrl: 'https://time.com/feed/',
    tier: SourceTier.TIER_1_STANDARD,
    politicalLeanPrior: -0.2,
    establishmentPrior: 0.55,
    reliabilityScore: 0.75,
    country: 'US',
    region: 'North America',
  },
  {
    name: 'ProPublica',
    slug: 'propublica',
    url: 'https://www.propublica.org',
    rssFeedUrl: 'https://www.propublica.org/feeds/propublica/main',
    tier: SourceTier.TIER_2,
    politicalLeanPrior: -0.25,
    establishmentPrior: 0.35,
    reliabilityScore: 0.88,
    country: 'US',
    region: 'North America',
  },
  {
    name: 'Al Jazeera',
    slug: 'al-jazeera',
    url: 'https://www.aljazeera.com',
    rssFeedUrl: 'https://www.aljazeera.com/xml/rss/all.xml',
    tier: SourceTier.TIER_1_STANDARD,
    politicalLeanPrior: -0.05,
    establishmentPrior: 0.2,
    reliabilityScore: 0.75,
    country: 'QA',
    region: 'Middle East',
  },
  {
    name: 'Vox',
    slug: 'vox',
    url: 'https://www.vox.com',
    rssFeedUrl: 'https://www.vox.com/rss/index.xml',
    tier: SourceTier.TIER_2,
    politicalLeanPrior: -0.5,
    establishmentPrior: 0.35,
    reliabilityScore: 0.7,
    country: 'US',
    region: 'North America',
  },
  {
    name: 'Reason',
    slug: 'reason',
    url: 'https://reason.com',
    rssFeedUrl: 'https://reason.com/feed/',
    tier: SourceTier.TIER_2,
    politicalLeanPrior: 0.45,
    establishmentPrior: -0.45,
    reliabilityScore: 0.65,
    country: 'US',
    region: 'North America',
  },
  {
    name: 'The Washington Times',
    slug: 'washington-times',
    url: 'https://www.washingtontimes.com',
    rssFeedUrl: 'https://www.washingtontimes.com/rss/headlines/news/',
    tier: SourceTier.TIER_2,
    politicalLeanPrior: 0.6,
    establishmentPrior: 0.25,
    reliabilityScore: 0.55,
    country: 'US',
    region: 'North America',
  },
  {
    name: 'MarketWatch',
    slug: 'marketwatch',
    url: 'https://www.marketwatch.com',
    rssFeedUrl: 'https://feeds.content.dowjones.io/public/rss/mw_topstories',
    tier: SourceTier.TIER_2,
    politicalLeanPrior: 0.05,
    establishmentPrior: 0.65,
    reliabilityScore: 0.75,
    country: 'US',
    region: 'North America',
  },
];

@Injectable()
export class SourceSeederService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SourceSeederService.name);

  constructor(
    @InjectRepository(Source)
    private readonly sourceRepo: Repository<Source>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    this.logger.log('Checking default source configuration…');

    let created = 0;
    let updated = 0;

    for (const def of DEFAULT_SOURCES) {
      const existing = await this.sourceRepo.findOne({
        where: { slug: def.slug },
      });

      if (!existing) {
        // New source — insert
        const source = this.sourceRepo.create({
          ...def,
          isActive: true,
          fetchIntervalSeconds: 300,
        });
        await this.sourceRepo.save(source);
        this.logger.log(`  + Created source: ${def.name} (${def.slug})`);
        created++;
      } else {
        const changed = this.applySourceDefinition(existing, def);
        if (changed) {
          await this.sourceRepo.save(existing);
          updated++;
        }
      }
    }

    const total = await this.sourceRepo.count({ where: { isActive: true } });
    this.logger.log(
      `Source seeding complete: ${created} created, ${updated} updated, ${total} active total`,
    );
  }

  private applySourceDefinition(
    source: Source,
    definition: DefaultSourceDefinition,
  ) {
    let changed = false;
    const updates: Partial<DefaultSourceDefinition> = {};

    for (const key of Object.keys(definition) as Array<
      keyof DefaultSourceDefinition
    >) {
      if (source[key] !== definition[key]) {
        updates[key] = definition[key] as never;
        changed = true;
      }
    }

    if (!source.isActive) {
      source.isActive = true;
      changed = true;
    }

    if (changed) {
      Object.assign(source, updates);
      this.logger.log(`  ~ Updated source metadata: ${definition.name}`);
    }

    return changed;
  }
}
