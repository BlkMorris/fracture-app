import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4000/api/v1';

export async function GET(request: NextRequest) {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    try {
        const res = await fetch(`${BACKEND_URL}/auth/profile`, {
            headers: { Authorization: authHeader },
        });
        const data = await res.json();
        if (!res.ok) return NextResponse.json(data, { status: res.status });
        return NextResponse.json(data);
    } catch {
        return NextResponse.json({ message: 'Internal error' }, { status: 500 });
    }
}
