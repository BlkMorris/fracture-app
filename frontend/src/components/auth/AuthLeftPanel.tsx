"use client";

import Link from "next/link";
import { useStats } from "@/hooks/useStories";
import { motion } from "framer-motion";

/* ── Animated counter ── */
function AnimatedStat({
  value,
  label,
  color,
}: {
  value: string;
  label: string;
  color: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={{ display: "flex", flexDirection: "column", gap: 2 }}
    >
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 28,
          fontWeight: 700,
          color,
          lineHeight: 1,
        }}
      >
        {value}
      </span>
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "var(--color-muted)",
        }}
      >
        {label}
      </span>
    </motion.div>
  );
}

export default function AuthLeftPanel() {
  const { data: stats } = useStats();

  const activeStories = stats?.activeStories ?? 0;
  const avgFdi = stats?.avgDivergence ?? 0;

  return (
    <div className="ns-auth-left">
      {/* Wordmark */}
      <Link
        href="/"
        style={{
          textDecoration: "none",
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 48,
        }}
      >
        <span className="ns-live-dot" />
        <span
          style={{
            fontFamily: "var(--font-condensed)",
            fontSize: 18,
            fontWeight: 700,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--color-text-strong)",
          }}
        >
          Fracture
        </span>
      </Link>

      {/* Stats row */}
      <div style={{ display: "flex", gap: 32, marginBottom: 48 }}>
        <AnimatedStat
          value={activeStories > 0 ? activeStories.toLocaleString() : "—"}
          label="Active Stories"
          color="var(--color-accent)"
        />
        <AnimatedStat
          value={avgFdi > 0 ? avgFdi.toFixed(1) : "—"}
          label="Avg Divergence"
          color="var(--color-amber)"
        />
      </div>

      {/* Pull quote */}
      <motion.blockquote
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.6 }}
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 26,
          fontStyle: "italic",
          color: "var(--color-primary)",
          lineHeight: 1.35,
          margin: 0,
          borderLeft: "2px solid var(--color-accent)",
          paddingLeft: 20,
          maxWidth: 360,
        }}
      >
        The same story.
        <br />
        Different realities.
      </motion.blockquote>
    </div>
  );
}
