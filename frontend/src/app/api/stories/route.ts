import { NextRequest, NextResponse } from 'next/server';
import { backendFetch, transformCluster, BackendError, isEnglishCluster } from '../_lib/backend';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = request.nextUrl;
        const page = searchParams.get('page') || '1';
        const limit = searchParams.get('limit') || '20';
        const search = searchParams.get('search') || '';

        const raw = await backendFetch<{ data?: unknown[]; stories?: unknown[]; total: number }>(
            `/narrative/stories?page=${page}&limit=${limit}${search ? `&search=${encodeURIComponent(search)}` : ''}`,
        );

        const items = raw.data ?? raw.stories ?? [];
        const stories = items.map(transformCluster).filter(isEnglishCluster);
        return NextResponse.json({
            stories,
            total: stories.length,
        });
    } catch (err) {
        if (err instanceof BackendError) {
            return NextResponse.json({ error: err.message }, { status: 502 });
        }
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
