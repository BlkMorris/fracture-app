import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import Parser from 'rss-parser';
import { TrendSignal } from '../../articles/entities/trend-signal.entity';

/**
 * Ingests trending topics from external sources:
 *  - Google News (politics RSS)
 *  - Reuters (world RSS)
 *  - AP News (politics RSS)
 *  - Simulated X/Twitter trending political topics
 *
 * Stores trend signals in the trend_signals table for use by
 * the hero ranking algorithm.
 */
@Injectable()
export class TrendSignalService implements OnModuleInit {
  private readonly logger = new Logger(TrendSignalService.name);
  private readonly parser: Parser;

  /** RSS feeds to poll for trend signals */
  private readonly feeds = [
    {
      source: 'google_news',
      url: 'https://news.google.com/rss/search?q=politics&hl=en-US&gl=US&ceid=US:en',
    },
    {
      source: 'reuters',
      url: 'https://www.rss-bridge.org/bridge01/?action=display&bridge=Reuters&topic=world&format=Atom',
    },
    {
      source: 'ap_news',
      url: 'https://rsshub.app/apnews/topics/politics',
    },
  ];

  constructor(
    @InjectRepository(TrendSignal)
    private readonly signalRepo: Repository<TrendSignal>,
  ) {
    this.parser = new Parser({
      timeout: 15_000,
      headers: {
        'User-Agent': 'Fracture/1.0 (trend-monitor)',
        Accept: 'application/rss+xml, application/xml, text/xml, application/atom+xml',
      },
    });
  }

  async onModuleInit(): Promise<void> {
    // Run initial trend fetch on startup (non-blocking)
    this.refreshTrends().catch((err) =>
      this.logger.warn(`Initial trend fetch failed: ${err.message}`),
    );
  }

  /**
   * Refresh trend signals every 15 minutes.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async refreshTrends(): Promise<void> {
    // Only run the full refresh every 15 minutes (use EVERY_MINUTE cron
    // but check elapsed time for more reliable scheduling in dev)
    const latest = await this.signalRepo.findOne({
      where: {},
      order: { detectedAt: 'DESC' },
    });
    if (latest) {
      const sinceMs = Date.now() - new Date(latest.detectedAt).getTime();
      if (sinceMs < 14 * 60 * 1000) return; // less than 14 min since last refresh
    }

    this.logger.log('Refreshing trend signals from external sources');

    let totalSignals = 0;

    // ── RSS feeds ──────────────────────────────────────
    for (const feed of this.feeds) {
      try {
        const signals = await this.fetchRssTrends(feed.source, feed.url);
        totalSignals += signals;
      } catch (err) {
        this.logger.debug(
          `Trend feed ${feed.source} unavailable: ${err.message}`,
        );
      }
    }

    // ── Simulated X/Twitter trends (political) ─────────
    try {
      const xSignals = await this.ingestSimulatedXTrends();
      totalSignals += xSignals;
    } catch (err) {
      this.logger.debug(`X trend simulation failed: ${err.message}`);
    }

    // ── Cleanup: remove signals older than 24 hours ────
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - 24);
    await this.signalRepo
      .createQueryBuilder()
      .delete()
      .where('"detectedAt" < :cutoff', { cutoff })
      .execute();

    if (totalSignals > 0) {
      this.logger.log(`Ingested ${totalSignals} trend signals`);
    }
  }

  /**
   * Fetch headlines from an RSS feed and extract trending keywords.
   */
  private async fetchRssTrends(
    source: string,
    feedUrl: string,
  ): Promise<number> {
    const feed = await this.parser.parseURL(feedUrl);
    const items = (feed.items || []).slice(0, 20);

    let count = 0;
    for (const item of items) {
      const title = item.title ?? '';
      if (!title || title.length < 5) continue;

      const keywords = this.extractKeywordsFromHeadline(title);
      for (const kw of keywords) {
        // Upsert: don't duplicate if same keyword+source exists recently
        const exists = await this.signalRepo
          .createQueryBuilder('s')
          .where('s.keyword = :kw', { kw })
          .andWhere('s.source = :source', { source })
          .andWhere('s."detectedAt" >= :since', {
            since: new Date(Date.now() - 60 * 60 * 1000),
          })
          .getCount();

        if (exists === 0) {
          await this.signalRepo.save(
            this.signalRepo.create({
              keyword: kw,
              source,
              trendScore: 60 + Math.random() * 30, // base score + noise
            }),
          );
          count++;
        }
      }
    }

    return count;
  }

  /**
   * Simulate X/Twitter trending political topics.
   * In production, this would use the X API.
   * For now we generate plausible political trending topics from
   * recently ingested cluster topics.
   */
  private async ingestSimulatedXTrends(): Promise<number> {
    // Core political trending terms (always-on baseline)
    const baseTrends = [
      'congress', 'white house', 'supreme court', 'election',
      'inflation', 'immigration', 'ukraine', 'china', 'iran',
      'tariffs', 'federal budget', 'healthcare', 'climate policy',
    ];

    let count = 0;
    for (const kw of baseTrends) {
      const exists = await this.signalRepo
        .createQueryBuilder('s')
        .where('s.keyword = :kw', { kw })
        .andWhere('s.source = :source', { source: 'x_trending' })
        .andWhere('s."detectedAt" >= :since', {
          since: new Date(Date.now() - 2 * 60 * 60 * 1000),
        })
        .getCount();

      if (exists === 0) {
        await this.signalRepo.save(
          this.signalRepo.create({
            keyword: kw,
            source: 'x_trending',
            trendScore: 40 + Math.random() * 40,
          }),
        );
        count++;
      }
    }

    return count;
  }

  /**
   * Extract significant keywords from a headline for trend detection.
   */
  private extractKeywordsFromHeadline(headline: string): string[] {
    const stopWords = new Set([
      'the', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'of', 'and',
      'or', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have',
      'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
      'should', 'may', 'might', 'shall', 'can', 'with', 'from', 'by',
      'about', 'as', 'but', 'not', 'this', 'that', 'it', 'its', 'he',
      'she', 'they', 'we', 'you', 'up', 'out', 'new', 'says', 'said',
      'also', 'just', 'how', 'why', 'what', 'when', 'where', 'who',
      'which', 'after', 'before', 'over', 'into', 'more', 'than',
    ]);

    return headline
      .toLowerCase()
      .replace(/[^a-z0-9\s'-]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 3 && !stopWords.has(w))
      .slice(0, 5);
  }

  // ─── Public API for ranking service ───────────────────

  /**
   * Get all active trend signals (last 24 hours).
   */
  async getActiveTrends(): Promise<TrendSignal[]> {
    const since = new Date();
    since.setHours(since.getHours() - 24);

    return this.signalRepo.find({
      where: { detectedAt: MoreThanOrEqual(since) },
      order: { trendScore: 'DESC' },
    });
  }

  /**
   * Compute a trend boost score for a cluster by matching its
   * topic, keywords, and article titles against active trend signals.
   *
   * Returns 0–100 boost. A score >= 20 is considered trending.
   */
  async computeTrendBoost(
    clusterTopic: string,
    topicKeywords: string[],
    articleTitles: string[] = [],
  ): Promise<number> {
    const trends = await this.getActiveTrends();
    if (trends.length === 0) return 0;

    const clusterText = [
      clusterTopic,
      ...topicKeywords,
      ...articleTitles,
    ]
      .join(' ')
      .toLowerCase();

    let totalBoost = 0;
    let matches = 0;

    for (const trend of trends) {
      const kw = trend.keyword.toLowerCase();
      if (clusterText.includes(kw)) {
        // Weighted by trend score
        totalBoost += trend.trendScore * 0.3;
        matches++;
      }
    }

    if (matches === 0) return 0;

    // Cap at 100, scale by number of matches (diminishing returns)
    const boost = Math.min(100, totalBoost * Math.min(matches, 5) / 5);
    return Math.round(boost * 10) / 10;
  }

  /**
   * Simple word-level similarity between a headline and trending keywords.
   * Returns 0.0–1.0.
   */
  headlineTrendSimilarity(headline: string, trendKeywords: string[]): number {
    if (trendKeywords.length === 0) return 0;

    const headlineLower = headline.toLowerCase();
    let matches = 0;

    for (const kw of trendKeywords) {
      if (headlineLower.includes(kw.toLowerCase())) {
        matches++;
      }
    }

    return matches / Math.max(trendKeywords.length, 1);
  }
}
