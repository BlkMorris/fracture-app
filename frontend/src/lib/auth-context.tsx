'use client';
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Auth Context — React context for auth state
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
import { createContext, useContext, useCallback, useEffect, useState, type ReactNode } from 'react';
import type { User, UserRole } from '@/types';
import { setAccessToken, setLogoutCallback, getAccessToken } from './auth-tokens';
import { hasRole as checkRole } from './tierUtils';

interface AuthContextValue {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string, displayName?: string) => Promise<void>;
    logout: () => Promise<void>;
    refreshSession: () => Promise<void>;
    hasRole: (minRole: UserRole) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const clearAuth = useCallback(() => {
        setAccessToken(null);
        setUser(null);
    }, []);

    useEffect(() => {
        setLogoutCallback(clearAuth);
    }, [clearAuth]);

    const refreshSession = useCallback(async () => {
        try {
            const res = await fetch('/api/auth/refresh', {
                method: 'POST',
                credentials: 'include',
            });
            if (!res.ok) {
                clearAuth();
                return;
            }
            const data = await res.json();
            setAccessToken(data.accessToken);
            setUser(data.user);
        } catch {
            clearAuth();
        }
    }, [clearAuth]);

    // Silent session restore on mount
    useEffect(() => {
        refreshSession().finally(() => setIsLoading(false));
    }, [refreshSession]);

    const login = async (email: string, password: string) => {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
            credentials: 'include',
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({ message: 'Login failed' }));
            throw new Error(err.message || 'Login failed');
        }
        const data = await res.json();
        setAccessToken(data.accessToken);
        setUser(data.user);
    };

    const register = async (email: string, password: string, displayName?: string) => {
        const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, displayName }),
            credentials: 'include',
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({ message: 'Registration failed' }));
            throw new Error(err.message || 'Registration failed');
        }
        const data = await res.json();
        setAccessToken(data.accessToken);
        setUser(data.user);
    };

    const logout = async () => {
        try {
            const token = getAccessToken();
            await fetch('/api/auth/logout', {
                method: 'POST',
                credentials: 'include',
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
        } finally {
            clearAuth();
        }
    };

    const hasRole = (minRole: UserRole) => {
        if (!user) return false;
        return checkRole(user.role, minRole);
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                isAuthenticated: !!user,
                isLoading,
                login,
                register,
                logout,
                refreshSession,
                hasRole,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
