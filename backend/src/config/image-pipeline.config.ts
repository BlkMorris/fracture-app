import { registerAs } from '@nestjs/config';

export default registerAs('imagePipeline', () => ({
  // ── Image Search APIs ─────────────────────────────────
  unsplashAccessKey: process.env.UNSPLASH_ACCESS_KEY || '',
  openverseEnabled:
    (process.env.OPENVERSE_ENABLED ?? 'true') === 'true',

  // ── AI Image Generation (OpenAI DALL-E) ───────────────
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  openaiModel: process.env.OPENAI_IMAGE_MODEL || 'dall-e-3',
  openaiImageSize: process.env.OPENAI_IMAGE_SIZE || '1792x1024',

  // ── Embeddings (OpenAI) ───────────────────────────────
  openaiEmbeddingModel:
    process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',

  // ── Image Storage ─────────────────────────────────────
  /** 'local' for dev (serves from /uploads), 's3' for production */
  storageDriver: process.env.IMAGE_STORAGE_DRIVER || 'local',
  localUploadDir: process.env.IMAGE_LOCAL_DIR || 'uploads/article-images',
  /** Base URL for serving local images (set to your domain in prod) */
  publicBaseUrl:
    process.env.IMAGE_PUBLIC_BASE_URL ||
    `http://localhost:${process.env.PORT || '4000'}`,

  // S3-compatible storage (production)
  s3Bucket: process.env.IMAGE_S3_BUCKET || '',
  s3Region: process.env.IMAGE_S3_REGION || 'us-east-1',
  s3AccessKeyId: process.env.IMAGE_S3_ACCESS_KEY_ID || '',
  s3SecretAccessKey: process.env.IMAGE_S3_SECRET_ACCESS_KEY || '',
  s3Endpoint: process.env.IMAGE_S3_ENDPOINT || '',

  // ── Pipeline Settings ─────────────────────────────────
  /** Default minimum similarity score (0–1) for accepting a retrieved image */
  similarityThreshold: parseFloat(
    process.env.IMAGE_SIMILARITY_THRESHOLD || '0.75',
  ),
  /** Category-specific similarity thresholds (higher = stricter) */
  categorySimilarityThresholds: {
    politics: 0.80,
    conflict: 0.80,
    elections: 0.80,
    economy: 0.75,
    technology: 0.72,
    science: 0.72,
    health: 0.75,
    environment: 0.75,
    world: 0.78,
  } as Record<string, number>,
  /** Minimum number of articles a cluster must have before generating/assigning cluster images */
  minClusterArticlesForImage: parseInt(
    process.env.IMAGE_MIN_CLUSTER_ARTICLES || '3',
    10,
  ),
  /** Max articles to process per pipeline run */
  batchSize: parseInt(process.env.IMAGE_BATCH_SIZE || '50', 10),
  /** How many image search results to evaluate per article */
  searchCandidates: parseInt(process.env.IMAGE_SEARCH_CANDIDATES || '5', 10),

  // ── Scheduler ─────────────────────────────────────────
  schedulerEnabled:
    (process.env.IMAGE_PIPELINE_SCHEDULER_ENABLED ?? 'true') === 'true',
}));
