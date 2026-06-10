"use client";

import Link from "next/link";
import { useState, useRef, useEffect, useCallback } from "react";
import { Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { isPaidTier, tierLabel } from "@/lib/tierUtils";

function getInitials(displayName: string | null, email: string | undefined): string {
  if (displayName) {
    return displayName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  }
  return (email?.[0] || "?").toUpperCase();
}

function UserAvatar({ showTierBadge }: { showTierBadge?: boolean }) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, close]);

  if (!user) return null;
  const initials = getInitials(user.displayName, user.email);
  const paid = isPaidTier(user.role);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Open account menu"
        aria-expanded={open}
        className="flex items-center justify-center w-8 h-8 rounded-full text-xs font-semibold cursor-pointer select-none bg-[var(--color-surface-alt)] text-[var(--color-text-strong)] border border-[var(--color-border)]"
      >
        {initials}
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-1 min-w-[200px] rounded shadow-lg py-1 z-50 bg-[var(--color-surface)] border border-[var(--color-border)]">
          <div className="px-4 py-2">
            <div className="text-xs truncate text-[var(--color-secondary)]">{user.email}</div>
            {showTierBadge && paid && (
              <span className="ns-badge ns-badge-fractured mt-1 inline-block">{tierLabel(user.role)}</span>
            )}
          </div>
          <div className="border-t border-[var(--color-border)] my-1" />
          <Link href="/pricing" onClick={close}
            className="block text-sm px-4 py-2 text-[var(--color-secondary)] hover:bg-[var(--color-surface-alt)] hover:text-[var(--color-text-strong)] transition-colors"
          >Plan & access</Link>
          <div className="border-t border-[var(--color-border)] my-1" />
          <button onClick={() => { logout(); close(); }}
            className="block w-full text-left text-sm px-4 py-2 text-[var(--color-secondary)] hover:bg-[var(--color-surface-alt)] hover:text-[var(--color-text-strong)] transition-colors cursor-pointer"
          >Sign out</button>
        </div>
      )}
    </div>
  );
}

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const { user, isAuthenticated } = useAuth();
  const drawerRef = useRef<HTMLDivElement>(null);
  const paid = isPaidTier(user?.role);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const NAV_LINKS = [
    { label: "Feed", href: "/" },
    { label: "Briefing", href: "/briefing" },
    { label: "Search", href: "/search" },
    { label: "Pricing", href: "/pricing" },
  ];

  return (
    <nav className="ns-navbar">
      <div className="ns-navbar-inner">
        {/* ── Logo + Desktop Nav ── */}
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 no-underline shrink-0">
            <span
              className="font-[var(--font-condensed)] text-lg tracking-[0.15em] uppercase text-[var(--color-text-strong)]"
              style={{ fontFamily: 'var(--font-condensed)', fontWeight: 700, fontSize: 18, letterSpacing: '0.15em' }}
            >
              FRACTURE
            </span>
          </Link>

          {/* ── Desktop Nav Links ── */}
          <div className="hidden lg:flex items-center gap-5">
            {NAV_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`ns-nav-link${isActive(item.href) ? " active" : ""}`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        {/* ── Right side ── */}
        <div className="hidden lg:flex items-center gap-4">
          {/* Live indicator */}
          <div className="flex items-center gap-1.5">
            <span className="ns-live-dot" />
            <span
              className="text-[var(--color-accent)] uppercase"
              style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600, letterSpacing: '0.1em' }}
            >
              Live
            </span>
          </div>

          {!isAuthenticated && (
            <div className="flex items-center gap-2">
              <Link href="/login" className="ns-btn ns-btn-ghost ns-btn-sm">Sign In</Link>
              <Link href="/register" className="ns-btn ns-btn-primary ns-btn-sm">Get Started</Link>
            </div>
          )}

          {isAuthenticated && (
            <div className="flex items-center gap-2">
              {!paid && (
                <Link
                  href="/pricing"
                  className="text-[var(--color-accent)] no-underline"
                  style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, letterSpacing: '0.04em' }}
                >
                  Upgrade →
                </Link>
              )}
              <div className="flex items-center gap-2">
                <div className="flex flex-col items-end">
                  <span
                    className="text-[var(--color-muted)] uppercase"
                    style={{ fontFamily: 'var(--font-mono)', fontSize: 8, fontWeight: 600, letterSpacing: '0.14em' }}
                  >
                    SIGNED IN AS
                  </span>
                  <span
                    className="text-[var(--color-secondary)]"
                    style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600 }}
                  >
                    {tierLabel(user!.role)}
                  </span>
                </div>
                <UserAvatar showTierBadge={paid} />
              </div>
            </div>
          )}
        </div>

        {/* ── Mobile Hamburger ── */}
        <button
          className="lg:hidden p-2 transition-colors ml-auto cursor-pointer text-[var(--color-secondary)]"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Open menu"
          aria-expanded={mobileOpen}
          aria-controls="mobile-navigation"
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* ── Mobile Drawer ── */}
      {mobileOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div
            id="mobile-navigation"
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Mobile navigation"
            className="fixed top-0 right-0 w-72 h-full z-50 flex flex-col bg-[var(--color-surface)] border-l border-[var(--color-border)]"
          >
            <div className="flex justify-end p-4">
              <button
                className="p-2 cursor-pointer text-[var(--color-secondary)]"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
              >
                <X size={24} />
              </button>
            </div>
            <div className="flex flex-col">
              {NAV_LINKS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-6 py-3 border-b border-[var(--color-border)] transition-colors ${
                    isActive(item.href)
                      ? "text-[var(--color-accent)] font-semibold bg-[var(--color-surface-alt)]"
                      : "text-[var(--color-secondary)]"
                  }`}
                  style={{ fontFamily: 'var(--font-condensed)', fontSize: 14, letterSpacing: '0.06em', textTransform: 'uppercase' }}
                  onClick={() => setMobileOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
            </div>
            <div className="px-6 py-4 flex flex-col gap-3 mt-auto border-t border-[var(--color-border)]">
              {!isAuthenticated && (
                <>
                  <Link href="/login" className="ns-btn ns-btn-ghost ns-btn-sm ns-btn-full" onClick={() => setMobileOpen(false)}>Sign In</Link>
                  <Link href="/register" className="ns-btn ns-btn-primary ns-btn-sm ns-btn-full" onClick={() => setMobileOpen(false)}>Get Started</Link>
                </>
              )}
              {isAuthenticated && (
                <div className="flex items-center gap-3">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full text-xs font-semibold bg-[var(--color-surface-alt)] text-[var(--color-text-strong)] border border-[var(--color-border)]">
                    {getInitials(user?.displayName ?? null, user?.email)}
                  </span>
                  <div className="flex flex-col">
                    <span className="text-sm truncate text-[var(--color-secondary)]">{user?.email}</span>
                    {paid && <span className="ns-badge ns-badge-fractured mt-0.5 inline-block w-fit">{tierLabel(user!.role)}</span>}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </nav>
  );
}
