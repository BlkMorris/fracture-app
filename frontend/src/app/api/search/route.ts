import { NextRequest, NextResponse } from 'next/server';
import { backendFetch, BackendError, isEnglishArticle, isEnglishCluster, transformArticle, transformCluster } from '../_lib/backend';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = request.nextUrl;
        const q = searchParams.get('q') || '';
        const page = searchParams.get('page') || '1';
        const limit = searchParams.get('limit') || '20';

        if (q.length < 2) {
            return NextResponse.json({ clusters: [], articles: [], relatedTopics: [], totalClusters: 0, totalArticles: 0 });
        }

        const raw = await backendFetch<{
            clusters?: unknown[];
            articles?: unknown[];
            relatedTopics?: string[];
            totalClusters?: number;
            totalArticles?: number;
        }>(
            `/narrative/discover?q=${encodeURIComponent(q)}&page=${page}&limit=${limit}`,
        );
        const clusters = (raw.clusters ?? []).map(transformCluster).filter(isEnglishCluster);
        const articles = (raw.articles ?? []).map(transformArticle).filter(isEnglishArticle);
        return NextResponse.json({
            ...raw,
            clusters,
            articles,
            relatedTopics: raw.relatedTopics ?? [],
            totalClusters: clusters.length,
            totalArticles: articles.length,
        });
    } catch (err) {
        if (err instanceof BackendError) {
            return NextResponse.json({ error: err.message }, { status: 502 });
        }
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
