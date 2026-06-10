import { Injectable, Logger } from '@nestjs/common';
import type { NarrativeSnapshot } from './snapshot.service';

/**
 * Renders a NarrativeSnapshot into a 1200×630 dark-theme SVG string.
 *
 * The SVG can be consumed directly or converted to PNG via sharp.
 * Optimised for X (Twitter) Open Graph card dimensions.
 */
@Injectable()
export class SnapshotImageService {
  private readonly logger = new Logger(SnapshotImageService.name);

  private static readonly WIDTH = 1200;
  private static readonly HEIGHT = 630;

  /**
   * Generate SVG markup for the snapshot card.
   */
  renderSvg(snapshot: NarrativeSnapshot): string {
    const { WIDTH, HEIGHT } = SnapshotImageService;
    const score = snapshot.divergenceScore;
    const scoreColor = score >= 60 ? '#EF4444' : score >= 30 ? '#F59E0B' : '#22C55E';

    // Escape XML special chars
    const esc = (s: string) =>
      s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

    // Truncate headline
    const headline =
      snapshot.headline.length > 80
        ? snapshot.headline.slice(0, 77) + '…'
        : snapshot.headline;

    // Truncate frame summaries
    const leftText =
      snapshot.leftFrame.summary.length > 100
        ? snapshot.leftFrame.summary.slice(0, 97) + '…'
        : snapshot.leftFrame.summary;
    const rightText =
      snapshot.rightFrame.summary.length > 100
        ? snapshot.rightFrame.summary.slice(0, 97) + '…'
        : snapshot.rightFrame.summary;

    const leftSources = snapshot.leftFrame.sources.slice(0, 3).join(', ');
    const rightSources = snapshot.rightFrame.sources.slice(0, 3).join(', ');

    // Build the divergence bar
    const barWidth = 300;
    const barX = (WIDTH - barWidth) / 2;
    const filledWidth = Math.round((score / 100) * barWidth);

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0F0F0F"/>
      <stop offset="100%" stop-color="#1A1A2E"/>
    </linearGradient>
    <linearGradient id="leftGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#3B82F6" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="#3B82F6" stop-opacity="0.03"/>
    </linearGradient>
    <linearGradient id="rightGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#EF4444" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="#EF4444" stop-opacity="0.03"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg)" rx="0"/>

  <!-- Top border accent -->
  <rect x="0" y="0" width="${WIDTH}" height="3" fill="${scoreColor}"/>

  <!-- FRACTURE branding -->
  <text x="48" y="52" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="700" fill="#6B7280" letter-spacing="4">FRACTURE</text>
  <text x="${WIDTH - 48}" y="52" font-family="system-ui, -apple-system, sans-serif" font-size="12" fill="#6B7280" text-anchor="end">Narrative Intelligence</text>

  <!-- Headline -->
  <text x="${WIDTH / 2}" y="100" font-family="system-ui, -apple-system, sans-serif" font-size="26" font-weight="700" fill="#F9FAFB" text-anchor="middle">${esc(headline)}</text>

  <!-- Divider -->
  <line x1="48" y1="125" x2="${WIDTH - 48}" y2="125" stroke="#374151" stroke-width="1"/>

  <!-- Left frame panel -->
  <rect x="48" y="145" width="510" height="280" rx="12" fill="url(#leftGrad)" stroke="#3B82F6" stroke-opacity="0.3" stroke-width="1"/>
  <text x="78" y="180" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="700" fill="#3B82F6" letter-spacing="3">LEFT FRAME</text>
  <text x="78" y="210" font-family="system-ui, -apple-system, sans-serif" font-size="13" fill="#9CA3AF">Sources: ${esc(leftSources || 'Unknown')}</text>

  <!-- Left quote -->
  <text x="78" y="250" font-family="Georgia, serif" font-size="18" fill="#E5E7EB" font-style="italic">
    <tspan x="78" dy="0">"${esc(leftText.slice(0, 55))}</tspan>
    <tspan x="78" dy="26">${esc(leftText.slice(55, 100))}"</tspan>
  </text>

  <!-- Right frame panel -->
  <rect x="${WIDTH - 558}" y="145" width="510" height="280" rx="12" fill="url(#rightGrad)" stroke="#EF4444" stroke-opacity="0.3" stroke-width="1"/>
  <text x="${WIDTH - 528}" y="180" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="700" fill="#EF4444" letter-spacing="3">RIGHT FRAME</text>
  <text x="${WIDTH - 528}" y="210" font-family="system-ui, -apple-system, sans-serif" font-size="13" fill="#9CA3AF">Sources: ${esc(rightSources || 'Unknown')}</text>

  <!-- Right quote -->
  <text x="${WIDTH - 528}" y="250" font-family="Georgia, serif" font-size="18" fill="#E5E7EB" font-style="italic">
    <tspan x="${WIDTH - 528}" dy="0">"${esc(rightText.slice(0, 55))}</tspan>
    <tspan x="${WIDTH - 528}" dy="26">${esc(rightText.slice(55, 100))}"</tspan>
  </text>

  <!-- VS divider -->
  <circle cx="${WIDTH / 2}" cy="285" r="24" fill="#1F2937" stroke="#374151" stroke-width="2"/>
  <text x="${WIDTH / 2}" y="291" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="700" fill="#9CA3AF" text-anchor="middle">VS</text>

  <!-- Bottom stats bar -->
  <rect x="0" y="${HEIGHT - 130}" width="${WIDTH}" height="130" fill="#111827"/>
  <line x1="0" y1="${HEIGHT - 130}" x2="${WIDTH}" y2="${HEIGHT - 130}" stroke="#1F2937" stroke-width="1"/>

  <!-- Divergence score -->
  <text x="${WIDTH / 2}" y="${HEIGHT - 92}" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="700" fill="#6B7280" text-anchor="middle" letter-spacing="2">DIVERGENCE SCORE</text>
  <text x="${WIDTH / 2}" y="${HEIGHT - 55}" font-family="system-ui, -apple-system, sans-serif" font-size="42" font-weight="800" fill="${scoreColor}" text-anchor="middle">${score}</text>

  <!-- Score bar -->
  <rect x="${barX}" y="${HEIGHT - 35}" width="${barWidth}" height="6" rx="3" fill="#1F2937"/>
  <rect x="${barX}" y="${HEIGHT - 35}" width="${filledWidth}" height="6" rx="3" fill="${scoreColor}"/>

  <!-- Article / Source counts -->
  <text x="80" y="${HEIGHT - 65}" font-family="system-ui, -apple-system, sans-serif" font-size="32" font-weight="800" fill="#F9FAFB">${snapshot.articleCount}</text>
  <text x="80" y="${HEIGHT - 40}" font-family="system-ui, -apple-system, sans-serif" font-size="12" fill="#6B7280">Articles</text>

  <text x="${WIDTH - 80}" y="${HEIGHT - 65}" font-family="system-ui, -apple-system, sans-serif" font-size="32" font-weight="800" fill="#F9FAFB" text-anchor="end">${snapshot.sourceCount}</text>
  <text x="${WIDTH - 80}" y="${HEIGHT - 40}" font-family="system-ui, -apple-system, sans-serif" font-size="12" fill="#6B7280" text-anchor="end">Sources</text>
</svg>`;
  }

  /**
   * Convert SVG to PNG buffer using sharp (if available).
   * Falls back to returning the SVG as a buffer.
   */
  async renderPng(snapshot: NarrativeSnapshot): Promise<Buffer> {
    const svg = this.renderSvg(snapshot);
    const svgBuffer = Buffer.from(svg);

    try {
      // Dynamic import — sharp is optional
      const sharp = (await import('sharp')).default;
      return await sharp(svgBuffer)
        .resize(
          SnapshotImageService.WIDTH,
          SnapshotImageService.HEIGHT,
        )
        .png({ quality: 90 })
        .toBuffer();
    } catch {
      this.logger.warn(
        'sharp not available — returning SVG buffer as fallback',
      );
      return svgBuffer;
    }
  }
}
