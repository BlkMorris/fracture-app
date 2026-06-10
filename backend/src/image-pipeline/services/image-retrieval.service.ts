import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import type { ImageContext, ImageCandidate } from '../interfaces';

/**
 * Retrieves real editorial images from royalty-free APIs.
 *
 * Provider priority:
 *   1. Unsplash  — high-quality editorial, requires API key
 *   2. Openverse — open-source, no API key required
 *   3. Wikimedia — Creative Commons fallback
 *
 * Query strategy (location-first):
 *   1. location + topic
 *   2. entity + topic
 *   3. topic only
 *   4. category + topic
 *
 * All results are filtered to reject non-photographic content
 * (diagrams, maps, illustrations, charts, logos, icons).
 */
@Injectable()
export class ImageRetrievalService {
  private readonly logger = new Logger(ImageRetrievalService.name);
  private readonly unsplashKey: string;
  private readonly openverseEnabled: boolean;
  private readonly maxCandidates: number;

  constructor(private readonly config: ConfigService) {
    this.unsplashKey = this.config.get<string>(
      'imagePipeline.unsplashAccessKey',
      '',
    );
    this.openverseEnabled = this.config.get<boolean>(
      'imagePipeline.openverseEnabled',
      true,
    );
    this.maxCandidates = this.config.get<number>(
      'imagePipeline.searchCandidates',
      5,
    );
  }

  // ── Main search entry point ───────────────────────────

  /**
   * Search for images across all configured providers.
   * Returns de-duplicated, filtered candidates sorted by likely relevance.
   */
  async searchImages(context: ImageContext): Promise<ImageCandidate[]> {
    const queries = this.buildSearchQueries(context);
    const candidates: ImageCandidate[] = [];
    const seenUrls = new Set<string>();

    this.logger.debug(
      `[IMG-SEARCH] Searching for "${context.topic}" with ${queries.length} queries: ` +
        `[${queries.join(' | ')}]`,
    );

    for (const query of queries) {
      if (candidates.length >= this.maxCandidates) break;

      try {
        // Unsplash (best quality for editorial content)
        if (this.unsplashKey) {
          const unsplash = await this.searchUnsplash(query);
          for (const img of unsplash) {
            if (!seenUrls.has(img.url) && !this.isNonPhotographic(img)) {
              seenUrls.add(img.url);
              candidates.push(img);
            }
          }
        }

        // Openverse
        if (this.openverseEnabled && candidates.length < this.maxCandidates) {
          const openverse = await this.searchOpenverse(query);
          for (const img of openverse) {
            if (!seenUrls.has(img.url) && !this.isNonPhotographic(img)) {
              seenUrls.add(img.url);
              candidates.push(img);
            }
          }
        }

        // Wikimedia Commons
        if (candidates.length < this.maxCandidates) {
          const wikimedia = await this.searchWikimedia(query);
          for (const img of wikimedia) {
            if (!seenUrls.has(img.url) && !this.isNonPhotographic(img)) {
              seenUrls.add(img.url);
              candidates.push(img);
            }
          }
        }
      } catch (error) {
        this.logger.warn(
          `[IMG-SEARCH] Query "${query}" failed: ${error.message}`,
        );
      }
    }

    this.logger.debug(
      `[IMG-SEARCH] Found ${candidates.length} candidates for "${context.topic}" ` +
        `(after non-photo filtering)`,
    );
    return candidates.slice(0, this.maxCandidates);
  }

  // ── Location-aware query construction ─────────────────

  /**
   * Build search queries ordered by specificity.
   *
   * Priority order:
   *   1. location + topic  — "Iran protest street"
   *   2. entity + topic    — "Zelensky missile strike"
   *   3. topic only        — "congressional hearing"
   *   4. category + topic  — "politics US election"
   */
  buildSearchQueries(context: ImageContext): string[] {
    const queries: string[] = [];
    const topicWords = this.extractTopicCore(context.topic);

    // Separate locations from other entities
    const location = this.findLocation(context.entities);
    const nonLocationEntities = context.entities.filter(
      (e) => !KNOWN_LOCATIONS_SET.has(e),
    );
    const topEntity = nonLocationEntities[0] || '';

    // 1. Location + topic  (highest priority — most specific for news imagery)
    if (location) {
      queries.push(`${location} ${topicWords}`);
    }

    // 2. Entity + topic
    if (topEntity) {
      queries.push(`${topEntity} ${topicWords}`);
    }

    // 3. Topic only (core subject)
    if (topicWords.length > 0) {
      queries.push(topicWords);
    }

    // 4. Category + topic (broadest fallback, still contextual)
    if (context.category !== 'general') {
      const catQuery = location
        ? `${context.category} ${location}`
        : `${context.category} ${topicWords}`;
      queries.push(catQuery);
    }

    // Deduplicate and cap
    return [...new Set(queries.map((q) => q.trim()))]
      .filter((q) => q.length > 0)
      .slice(0, 4);
  }

  /**
   * Extract the core 3–4 word topic phrase from the full topic string.
   * Avoids sending the entire headline as a search query.
   */
  private extractTopicCore(topic: string): string {
    const words = topic
      .replace(/[^a-zA-Z0-9\s'-]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !QUERY_STOP_WORDS.has(w.toLowerCase()));
    return words.slice(0, 4).join(' ');
  }

  /**
   * Find the first known location in the entities list.
   */
  private findLocation(entities: string[]): string | null {
    for (const entity of entities) {
      if (KNOWN_LOCATIONS_SET.has(entity)) return entity;
    }
    return null;
  }

  // ── Non-photographic content filter ───────────────────

  /**
   * Returns true if the image is likely non-photographic content
   * (diagram, map, illustration, chart, logo, icon).
   */
  private isNonPhotographic(candidate: ImageCandidate): boolean {
    const allText = [
      candidate.description,
      ...candidate.tags,
    ]
      .join(' ')
      .toLowerCase();

    // Reject if ANY reject tag is present
    for (const tag of REJECTED_TAGS) {
      if (allText.includes(tag)) {
        this.logger.debug(
          `[IMG-FILTER] Rejected non-photo: "${candidate.description?.slice(0, 40)}" ` +
            `(matched: "${tag}") provider=${candidate.provider}`,
        );
        return true;
      }
    }

    return false;
  }

  // ── Unsplash ──────────────────────────────────────────

  private async searchUnsplash(query: string): Promise<ImageCandidate[]> {
    try {
      const res = await axios.get('https://api.unsplash.com/search/photos', {
        params: {
          query,
          per_page: 3,
          orientation: 'landscape',
          content_filter: 'high',
        },
        headers: {
          Authorization: `Client-ID ${this.unsplashKey}`,
        },
        timeout: 5000,
      });

      return (res.data?.results ?? []).map((photo: any) => ({
        url: photo.urls?.regular || photo.urls?.small,
        description:
          photo.description || photo.alt_description || '',
        tags: (photo.tags ?? [])
          .map((t: any) => t.title || t.source?.title || '')
          .filter(Boolean),
        provider: 'unsplash' as const,
        attribution: `Photo by ${photo.user?.name ?? 'Unknown'} on Unsplash`,
        width: photo.width,
        height: photo.height,
      }));
    } catch (error) {
      this.logger.debug(`Unsplash search failed: ${error.message}`);
      return [];
    }
  }

  // ── Openverse ─────────────────────────────────────────

  private async searchOpenverse(query: string): Promise<ImageCandidate[]> {
    try {
      const res = await axios.get('https://api.openverse.org/v1/images/', {
        params: {
          q: query,
          page_size: 5, // Request more since we'll filter
          license_type: 'commercial',
          aspect_ratio: 'wide',
          mature: false,
          // Prefer photographs by requesting category filter
          category: 'photograph',
        },
        timeout: 5000,
      });

      return (res.data?.results ?? []).map((img: any) => ({
        url: img.url || img.thumbnail,
        description: img.title || '',
        tags: (img.tags ?? []).map((t: any) => t.name || '').filter(Boolean),
        provider: 'openverse' as const,
        attribution: img.attribution || `${img.creator ?? 'Unknown'} via Openverse`,
        width: img.width,
        height: img.height,
      }));
    } catch (error) {
      this.logger.debug(`Openverse search failed: ${error.message}`);
      return [];
    }
  }

  // ── Wikimedia Commons ─────────────────────────────────

  private async searchWikimedia(query: string): Promise<ImageCandidate[]> {
    try {
      const res = await axios.get(
        'https://commons.wikimedia.org/w/api.php',
        {
          params: {
            action: 'query',
            generator: 'search',
            gsrsearch: `${query} filetype:bitmap`,
            gsrlimit: 5, // Request more since we'll filter
            gsrnamespace: 6,
            prop: 'imageinfo',
            iiprop: 'url|size|extmetadata',
            iiurlwidth: 1200,
            format: 'json',
            origin: '*',
          },
          timeout: 5000,
        },
      );

      const pages = res.data?.query?.pages;
      if (!pages) return [];

      return Object.values(pages)
        .filter((page: any) => page.imageinfo?.[0]?.thumburl)
        .map((page: any) => {
          const info = page.imageinfo[0];
          const meta = info.extmetadata ?? {};
          return {
            url: info.thumburl || info.url,
            description:
              meta.ImageDescription?.value?.replace(/<[^>]*>/g, '') || '',
            tags: (meta.Categories?.value ?? '')
              .split('|')
              .filter(Boolean),
            provider: 'wikimedia' as const,
            attribution:
              meta.Artist?.value?.replace(/<[^>]*>/g, '') ||
              'Wikimedia Commons',
            width: info.thumbwidth || info.width,
            height: info.thumbheight || info.height,
          };
        })
        .slice(0, 5);
    } catch (error) {
      this.logger.debug(`Wikimedia search failed: ${error.message}`);
      return [];
    }
  }
}

// ── Constants ───────────────────────────────────────────

/** Tags that indicate non-photographic content — reject these */
const REJECTED_TAGS = [
  'diagram',
  'map',
  'illustration',
  'chart',
  'logo',
  'icon',
  'infographic',
  'graph',
  'schematic',
  'blueprint',
  'flag',
  'coat of arms',
  'heraldry',
  'svg',
  'vector',
  'clipart',
  'drawing',
];

/** Words to strip when building concise search queries */
const QUERY_STOP_WORDS = new Set([
  'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'it',
  'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at', 'this',
  'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she',
  'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their',
  'what', 'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which',
  'go', 'me', 'when', 'make', 'can', 'like', 'time', 'no', 'just',
  'says', 'said', 'report', 'news', 'update', 'breaking', 'video',
  'shows', 'moment', 'how', 'why', 'new', 'first', 'after', 'over',
  'was', 'has', 'had', 'are', 'been', 'did', 'were', 'more', 'could',
]);

const KNOWN_LOCATIONS_SET = new Set([
  'United States', 'China', 'Russia', 'Ukraine', 'Israel', 'Gaza',
  'Iran', 'Iraq', 'Syria', 'Afghanistan', 'North Korea', 'Taiwan',
  'Europe', 'Middle East', 'Washington', 'Moscow', 'Beijing',
  'London', 'Paris', 'Berlin', 'Tokyo', 'Jerusalem', 'Kyiv',
  'New York', 'Los Angeles', 'Mexico', 'Brazil', 'India',
  'Pakistan', 'Turkey', 'Saudi Arabia', 'Egypt', 'South Africa',
  'Nigeria', 'Venezuela', 'Cuba', 'Kabul', 'Tehran', 'Baghdad',
  'Delhi', 'Mumbai', 'Seoul', 'Brussels', 'Geneva', 'Chicago',
  'Canada', 'Australia', 'Japan', 'Germany', 'France', 'Italy',
  'Spain', 'Poland', 'Philippines', 'Indonesia', 'Thailand',
  'Myanmar', 'Lebanon', 'Libya', 'Sudan', 'Yemen', 'Somalia',
  'Ethiopia', 'Kenya', 'Colombia', 'Argentina', 'Chile', 'Peru',
]);
