import { NextResponse } from 'next/server';
import { backendFetch, transformSource, BackendError } from '../_lib/backend';

export async function GET() {
    try {
        const raw = await backendFetch<unknown[]>('/sources');
        return NextResponse.json(raw.map(transformSource));
    } catch (err) {
        if (err instanceof BackendError) {
            return NextResponse.json({ error: err.message }, { status: 502 });
        }
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
