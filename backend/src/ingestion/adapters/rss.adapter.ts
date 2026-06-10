import { Injectable, Logger } from '@nestjs/common';
import Parser from 'rss-parser';
import { SourceAdapter, RawArticle } from '../interfaces';

@Injectable()
export class RssAdapter implements SourceAdapter {
  readonly name = 'RSS';
  private readonly logger = new Logger(RssAdapter.name);
  private readonly parser: Parser;

  constructor() {
    this.parser = new Parser({
      timeout: 10_000,
      headers: {
        'User-Agent': 'Fracture/1.0 (news-aggregator)',
        Accept: 'application/rss+xml, application/xml, text/xml',
      },
      customFields: {
        item: [
          ['media:content', 'media:content', { keepArray: false }],
          ['media:thumbnail', 'media:thumbnail', { keepArray: false }],
          ['media:group', 'media:group', { keepArray: false }],
        ],
      },
    });
  }

  async fetchArticles(
    sourceSlug: string,
    feedUrl: string,
  ): Promise<RawArticle[]> {
    try {
      this.logger.debug(`Fetching RSS: ${feedUrl} (${sourceSlug})`);
      const feed = await this.parser.parseURL(feedUrl);

      const articles: RawArticle[] = (feed.items || []).map((item) => ({
        url: item.link || '',
        title: item.title || 'Untitled',
        summary: item.contentSnippet || item.content || undefined,
        content: item['content:encoded'] || item.content || undefined,
        author: item.creator || item.author || undefined,
        imageUrl: this.extractImage(item),
        publishedAt: item.isoDate || item.pubDate || undefined,
        sourceSlug,
      }));

      this.logger.log(
        `RSS fetched ${articles.length} articles from ${sourceSlug}`,
      );
      return articles.filter((a) => a.url); // drop items without a link
    } catch (error) {
      this.logger.error(
        `RSS fetch failed for ${sourceSlug}: ${error.message}`,
      );
      return [];
    }
  }

  private extractImage(item: Record<string, any>): string | undefined {
    // 1. media:content (Fox News, BBC, etc.)
    const mc = item['media:content'];
    if (mc?.$?.url) return mc.$.url;

    // 2. media:thumbnail
    const mt = item['media:thumbnail'];
    if (mt?.$?.url) return mt.$.url;

    // 3. media:group → media:content nested
    const mg = item['media:group'];
    if (mg?.['media:content']?.$?.url) return mg['media:content'].$.url;
    if (mg?.['media:thumbnail']?.$?.url) return mg['media:thumbnail'].$.url;

    // 4. enclosure (podcasts, some feeds)
    if (item.enclosure?.url && item.enclosure.type?.startsWith('image/')) {
      return item.enclosure.url;
    }

    // 5. Extract first <img> src from content HTML (NPR, CNN, etc.)
    const html = item['content:encoded'] || item.content || '';
    if (html) {
      const imgMatch = html.match(/<img[^>]+src=["']([^"']+)["']/i);
      if (imgMatch?.[1]) return imgMatch[1];
    }

    return undefined;
  }
}
