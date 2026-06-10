import { NextRequest } from 'next/server';
import { clearAndReturn } from '../_helpers';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4000/api/v1';

export async function POST(request: NextRequest) {
    try {
        const authHeader = request.headers.get('Authorization');
        if (authHeader) {
            await fetch(`${BACKEND_URL}/auth/logout`, {
                method: 'POST',
                headers: { Authorization: authHeader },
            }).catch(() => { });
        }
    } finally {
        return clearAndReturn(204);
    }
}
