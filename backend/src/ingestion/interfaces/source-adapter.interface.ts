/**
 * Raw article shape returned by all source adapters before
 * deduplication and persistence.
 */
export interface RawArticle {
  /** Original URL of the article */
  url: string;
  /** Headline / title */
  title: string;
  /** Short summary or description */
  summary?: string;
  /** Full article body (if available) */
  content?: string;
  /** Author / byline */
  author?: string;
  /** Featured image URL */
  imageUrl?: string;
  /** Publication timestamp (ISO string) */
  publishedAt?: string;
  /** Slug of the source that produced this article */
  sourceSlug: string;
}

/**
 * Every ingestion adapter must implement this interface.
 * Adapters are responsible for fetching articles from a single
 * source type (RSS, API, licensed feed, etc.).
 */
export interface SourceAdapter {
  /** Human-readable adapter name (for logging) */
  readonly name: string;

  /**
   * Fetch articles from the source.
   * @param sourceSlug  Slug identifying the outlet
   * @param feedUrl     URL or endpoint to fetch from
   * @returns           Array of raw articles
   */
  fetchArticles(sourceSlug: string, feedUrl: string): Promise<RawArticle[]>;
}
