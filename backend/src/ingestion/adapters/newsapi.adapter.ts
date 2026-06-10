import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { SourceAdapter, RawArticle } from '../interfaces';

interface NewsApiArticle {
  title: string;
  description: string;
  url: string;
  urlToImage: string | null;
  author: string | null;
  publishedAt: string;
  content: string | null;
  source: { id: string | null; name: string };
}

interface NewsApiResponse {
  status: string;
  totalResults: number;
  articles: NewsApiArticle[];
}

@Injectable()
export class NewsApiAdapter implements SourceAdapter {
  readonly name = 'NewsAPI';
  private readonly logger = new Logger(NewsApiAdapter.name);
  private readonly apiKey: string;
  private readonly baseUrl = 'https://newsapi.org/v2';

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get<string>('ingestion.newsapiKey') || '';
  }

  /**
   * For NewsAPI, `feedUrl` is treated as the endpoint path,
   * e.g. "top-headlines?country=us" or "everything?q=politics".
   */
  async fetchArticles(
    sourceSlug: string,
    feedUrl: string,
  ): Promise<RawArticle[]> {
    if (!this.apiKey || this.apiKey.startsWith('mock')) {
      this.logger.warn(
        `NewsAPI key is not configured — returning mock data for ${sourceSlug}`,
      );
      return this.getMockArticles(sourceSlug);
    }

    try {
      const separator = feedUrl.includes('?') ? '&' : '?';
      const url = `${this.baseUrl}/${feedUrl}${separator}apiKey=${this.apiKey}`;

      this.logger.debug(`Fetching NewsAPI: ${feedUrl} (${sourceSlug})`);
      const { data } = await axios.get<NewsApiResponse>(url, {
        timeout: 10_000,
      });

      if (data.status !== 'ok') {
        this.logger.error(`NewsAPI error response for ${sourceSlug}`);
        return [];
      }

      const articles: RawArticle[] = data.articles.map((a) => ({
        url: a.url,
        title: a.title,
        summary: a.description || undefined,
        content: a.content || undefined,
        author: a.author || undefined,
        imageUrl: a.urlToImage || undefined,
        publishedAt: a.publishedAt,
        sourceSlug,
      }));

      this.logger.log(
        `NewsAPI fetched ${articles.length} articles for ${sourceSlug}`,
      );
      return articles;
    } catch (error) {
      this.logger.error(
        `NewsAPI fetch failed for ${sourceSlug}: ${error.message}`,
      );
      return [];
    }
  }

  /**
   * Returns realistic mock articles for local development
   * when no valid API key is configured.
   */
  private getMockArticles(sourceSlug: string): RawArticle[] {
    const now = new Date().toISOString();
    return [
      {
        url: `https://example.com/${sourceSlug}/article-1`,
        title: 'Senate Advances Bipartisan Budget Framework',
        summary:
          'Senate leaders from both parties announced agreement on a budget framework that would fund infrastructure and social programs.',
        author: 'Jane Reporter',
        publishedAt: now,
        sourceSlug,
      },
      {
        url: `https://example.com/${sourceSlug}/article-2`,
        title: 'Federal Reserve Signals Rate Decision Ahead of March Meeting',
        summary:
          'The Federal Reserve chair indicated that interest rate decisions will be data-dependent heading into the spring.',
        author: 'Bob Correspondent',
        publishedAt: now,
        sourceSlug,
      },
      {
        url: `https://example.com/${sourceSlug}/article-3`,
        title: 'Tech Giants Face New Regulatory Scrutiny in Congress',
        summary:
          'A bipartisan committee announced hearings on AI regulation, data privacy, and platform liability.',
        author: 'Alice Analyst',
        publishedAt: now,
        sourceSlug,
      },
    ];
  }
}
