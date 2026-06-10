import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4000/api/v1';
const COOKIE_NAME = 'fracture_rt';
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 days

export function setRefreshCookie(refreshToken: string) {
    const isProduction = process.env.NODE_ENV === 'production';
    return {
        name: COOKIE_NAME,
        value: refreshToken,
        httpOnly: true,
        sameSite: 'lax' as const,
        path: '/api/auth',
        maxAge: COOKIE_MAX_AGE,
        secure: isProduction,
    };
}

export function clearRefreshCookie() {
    return {
        name: COOKIE_NAME,
        value: '',
        httpOnly: true,
        sameSite: 'lax' as const,
        path: '/api/auth',
        maxAge: 0,
        secure: process.env.NODE_ENV === 'production',
    };
}

export async function getRefreshToken(): Promise<string | null> {
    const cookieStore = await cookies();
    return cookieStore.get(COOKIE_NAME)?.value ?? null;
}

export async function authBackendPost(path: string, body: unknown) {
    const res = await fetch(`${BACKEND_URL}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => null);
    return { ok: res.ok, status: res.status, data };
}

export async function authBackendGet(path: string, token: string) {
    const res = await fetch(`${BACKEND_URL}${path}`, {
        headers: { Authorization: `Bearer ${token}` },
    });

    const data = await res.json().catch(() => null);
    return { ok: res.ok, status: res.status, data };
}

export function authResponse(data: Record<string, unknown>, refreshToken?: string, status = 200) {
    const res = NextResponse.json(data, { status });
    if (refreshToken) {
        res.cookies.set(setRefreshCookie(refreshToken));
    }
    return res;
}

export function clearAndReturn(status = 204) {
    const res = new NextResponse(null, { status });
    res.cookies.set(clearRefreshCookie());
    return res;
}
