"use client";

import { PulseInfoPage } from "@/components/pulse/PulseInfoPage";
import { useSources } from "@/hooks/useStories";
import type { Source } from "@/types";

export default function SourcesPage() {
  const { data: sources = [], isLoading, error } = useSources();

  return (
    <PulseInfoPage
      eyebrow="Sources"
      title="Where Fracture gets its story signal."
      deck="Fracture tracks configured news sources, preserves outlet metadata, and compares coverage only when enough source context exists to make the analysis useful."
      cards={[
        { label: "Input", value: "Feeds", body: "Sources enter through RSS, API, or feed adapters where available." },
        { label: "Metadata", value: "Priors", body: "Outlet metadata includes source identity, region, reliability, and broad lean priors used for source-map placement." },
        { label: "Output", value: "Clusters", body: "Articles are grouped into story clusters before Fracture calculates divergence." },
      ]}
      sections={[
        {
          title: "Fracture does not scrape blindly.",
          body: "Each tracked outlet is represented as a configured source with a known slug, name, URL, tier, and metadata profile. New sources should be added through the ingestion layer rather than pasted into the UI.",
        },
        {
          title: "Feeds and APIs are normalized.",
          body: "Different outlets publish different payloads. Fracture normalizes article title, URL, summary, publish time, image, and source identity before analysis.",
        },
        {
          title: "Source maps use outlet priors and article signals.",
          body: "The source map is not a popularity ranking. It shows the source spread for a story using outlet metadata and the article-level framing signals available in that cluster.",
        },
        {
          title: "Transparency improves as source coverage grows.",
          body: "As more outlets and licensed feeds are added, the Sources page can evolve into a fully live source directory backed by the same API as the ingestion system.",
        },
      ]}
    >
      <SourceDirectory sources={sources} isLoading={isLoading} hasError={!!error} />
    </PulseInfoPage>
  );
}

function SourceDirectory({
  sources,
  isLoading,
  hasError,
}: {
  sources: Source[];
  isLoading: boolean;
  hasError: boolean;
}) {
  return (
    <section className="pulse-source-directory" aria-label="Tracked source directory">
      <div className="pulse-source-directory-head">
        <h2>Tracked sources</h2>
        <p>
          {isLoading
            ? "Loading the current source directory."
            : hasError
              ? "Source directory is temporarily unavailable."
              : `${sources.length} outlets currently returned by the live source registry.`}
        </p>
      </div>

      {isLoading ? (
        <div className="pulse-source-skeleton" aria-label="Loading tracked sources" aria-busy="true">
          {Array.from({ length: 8 }).map((_, index) => <article key={index} />)}
        </div>
      ) : hasError ? (
        <p className="pulse-source-empty">Fracture could not load the tracked source list. Try refreshing in a moment.</p>
      ) : sources.length ? (
        <div className="pulse-source-list-grid">
          {sources.map((source) => (
            <article className="pulse-source-item" key={source.id}>
              <div>
                <span>{formatTier(source.tier)}</span>
                <strong>{source.name}</strong>
              </div>
              <dl>
                <div>
                  <dt>Lean prior</dt>
                  <dd>{formatPrior(source.politicalLeanPrior)}</dd>
                </div>
                <div>
                  <dt>Reliability</dt>
                  <dd>{Math.round((source.reliabilityScore ?? 0) * 100)}%</dd>
                </div>
                <div>
                  <dt>Region</dt>
                  <dd>{source.region || source.country || "Global"}</dd>
                </div>
                <div>
                  <dt>Slug</dt>
                  <dd>{source.slug}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      ) : (
        <p className="pulse-source-empty">No tracked sources are available yet.</p>
      )}
    </section>
  );
}

function formatTier(tier: Source["tier"]) {
  return tier.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatPrior(value: number) {
  if (value <= -0.35) return "Left";
  if (value >= 0.35) return "Right";
  return "Center";
}
