"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { StoryCluster } from "@/types";
import { CategoryBadge, formatTimeAgo } from "./ui";
import { severityTier, severityColor } from "@/lib/TERMINOLOGY_CONSTANTS";

interface FracturedRowProps {
  stories: StoryCluster[];
}

export default function FracturedRow({ stories }: FracturedRowProps) {
  if (!stories.length) return null;

  return (
    <section>
      <h2 className="ns-section-header">Most Fractured</h2>

      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin" style={{ scrollSnapType: "x mandatory" }}>
        {stories.map((story, i) => (
          <FracturedCard key={story.id} story={story} index={i} />
        ))}
      </div>
    </section>
  );
}

function FracturedCard({ story, index }: { story: StoryCluster; index: number }) {
  const score = story.divergenceScore ?? 0;
  const tier = severityTier(score);
  const color = severityColor(tier);
  const pct = Math.min(score, 100);
  if (!story.id) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.35, ease: "easeOut" }}
      style={{ scrollSnapAlign: "start" }}
    >
      <Link
        href={`/story/${story.id}`}
        className="ns-card block no-underline group"
        style={{
          width: 300,
          borderTop: story.isFractured ? "2px solid var(--color-accent)" : "2px solid transparent",
        }}
      >
        {/* FDI Score — large mono */}
        <div className="p-4 pb-2 flex items-start justify-between">
          <div>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 28,
                fontWeight: 700,
                lineHeight: 1,
                color,
              }}
            >
              {Math.round(score)}
            </span>
            <span
              className="block mt-0.5"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.08em",
                textTransform: "uppercase" as const,
                color: "var(--color-muted)",
              }}
            >
              FDI · {tier}
            </span>
          </div>
          <CategoryBadge category={story.topicCategory} />
        </div>

        {/* Score bar */}
        <div className="px-4 mb-3">
          <div className="ns-score-bar-track">
            <div
              className="ns-score-bar-fill"
              style={{ width: `${pct}%`, backgroundColor: color }}
            />
          </div>
        </div>

        {/* Headline */}
        <div className="px-4 pb-4">
          <h3
            className="text-text-strong line-clamp-2 mb-2"
            style={{
              fontFamily: "var(--font-condensed)",
              fontSize: 16,
              fontWeight: 600,
              lineHeight: 1.3,
              margin: "0 0 8px",
            }}
          >
            {story.topic}
          </h3>

          {/* Meta */}
          <div
            className="flex items-center gap-2 flex-wrap"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              color: "var(--color-muted)",
            }}
          >
            <span>{story.sourceCount} sources</span>
            <span>·</span>
            <span>{story.articleCount} articles</span>
            <span>·</span>
            <span>{formatTimeAgo(story.newestArticleAt)}</span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
