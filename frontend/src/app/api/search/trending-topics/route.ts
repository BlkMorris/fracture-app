import { NextResponse } from 'next/server';
import { backendFetch } from '../../_lib/backend';

export async function GET() {
    try {
        const raw = await backendFetch<string[]>('/narrative/trending-topics');
        return NextResponse.json(raw);
    } catch {
        return NextResponse.json([]);
    }
}
