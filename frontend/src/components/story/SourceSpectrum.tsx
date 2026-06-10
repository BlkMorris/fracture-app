"use client";

import { leanCategory, leanColor } from "@/lib/TERMINOLOGY_CONSTANTS";
import type { HeadlineEntry } from "@/types";
import { motion } from "framer-motion";

interface SourceSpectrumProps {
  headlines: HeadlineEntry[];
}

export default function SourceSpectrum({ headlines }: SourceSpectrumProps) {
  if (!headlines.length) return null;

  /* Deduplicate by source — take first headline per source */
  const seen = new Set<string>();
  const uniqueSources = headlines.filter((h) => {
    if (seen.has(h.sourceSlug)) return false;
    seen.add(h.sourceSlug);
    return true;
  });

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.1, duration: 0.4 }}
      style={{
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-md)",
        backgroundColor: "var(--color-surface)",
        padding: "18px 20px",
        marginBottom: 24,
      }}
    >
      <div style={{ marginBottom: 16 }}>
        <h3
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--color-secondary)",
            margin: "0 0 6px",
          }}
        >
          Source Spectrum
        </h3>
        <p style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--color-muted)", margin: 0, lineHeight: 1.5 }}>
          Each source is placed by estimated coverage lean for this story. Labels remain visible so the chart is not color-only.
        </p>
      </div>

      {/* Spectrum bar */}
      <div
        style={{
          position: "relative",
          height: 32,
          borderRadius: 4,
          background:
            "linear-gradient(to right, var(--color-left) 0%, var(--color-center) 50%, var(--color-right) 100%)",
          opacity: 0.15,
          marginBottom: 8,
        }}
      />

      {/* Dots overlay */}
      <div
        style={{
          position: "relative",
          height: 0,
          marginTop: -40,
          marginBottom: 24,
        }}
      >
        {uniqueSources.map((entry) => {
          const lean = entry.lean ?? 0;
          const leftPct = 50 + lean * 45;
          const cat = leanCategory(lean);
          const color = leanColor(lean);

          return (
            <div
              key={entry.sourceSlug}
              title={`${entry.sourceName} — ${cat}`}
              aria-label={`${entry.sourceName}, ${cat}`}
              style={{
                position: "absolute",
                left: `${leftPct}%`,
                top: 8,
                transform: "translateX(-50%)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
                cursor: "default",
              }}
            >
              <div
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  backgroundColor: color,
                  border: "2px solid var(--color-surface)",
                  boxShadow: `0 0 0 1px ${color}44`,
                }}
              />
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 9,
                  color: "var(--color-secondary)",
                  whiteSpace: "nowrap",
                  maxWidth: 60,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {entry.sourceName}
              </span>
            </div>
          );
        })}
      </div>

      {/* Labels */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontFamily: "var(--font-mono)",
          fontSize: 9,
          color: "var(--color-muted)",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          paddingTop: 20,
        }}
      >
        <span>Left</span>
        <span>Center / mixed</span>
        <span>Right</span>
      </div>
    </motion.section>
  );
}
