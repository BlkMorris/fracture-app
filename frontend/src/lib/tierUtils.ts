import type { UserRole } from '@/types';

const ROLE_HIERARCHY: UserRole[] = ['free', 'pro', 'analyst', 'enterprise', 'admin'];

export function roleIndex(role: UserRole): number {
    return ROLE_HIERARCHY.indexOf(role);
}

export function hasRole(userRole: UserRole, minRole: UserRole): boolean {
    return roleIndex(userRole) >= roleIndex(minRole);
}

export function isPaidTier(role: UserRole | undefined): boolean {
    if (!role) return false;
    return hasRole(role, 'pro');
}

export function isEnterpriseTier(role: UserRole | undefined): boolean {
    if (!role) return false;
    return hasRole(role, 'enterprise');
}

export function tierLabel(role: UserRole): string {
    switch (role) {
        case 'free': return 'Free';
        case 'pro': return 'Pro';
        case 'analyst': return 'Analyst';
        case 'enterprise': return 'Enterprise';
        case 'admin': return 'Admin';
        default: return 'Free';
    }
}
