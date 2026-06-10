// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Auth Token Management — Module-scope memory storage
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

let accessToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;
let onLogout: (() => void) | null = null;

export function getAccessToken(): string | null {
    return accessToken;
}

export function setAccessToken(token: string | null) {
    accessToken = token;
}

export function setLogoutCallback(cb: () => void) {
    onLogout = cb;
}

export async function refreshAccessToken(): Promise<string | null> {
    // Deduplicate concurrent refresh calls
    if (refreshPromise) return refreshPromise;

    refreshPromise = (async () => {
        try {
            const res = await fetch('/api/auth/refresh', {
                method: 'POST',
                credentials: 'include',
            });

            if (!res.ok) {
                setAccessToken(null);
                onLogout?.();
                return null;
            }

            const data = await res.json();
            setAccessToken(data.accessToken);
            return data.accessToken;
        } catch {
            setAccessToken(null);
            onLogout?.();
            return null;
        } finally {
            refreshPromise = null;
        }
    })();

    return refreshPromise;
}

export async function authedFetch(url: string, options: RequestInit = {}): Promise<Response> {
    const token = getAccessToken();

    const doFetch = (t: string | null) =>
        fetch(url, {
            ...options,
            headers: {
                ...options.headers,
                ...(t ? { Authorization: `Bearer ${t}` } : {}),
            },
            credentials: 'include',
        });

    let res = await doFetch(token);

    if (res.status === 401 && token) {
        const newToken = await refreshAccessToken();
        if (newToken) {
            res = await doFetch(newToken);
        }
    }

    return res;
}
