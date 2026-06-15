// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BFF Backend Fetch — Central API helper
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
import type {
    Article, Source, StoryCluster, DivergenceIndex,
    HomepageData, LatestArticle, StoryDetail, PlatformStats
} from '@/types';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4000/api/v1';

export class BackendError extends Error {
    constructor(public status: number, message: string) {
        super(message);
        this.name = 'BackendError';
    }
}

export async function backendFetch<T>(
    path: string,
    options: RequestInit = {},
): Promise<T> {
    const url = `${BACKEND_URL}${path}`;
    const res = await fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
    });

    if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new BackendError(res.status, body || `Backend returned ${res.status}`);
    }

    return res.json();
}

// ── Transform Functions ──────────────────────────────
// These decouple backend shapes from frontend contracts

/* eslint-disable @typescript-eslint/no-explicit-any */

export function transformSource(raw: any): Source {
    return {
        id: raw.id,
        name: raw.name,
        slug: raw.slug,
        url: raw.url ?? null,
        tier: raw.tier,
        politicalLeanPrior: raw.politicalLeanPrior ?? 0,
        establishmentPrior: raw.establishmentPrior ?? 0,
        reliabilityScore: raw.reliabilityScore ?? 0.5,
        country: raw.country ?? null,
        region: raw.region ?? null,
    };
}

export function transformArticle(raw: any): Article {
    return {
        id: raw.id,
        title: raw.title,
        summary: raw.summary ?? null,
        url: raw.url,
        author: raw.author ?? null,
        imageUrl: raw.imageUrl ?? null,
        publishedAt: raw.publishedAt ?? null,
        source: raw.source ? transformSource(raw.source) : raw.source,
        politicalLeanScore: raw.politicalLeanScore ?? null,
        establishmentScore: raw.establishmentScore ?? null,
        headlineSentiment: raw.headlineSentiment ?? null,
        bodySentiment: raw.bodySentiment ?? null,
        framingType: raw.framingType ?? null,
        framingConfidence: raw.framingConfidence ?? null,
    };
}

export function transformCluster(raw: any): StoryCluster {
    // Backend uses `storyClusterId` in summary endpoints, `id` in detail endpoints
    const id = raw.id ?? raw.storyClusterId;
    return {
        id,
        topic: raw.topic ?? raw.title ?? '',
        summary: raw.summary ?? null,
        topicKeywords: raw.topicKeywords ?? [],
        status: raw.status ?? 'ACTIVE',
        articleCount: raw.articleCount ?? 0,
        sourceCount: raw.sourceCount ?? 0,
        divergenceScore: raw.divergenceScore ?? null,
        velocityScore: raw.velocityScore ?? null,
        isFractured: raw.isFractured ?? false,
        topicCategory: raw.topicCategory ?? 'uncategorized',
        imageUrl: raw.imageUrl ?? null,
        newestArticleAt: raw.newestArticleAt ?? raw.latestArticleAt ?? null,
        oldestArticleAt: raw.oldestArticleAt ?? null,
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
    };
}

export function transformDivergenceIndex(raw: any): DivergenceIndex | null {
    if (!raw) return null;
    return {
        overall: raw.overall ?? raw.divergenceScore ?? raw.fdi ?? 0,
        headlineSentimentSpread: raw.headlineSentimentSpread ?? 0,
        framingTypeEntropy: raw.framingTypeEntropy ?? 0,
        entityFramingDivergence: raw.entityFramingDivergence ?? raw.biasSpread ?? 0,
        linguisticEmbeddingSpread: raw.linguisticEmbeddingSpread ?? raw.linguisticSpread ?? 0,
        sourceSelectionVariance: raw.sourceSelectionVariance ?? 0,
        structuralDivergence: raw.structuralDivergence ?? 0,
    };
}

export function transformHomepageResponse(raw: any): HomepageData {
    // Backend hero is a complex object: { cluster: {...}, divergence, leftArticle, ... }
    // Extract the cluster summary and merge top-level fields
    const heroCluster = raw.hero?.cluster ?? raw.hero;
    const hero = heroCluster ? transformCluster({
        ...heroCluster,
        imageUrl: heroCluster.imageUrl ?? raw.hero?.imageUrl ?? null,
    }) : null;

    const trending = (raw.trending ?? []).map(transformCluster);

    // Backend returns `fractured` (not `mostFractured`), which is also a complex object
    const fracturedRaw = raw.mostFractured ?? raw.fractured;
    const fracturedCluster = fracturedRaw?.cluster ?? fracturedRaw;
    const mostFractured = fracturedCluster ? transformCluster(fracturedCluster) : null;
    const heroArticleRaw = raw.hero?.leftArticle ?? raw.hero?.rightArticle ?? raw.hero?.articles?.[0] ?? null;

    return {
        hero,
        heroHeadline: raw.hero?.headline ?? null,
        heroArticle: heroArticleRaw ? transformLatestArticle(heroArticleRaw, hero?.id ?? null) : null,
        trending,
        mostFractured,
        latest: (raw.latest ?? []).map((a: any): LatestArticle => transformLatestArticle(a)),
        breakingCount: raw.breakingCount ?? 0,
    };
}

function transformLatestArticle(a: any, storyClusterId: string | null = null): LatestArticle {
    return {
        id: a.id,
        title: a.title,
        summary: a.summary ?? null,
        imageUrl: a.imageUrl ?? null,
        publishedAt: a.publishedAt ?? null,
        source: {
            name: a.source?.name ?? a.sourceName ?? 'Unknown',
            slug: a.source?.slug ?? a.sourceSlug ?? 'unknown',
        },
        storyClusterId: a.storyClusterId ?? storyClusterId,
    };
}

export function transformStoryDetail(raw: any): StoryDetail {
    const articles = (raw.articles ?? []).map(transformArticle);
    const divergence = raw.divergenceIndex ?? raw.divergence;
    const rawCluster = raw.cluster ?? raw;
    const sourceCount = rawCluster.sourceCount ?? new Set(
        articles.map((article: Article) => article.source?.slug ?? article.source?.name).filter(Boolean),
    ).size;

    return {
        cluster: transformCluster({
            ...rawCluster,
            articleCount: rawCluster.articleCount ?? articles.length,
            sourceCount,
            divergenceScore:
                rawCluster.divergenceScore ??
                raw.divergenceScore ??
                divergence?.overall ??
                divergence?.divergenceScore ??
                divergence?.fdi ??
                null,
        }),
        articles,
        divergenceIndex: transformDivergenceIndex(divergence),
        narrativeFrames: raw.narrativeFrames?.frames ?? raw.narrativeFrames ?? [],
        headlineComparison: raw.headlineComparison ?? [],
        timeline: raw.timeline ?? [],
    };
}

export function transformStats(raw: any): PlatformStats {
    return {
        activeStories: raw.activeStories ?? 0,
        avgDivergence: raw.avgDivergence ?? 0,
        sourcesTracked: raw.sourcesTracked ?? 0,
    };
}
