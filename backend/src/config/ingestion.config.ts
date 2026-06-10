import { registerAs } from '@nestjs/config';

export default registerAs('ingestion', () => ({
  newsapiKey: process.env.NEWSAPI_KEY || '',
  rssFetchIntervalMs:
    parseInt(process.env.RSS_FETCH_INTERVAL_MS || '300000', 10),
  schedulerEnabled: process.env.INGESTION_SCHEDULER_ENABLED || 'true',

  // ── Image validation thresholds ───────────────────────
  imageMinWidth: parseInt(process.env.IMAGE_MIN_WIDTH || '600', 10),
  imageMinHeight: parseInt(process.env.IMAGE_MIN_HEIGHT || '400', 10),
  imageMinFileSize: parseInt(
    process.env.IMAGE_MIN_FILE_SIZE || String(30 * 1024),
    10,
  ),
  /** Fallback image URL used when no valid image can be found */
  imageFallbackUrl: process.env.IMAGE_FALLBACK_URL || null,
}));
