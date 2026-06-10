import { Injectable, Logger } from '@nestjs/common';
import { SourceAdapter, RawArticle } from '../interfaces';

/**
 * Stub adapter for paid / licensed publisher feeds.
 *
 * In production this would integrate with:
 * - AP, Reuters, AFP licensed feeds
 * - Direct publisher partnerships
 * - Premium data providers
 *
 * For MVP, this returns empty results and logs a notice.
 */
@Injectable()
export class PaidSourceAdapter implements SourceAdapter {
  readonly name = 'PaidSource';
  private readonly logger = new Logger(PaidSourceAdapter.name);

  async fetchArticles(
    sourceSlug: string,
    feedUrl: string,
  ): Promise<RawArticle[]> {
    this.logger.debug(
      `PaidSourceAdapter: stub called for ${sourceSlug} (${feedUrl}) — no licensed feed configured`,
    );
    return [];
  }
}
