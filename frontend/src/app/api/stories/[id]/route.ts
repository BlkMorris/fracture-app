import { NextResponse } from 'next/server';
import { backendFetch, transformStoryDetail, BackendError } from '../../_lib/backend';

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const { id } = await params;
    try {
        const raw = await backendFetch(`/narrative/cluster/${id}`);
        const data = transformStoryDetail(raw);
        return NextResponse.json(data);
    } catch (err) {
        if (err instanceof BackendError) {
            if (err.status === 404) return NextResponse.json({ error: 'Not found' }, { status: 404 });
            return NextResponse.json({ error: err.message }, { status: 502 });
        }
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
