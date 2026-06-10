import { NextResponse } from 'next/server';
import { backendFetch, transformHomepageResponse, BackendError } from '../_lib/backend';

export async function GET() {
    try {
        const raw = await backendFetch('/narrative/homepage');
        const data = transformHomepageResponse(raw);
        return NextResponse.json(data);
    } catch (err) {
        if (err instanceof BackendError) {
            return NextResponse.json({ error: err.message }, { status: 502 });
        }
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
