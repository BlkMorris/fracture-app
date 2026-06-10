"use client";

import Link from "next/link";
import type { StoryCluster, LatestArticle } from "@/types";
import { CategoryBadge, StatusBadge, fdiBadgeClass, formatTimeAgo } from "./ui";

/* ── Story Card (Zone 2 secondary grid) ───────────────── */
interface StoryCardProps {
  story: StoryCluster;
}

export function StoryCard({ story }: StoryCardProps) {
  const score = story.divergenceScore ?? 0;
  if (!story.id) return null;

  return (
    <Link href={`/story/${story.id}`} className="block no-underline ns-card group">
      {/* Image */}
      {story.imageUrl && (
        <div className="relative overflow-hidden" style={{ height: 160 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={story.imageUrl}
            alt={story.topic}
            className="w-full h-full object-cover opacity-60 group-hover:opacity-75 transition-opacity"
          />
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(to top, var(--color-surface) 5%, transparent 55%)" }}
          />
        </div>
      )}
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <CategoryBadge category={story.topicCategory} />
          <StatusBadge status={story.status} />
        </div>
        <h3
          className="text-[var(--color-text-strong)] mb-3 line-clamp-2"
          style={{ fontFamily: "var(--font-condensed)", fontSize: 17, fontWeight: 600, lineHeight: 1.3, margin: "0 0 12px" }}
        >
          {story.topic}
        </h3>
        <div
          className="flex items-center gap-2 flex-wrap"
          style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-muted)" }}
        >
          <span className={fdiBadgeClass(score)}>FDI {Math.round(score)}</span>
          <span>{story.sourceCount} sources</span>
          <span>·</span>
          <span>{formatTimeAgo(story.newestArticleAt)}</span>
        </div>
      </div>
    </Link>
  );
}

/* ── Compact Card (for search results, etc.) ──────────── */
interface CompactCardProps {
  story: StoryCluster;
}

export function CompactCard({ story }: CompactCardProps) {
  const score = story.divergenceScore ?? 0;
  if (!story.id) return null;

  return (
    <Link href={`/story/${story.id}`} className="flex flex-col no-underline ns-card group">
      {story.imageUrl && (
        <div className="relative overflow-hidden" style={{ height: 160 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={story.imageUrl}
            alt={story.topic}
            className="w-full h-full object-cover opacity-55 group-hover:opacity-70 transition-opacity"
          />
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(to top, var(--color-surface) 5%, transparent 55%)" }}
          />
          <div className="absolute top-2 left-2">
            <span className={fdiBadgeClass(score)} style={{ fontSize: 10 }}>FDI {Math.round(score)}</span>
          </div>
          <span
            className="absolute bottom-1.5 left-2"
            style={{ fontFamily: "var(--font-mono)", fontSize: 8, fontWeight: 700, letterSpacing: "0.14em", color: "var(--color-accent)", textTransform: "uppercase" }}
          >
            {story.topicCategory?.toUpperCase() || "GENERAL"}
          </span>
        </div>
      )}
      <div className="p-3.5 flex-1 flex flex-col">
        <h3
          className="text-[var(--color-text-strong)] mb-2 line-clamp-2"
          style={{ fontFamily: "var(--font-condensed)", fontSize: 14, fontWeight: 600, lineHeight: 1.35, margin: "0 0 8px" }}
        >
          {story.topic}
        </h3>
        <div
          className="flex items-center gap-2 mt-auto"
          style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-muted)" }}
        >
          <span>{story.sourceCount} src</span>
          <span>{formatTimeAgo(story.newestArticleAt)}</span>
        </div>
      </div>
    </Link>
  );
}

/* ── List Card (article row) ──────────────────────────── */
interface ListCardProps {
  article: LatestArticle;
}

export function ListCard({ article }: ListCardProps) {
  const linkHref = article.storyClusterId ? `/story/${article.storyClusterId}` : "#";

  return (
    <Link href={linkHref} className="ns-feed-row no-underline flex gap-3">
      {article.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={article.imageUrl}
          alt={article.title}
          className="rounded-sm shrink-0 opacity-70"
          style={{ width: 80, height: 60, objectFit: "cover", borderRadius: "var(--radius-sm)" }}
        />
      )}
      <div className="flex-1 min-w-0">
        <span
          className="text-[var(--color-accent)]"
          style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}
        >
          {article.source.name}
        </span>
        <h4
          className="text-[var(--color-text-strong)] line-clamp-2"
          style={{ fontFamily: "var(--font-condensed)", fontSize: 14, fontWeight: 600, lineHeight: 1.35, margin: "2px 0 0" }}
        >
          {article.title}
        </h4>
        <span
          className="text-[var(--color-muted)] block mt-0.5"
          style={{ fontFamily: "var(--font-mono)", fontSize: 10 }}
        >
          {formatTimeAgo(article.publishedAt)}
        </span>
      </div>
    </Link>
  );
}
