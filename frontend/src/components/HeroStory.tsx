"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { StoryCluster } from "@/types";
import { CategoryBadge, fdiBadgeClass, formatTimeAgo } from "./ui";
import { severityTier } from "@/lib/TERMINOLOGY_CONSTANTS";

interface HeroStoryProps {
  story: StoryCluster;
}

/* Category → gradient fallback when no image */
function categoryGradient(cat: string): string {
  const gradients: Record<string, string> = {
    politics: "linear-gradient(135deg, #1a1035 0%, #0c0d12 100%)",
    economy: "linear-gradient(135deg, #0d1a1a 0%, #0c0d12 100%)",
    world: "linear-gradient(135deg, #0d1420 0%, #0c0d12 100%)",
    conflict: "linear-gradient(135deg, #1a0d0d 0%, #0c0d12 100%)",
    elections: "linear-gradient(135deg, #1a1520 0%, #0c0d12 100%)",
  };
  return gradients[cat] || "linear-gradient(135deg, #111318 0%, #0c0d12 100%)";
}

export function HeroStory({ story }: HeroStoryProps) {
  const score = story.divergenceScore ?? 0;
  const tier = severityTier(story.divergenceScore);
  if (!story.id) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <Link href={`/story/${story.id}`} className="block no-underline">
        <div className="ns-card-hero grid grid-cols-1 md:grid-cols-[45fr_55fr]" style={{ minHeight: 420 }}>
          {/* ── Left Panel ── */}
          <div className="flex flex-col justify-center p-8 md:p-9 order-2 md:order-1">
            <div className="flex items-center gap-2 mb-4">
              <CategoryBadge category={story.topicCategory} />
              <span className={fdiBadgeClass(score)}>
                FDI {Math.round(score)} · {tier}
              </span>
            </div>

            <h1
              className="text-[var(--color-text-strong)] mb-4 leading-[1.1]"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(28px, 4vw, 44px)",
                fontWeight: 400,
                fontStyle: "italic",
                margin: "0 0 16px",
              }}
            >
              {story.topic}
            </h1>

            {story.summary && (
              <p
                className="text-[var(--color-secondary)] mb-6 line-clamp-3"
                style={{ fontFamily: "var(--font-body)", fontSize: 15, lineHeight: 1.6 }}
              >
                {story.summary}
              </p>
            )}

            {/* Source count + time */}
            <div
              className="flex items-center gap-3 mb-6"
              style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-muted)" }}
            >
              <span>{story.sourceCount} outlets</span>
              <span>·</span>
              <span>{story.articleCount} articles</span>
              <span>·</span>
              <span>{formatTimeAgo(story.newestArticleAt)}</span>
            </div>

            <div>
              <span className="ns-btn ns-btn-primary">
                Read Story →
              </span>
            </div>
          </div>

          {/* ── Right Panel — Image or Gradient ── */}
          <div
            className="relative min-h-[220px] md:min-h-0 order-1 md:order-2"
            style={{
              backgroundImage: story.imageUrl
                ? `url(${story.imageUrl})`
                : categoryGradient(story.topicCategory),
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            {/* Gradient overlay for text readability */}
            <div
              className="absolute inset-0"
              style={{
                background: "linear-gradient(to right, var(--color-surface) 0%, transparent 40%)",
              }}
            />
            {story.isFractured && (
              <div
                className="absolute top-4 right-4"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "var(--color-accent)",
                  background: "var(--color-accent-subtle)",
                  padding: "3px 10px",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid rgba(255, 59, 59, 0.25)",
                }}
              >
                Fractured
              </div>
            )}
          </div>
        </div>
      </Link>
    </motion.section>
  );
}
