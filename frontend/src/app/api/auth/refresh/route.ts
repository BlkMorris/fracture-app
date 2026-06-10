import { getRefreshToken, authBackendPost, authResponse, clearAndReturn } from '../_helpers';

export async function POST() {
    try {
        const refreshToken = await getRefreshToken();
        if (!refreshToken) {
            return clearAndReturn(401);
        }

        const { ok, data } = await authBackendPost('/auth/refresh', { refreshToken });

        if (!ok) {
            return clearAndReturn(401);
        }

        const { refreshToken: newRefresh, ...rest } = data;
        return authResponse(rest, newRefresh);
    } catch {
        return clearAndReturn(401);
    }
}
