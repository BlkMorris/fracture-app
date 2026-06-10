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
const DEFAULT_SOURCES: Array<{
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
}> = [
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
        // Existing source — update feed URL and metadata if changed
        let changed = false;
        if (existing.rssFeedUrl !== def.rssFeedUrl) {
          this.logger.log(
            `  ~ Updating RSS feed for ${def.name}: ${existing.rssFeedUrl} → ${def.rssFeedUrl}`,
          );
          existing.rssFeedUrl = def.rssFeedUrl;
          changed = true;
        }
        if (existing.url !== def.url) {
          existing.url = def.url;
          changed = true;
        }
        if (existing.country !== def.country) {
          existing.country = def.country;
          changed = true;
        }
        if (existing.region !== def.region) {
          existing.region = def.region;
          changed = true;
        }
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
}
