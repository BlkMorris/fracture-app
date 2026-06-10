"use client";

import Link from "next/link";
import { ArrowLeft, Share2, Clock, Users, Layers } from "lucide-react";
import { DivergenceBadge, CategoryBadge, formatTimeAgo } from "@/components/ui";
import type { StoryCluster } from "@/types";
import { motion } from "framer-motion";

interface StoryHeaderProps {
  cluster: StoryCluster;
}

export default function StoryHeader({ cluster }: StoryHeaderProps) {
  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
    } catch {
      /* silent fail */
    }
  };

  return (
    <motion.header
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{ marginBottom: 32 }}
    >
      {/* Navigation row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 20,
        }}
      >
        <Link
          href="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            fontWeight: 600,
            color: "var(--color-muted)",
            textDecoration: "none",
            letterSpacing: "0.04em",
            transition: "color 0.15s",
          }}
        >
          <ArrowLeft size={14} /> Back to stories
        </Link>

        <button
          onClick={handleShare}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            fontWeight: 600,
            color: "var(--color-muted)",
            background: "none",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-sm)",
            padding: "5px 12px",
            cursor: "pointer",
            transition: "all 0.15s",
          }}
        >
          <Share2 size={12} /> Share
        </button>
      </div>

      {/* Category + status */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 12,
        }}
      >
        <CategoryBadge category={cluster.topicCategory} />
        {cluster.isFractured && (
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 9,
              fontWeight: 800,
              letterSpacing: "0.1em",
              color: "var(--color-diverge-high)",
              backgroundColor: "var(--color-diverge-high-bg)",
              padding: "3px 10px",
              borderRadius: 2,
              border: "1px solid var(--color-diverge-high)",
            }}
          >
            FRACTURED
          </span>
        )}
      </div>

      {/* Headline */}
      <h1
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 40,
          fontWeight: 400,
          color: "var(--color-text-strong)",
          margin: "0 0 16px",
          lineHeight: 1.15,
          maxWidth: 720,
        }}
      >
        {cluster.topic}
      </h1>

      {/* Meta row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          flexWrap: "wrap",
          paddingBottom: 20,
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        <DivergenceBadge score={cluster.divergenceScore} />
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--color-secondary)",
          }}
        >
          <Users size={14} /> {cluster.sourceCount} sources
        </span>
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--color-secondary)",
          }}
        >
          <Layers size={14} /> {cluster.articleCount} articles
        </span>
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--color-secondary)",
          }}
        >
          <Clock size={14} /> {formatTimeAgo(cluster.newestArticleAt)}
        </span>
      </div>
    </motion.header>
  );
}
