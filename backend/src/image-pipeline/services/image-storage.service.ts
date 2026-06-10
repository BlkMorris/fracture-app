import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { v4 as uuid } from 'uuid';
import axios from 'axios';

/**
 * Stores images to a permanent location and returns a public URL.
 *
 * Supports two drivers:
 *  - 'local': saves to disk under `uploads/article-images/` (development)
 *  - 's3': uploads to an S3-compatible bucket (production)
 *
 * Images are stored with a UUID-based filename to prevent collisions.
 * Includes SHA-256 duplicate detection: if the same image bytes have
 * already been stored, the existing URL is returned instead of saving
 * a second copy.
 */
@Injectable()
export class ImageStorageService implements OnModuleInit {
  private readonly logger = new Logger(ImageStorageService.name);
  private readonly driver: string;
  private readonly localDir: string;
  private readonly publicBaseUrl: string;
  private readonly s3Bucket: string;
  private readonly s3Region: string;
  private readonly s3AccessKeyId: string;
  private readonly s3SecretAccessKey: string;
  private readonly s3Endpoint: string;

  /**
   * In-memory hash → URL index.
   * Prevents storing identical image bytes more than once per process lifetime.
   * Key: SHA-256 hex digest. Value: public URL.
   */
  private readonly hashIndex = new Map<string, string>();

  /** Counter exposed for metrics — how many times we avoided a duplicate write */
  private _duplicateAvoidedCount = 0;

  get duplicateAvoidedCount(): number {
    return this._duplicateAvoidedCount;
  }

  constructor(private readonly config: ConfigService) {
    this.driver = this.config.get<string>(
      'imagePipeline.storageDriver',
      'local',
    );
    this.localDir = this.config.get<string>(
      'imagePipeline.localUploadDir',
      'uploads/article-images',
    );
    this.publicBaseUrl = this.config.get<string>(
      'imagePipeline.publicBaseUrl',
      'http://localhost:4000',
    );
    this.s3Bucket = this.config.get<string>('imagePipeline.s3Bucket', '');
    this.s3Region = this.config.get<string>(
      'imagePipeline.s3Region',
      'us-east-1',
    );
    this.s3AccessKeyId = this.config.get<string>(
      'imagePipeline.s3AccessKeyId',
      '',
    );
    this.s3SecretAccessKey = this.config.get<string>(
      'imagePipeline.s3SecretAccessKey',
      '',
    );
    this.s3Endpoint = this.config.get<string>(
      'imagePipeline.s3Endpoint',
      '',
    );
  }

  async onModuleInit(): Promise<void> {
    if (this.driver === 'local') {
      // Ensure the upload directory exists
      const absDir = path.resolve(this.localDir);
      if (!fs.existsSync(absDir)) {
        fs.mkdirSync(absDir, { recursive: true });
        this.logger.log(
          `[IMG-STORAGE] Created local upload directory: ${absDir}`,
        );
      }
    }
  }

  /**
   * Download an image from a URL and store it permanently.
   * Returns the public URL of the stored image.
   *
   * If the exact same image bytes (by SHA-256) have been stored before,
   * the existing URL is returned without writing a duplicate file.
   */
  async storeFromUrl(
    sourceUrl: string,
    articleId: string,
  ): Promise<{ url: string; wasDuplicate: boolean }> {
    // Download the image
    const response = await axios.get(sourceUrl, {
      responseType: 'arraybuffer',
      timeout: 30000,
      maxContentLength: 10 * 1024 * 1024, // 10 MB max
    });

    const contentType =
      response.headers['content-type'] || 'image/jpeg';
    const ext = this.extensionFromMime(contentType);
    const imageBuffer = Buffer.from(response.data);

    // ── SHA-256 duplicate check ─────────────────────────
    const hash = crypto.createHash('sha256').update(imageBuffer).digest('hex');
    const existingUrl = this.hashIndex.get(hash);
    if (existingUrl) {
      this._duplicateAvoidedCount++;
      this.logger.debug(
        `[IMG-STORAGE] Duplicate detected (SHA256=${hash.slice(0, 12)}…) ` +
          `— reusing existing URL: ${existingUrl.slice(0, 80)}`,
      );
      return { url: existingUrl, wasDuplicate: true };
    }

    const filename = `${articleId}-${uuid().slice(0, 8)}${ext}`;

    let publicUrl: string;
    if (this.driver === 's3' && this.s3Bucket) {
      publicUrl = await this.uploadToS3(filename, imageBuffer, contentType);
    } else {
      publicUrl = await this.saveToLocal(filename, imageBuffer);
    }

    // Register in hash index for future de-duplication
    this.hashIndex.set(hash, publicUrl);

    return { url: publicUrl, wasDuplicate: false };
  }

  // ── Local storage ─────────────────────────────────────

  private async saveToLocal(
    filename: string,
    buffer: Buffer,
  ): Promise<string> {
    const absDir = path.resolve(this.localDir);
    const filePath = path.join(absDir, filename);

    await fs.promises.writeFile(filePath, buffer);

    const publicUrl = `${this.publicBaseUrl}/${this.localDir}/${filename}`;

    this.logger.debug(
      `[IMG-STORAGE] Saved locally: ${filePath} → ${publicUrl}`,
    );

    return publicUrl;
  }

  // ── S3-compatible storage ─────────────────────────────

  private async uploadToS3(
    filename: string,
    buffer: Buffer,
    contentType: string,
  ): Promise<string> {
    // S3 upload via pre-signed PUT request pattern using axios
    // In production, replace this with the AWS SDK v3 S3Client.
    // This is a simplified implementation that works with most S3-compatible APIs.

    const key = `article-images/${filename}`;
    const endpoint = this.s3Endpoint || `https://s3.${this.s3Region}.amazonaws.com`;
    const url = `${endpoint}/${this.s3Bucket}/${key}`;

    try {
      await axios.put(url, buffer, {
        headers: {
          'Content-Type': contentType,
          'x-amz-acl': 'public-read',
        },
        timeout: 30000,
      });

      const publicUrl = `${endpoint}/${this.s3Bucket}/${key}`;
      this.logger.debug(
        `[IMG-STORAGE] Uploaded to S3: ${publicUrl}`,
      );
      return publicUrl;
    } catch (error) {
      this.logger.error(
        `[IMG-STORAGE] S3 upload failed for ${filename}: ${error.message}. ` +
          `Falling back to local storage.`,
      );
      // Fallback to local if S3 fails
      return this.saveToLocal(filename, buffer);
    }
  }

  // ── Helpers ───────────────────────────────────────────

  private extensionFromMime(mime: string): string {
    if (mime.includes('png')) return '.png';
    if (mime.includes('webp')) return '.webp';
    if (mime.includes('gif')) return '.gif';
    if (mime.includes('svg')) return '.svg';
    return '.jpg';
  }
}
