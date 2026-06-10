"use client";

import Link from "next/link";
import type { StoryCluster } from "@/types";
import { DivergenceBadge, formatTimeAgo } from "./ui";

interface StoryListRowProps {
  story: StoryCluster;
}

export default function StoryListRow({ story }: StoryListRowProps) {
  const score = story.divergenceScore ?? 0;
  if (!story.id) return null;

  return (
    <Link
      href={`/story/${story.id}`}
      className="ns-feed-row no-underline flex items-center gap-3 group"
      style={{ minHeight: 80 }}
    >
      {/* Thumbnail */}
      {story.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={story.imageUrl}
          alt={story.topic}
          className="rounded-sm shrink-0 opacity-60 group-hover:opacity-80 transition-opacity"
          style={{
            width: 72,
            height: 72,
            objectFit: "cover",
            borderRadius: "var(--radius-sm)",
          }}
        />
      ) : (
        <div
          className="shrink-0 rounded-sm"
          style={{
            width: 72,
            height: 72,
            borderRadius: "var(--radius-sm)",
            background: "var(--color-surface-alt)",
          }}
        />
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h3
          className="text-text-strong line-clamp-2"
          style={{
            fontFamily: "var(--font-condensed)",
            fontSize: 16,
            fontWeight: 600,
            lineHeight: 1.3,
            margin: 0,
          }}
        >
          {story.topic}
        </h3>
        <div
          className="flex items-center gap-2 mt-1"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--color-muted)",
          }}
        >
          <DivergenceBadge score={score} size="sm" />
          <span>{story.sourceCount} sources</span>
          <span>·</span>
          <span>{formatTimeAgo(story.newestArticleAt)}</span>
        </div>
      </div>
    </Link>
  );
}
