"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PulseRelativeTime } from "@/components/pulse/PulseChrome";

const tabs = [
  { label: "Top Stories", href: "/" },
  { label: "Newest", href: "/newest" },
  { label: "Watchlist", href: "/watchlist" },
] as const;

export function PulseHomeTabs({ updatedAt }: { updatedAt?: string | null }) {
  const pathname = usePathname();
  const activeIndex = tabs.findIndex((tab) => tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href));
  const routeActiveIndex = Math.max(activeIndex, 0);
  const [displayedActiveIndex, setDisplayedActiveIndex] = useState(routeActiveIndex);

  useEffect(() => {
    setDisplayedActiveIndex(routeActiveIndex);
  }, [routeActiveIndex]);

  return (
    <nav className="pulse-tabs" aria-label="Story filters">
      <div className="pulse-tab-list" data-active={displayedActiveIndex}>
        <span className="pulse-tab-indicator" aria-hidden="true" />
        {tabs.map((tab, index) => {
          const active = displayedActiveIndex === index;
          return (
            <Link className={active ? "is-active" : ""} href={tab.href} onClick={() => setDisplayedActiveIndex(index)} key={tab.href}>
              {tab.label}
            </Link>
          );
        })}
      </div>
      <p>{updatedAt ? <>Updated <PulseRelativeTime value={updatedAt} fallback="..." /></> : "Updating"} <span /></p>
    </nav>
  );
}
