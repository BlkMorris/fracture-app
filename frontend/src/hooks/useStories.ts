'use client';
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Hooks — TanStack Query data fetching hooks
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { HomepageData, StoryDetail, StoryCluster, PlatformStats, SearchResult } from '@/types';

async function apiFetch<T>(url: string): Promise<T> {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json();
}

export function useHomepage() {
    return useQuery<HomepageData>({
        queryKey: ['homepage'],
        queryFn: () => apiFetch('/api/homepage'),
        staleTime: 30_000,
    });
}

export function useStories(params?: { page?: number; limit?: number; search?: string }) {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.search) searchParams.set('search', params.search);
    const qs = searchParams.toString();

    return useQuery<{ stories: StoryCluster[]; total: number }>({
        queryKey: ['stories', params],
        queryFn: () => apiFetch(`/api/stories${qs ? `?${qs}` : ''}`),
        placeholderData: keepPreviousData,
    });
}

export function useStory(id: string | null) {
    return useQuery<StoryDetail>({
        queryKey: ['story', id],
        queryFn: () => apiFetch(`/api/stories/${id}`),
        enabled: !!id,
    });
}

export function useStats() {
    return useQuery<PlatformStats>({
        queryKey: ['stats'],
        queryFn: () => apiFetch('/api/stats'),
        staleTime: 30_000,
    });
}

export function useSearchDiscover(q: string, page = 1, limit = 20) {
    return useQuery<SearchResult>({
        queryKey: ['search', q, page, limit],
        queryFn: () => apiFetch(`/api/search?q=${encodeURIComponent(q)}&page=${page}&limit=${limit}`),
        enabled: q.length >= 2,
    });
}

export function useTrendingTopics() {
    return useQuery<string[]>({
        queryKey: ['trendingTopics'],
        queryFn: () => apiFetch('/api/search/trending-topics'),
        staleTime: 5 * 60 * 1000,
    });
}
