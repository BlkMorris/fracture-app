"use client";

import { Search } from "lucide-react";
import { useStats } from "@/hooks/useStories";

interface SearchHeaderProps {
  query: string;
  onQueryChange: (q: string) => void;
}

export default function SearchHeader({ query, onQueryChange }: SearchHeaderProps) {
  const { data: stats } = useStats();

  return (
    <div style={{ marginBottom: 36 }}>
      <span className="ns-eyebrow">Discovery</span>
      <h1 className="ns-page-title">
        Discover
      </h1>
      <p
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          color: "var(--color-muted)",
          margin: "0 0 24px",
          letterSpacing: "0.04em",
        }}
      >
        {stats
          ? `Searching across ${stats.activeStories?.toLocaleString() ?? 0} stories from ${stats.sourcesTracked?.toLocaleString() ?? 0} sources`
          : "Search stories, topics, and sources"}
      </p>

      {/* Search input */}
      <div style={{ position: "relative" }}>
        <Search
          size={18}
          style={{
            position: "absolute",
            left: 16,
            top: "50%",
            transform: "translateY(-50%)",
            color: "var(--color-muted)",
            pointerEvents: "none",
          }}
        />
        <input
          type="text"
          className="ns-input"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search stories, topics, sources\u2026"
          autoFocus
          style={{
            height: 52,
            paddingLeft: 44,
            fontSize: 15,
            fontFamily: "var(--font-body)",
          }}
        />
      </div>
    </div>
  );
}
