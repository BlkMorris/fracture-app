import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import type { ImageContext } from '../interfaces';

/** Extended context for cluster-level image generation */
export interface ClusterImageContext {
  /** Cluster headline / topic */
  topic: string;
  /** Combined summary from top articles in the cluster */
  combinedSummary: string;
  /** Aggregated top entities across all cluster articles */
  entities: string[];
  /** Cluster category */
  category: string;
  /** Visual keywords aggregated from cluster articles */
  visualKeywords: string[];
}

/**
 * AI image generation fallback using OpenAI DALL-E 3.
 *
 * Only invoked when no suitable real editorial image is found.
 * Generates neutral, editorial-style illustrations with:
 *  - Landscape orientation
 *  - No text or logos
 *  - No propaganda imagery
 *  - Modern journalism illustration style
 */
@Injectable()
export class ImageGenerationService {
  private readonly logger = new Logger(ImageGenerationService.name);
  private readonly apiKey: string;
  private readonly model: string;
  private readonly imageSize: string;

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get<string>('imagePipeline.openaiApiKey', '');
    this.model = this.config.get<string>(
      'imagePipeline.openaiModel',
      'dall-e-3',
    );
    this.imageSize = this.config.get<string>(
      'imagePipeline.openaiImageSize',
      '1792x1024',
    );
  }

  /** Whether AI generation is configured and available */
  get isAvailable(): boolean {
    return this.apiKey.length > 0;
  }

  /**
   * Generate an editorial-style image from article context.
   * Returns the image URL (temporary OpenAI URL, must be downloaded & stored).
   */
  async generateImage(
    context: ImageContext,
  ): Promise<{ url: string; revisedPrompt: string } | null> {
    if (!this.isAvailable) {
      this.logger.warn(
        '[IMG-GEN] OpenAI API key not configured — skipping generation',
      );
      return null;
    }

    const prompt = this.buildPrompt(context);

    this.logger.debug(`[IMG-GEN] Generating image with prompt: "${prompt}"`);

    try {
      const res = await axios.post(
        'https://api.openai.com/v1/images/generations',
        {
          model: this.model,
          prompt,
          n: 1,
          size: this.imageSize,
          quality: 'standard',
          style: 'natural',
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 60000, // DALL-E can take up to 60s
        },
      );

      const image = res.data?.data?.[0];
      if (!image?.url) {
        this.logger.warn('[IMG-GEN] No image URL in OpenAI response');
        return null;
      }

      this.logger.debug(
        `[IMG-GEN] Generated image for "${context.topic.slice(0, 50)}" ` +
          `revised="${(image.revised_prompt ?? '').slice(0, 80)}"`,
      );

      return {
        url: image.url,
        revisedPrompt: image.revised_prompt ?? prompt,
      };
    } catch (error) {
      this.logger.error(
        `[IMG-GEN] Generation failed for "${context.topic.slice(0, 50)}": ${error.message}`,
      );
      return null;
    }
  }

  /**
   * Build a structured prompt for editorial image generation.
   * Follows the constraint requirements:
   *  - Landscape orientation
   *  - No text, logos, or propaganda
   *  - Neutral editorial style
   */
  private buildPrompt(context: ImageContext): string {
    const entityPhrase =
      context.entities.length > 0
        ? `, featuring ${context.entities.slice(0, 3).join(', ')}`
        : '';

    const visualPhrase =
      context.visualKeywords.length > 0
        ? `, visual elements: ${context.visualKeywords.slice(0, 4).join(', ')}`
        : '';

    const categoryPhrase =
      context.category !== 'general'
        ? ` in the context of ${context.category} news`
        : '';

    // Cap prompt at 1000 chars (DALL-E 3 limit is 4000)
    const prompt =
      `Editorial news illustration representing "${context.topic}"` +
      `${entityPhrase}${categoryPhrase}${visualPhrase}. ` +
      `Modern journalism illustration style, photorealistic, neutral tone, ` +
      `landscape composition, cinematic lighting. ` +
      `CONSTRAINTS: No text, no logos, no watermarks, no propaganda imagery, ` +
      `no graphic violence. Suitable for a professional news platform.`;

    return prompt.slice(0, 1000);
  }

  /**
   * Generate an editorial-style image from **aggregated cluster context**.
   * This produces an image representing the full story across multiple articles,
   * rather than a single article's perspective.
   */
  async generateClusterImage(
    context: ClusterImageContext,
  ): Promise<{ url: string; revisedPrompt: string } | null> {
    if (!this.isAvailable) {
      this.logger.warn(
        '[IMG-GEN] OpenAI API key not configured — skipping cluster generation',
      );
      return null;
    }

    const prompt = this.buildClusterPrompt(context);

    this.logger.debug(
      `[IMG-GEN] Generating cluster image with prompt: "${prompt.slice(0, 120)}…"`,
    );

    try {
      const res = await axios.post(
        'https://api.openai.com/v1/images/generations',
        {
          model: this.model,
          prompt,
          n: 1,
          size: this.imageSize,
          quality: 'standard',
          style: 'natural',
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 60000,
        },
      );

      const image = res.data?.data?.[0];
      if (!image?.url) {
        this.logger.warn('[IMG-GEN] No image URL in OpenAI response (cluster)');
        return null;
      }

      this.logger.debug(
        `[IMG-GEN] Generated cluster image for "${context.topic.slice(0, 50)}" ` +
          `revised="${(image.revised_prompt ?? '').slice(0, 80)}"`,
      );

      return {
        url: image.url,
        revisedPrompt: image.revised_prompt ?? prompt,
      };
    } catch (error) {
      this.logger.error(
        `[IMG-GEN] Cluster generation failed for "${context.topic.slice(0, 50)}": ${error.message}`,
      );
      return null;
    }
  }

  /**
   * Build a richer prompt for cluster-level generation.
   * Combines headline, summary, entities, and category from the whole cluster.
   */
  private buildClusterPrompt(context: ClusterImageContext): string {
    const summaryPhrase = context.combinedSummary
      ? `. Story overview: ${context.combinedSummary.slice(0, 300)}`
      : '';

    const entityPhrase =
      context.entities.length > 0
        ? `, key subjects: ${context.entities.slice(0, 5).join(', ')}`
        : '';

    const visualPhrase =
      context.visualKeywords.length > 0
        ? `, visual elements: ${context.visualKeywords.slice(0, 5).join(', ')}`
        : '';

    const categoryPhrase =
      context.category !== 'general' && context.category !== 'uncategorized'
        ? ` in the context of ${context.category} news`
        : '';

    const prompt =
      `Editorial news illustration representing the story: "${context.topic}"` +
      `${summaryPhrase}${entityPhrase}${categoryPhrase}${visualPhrase}. ` +
      `Modern journalism illustration style, photorealistic, neutral tone, ` +
      `landscape composition, cinematic lighting. ` +
      `CONSTRAINTS: No text, no logos, no watermarks, no propaganda imagery, ` +
      `no graphic violence. Suitable for a professional news platform.`;

    return prompt.slice(0, 1000);
  }
}
