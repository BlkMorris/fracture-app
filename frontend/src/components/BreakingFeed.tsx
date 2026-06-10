"use client";

import Link from "next/link";
import type { LatestArticle } from "@/types";
import { formatTimeAgo } from "./ui";

interface BreakingFeedProps {
  items: LatestArticle[];
}

export function BreakingFeed({ items }: BreakingFeedProps) {
  if (!items.length) return null;

  return (
    <div>
      {items.map((item, idx) => (
        <Link
          key={item.id}
          href={item.storyClusterId ? `/story/${item.storyClusterId}` : "#"}
          className="flex items-center gap-3 no-underline cursor-pointer transition-colors hover:bg-[var(--color-surface-alt)]"
          style={{
            height: 52,
            padding: "0 12px",
            borderBottom: "1px solid var(--color-border)",
            borderLeft: idx === 0 ? "2px solid var(--color-accent)" : "2px solid transparent",
          }}
        >
          {/* Source pill */}
          <span
            className="shrink-0 ns-cat-pill"
            style={{ fontSize: 9 }}
          >
            {item.source.name}
          </span>

          {/* Headline — single line truncated */}
          <span
            className="flex-1 min-w-0 truncate text-[var(--color-text)]"
            style={{ fontFamily: "var(--font-condensed)", fontSize: 14, fontWeight: 600 }}
          >
            {item.title}
          </span>

          {/* Timestamp */}
          <span
            className="shrink-0 text-[var(--color-muted)]"
            style={{ fontFamily: "var(--font-mono)", fontSize: 10 }}
          >
            {formatTimeAgo(item.publishedAt)}
          </span>
        </Link>
      ))}

      <Link
        href="/search"
        className="flex items-center justify-center py-3 text-[var(--color-accent)] hover:text-[var(--color-text-strong)] transition-colors"
        style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}
      >
        View All Stories →
      </Link>
    </div>
  );
}
