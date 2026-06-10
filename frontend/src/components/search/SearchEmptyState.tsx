"use client";

import { Search } from "lucide-react";

export default function SearchEmptyState() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "64px 24px",
        textAlign: "center",
      }}
    >
      <Search
        size={40}
        style={{ color: "var(--color-border)", marginBottom: 16 }}
      />
      <h3
        style={{
          fontFamily: "var(--font-condensed)",
          fontSize: 20,
          fontWeight: 600,
          color: "var(--color-text-strong)",
          margin: "0 0 8px",
        }}
      >
        No results found
      </h3>
      <p
        style={{
          fontFamily: "var(--font-body)",
          fontSize: 14,
          color: "var(--color-secondary)",
          margin: 0,
          maxWidth: 320,
          lineHeight: 1.5,
        }}
      >
        Try a different search term or browse trending topics above.
      </p>
    </div>
  );
}
