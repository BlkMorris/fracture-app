import { NextRequest, NextResponse } from 'next/server';
import { backendFetch, transformCluster, BackendError } from '../_lib/backend';

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
        return NextResponse.json({
            stories: items.map(transformCluster),
            total: raw.total ?? 0,
        });
    } catch (err) {
        if (err instanceof BackendError) {
            return NextResponse.json({ error: err.message }, { status: 502 });
        }
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
