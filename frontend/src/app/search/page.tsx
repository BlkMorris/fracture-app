"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchDiscover, useTrendingTopics, useStories } from "@/hooks/useStories";
import SearchHeader from "@/components/search/SearchHeader";
import TrendingTopics from "@/components/search/TrendingTopics";
import SearchResults from "@/components/search/SearchResults";
import SearchEmptyState from "@/components/search/SearchEmptyState";
import { StoryCard } from "@/components/StoryCard";
import { motion } from "framer-motion";

export default function SearchPage() {
  const [inputValue, setInputValue] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: trending } = useTrendingTopics();
  const { data: results, isLoading: searchLoading } = useSearchDiscover(searchQuery);
  const { data: recentData } = useStories({ limit: 4 });

  /* 300ms debounce */
  useEffect(() => {
    const timer = setTimeout(() => setSearchQuery(inputValue), 300);
    return () => clearTimeout(timer);
  }, [inputValue]);

  const handleTrendingSelect = useCallback((topic: string) => {
    setInputValue(topic);
    setSearchQuery(topic);
  }, []);

  const hasQuery = searchQuery.length >= 2;
  const stories = results?.clusters ?? [];
  const totalCount = results?.totalClusters ?? 0;
  const recentStories = recentData?.stories ?? [];

  return (
    <div style={{ minHeight: "100vh" }}>
      <div className="ns-page-section">
        <SearchHeader query={inputValue} onQueryChange={setInputValue} />

        {/* State A: No active search — show trending + recently fractured */}
        {!hasQuery && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <TrendingTopics
              topics={trending ?? []}
              onSelect={handleTrendingSelect}
            />

            {/* Recently Fractured */}
            {recentStories.length > 0 && (
              <section>
                <h2
                  className="ns-section-header"
                  style={{ marginBottom: 14 }}
                >
                  Recently Fractured
                </h2>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fill, minmax(280px, 1fr))",
                    gap: 16,
                  }}
                >
                  {recentStories.slice(0, 4).map((story, i) => (
                    <motion.div
                      key={story.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05, duration: 0.3 }}
                    >
                      <StoryCard story={story} />
                    </motion.div>
                  ))}
                </div>
              </section>
            )}
          </motion.div>
        )}

        {/* State B: Active search — show results */}
        {hasQuery && (
          <>
            {!searchLoading && stories.length === 0 ? (
              <SearchEmptyState />
            ) : (
              <SearchResults
                stories={stories}
                isLoading={searchLoading}
                totalCount={totalCount}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
