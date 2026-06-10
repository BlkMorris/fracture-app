import { NextRequest, NextResponse } from 'next/server';
import { authBackendPost, authResponse } from '../_helpers';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { ok, status, data } = await authBackendPost('/auth/login', body);

        if (!ok) {
            return NextResponse.json(data ?? { message: 'Login failed' }, { status });
        }

        const { refreshToken, ...rest } = data;
        return authResponse(rest, refreshToken);
    } catch {
        return NextResponse.json({ message: 'Internal error' }, { status: 500 });
    }
}
