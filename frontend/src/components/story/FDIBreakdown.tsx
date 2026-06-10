"use client";

import { LABELS, severityTier, severityColor } from "@/lib/TERMINOLOGY_CONSTANTS";
import type { DivergenceIndex } from "@/types";
import { motion } from "framer-motion";

interface FDIBreakdownProps {
  divergenceIndex: DivergenceIndex;
  overallScore: number;
}

export default function FDIBreakdown({
  divergenceIndex,
  overallScore,
}: FDIBreakdownProps) {
  const tier = severityTier(overallScore);
  const color = severityColor(tier);

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, duration: 0.4 }}
      style={{
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-md)",
        backgroundColor: "var(--color-surface)",
        overflow: "hidden",
        marginBottom: 20,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 18px",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--color-secondary)",
          }}
        >
          {LABELS.FDI_NAME}
        </span>
      </div>

      {/* Composite score */}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 10,
          padding: "16px 18px 4px",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 52,
            fontWeight: 700,
            color,
            lineHeight: 1,
          }}
        >
          {Math.round(overallScore)}
        </span>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            fontWeight: 600,
            color: "var(--color-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          {tier}
        </span>
      </div>

      <p
        style={{
          fontFamily: "var(--font-body)",
          fontSize: 13,
          color: "var(--color-secondary)",
          lineHeight: 1.55,
          margin: 0,
          padding: "0 18px 10px",
        }}
      >
        FDI measures how far coverage diverges across tone, framing, language, sourcing, and story structure.
      </p>

      {/* Sub-metric bars */}
      <div
        style={{
          padding: "12px 18px 18px",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {Object.entries(LABELS.SCORE_LABELS).map(([key, label], i) => {
          const rawValue =
            divergenceIndex[key as keyof DivergenceIndex] ?? 0;
          const value = typeof rawValue === "number" ? rawValue : 0;
          const pct = Math.round(value * 100);
          const weight = LABELS.SCORE_WEIGHTS[key as keyof typeof LABELS.SCORE_WEIGHTS];

          return (
            <div key={key}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 4,
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-body)",
                    fontSize: 12,
                    color: "var(--color-secondary)",
                  }}
                >
                  {label}
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                      color: "var(--color-muted)",
                    }}
                  >
                    {Math.round(weight * 100)}%w
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 12,
                      fontWeight: 600,
                      color: "var(--color-text-strong)",
                      width: 28,
                      textAlign: "right",
                    }}
                  >
                    {pct}
                  </span>
                </div>
              </div>
              <div className="ns-score-bar-track">
                <motion.div
                  className="ns-score-bar-fill"
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ delay: 0.2 + i * 0.06, duration: 0.5 }}
                  style={{
                    backgroundColor: severityColor(severityTier(pct)),
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </motion.section>
  );
}
