#!/usr/bin/env python3
"""Write the redesigned Navbar.tsx (Whitmore direction)."""

from pathlib import Path

NAVBAR_TSX = r""""use client";

import Link from "next/link";
import { useState, useRef, useEffect, useCallback } from "react";
import { Menu, X, Search, Bell } from "lucide-react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { isPaidTier, isEnterpriseTier, tierLabel } from "@/lib/tierUtils";

// ── Helpers ──────────────────────────────────────────
function getInitials(
  displayName: string | null,
  email: string | undefined,
): string {
  if (displayName) {
    return displayName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  return (email?.[0] || "?").toUpperCase();
}

// ── UserAvatar ───────────────────────────────────────
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
  const enterprise = isEnterpriseTier(user.role);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-center w-8 h-8 rounded-full text-xs font-semibold cursor-pointer select-none"
        style={{ backgroundColor: "#1B2A4A", color: "#FFFFFF" }}
      >
        {initials}
      </button>

      {open && (
        <div
          className="absolute top-full right-0 mt-1 min-w-[200px] rounded shadow-sm py-1 z-50"
          style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid #E8E8E8",
          }}
        >
          {/* Email + tier */}
          <div className="px-4 py-2">
            <div className="text-xs truncate" style={{ color: "#5A5A5A" }}>
              {user.email}
            </div>
            {showTierBadge && paid && (
              <span className="ns-badge ns-badge-fractured mt-1 inline-block">
                {tierLabel(user.role)}
              </span>
            )}
          </div>

          <div style={{ borderTop: "1px solid #E8E8E8", margin: "4px 0" }} />

          {/* Menu items */}
          {enterprise && (
            <Link
              href="/dashboard"
              onClick={close}
              className="block text-sm px-4 py-2 transition-colors duration-150"
              style={{ color: "#5A5A5A" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#F8F8F6";
                e.currentTarget.style.color = "#1A1A1A";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.color = "#5A5A5A";
              }}
            >
              Dashboard
            </Link>
          )}
          <Link
            href="/account"
            onClick={close}
            className="block text-sm px-4 py-2 transition-colors duration-150"
            style={{ color: "#5A5A5A" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#F8F8F6";
              e.currentTarget.style.color = "#1A1A1A";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
              e.currentTarget.style.color = "#5A5A5A";
            }}
          >
            Account
          </Link>

          <div style={{ borderTop: "1px solid #E8E8E8", margin: "4px 0" }} />

          <button
            onClick={() => {
              logout();
              close();
            }}
            className="block w-full text-left text-sm px-4 py-2 transition-colors duration-150 cursor-pointer"
            style={{ color: "#5A5A5A" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#F8F8F6";
              e.currentTarget.style.color = "#1A1A1A";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
              e.currentTarget.style.color = "#5A5A5A";
            }}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

// ── Navbar ───────────────────────────────────────────
export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const { user, isAuthenticated } = useAuth();
  const drawerRef = useRef<HTMLDivElement>(null);

  const navItems = [
    { label: "Today", href: "/" },
    { label: "Stories", href: "/search" },
    { label: "Briefing", href: "/briefing" },
    { label: "Pricing", href: "/pricing" },
  ];

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const paid = isPaidTier(user?.role);

  return (
    <nav className="ns-navbar">
      <div className="ns-navbar-inner">
        {/* ── Logo ───────────────────────────────── */}
        <Link
          href="/"
          className="flex items-center"
          style={{ textDecoration: "none", flexShrink: 0 }}
        >
          <span
            style={{
              fontFamily:
                "var(--font-instrument-serif, 'Instrument Serif', Georgia, serif)",
              fontWeight: 400,
              fontSize: 22,
              letterSpacing: "0.04em",
              color: "#1A1A1A",
            }}
          >
            FRACTURE
          </span>
        </Link>

        {/* ── Desktop Nav Links ──────────────────── */}
        <div
          className="hidden lg:flex items-center"
          style={{ marginLeft: "auto", gap: 24 }}
        >
          <div className="flex items-center" style={{ gap: 20 }}>
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`ns-nav-link${isActive(item.href) ? " active" : ""}`}
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* ── Right‑side actions ────────────────── */}
          <div className="flex items-center" style={{ gap: 12 }}>
            {/* Search icon */}
            <button
              className="flex items-center justify-center rounded cursor-pointer"
              style={{
                width: 36,
                height: 36,
                backgroundColor: "transparent",
                color: "#5A5A5A",
                border: "none",
                transition: "background-color 150ms ease, color 150ms ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#F8F8F6";
                e.currentTarget.style.color = "#1A1A1A";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.color = "#5A5A5A";
              }}
              aria-label="Search"
            >
              <Search size={18} />
            </button>

            {/* Bell icon */}
            <button
              className="relative flex items-center justify-center rounded cursor-pointer"
              style={{
                width: 36,
                height: 36,
                backgroundColor: "transparent",
                color: "#5A5A5A",
                border: "none",
                transition: "background-color 150ms ease, color 150ms ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#F8F8F6";
                e.currentTarget.style.color = "#1A1A1A";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.color = "#5A5A5A";
              }}
              aria-label="Notifications"
            >
              <Bell size={18} />
              {/* Red badge */}
              <span
                className="absolute flex items-center justify-center"
                style={{
                  top: 4,
                  right: 4,
                  width: 16,
                  height: 16,
                  borderRadius: "50%",
                  backgroundColor: "#D03027",
                  color: "#FFFFFF",
                  fontSize: 9,
                  fontWeight: 700,
                  lineHeight: 1,
                }}
              >
                3
              </span>
            </button>

            {/* Divider */}
            <div
              style={{
                width: 1,
                height: 24,
                backgroundColor: "#E8E8E8",
                margin: "0 4px",
              }}
            />

            {/* Auth actions */}
            {!isAuthenticated && (
              <>
                <Link
                  href="/login"
                  className="ns-btn ns-btn-outline-dark ns-btn-sm"
                >
                  Sign in
                </Link>
                <Link
                  href="/register"
                  className="ns-btn ns-btn-primary ns-btn-sm"
                >
                  Get Started
                </Link>
              </>
            )}

            {isAuthenticated && !paid && (
              <>
                <Link
                  href="/pricing"
                  className="text-xs font-semibold transition-colors duration-150"
                  style={{ color: "#D03027" }}
                >
                  Upgrade →
                </Link>
                <UserAvatar />
              </>
            )}

            {isAuthenticated && paid && <UserAvatar showTierBadge />}
          </div>
        </div>

        {/* ── Mobile Hamburger ───────────────────── */}
        <button
          className="lg:hidden p-2 transition-colors duration-150 ml-auto cursor-pointer"
          style={{ color: "#5A5A5A" }}
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Open menu"
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* ── Mobile Drawer ──────────────────────── */}
      {mobileOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            style={{ backgroundColor: "rgba(0,0,0,0.2)" }}
            onClick={() => setMobileOpen(false)}
          />
          <div
            ref={drawerRef}
            className="fixed top-0 right-0 w-72 h-full z-50 flex flex-col"
            style={{
              backgroundColor: "#FFFFFF",
              borderLeft: "1px solid #E8E8E8",
            }}
          >
            {/* Close button */}
            <div className="flex justify-end p-4">
              <button
                className="p-2 transition-colors duration-150 cursor-pointer"
                style={{ color: "#5A5A5A" }}
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
              >
                <X size={24} />
              </button>
            </div>

            {/* Nav links */}
            <div className="flex flex-col">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-sm px-6 py-3 transition-colors duration-150"
                  style={{
                    borderBottom: "1px solid #E8E8E8",
                    color: isActive(item.href) ? "#1A1A1A" : "#5A5A5A",
                    fontWeight: isActive(item.href) ? 600 : 400,
                    backgroundColor: isActive(item.href)
                      ? "#F8F8F6"
                      : "transparent",
                  }}
                  onClick={() => setMobileOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
            </div>

            {/* Auth section */}
            <div
              className="px-6 py-4 flex flex-col gap-3 mt-auto"
              style={{ borderTop: "1px solid #E8E8E8" }}
            >
              {!isAuthenticated && (
                <>
                  <Link
                    href="/login"
                    className="ns-btn ns-btn-outline-dark ns-btn-sm ns-btn-full"
                    onClick={() => setMobileOpen(false)}
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/register"
                    className="ns-btn ns-btn-primary ns-btn-sm ns-btn-full"
                    onClick={() => setMobileOpen(false)}
                  >
                    Get Started
                  </Link>
                </>
              )}
              {isAuthenticated && !paid && (
                <>
                  <Link
                    href="/pricing"
                    className="text-xs font-semibold transition-colors duration-150"
                    style={{ color: "#D03027" }}
                    onClick={() => setMobileOpen(false)}
                  >
                    Upgrade →
                  </Link>
                  <div className="flex items-center gap-3">
                    <span
                      className="flex items-center justify-center w-8 h-8 rounded-full text-xs font-semibold"
                      style={{ backgroundColor: "#1B2A4A", color: "#FFFFFF" }}
                    >
                      {getInitials(user?.displayName ?? null, user?.email)}
                    </span>
                    <span
                      className="text-sm truncate"
                      style={{ color: "#5A5A5A" }}
                    >
                      {user?.email}
                    </span>
                  </div>
                </>
              )}
              {isAuthenticated && paid && (
                <div className="flex items-center gap-3">
                  <span
                    className="flex items-center justify-center w-8 h-8 rounded-full text-xs font-semibold"
                    style={{ backgroundColor: "#1B2A4A", color: "#FFFFFF" }}
                  >
                    {getInitials(user?.displayName ?? null, user?.email)}
                  </span>
                  <div className="flex flex-col">
                    <span
                      className="text-sm truncate"
                      style={{ color: "#5A5A5A" }}
                    >
                      {user?.email}
                    </span>
                    <span className="ns-badge ns-badge-fractured mt-0.5 inline-block w-fit">
                      {tierLabel(user!.role)}
                    </span>
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
"""

out = Path(__file__).resolve().parent / "src" / "components" / "Navbar.tsx"
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(NAVBAR_TSX.lstrip("\n"), encoding="utf-8")
print(f"Wrote {out}  ({out.stat().st_size:,} bytes)")
