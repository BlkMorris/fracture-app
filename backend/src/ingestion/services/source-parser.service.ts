import { Injectable } from '@nestjs/common';

/**
 * Utility service to extract and normalize source names from article URLs.
 *
 * Used as a fallback when articles can't be matched to a known Source entity.
 * Maps common news domains to their canonical brand names.
 */
@Injectable()
export class SourceParserService {
  /** domain → brand name */
  private static readonly DOMAIN_MAP: Record<string, string> = {
    'cnn.com': 'CNN',
    'foxnews.com': 'Fox News',
    'fox.com': 'Fox News',
    'reuters.com': 'Reuters',
    'bbc.com': 'BBC',
    'bbc.co.uk': 'BBC',
    'npr.org': 'NPR',
    'apnews.com': 'Associated Press',
    'ap.org': 'Associated Press',
    'theguardian.com': 'The Guardian',
    'nytimes.com': 'The New York Times',
    'washingtonpost.com': 'The Washington Post',
    'wsj.com': 'The Wall Street Journal',
    'nbcnews.com': 'NBC News',
    'abcnews.go.com': 'ABC News',
    'cbsnews.com': 'CBS News',
    'msnbc.com': 'MSNBC',
    'politico.com': 'Politico',
    'thehill.com': 'The Hill',
    'axios.com': 'Axios',
    'bloomberg.com': 'Bloomberg',
    'usatoday.com': 'USA Today',
    'latimes.com': 'Los Angeles Times',
    'chicagotribune.com': 'Chicago Tribune',
    'nypost.com': 'New York Post',
    'dailymail.co.uk': 'Daily Mail',
    'sky.com': 'Sky News',
    'aljazeera.com': 'Al Jazeera',
    'france24.com': 'France 24',
    'dw.com': 'DW News',
  };

  /**
   * Extract a canonical source name from a URL.
   *
   * @param url  Full article URL
   * @returns    Normalized brand name, or a titlecased domain fallback
   */
  extractSourceName(url: string): string {
    const domain = this.extractDomain(url);
    if (!domain) return 'Unknown';

    // Try exact domain match
    const exact = SourceParserService.DOMAIN_MAP[domain];
    if (exact) return exact;

    // Try root domain (strip subdomain)
    const parts = domain.split('.');
    if (parts.length > 2) {
      const root = parts.slice(-2).join('.');
      const rootMatch = SourceParserService.DOMAIN_MAP[root];
      if (rootMatch) return rootMatch;
    }

    // Fallback: titlecase the main domain part
    const mainPart = parts.length >= 2 ? parts[parts.length - 2] : parts[0];
    return mainPart.charAt(0).toUpperCase() + mainPart.slice(1);
  }

  /**
   * Extract a clean domain from a URL.
   */
  extractDomain(url: string): string | null {
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch {
      return null;
    }
  }
}
