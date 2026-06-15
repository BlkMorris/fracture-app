"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { formatPulseTime } from "@/components/pulse/PulseChrome";

const tabs = [
  { label: "Top Stories", href: "/" },
  { label: "Newest", href: "/newest" },
  { label: "Watchlist", href: "/watchlist" },
] as const;

export function PulseHomeTabs({ updatedAt }: { updatedAt?: string | null }) {
  const pathname = usePathname();

  return (
    <nav className="pulse-tabs" aria-label="Story filters">
      <div>
        {tabs.map((tab) => {
          const active = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
          return (
            <Link className={active ? "is-active" : ""} href={tab.href} key={tab.href}>
              {tab.label}
            </Link>
          );
        })}
      </div>
      <p>Updated {formatPulseTime(updatedAt)} <span /></p>
    </nav>
  );
}
