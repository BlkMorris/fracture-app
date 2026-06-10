import { NextRequest, NextResponse } from 'next/server';
import { backendFetch, BackendError } from '../_lib/backend';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = request.nextUrl;
        const q = searchParams.get('q') || '';
        const page = searchParams.get('page') || '1';
        const limit = searchParams.get('limit') || '20';

        if (q.length < 2) {
            return NextResponse.json({ clusters: [], articles: [], relatedTopics: [], totalClusters: 0, totalArticles: 0 });
        }

        const raw = await backendFetch(
            `/narrative/discover?q=${encodeURIComponent(q)}&page=${page}&limit=${limit}`,
        );
        return NextResponse.json(raw);
    } catch (err) {
        if (err instanceof BackendError) {
            return NextResponse.json({ error: err.message }, { status: 502 });
        }
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
