"use client";

import { useState } from "react";
import { Grid3X3, List } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { StoryCluster } from "@/types";
import { StoryCard } from "@/components/StoryCard";
import StoryListRow from "@/components/StoryListRow";
import { SkeletonCard } from "@/components/ui";

interface SearchResultsProps {
  stories: StoryCluster[];
  isLoading: boolean;
  totalCount: number;
}

export default function SearchResults({
  stories,
  isLoading,
  totalCount,
}: SearchResultsProps) {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  return (
    <section>
      {/* Results header with toggle */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <h2 className="ns-section-header" style={{ margin: 0 }}>
          Results{" "}
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--color-muted)",
              fontWeight: 400,
            }}
          >
            ({totalCount})
          </span>
        </h2>

        {/* Grid / List toggle */}
        <div style={{ display: "flex", gap: 2 }}>
          <button
            onClick={() => setViewMode("grid")}
            style={{
              padding: "6px 8px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--color-border)",
              backgroundColor:
                viewMode === "grid"
                  ? "var(--color-surface-alt)"
                  : "transparent",
              color:
                viewMode === "grid"
                  ? "var(--color-accent)"
                  : "var(--color-muted)",
              cursor: "pointer",
              display: "flex",
              transition: "all 0.15s ease",
            }}
            aria-label="Grid view"
          >
            <Grid3X3 size={16} />
          </button>
          <button
            onClick={() => setViewMode("list")}
            style={{
              padding: "6px 8px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--color-border)",
              backgroundColor:
                viewMode === "list"
                  ? "var(--color-surface-alt)"
                  : "transparent",
              color:
                viewMode === "list"
                  ? "var(--color-accent)"
                  : "var(--color-muted)",
              cursor: "pointer",
              display: "flex",
              transition: "all 0.15s ease",
            }}
            aria-label="List view"
          >
            <List size={16} />
          </button>
        </div>
      </div>

      {/* Loading skeletons */}
      {isLoading && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              viewMode === "grid"
                ? "repeat(auto-fill, minmax(280px, 1fr))"
                : "1fr",
            gap: viewMode === "grid" ? 16 : 0,
          }}
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} height={viewMode === "grid" ? 240 : 80} />
          ))}
        </div>
      )}

      {/* Results */}
      {!isLoading && (
        <AnimatePresence mode="wait">
          {viewMode === "grid" ? (
            <motion.div
              key="grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: 16,
              }}
            >
              {stories.map((story, i) => (
                <motion.div
                  key={story.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.3 }}
                >
                  <StoryCard story={story} />
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {stories.map((story, i) => (
                <motion.div
                  key={story.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03, duration: 0.25 }}
                >
                  <StoryListRow story={story} />
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </section>
  );
}
