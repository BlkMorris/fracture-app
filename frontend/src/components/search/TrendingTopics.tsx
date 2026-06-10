"use client";

import { motion } from "framer-motion";

interface TrendingTopicsProps {
  topics: string[];
  onSelect: (topic: string) => void;
}

export default function TrendingTopics({ topics, onSelect }: TrendingTopicsProps) {
  if (!topics.length) return null;

  return (
    <section style={{ marginBottom: 36 }}>
      <h2 className="ns-section-header" style={{ marginBottom: 14 }}>
        Trending Topics
      </h2>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {topics.map((topic, i) => (
          <motion.button
            key={topic}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04, duration: 0.3 }}
            className="ns-trend-pill"
            onClick={() => onSelect(topic)}
          >
            {topic}
          </motion.button>
        ))}
      </div>
    </section>
  );
}
