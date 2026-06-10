import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { type AxiosResponse } from 'axios';

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────

export interface ImageMetadata {
  width: number;
  height: number;
  fileSize: number;
}

export interface ImageValidationResult {
  /** Final image URL to store (may be original, upgraded, og:image, or fallback) */
  imageUrl: string | null;
  /** What action was taken */
  action:
    | 'accepted'
    | 'upgraded-url'
    | 'extracted-og-image'
    | 'extracted-twitter-image'
    | 'fallback'
    | 'no-image';
  /** Original RSS image URL (if any) */
  originalUrl?: string;
}

// ─────────────────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────────────────

/**
 * Validates image quality during article ingestion and attempts to find
 * higher-resolution alternatives when the RSS-provided image fails
 * minimum quality thresholds.
 *
 * Quality checks:
 *  1. Resolution — reject width < 600 or height < 400
 *  2. File size  — reject images smaller than 30 KB
 *  3. Thumbnail URL pattern detection & URL upgrade
 *
 * Upgrade strategy:
 *  1. Strip thumbnail suffixes / path segments and test the resulting URL
 *  2. Fetch article page and extract og:image / twitter:image meta tags
 *  3. Fall back to a configurable default image
 */
@Injectable()
export class ImageValidationService {
  private readonly logger = new Logger(ImageValidationService.name);

  // ── In-memory cache (prevents re-probing the same URL) ─
  private readonly cache = new Map<string, ImageValidationResult>();
  private static readonly MAX_CACHE_SIZE = 2_000;

  // ── Quality thresholds ─────────────────────────────────
  readonly minWidth: number;
  readonly minHeight: number;
  readonly minFileSize: number;

  /** URL returned when no valid image can be found */
  readonly fallbackImageUrl: string | null;

  /** Max bytes to download when probing image dimensions */
  private static readonly PROBE_MAX_BYTES = 65_536; // 64 KB

  /** HTTP timeout for probe / page-fetch requests */
  private static readonly REQUEST_TIMEOUT_MS = 8_000;

  // ── Thumbnail patterns ─────────────────────────────────

  /** Path-segment patterns that indicate the URL serves a thumbnail */
  private static readonly THUMBNAIL_PATH_PATTERNS: RegExp[] = [
    /\/thumb\//i,
    /\/small\//i,
    /\/150x150\//i,
    /\/120x120\//i,
    /\/300x300\//i,
    /\/thumbnails?\//i,
  ];

  /** Filename suffix patterns to strip when building an upgraded URL */
  private static readonly THUMBNAIL_SUFFIX_PATTERNS: {
    regex: RegExp;
    replacement: string;
  }[] = [
    { regex: /[_-]150x150/g, replacement: '' },
    { regex: /[_-]120x120/g, replacement: '' },
    { regex: /[_-]300x300/g, replacement: '' },
    { regex: /[_-]small/gi, replacement: '' },
    { regex: /[_-]thumb(?:nail)?/gi, replacement: '' },
    // Generic WxH suffix where both dims ≤ 600 (e.g. _480x320)
    { regex: /[_-]\d{2,3}x\d{2,3}(?=\.\w+$)/g, replacement: '' },
  ];

  // ─────────────────────────────────────────────────────
  constructor(private readonly config: ConfigService) {
    this.minWidth = this.config.get<number>(
      'ingestion.imageMinWidth',
      600,
    );
    this.minHeight = this.config.get<number>(
      'ingestion.imageMinHeight',
      400,
    );
    this.minFileSize = this.config.get<number>(
      'ingestion.imageMinFileSize',
      30 * 1024,
    );
    this.fallbackImageUrl =
      this.config.get<string>('ingestion.imageFallbackUrl') ?? null;
  }

  // ═══════════════════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════════════════

  /**
   * Validate an image URL and, if it fails quality checks, attempt to
   * find a higher-resolution alternative.
   *
   * Call **before** persisting the article to the database.
   *
   * @param imageUrl   The RSS-provided image URL (may be undefined)
   * @param articleUrl The original article link (used for og:image fallback)
   * @returns          Validation result with the final image URL to store
   */
  async validateAndUpgradeImage(
    imageUrl: string | undefined,
    articleUrl: string,
  ): Promise<ImageValidationResult> {
    // ── No image provided at all ────────────────────────
    if (!imageUrl) {
      this.logger.debug(
        `No RSS image for article ${articleUrl} — trying og:image`,
      );
      return this.fallbackToPageMeta(articleUrl);
    }

    // ── Cache hit ───────────────────────────────────────
    const cached = this.cache.get(imageUrl);
    if (cached) {
      this.logger.debug(`Image validation cache hit: ${imageUrl}`);
      return cached;
    }

    // ── Step 0: Quick thumbnail-URL heuristic ───────────
    const isThumbnail = this.isThumbnailUrl(imageUrl);

    // ── Step 1: Validate the original RSS image ─────────
    if (!isThumbnail) {
      const meta = await this.probeImage(imageUrl);
      if (meta && this.meetsQuality(meta)) {
        const result: ImageValidationResult = {
          imageUrl,
          action: 'accepted',
          originalUrl: imageUrl,
        };
        this.logger.log(`✓ Accepted RSS image: ${imageUrl}`);
        this.cacheSet(imageUrl, result);
        return result;
      }
    } else {
      this.logger.debug(`Thumbnail URL detected: ${imageUrl}`);
    }

    // ── Step 2: Try URL upgrade ─────────────────────────
    const upgradedUrl = this.buildUpgradedUrl(imageUrl);
    if (upgradedUrl) {
      const upgradedMeta = await this.probeImage(upgradedUrl);
      if (upgradedMeta && this.meetsQuality(upgradedMeta)) {
        const result: ImageValidationResult = {
          imageUrl: upgradedUrl,
          action: 'upgraded-url',
          originalUrl: imageUrl,
        };
        this.logger.log(
          `↑ Upgraded image URL: ${imageUrl} → ${upgradedUrl}`,
        );
        this.cacheSet(imageUrl, result);
        return result;
      }
    }

    // ── Step 3: Extract og:image / twitter:image ────────
    const pageResult = await this.fallbackToPageMeta(articleUrl, imageUrl);
    this.cacheSet(imageUrl, pageResult);
    return pageResult;
  }

  // ═══════════════════════════════════════════════════════
  // IMAGE PROBING
  // ═══════════════════════════════════════════════════════

  /**
   * Probe an image URL to determine its dimensions and file size.
   * Performs a HEAD request first, then a partial GET (Range header)
   * to read only enough bytes for dimension parsing.
   */
  private async probeImage(url: string): Promise<ImageMetadata | null> {
    try {
      let fileSize = 0;

      // ── HEAD request for Content-Length ──────────────
      try {
        const head = await axios.head(url, {
          timeout: ImageValidationService.REQUEST_TIMEOUT_MS,
          headers: { 'User-Agent': 'Fracture/1.0 (image-validator)' },
          maxRedirects: 5,
        });
        fileSize = parseInt(head.headers['content-length'] || '0', 10);

        // Early exit: file too small
        if (fileSize > 0 && fileSize < this.minFileSize) {
          this.logger.debug(
            `Image too small (${fileSize} bytes < ${this.minFileSize}): ${url}`,
          );
          return { width: 0, height: 0, fileSize };
        }
      } catch {
        // HEAD may not be supported — continue with GET
      }

      // ── Partial GET for dimension parsing ───────────
      const response: AxiosResponse<ArrayBuffer> = await axios.get(url, {
        timeout: ImageValidationService.REQUEST_TIMEOUT_MS,
        responseType: 'arraybuffer',
        headers: {
          'User-Agent': 'Fracture/1.0 (image-validator)',
          Range: `bytes=0-${ImageValidationService.PROBE_MAX_BYTES - 1}`,
        },
        maxRedirects: 5,
        maxContentLength: ImageValidationService.PROBE_MAX_BYTES * 4,
      });

      const buf = Buffer.from(response.data);

      // Resolve file size from response if we didn't get it from HEAD
      if (fileSize === 0) {
        const contentRange = response.headers['content-range'] as
          | string
          | undefined;
        if (contentRange) {
          const match = contentRange.match(/\/(\d+)/);
          if (match) fileSize = parseInt(match[1], 10);
        }
        if (fileSize === 0) {
          fileSize =
            parseInt(response.headers['content-length'] || '0', 10) ||
            buf.length;
        }
      }

      const dimensions = this.parseDimensions(buf);
      if (!dimensions) {
        this.logger.debug(`Could not parse dimensions: ${url}`);
        return null;
      }

      return { ...dimensions, fileSize };
    } catch (error: any) {
      this.logger.debug(
        `Image probe failed for ${url}: ${error.message ?? error}`,
      );
      return null;
    }
  }

  // ═══════════════════════════════════════════════════════
  // DIMENSION PARSING  (PNG · JPEG · GIF · WebP)
  // ═══════════════════════════════════════════════════════

  private parseDimensions(
    buf: Buffer,
  ): { width: number; height: number } | null {
    if (buf.length < 10) return null;

    // PNG: 89 50 4E 47
    if (
      buf[0] === 0x89 &&
      buf[1] === 0x50 &&
      buf[2] === 0x4e &&
      buf[3] === 0x47
    ) {
      return this.parsePng(buf);
    }

    // JPEG: FF D8
    if (buf[0] === 0xff && buf[1] === 0xd8) {
      return this.parseJpeg(buf);
    }

    // GIF: "GIF8"
    if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) {
      return this.parseGif(buf);
    }

    // WebP: "RIFF" ... "WEBP"
    if (
      buf.length >= 12 &&
      buf.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buf.subarray(8, 12).toString('ascii') === 'WEBP'
    ) {
      return this.parseWebp(buf);
    }

    return null;
  }

  /** PNG: IHDR width @ offset 16, height @ offset 20 (big-endian u32) */
  private parsePng(buf: Buffer): { width: number; height: number } | null {
    if (buf.length < 24) return null;
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }

  /** GIF: width @ offset 6, height @ offset 8 (little-endian u16) */
  private parseGif(buf: Buffer): { width: number; height: number } | null {
    if (buf.length < 10) return null;
    return { width: buf.readUInt16LE(6), height: buf.readUInt16LE(8) };
  }

  /** JPEG: scan for SOF0–SOF15 marker (excluding DHT 0xC4, 0xC8, 0xCC) */
  private parseJpeg(buf: Buffer): { width: number; height: number } | null {
    let offset = 2; // skip SOI (FF D8)

    while (offset < buf.length - 1) {
      if (buf[offset] !== 0xff) {
        offset++;
        continue;
      }

      const marker = buf[offset + 1];

      // SOF markers: C0-CF minus C4 (DHT), C8 (reserved), CC (DAC)
      if (
        marker >= 0xc0 &&
        marker <= 0xcf &&
        marker !== 0xc4 &&
        marker !== 0xc8 &&
        marker !== 0xcc
      ) {
        if (offset + 9 <= buf.length) {
          const height = buf.readUInt16BE(offset + 5);
          const width = buf.readUInt16BE(offset + 7);
          if (width > 0 && height > 0) return { width, height };
        }
        return null;
      }

      // Advance past marker segment
      if (marker === 0xd8 || marker === 0xd9) {
        offset += 2; // SOI / EOI — no payload
      } else if (offset + 3 < buf.length) {
        offset += 2 + buf.readUInt16BE(offset + 2);
      } else {
        break;
      }
    }

    return null;
  }

  /** WebP: supports VP8, VP8L, and VP8X sub-formats */
  private parseWebp(buf: Buffer): { width: number; height: number } | null {
    if (buf.length < 30) return null;
    const chunk = buf.subarray(12, 16).toString('ascii');

    if (chunk === 'VP8 ' && buf.length >= 30) {
      return {
        width: buf.readUInt16LE(26) & 0x3fff,
        height: buf.readUInt16LE(28) & 0x3fff,
      };
    }
    if (chunk === 'VP8L' && buf.length >= 25) {
      const bits = buf.readUInt32LE(21);
      return {
        width: (bits & 0x3fff) + 1,
        height: ((bits >> 14) & 0x3fff) + 1,
      };
    }
    if (chunk === 'VP8X' && buf.length >= 30) {
      return {
        width: 1 + (buf[24] | (buf[25] << 8) | (buf[26] << 16)),
        height: 1 + (buf[27] | (buf[28] << 8) | (buf[29] << 16)),
      };
    }

    return null;
  }

  // ═══════════════════════════════════════════════════════
  // QUALITY CHECK
  // ═══════════════════════════════════════════════════════

  private meetsQuality(meta: ImageMetadata): boolean {
    if (meta.width < this.minWidth || meta.height < this.minHeight) {
      return false;
    }
    if (meta.fileSize > 0 && meta.fileSize < this.minFileSize) {
      return false;
    }
    return true;
  }

  // ═══════════════════════════════════════════════════════
  // THUMBNAIL DETECTION & URL UPGRADE
  // ═══════════════════════════════════════════════════════

  /** Returns true if the URL contains a common thumbnail path segment */
  private isThumbnailUrl(url: string): boolean {
    return ImageValidationService.THUMBNAIL_PATH_PATTERNS.some((p) =>
      p.test(url),
    );
  }

  /**
   * Build a potential higher-resolution URL by stripping thumbnail
   * indicators from the path and filename.
   *
   * @returns The upgraded URL, or `null` if nothing changed.
   */
  private buildUpgradedUrl(originalUrl: string): string | null {
    let upgraded = originalUrl;

    // Strip path-level thumbnail segments (/thumb/, /small/, etc.)
    for (const pattern of ImageValidationService.THUMBNAIL_PATH_PATTERNS) {
      upgraded = upgraded.replace(pattern, '/');
    }

    // Strip filename-level suffixes (_150x150, -thumb, etc.)
    for (const {
      regex,
      replacement,
    } of ImageValidationService.THUMBNAIL_SUFFIX_PATTERNS) {
      upgraded = upgraded.replace(regex, replacement);
    }

    // Clean up double slashes (preserve protocol://)
    upgraded = upgraded.replace(/([^:])\/\/+/g, '$1/');

    return upgraded !== originalUrl ? upgraded : null;
  }

  // ═══════════════════════════════════════════════════════
  // OG:IMAGE / TWITTER:IMAGE EXTRACTION
  // ═══════════════════════════════════════════════════════

  /**
   * Fetch the article HTML and attempt to extract a high-quality image
   * from `og:image` or `twitter:image` meta tags.
   *
   * Only called when the RSS image fails validation.
   */
  private async fallbackToPageMeta(
    articleUrl: string,
    originalImageUrl?: string,
  ): Promise<ImageValidationResult> {
    try {
      const response = await axios.get<string>(articleUrl, {
        timeout: ImageValidationService.REQUEST_TIMEOUT_MS,
        responseType: 'text',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (compatible; Fracture/1.0; +https://fracture.news)',
          Accept: 'text/html',
        },
        maxRedirects: 5,
        maxContentLength: 200_000, // meta tags live in <head>
      });

      const html =
        typeof response.data === 'string' ? response.data : '';

      // ── og:image ────────────────────────────────────
      const ogUrl = this.extractMetaContent(html, 'og:image', articleUrl);
      if (ogUrl) {
        const meta = await this.probeImage(ogUrl);
        if (meta && this.meetsQuality(meta)) {
          this.logger.log(
            `⤓ Extracted og:image for ${articleUrl}: ${ogUrl}`,
          );
          return {
            imageUrl: ogUrl,
            action: 'extracted-og-image',
            originalUrl: originalImageUrl,
          };
        }
      }

      // ── twitter:image ───────────────────────────────
      const twUrl = this.extractMetaContent(
        html,
        'twitter:image',
        articleUrl,
      );
      if (twUrl) {
        const meta = await this.probeImage(twUrl);
        if (meta && this.meetsQuality(meta)) {
          this.logger.log(
            `⤓ Extracted twitter:image for ${articleUrl}: ${twUrl}`,
          );
          return {
            imageUrl: twUrl,
            action: 'extracted-twitter-image',
            originalUrl: originalImageUrl,
          };
        }
      }
    } catch (error: any) {
      this.logger.debug(
        `Page meta extraction failed for ${articleUrl}: ${error.message ?? error}`,
      );
    }

    // ── Fallback ──────────────────────────────────────
    this.logger.debug(
      `⚠ No valid image found — using fallback for ${articleUrl}`,
    );
    return {
      imageUrl: this.fallbackImageUrl,
      action: 'fallback',
      originalUrl: originalImageUrl,
    };
  }

  // ═══════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════

  /**
   * Extract the `content` attribute from a `<meta>` tag matching the
   * given property/name. Handles both `property="..."` and `name="..."`.
   */
  private extractMetaContent(
    html: string,
    metaName: string,
    baseUrl: string,
  ): string | null {
    // Pattern 1: property/name first, content second
    const p1 = new RegExp(
      `<meta[^>]+(?:property|name)=["']${metaName}["'][^>]+content=["']([^"']+)["']`,
      'i',
    );
    // Pattern 2: content first, property/name second
    const p2 = new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${metaName}["']`,
      'i',
    );

    const match = p1.exec(html) ?? p2.exec(html);
    if (!match?.[1]) return null;

    return this.resolveUrl(match[1], baseUrl);
  }

  /** Resolve a possibly-relative URL against a base URL. */
  private resolveUrl(href: string, base: string): string {
    try {
      return new URL(href, base).toString();
    } catch {
      return href;
    }
  }

  /** Store a result in the bounded cache. */
  private cacheSet(key: string, value: ImageValidationResult): void {
    if (this.cache.size >= ImageValidationService.MAX_CACHE_SIZE) {
      const oldest = this.cache.keys().next().value;
      if (oldest) this.cache.delete(oldest);
    }
    this.cache.set(key, value);
  }
}
