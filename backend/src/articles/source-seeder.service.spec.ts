import { SourceTier } from '../common/enums';
import { DEFAULT_SOURCES, PHASE_4_SOURCE_SLUGS } from './source-seeder.service';

describe('DEFAULT_SOURCES', () => {
  it('uses unique source slugs and names', () => {
    const slugs = DEFAULT_SOURCES.map((source) => source.slug);
    const names = DEFAULT_SOURCES.map((source) => source.name);

    expect(new Set(slugs).size).toBe(slugs.length);
    expect(new Set(names).size).toBe(names.length);
  });

  it('keeps feed URLs and outlet URLs parseable', () => {
    for (const source of DEFAULT_SOURCES) {
      expect(() => new URL(source.url)).not.toThrow();
      expect(() => new URL(source.rssFeedUrl)).not.toThrow();
      expect(source.rssFeedUrl).toMatch(/^https?:\/\//);
    }
  });

  it('keeps source priors inside scoring bounds', () => {
    for (const source of DEFAULT_SOURCES) {
      expect(source.politicalLeanPrior).toBeGreaterThanOrEqual(-1);
      expect(source.politicalLeanPrior).toBeLessThanOrEqual(1);
      expect(source.establishmentPrior).toBeGreaterThanOrEqual(-1);
      expect(source.establishmentPrior).toBeLessThanOrEqual(1);
      expect(source.reliabilityScore).toBeGreaterThanOrEqual(0);
      expect(source.reliabilityScore).toBeLessThanOrEqual(1);
    }
  });

  it('includes a broader political and regional spectrum for divergence', () => {
    const leans = DEFAULT_SOURCES.map((source) => source.politicalLeanPrior);
    const regions = new Set(DEFAULT_SOURCES.map((source) => source.region));
    const tiers = new Set(DEFAULT_SOURCES.map((source) => source.tier));

    expect(Math.min(...leans)).toBeLessThanOrEqual(-0.5);
    expect(Math.max(...leans)).toBeGreaterThanOrEqual(0.7);
    expect(regions.has('Middle East')).toBe(true);
    expect(tiers.has(SourceTier.TIER_1_STANDARD)).toBe(true);
    expect(tiers.has(SourceTier.TIER_2)).toBe(true);
  });

  it('keeps the expanded ingestion slug set seeded and RSS-backed', () => {
    const sourcesBySlug = new Map(
      DEFAULT_SOURCES.map((source) => [source.slug, source]),
    );

    for (const slug of PHASE_4_SOURCE_SLUGS) {
      const source = sourcesBySlug.get(slug);

      expect(source).toBeDefined();
      expect(source?.rssFeedUrl).toMatch(/^https?:\/\//);
    }
  });
});
