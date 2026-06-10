import {
    severityTier,
    severityColor,
    categoryLabel,
    divDotClass,
    leanDotClass,
    leanTextClass,
} from '@/lib/TERMINOLOGY_CONSTANTS';
import type { FramingType } from '@/types';

/* ── Category Pill ────────────────────────────────────── */
interface CategoryBadgeProps {
    category: string;
    className?: string;
}

export function CategoryBadge({ category, className = '' }: CategoryBadgeProps) {
    return (
        <span className={`ns-cat-pill ${className}`}>
            {categoryLabel(category)}
        </span>
    );
}

/* ── FDI Badge (new ns-fdi-* classes) ─────────────────── */
interface DivergenceBadgeProps {
    score: number | null;
    showLabel?: boolean;
    size?: 'sm' | 'md' | 'lg';
}

export function fdiBadgeClass(score: number | null): string {
    if (score === null || score === undefined) return 'ns-fdi-badge ns-fdi-low';
    if (score >= 80) return 'ns-fdi-badge ns-fdi-ext';
    if (score >= 60) return 'ns-fdi-badge ns-fdi-high';
    if (score >= 30) return 'ns-fdi-badge ns-fdi-mod';
    return 'ns-fdi-badge ns-fdi-low';
}

export function fdiLabel(score: number | null): string {
    if (score === null || score === undefined) return 'FDI pending';
    return `FDI ${Math.round(score)} · ${severityTier(score)}`;
}

export function DivergenceBadge({ score, showLabel = true, size = 'md' }: DivergenceBadgeProps) {
    const tier = severityTier(score);
    const dotClass = score !== null && score !== undefined ? divDotClass(score) : 'ns-div-dot ns-div-dot-low';
    const value = score !== null && score !== undefined ? Math.round(score) : '—';
    const label = score !== null && score !== undefined ? tier : 'Not scored';

    if (size === 'lg') {
        return (
            <span className={fdiBadgeClass(score)} style={{ fontSize: 28, padding: '4px 10px' }}>
                {value}
            </span>
        );
    }

    return (
        <span
            className="inline-flex items-center gap-1.5"
            style={{ fontSize: size === 'sm' ? 11 : 12 }}
        >
            <span className={dotClass} style={size === 'sm' ? { width: 6, height: 6 } : {}} />
            {showLabel ? (
                <span className={fdiBadgeClass(score)} style={{ fontSize: size === 'sm' ? 10 : 11 }}>
                    FDI {value} · {label}
                </span>
            ) : (
                <span className={fdiBadgeClass(score)} style={{ fontSize: size === 'sm' ? 10 : 11 }}>
                    {value}
                </span>
            )}
        </span>
    );
}

export const FRAMING_LABELS: Record<FramingType, string> = {
    CONFLICT: 'Conflict',
    HUMAN_INTEREST: 'Human Interest',
    ECONOMIC: 'Economic',
    MORAL: 'Moral',
    RESPONSIBILITY: 'Responsibility',
};

export function framingColor(type: FramingType): string {
    switch (type) {
        case 'CONFLICT': return 'var(--color-amber)';
        case 'HUMAN_INTEREST': return 'var(--color-green)';
        case 'ECONOMIC': return 'var(--color-left)';
        case 'MORAL': return '#a78bfa';
        case 'RESPONSIBILITY': return 'var(--color-secondary)';
    }
}

export function divergenceInlineStyle(score: number | null): { color: string } {
    return { color: severityColor(severityTier(score)) };
}

/* ── Status Badge ─────────────────────────────────────── */
interface StatusBadgeProps {
    status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
    if (status === 'BREAKING') {
        return <span className="ns-badge ns-badge-breaking">Breaking</span>;
    }
    return null;
}

/* ── Source Pill ───────────────────────────────────────── */
interface SourcePillProps {
    name: string;
    lean?: number | null;
}

export function SourcePill({ name, lean }: SourcePillProps) {
    const dotClass = lean !== null && lean !== undefined ? leanDotClass(lean) : 'ns-div-dot ns-lean-dot-center';
    const textClass = lean !== null && lean !== undefined ? leanTextClass(lean) : 'ns-lean-center';

    return (
        <span
            className={`inline-flex items-center gap-1.5 text-xs font-medium ${textClass}`}
        >
            <span className={dotClass} style={{ width: 6, height: 6 }} />
            {name}
        </span>
    );
}

/* ── Skeleton Components ──────────────────────────────── */
export function SkeletonCard({ height = 200 }: { height?: number }) {
    return (
        <div
            className="ns-skeleton"
            style={{ height, borderRadius: 'var(--radius-md)' }}
            aria-busy="true"
        />
    );
}

export function SkeletonLine({ width = '100%', height = 16 }: { width?: string | number; height?: number }) {
    return (
        <div
            className="ns-skeleton"
            style={{ width, height, borderRadius: 'var(--radius-sm)' }}
            aria-busy="true"
        />
    );
}

/* ── Utility ──────────────────────────────────────────── */
export function formatTimeAgo(dateString: string | null): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
