import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { Article } from '../../articles/entities/article.entity';

/**
 * Three-stage deduplication per SYSTEM_DESIGN.md §2.3:
 *  1. URL canonicalization (strip tracking params, normalize)
 *  2. SimHash on article body with Hamming distance ≤ 3
 *  3. Exact headline match within 24-hour window
 */
@Injectable()
export class DeduplicationService {
  private readonly logger = new Logger(DeduplicationService.name);

  constructor(
    @InjectRepository(Article)
    private readonly articleRepo: Repository<Article>,
  ) {}

  /**
   * Returns `true` if the article is a duplicate and should be skipped.
   */
  async isDuplicate(
    url: string,
    title: string,
    content?: string,
  ): Promise<boolean> {
    // ── Stage 1: URL canonicalization ───────────────────
    const canonicalUrl = this.canonicalizeUrl(url);
    const urlExists = await this.articleRepo.findOne({
      where: { url: canonicalUrl },
      select: ['id'],
    });
    if (urlExists) {
      this.logger.debug(`Duplicate (URL): ${canonicalUrl}`);
      return true;
    }

    // ── Stage 3: Exact headline match within 24h ────────
    // (done before SimHash because it's cheaper)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const headlineMatch = await this.articleRepo.findOne({
      where: {
        title,
        ingestedAt: MoreThan(twentyFourHoursAgo),
      },
      select: ['id'],
    });
    if (headlineMatch) {
      this.logger.debug(`Duplicate (headline): "${title}"`);
      return true;
    }

    // ── Stage 2: SimHash with Hamming distance ≤ 3 ──────
    if (content && content.length > 100) {
      const hash = this.computeSimHash(content);
      const recentWithHashes = await this.articleRepo
        .createQueryBuilder('a')
        .select(['a.id', 'a.simhash'])
        .where('a.simhash IS NOT NULL')
        .andWhere('a.ingestedAt > :since', { since: twentyFourHoursAgo })
        .getMany();

      for (const existing of recentWithHashes) {
        if (
          existing.simhash &&
          this.hammingDistance(hash, BigInt(existing.simhash)) <= 3
        ) {
          this.logger.debug(
            `Duplicate (SimHash): hamming ≤ 3 against ${existing.id}`,
          );
          return true;
        }
      }
    }

    return false;
  }

  // ── URL Canonicalization ────────────────────────────────

  canonicalizeUrl(rawUrl: string): string {
    try {
      const url = new URL(rawUrl);

      // Strip common tracking params
      const stripParams = [
        'utm_source',
        'utm_medium',
        'utm_campaign',
        'utm_term',
        'utm_content',
        'fbclid',
        'gclid',
        'ref',
        'source',
        'ncid',
      ];
      for (const param of stripParams) {
        url.searchParams.delete(param);
      }

      // Normalize: lowercase host, remove trailing slash, remove www
      url.hostname = url.hostname.replace(/^www\./, '');
      let canonical = url.toString();
      if (canonical.endsWith('/')) {
        canonical = canonical.slice(0, -1);
      }

      return canonical;
    } catch {
      return rawUrl;
    }
  }

  // ── SimHash (64-bit) ───────────────────────────────────

  computeSimHash(text: string): bigint {
    const tokens = this.tokenize(text);
    const bits = 64;
    const v = new Array<number>(bits).fill(0);

    for (const token of tokens) {
      const hash = this.fnv1a64(token);
      for (let i = 0; i < bits; i++) {
        if ((hash >> BigInt(i)) & 1n) {
          v[i]++;
        } else {
          v[i]--;
        }
      }
    }

    let fingerprint = 0n;
    for (let i = 0; i < bits; i++) {
      if (v[i] > 0) {
        fingerprint |= 1n << BigInt(i);
      }
    }
    // Convert unsigned 64-bit → signed 64-bit for PostgreSQL bigint column
    return this.toSignedBigint(fingerprint);
  }

  /**
   * Convert unsigned 64-bit bigint to signed 64-bit bigint.
   * PostgreSQL `bigint` is signed (-2^63 to 2^63-1).
   * Hamming distance (XOR + popcount) is unaffected by sign.
   */
  private toSignedBigint(unsigned: bigint): bigint {
    const MAX_SIGNED = 0x7fffffffffffffffn; // 2^63 - 1
    if (unsigned > MAX_SIGNED) {
      return unsigned - 0x10000000000000000n; // unsigned - 2^64
    }
    return unsigned;
  }

  hammingDistance(a: bigint, b: bigint): number {
    let xor = a ^ b;
    let count = 0;
    while (xor > 0n) {
      count += Number(xor & 1n);
      xor >>= 1n;
    }
    return count;
  }

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter((t) => t.length > 2);
  }

  private fnv1a64(str: string): bigint {
    let hash = 14695981039346656037n; // FNV offset basis
    const prime = 1099511628211n;
    for (let i = 0; i < str.length; i++) {
      hash ^= BigInt(str.charCodeAt(i));
      hash = (hash * prime) & 0xffffffffffffffffn; // keep 64-bit
    }
    return hash;
  }
}
