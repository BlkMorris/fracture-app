"use client";

import { ExternalLink } from "lucide-react";
import { leanCategory, leanColor } from "@/lib/TERMINOLOGY_CONSTANTS";
import { formatTimeAgo, FRAMING_LABELS, framingColor } from "@/components/ui";
import type { Article } from "@/types";
import { motion } from "framer-motion";

interface ArticleCoverageCardProps {
  article: Article;
  index: number;
}

export default function ArticleCoverageCard({
  article,
  index,
}: ArticleCoverageCardProps) {
  const lean = article.politicalLeanScore;
  const cat = leanCategory(lean);
  const color = leanColor(lean);
  const framingType = article.framingType;
  const frameColor = framingType ? framingColor(framingType) : undefined;
  const framingLabel = framingType ? FRAMING_LABELS[framingType] : undefined;

  return (
    <motion.a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      style={{
        display: "block",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-md)",
        backgroundColor: "var(--color-surface)",
        padding: "14px 16px",
        textDecoration: "none",
        transition: "border-color 0.15s ease",
        cursor: "pointer",
      }}
    >
      {/* Source + lean */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div
            style={{
              width: 3,
              height: 20,
              borderRadius: 2,
              backgroundColor: color,
            }}
          />
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              fontWeight: 600,
              color: "var(--color-text-strong)",
            }}
          >
            {article.source?.name ?? "Unknown"}
          </span>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 9,
              fontWeight: 600,
              letterSpacing: "0.08em",
              color,
              opacity: 0.8,
            }}
          >
            {cat}
          </span>
        </div>
        <ExternalLink size={12} style={{ color: "var(--color-muted)" }} />
      </div>

      {/* Headline */}
      <h4
        style={{
          fontFamily: "var(--font-body)",
          fontSize: 13,
          fontWeight: 600,
          color: "var(--color-text-strong)",
          lineHeight: 1.4,
          margin: "0 0 8px",
        }}
      >
        {article.title}
      </h4>

      {/* Meta row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        {framingLabel && frameColor && (
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.08em",
              color: frameColor,
              backgroundColor: `color-mix(in srgb, ${frameColor} 14%, transparent)`,
              padding: "2px 8px",
              borderRadius: 2,
              textTransform: "uppercase",
            }}
          >
            {framingLabel}
          </span>
        )}
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color: "var(--color-muted)",
          }}
        >
          {formatTimeAgo(article.publishedAt)}
        </span>
        {article.author && (
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              color: "var(--color-muted)",
            }}
          >
            {article.author}
          </span>
        )}
      </div>
    </motion.a>
  );
}
