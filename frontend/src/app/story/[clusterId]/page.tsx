"use client";

import { use, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ExternalLink, HelpCircle, ShieldCheck, X } from "lucide-react";
import { useStory } from "@/hooks/useStories";
import SourceSpectrum from "@/components/story/SourceSpectrum";
import {
  FRAMING_LABELS,
  fdiBadgeClass,
  formatTimeAgo,
} from "@/components/ui";
import {
  LABELS,
  leanCategory,
  leanColor,
  severityColor,
  severityTier,
} from "@/lib/TERMINOLOGY_CONSTANTS";
import type { Article, DivergenceIndex, StoryCluster } from "@/types";

export default function StoryPage({
  params,
}: {
  params: Promise<{ clusterId: string }>;
}) {
  const { clusterId } = use(params);
  const { data, isLoading, error } = useStory(clusterId);
  const [storyModalOpen, setStoryModalOpen] = useState(false);

  if (error) {
    return <StoryError />;
  }

  if (isLoading || !data) {
    return <StoryLoading />;
  }

  const { cluster, articles, divergenceIndex, headlineComparison } = data;
  const sortedArticles = [...articles].sort(
    (a, b) => (a.politicalLeanScore ?? 0) - (b.politicalLeanScore ?? 0),
  );
  const storyOverview = buildStoryOverview(cluster, articles);

  return (
    <div className="story-editorial-page">
      <article className="story-editorial-shell">
        <EditorialHero cluster={cluster} summary={storyOverview} />

        <div className="story-editorial-body">
          <aside className="story-editorial-rail">
            <ScorePlate cluster={cluster} />
            {cluster.topicKeywords?.length > 0 && (
              <KeywordPanel keywords={cluster.topicKeywords} />
            )}
          </aside>

          <main className="story-editorial-main">
            <StoryPreviewSection
              title="The Story"
              body={storyOverview}
              articles={sortedArticles}
              onReadMore={() => setStoryModalOpen(true)}
            />
            <ReadingSection
              title="The Fracture"
              body={fractureSummary(cluster, divergenceIndex)}
            />
            <ReadingSection
              title="How Outlets Framed It"
              body={framingSummary(sortedArticles)}
            />

            <SourceSpectrum headlines={headlineComparison} />
            <SourceIntelligence articles={sortedArticles} />
            <EditorialArticleList articles={sortedArticles.slice(0, 12)} />
            <AnalysisNote cluster={cluster} articles={articles} />
          </main>
        </div>
      </article>

      {storyModalOpen && (
        <StorySourcesModal
          cluster={cluster}
          articles={sortedArticles}
          onClose={() => setStoryModalOpen(false)}
        />
      )}

      <style>{styles}</style>
    </div>
  );
}

function StoryError() {
  return (
    <div className="ns-page">
      <div style={{ maxWidth: "var(--max-width)", margin: "0 auto", padding: "80px 24px", textAlign: "center" }}>
        <h2 style={{ fontFamily: "var(--font-condensed)", fontSize: 28, fontWeight: 600, marginBottom: 16, color: "var(--color-text-strong)" }}>
          Story not found
        </h2>
        <p style={{ fontSize: 15, color: "var(--color-secondary)", marginBottom: 24 }}>
          We couldn&rsquo;t find the story you&rsquo;re looking for.
        </p>
        <Link href="/" className="ns-btn ns-btn-primary">
          Back to Feed
        </Link>
      </div>
    </div>
  );
}

function StoryLoading() {
  return (
    <div className="story-editorial-page">
      <div className="story-editorial-shell" aria-busy="true">
        <div className="story-editorial-hero loading-hero">
          <div className="ns-skeleton" style={{ width: 240, height: 18 }} />
          <div className="ns-skeleton" style={{ width: "86%", height: 80, marginTop: 24 }} />
          <div className="ns-skeleton" style={{ width: "64%", height: 20, marginTop: 18 }} />
        </div>
        <div className="story-editorial-body">
          <aside className="story-editorial-rail">
            <div className="ns-skeleton" style={{ height: 190 }} />
            <div className="ns-skeleton" style={{ height: 120 }} />
          </aside>
          <main className="story-editorial-main">
            <div className="ns-skeleton" style={{ height: 160 }} />
            <div className="ns-skeleton" style={{ height: 220 }} />
            <div className="ns-skeleton" style={{ height: 320 }} />
          </main>
        </div>
      </div>
      <style>{styles}</style>
    </div>
  );
}

function EditorialHero({ cluster, summary }: { cluster: StoryCluster; summary: string }) {
  return (
    <header className="story-editorial-hero">
      <div className="story-editorial-nav">
        <Link href="/" className="ns-muted-link">
          <ArrowLeft size={14} /> Back to feed
        </Link>
      </div>

      <div className="story-kicker">
        <span>{cluster.topicCategory || "News"}</span>
        <span>{cluster.status?.toLowerCase() || "active"}</span>
        <span>Updated {formatTimeAgo(cluster.newestArticleAt)}</span>
      </div>

      <h1>{cluster.topic}</h1>
      <p>{summary}</p>

      <div className="ns-meta-row story-hero-meta">
        <span>{cluster.sourceCount} sources</span>
        <span>{cluster.articleCount} articles</span>
        <span>{LABELS.FDI_SHORT} {Math.round(cluster.divergenceScore ?? 0)}</span>
      </div>
    </header>
  );
}

function buildStoryOverview(cluster: StoryCluster, articles: Article[]): string {
  if (cluster.summary?.trim()) {
    return cluster.summary.trim();
  }

  const articleSummaries = uniqueStrings(
    articles
      .map((article) => cleanText(article.summary))
      .filter((summary): summary is string => Boolean(summary && summary.length >= 50)),
  );

  const sourceNames = uniqueStrings(
    articles
      .map((article) => article.source?.name)
      .filter((name): name is string => Boolean(name)),
  );

  if (articleSummaries.length > 0) {
    const lead = trimToSentence(articleSummaries[0], 260);
    const supporting = articleSummaries[1]
      ? ` Additional coverage notes that ${lowercaseLead(trimToSentence(articleSummaries[1], 180))}`
      : "";

    return `This story centers on ${cluster.topic}. Across ${articles.length || cluster.articleCount} articles${sourceNames.length ? ` from ${sourceNames.length} sources` : ""}, coverage describes ${lowercaseLead(lead)}${supporting}`;
  }

  const representativeHeadlines = uniqueStrings(
    articles
      .map((article) => cleanText(article.title))
      .filter((title): title is string => Boolean(title)),
  ).slice(0, 3);

  if (representativeHeadlines.length > 0) {
    return `This story centers on ${cluster.topic}. Fracture is tracking ${articles.length || cluster.articleCount} articles${sourceNames.length ? ` from ${sourceNames.length} sources` : ""}; representative coverage includes: ${representativeHeadlines.join("; ")}.`;
  }

  return `This story centers on ${cluster.topic}. Fracture is tracking coverage across ${cluster.sourceCount} sources and ${cluster.articleCount} articles as the story develops.`;
}

function cleanText(value: string | null | undefined): string | null {
  if (!value) return null;
  const cleaned = value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || null;
}

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = value.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function trimToSentence(value: string, maxLength: number): string {
  if (value.length <= maxLength) return ensureTerminalPunctuation(value);
  const clipped = value.slice(0, maxLength);
  const sentenceEnd = Math.max(clipped.lastIndexOf(". "), clipped.lastIndexOf("! "), clipped.lastIndexOf("? "));
  const trimmed = sentenceEnd > 80 ? clipped.slice(0, sentenceEnd + 1) : `${clipped.trim()}...`;
  return ensureTerminalPunctuation(trimmed);
}

function ensureTerminalPunctuation(value: string): string {
  return /[.!?]$/.test(value) ? value : `${value}.`;
}

function lowercaseLead(value: string): string {
  return value.charAt(0).toLowerCase() + value.slice(1);
}

function truncateSummary(value: string): string {
  const limit = 420;
  if (value.length <= limit) return value;
  const clipped = value.slice(0, limit);
  const sentenceEnd = Math.max(clipped.lastIndexOf(". "), clipped.lastIndexOf("! "), clipped.lastIndexOf("? "));
  const trimmed = sentenceEnd > 220 ? clipped.slice(0, sentenceEnd + 1) : clipped.trim();
  return `${trimmed.replace(/[.!?]?$/, "")}... `;
}

function buildWordingNotes(article: Article): string[] {
  const notes: string[] = [];
  const title = article.title.toLowerCase();
  const frame = article.framingType ? FRAMING_LABELS[article.framingType] : null;
  const tone = toneLabel(article.headlineSentiment);

  if (frame) {
    notes.push(`Frames the story primarily through a ${frame.toLowerCase()} lens.`);
  }

  if (tone !== "Unknown") {
    notes.push(`Headline tone reads as ${tone.toLowerCase()}, which shapes the level of urgency or skepticism.`);
  }

  if (/accuse|blame|fail|crisis|anger|warning|pressure|threat|slam/.test(title)) {
    notes.push("Uses conflict-oriented wording that emphasizes accountability, pressure, or failure.");
  } else if (/deal|talks|plan|policy|summit|deadline|proposal|negotiat/.test(title)) {
    notes.push("Uses process-oriented wording that emphasizes negotiations, policy mechanics, or deadlines.");
  } else if (/cost|tax|market|econom|budget|fund|bill|spending/.test(title)) {
    notes.push("Uses economic wording that emphasizes cost, funding, or financial exposure.");
  } else {
    notes.push("Uses comparatively neutral headline wording, with the strongest differences appearing in framing and source selection.");
  }

  return notes.slice(0, 3);
}

function ScorePlate({ cluster }: { cluster: StoryCluster }) {
  const score = cluster.divergenceScore ?? 0;
  const tier = severityTier(score);

  return (
    <section className="score-plate">
      <div className="fdi-label-row">
        <span className={fdiBadgeClass(score)}>{LABELS.FDI_SHORT} {Math.round(score)} · {tier}</span>
        <button type="button" className="fdi-help" aria-label="What is FDI?">
          <HelpCircle size={14} />
          <span role="tooltip">
            <strong>Fracture Divergence Index</strong>
            FDI is a 0-100 score showing how differently outlets cover the same story. Example: 20 means mostly aligned coverage; 80 means outlets are using sharply different tone, framing, sources, or emphasis.
          </span>
        </button>
      </div>
      <strong style={{ color: severityColor(tier) }}>{Math.round(score)}</strong>
      <p>{LABELS.FDI_NAME}</p>
      <small>{cluster.sourceCount} sources / {cluster.articleCount} articles</small>
    </section>
  );
}

function KeywordPanel({ keywords }: { keywords: string[] }) {
  return (
    <section className="story-panel">
      <h2>Keywords</h2>
      <div className="keyword-cloud">
        {keywords.map((keyword) => (
          <span key={keyword}>{keyword}</span>
        ))}
      </div>
    </section>
  );
}

function ReadingSection({ title, body }: { title: string; body: string }) {
  return (
    <section className="reading-section">
      <h2>{title}</h2>
      <p>{body}</p>
    </section>
  );
}

function StoryPreviewSection({
  title,
  body,
  articles,
  onReadMore,
}: {
  title: string;
  body: string;
  articles: Article[];
  onReadMore: () => void;
}) {
  const preview = truncateSummary(body);

  return (
    <section className="reading-section">
      <h2>{title}</h2>
      <p>
        {preview}
        <button type="button" className="story-read-more" onClick={onReadMore}>
          Read source-by-source breakdown
        </button>
      </p>
      <span className="story-preview-note">
        Opens {articles.length} source articles with framing, tone, and wording differences.
      </span>
    </section>
  );
}

function StorySourcesModal({
  cluster,
  articles,
  onClose,
}: {
  cluster: StoryCluster;
  articles: Article[];
  onClose: () => void;
}) {
  return (
    <div className="story-modal-backdrop" role="presentation" onClick={onClose}>
      <section
        className="story-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="story-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="story-modal-header">
          <div>
            <span className="ns-eyebrow">Source-by-source breakdown</span>
            <h2 id="story-modal-title">How each outlet covered this story</h2>
            <p>{cluster.topic}</p>
          </div>
          <button type="button" className="story-modal-close" onClick={onClose} aria-label="Close source breakdown">
            <X size={18} />
          </button>
        </header>

        <div className="story-modal-summary">
          <strong>What to compare</strong>
          <p>
            Review each source&apos;s headline, framing, tone, and summary language. Click any article to read the original coverage from that outlet.
          </p>
        </div>

        <div className="story-source-list">
          {articles.map((article) => (
            <SourceDifferenceCard key={article.id} article={article} />
          ))}
        </div>
      </section>
    </div>
  );
}

function SourceDifferenceCard({ article }: { article: Article }) {
  const lean = leanCategory(article.politicalLeanScore);
  const frame = article.framingType ? FRAMING_LABELS[article.framingType] : "Unclassified";
  const tone = toneLabel(article.headlineSentiment);
  const summary = cleanText(article.summary);
  const wordingNotes = buildWordingNotes(article);

  return (
    <article className="source-difference-card">
      <div className="source-card-top">
        <div>
          <span>{article.source?.name ?? "Unknown source"}</span>
          <h3>{article.title}</h3>
        </div>
        <a href={article.url} target="_blank" rel="noopener noreferrer">
          Read original <ExternalLink size={13} />
        </a>
      </div>

      <div className="source-card-meta">
        <span>{lean}</span>
        <span>{frame} frame</span>
        <span>{tone} tone</span>
        <span>{formatTimeAgo(article.publishedAt)}</span>
      </div>

      {summary && <p>{trimToSentence(summary, 280)}</p>}

      <div className="wording-notes">
        <strong>Wording differences</strong>
        <ul>
          {wordingNotes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      </div>
    </article>
  );
}

function SourceIntelligence({ articles }: { articles: Article[] }) {
  const rows = dedupeArticlesBySource(articles).slice(0, 12);

  if (!rows.length) return null;

  return (
    <section className="source-intelligence story-panel">
      <h2>Source Intelligence</h2>
      <div className="source-table-wrap">
        <table className="source-table">
          <thead>
            <tr>
              <th>Source</th>
              <th>Lean</th>
              <th>Frame</th>
              <th>Tone</th>
              <th>Reliability</th>
              <th>Headline</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((article) => {
              const lean = article.politicalLeanScore;
              const leanLabel = leanCategory(lean);
              const leanIndicator = leanColor(lean);
              const frame = article.framingType ? FRAMING_LABELS[article.framingType] : "Unclassified";

              return (
                <tr key={article.id}>
                  <td>{article.source?.name ?? "Unknown"}</td>
                  <td>
                    <span className="lean-cell">
                      <i style={{ backgroundColor: leanIndicator }} /> {leanLabel}
                    </span>
                  </td>
                  <td>{frame}</td>
                  <td>{toneLabel(article.headlineSentiment)}</td>
                  <td>{formatReliability(article.source?.reliabilityScore)}</td>
                  <td>{article.title}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function EditorialArticleList({ articles }: { articles: Article[] }) {
  if (!articles.length) return null;

  return (
    <section className="story-panel">
      <h2>Article Coverage</h2>
      <div className="editorial-article-list">
        {articles.map((article) => {
          const lean = leanCategory(article.politicalLeanScore);
          const frame = article.framingType ? FRAMING_LABELS[article.framingType] : "Coverage";

          return (
            <a key={article.id} href={article.url} target="_blank" rel="noopener noreferrer">
              <div>
                <span>{article.source?.name ?? "Unknown"} / {lean}</span>
                <strong>{article.title}</strong>
                <small>{frame} frame / {formatTimeAgo(article.publishedAt)}</small>
              </div>
              <ExternalLink size={14} />
            </a>
          );
        })}
      </div>
    </section>
  );
}

function AnalysisNote({ cluster, articles }: { cluster: StoryCluster; articles: Article[] }) {
  return (
    <section className="story-panel trust-note">
      <ShieldCheck size={18} />
      <div>
        <h2>Analysis Note</h2>
        <p>
          Fracture compares coverage patterns across {cluster.sourceCount} sources and {articles.length} available articles for this story. Summaries are generated from source coverage and should be read as synthesis, not editorial judgment.
        </p>
      </div>
    </section>
  );
}

function fractureSummary(cluster: StoryCluster, divergenceIndex: DivergenceIndex | null): string {
  const score = cluster.divergenceScore ?? 0;
  const tier = severityTier(score).toLowerCase();

  if (!divergenceIndex) {
    return `This story currently shows ${tier} divergence across ${cluster.sourceCount} sources. Detailed sub-metrics are still being computed.`;
  }

  const entries = [
    ["headline tone", divergenceIndex.headlineSentimentSpread],
    ["framing approach", divergenceIndex.framingTypeEntropy],
    ["source selection", divergenceIndex.sourceSelectionVariance],
    ["story structure", divergenceIndex.structuralDivergence],
  ] as const;
  const strongest = entries.reduce((max, entry) => (entry[1] > max[1] ? entry : max));

  return `This story shows ${tier} narrative divergence, with the strongest split currently appearing in ${strongest[0]}. The FDI score reflects differences in tone, framing, language, sourcing, and structure across the coverage set.`;
}

function framingSummary(articles: Article[]): string {
  const framed = articles.filter((article) => article.framingType);
  if (!framed.length) {
    return "Framing analysis is still being classified for this coverage set.";
  }

  const counts = framed.reduce<Record<string, number>>((acc, article) => {
    const label = article.framingType ? FRAMING_LABELS[article.framingType] : "Unclassified";
    acc[label] = (acc[label] ?? 0) + 1;
    return acc;
  }, {});
  const dominant = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "mixed";

  return `Outlets are primarily using a ${dominant.toLowerCase()} frame, but the source mix shows different emphasis by lean, tone, and outlet selection. The table below shows how each source positions the story.`;
}

function dedupeArticlesBySource(articles: Article[]): Article[] {
  const seen = new Set<string>();
  return articles.filter((article) => {
    const key = article.source?.slug || article.source?.name || article.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function toneLabel(sentiment: number | null): string {
  if (sentiment === null || sentiment === undefined) return "Unknown";
  if (sentiment <= -0.35) return "Critical";
  if (sentiment < -0.1) return "Skeptical";
  if (sentiment <= 0.1) return "Neutral";
  if (sentiment < 0.35) return "Measured";
  return "Positive";
}

function formatReliability(score: number | null | undefined): string {
  if (score === null || score === undefined) return "—";
  const normalized = score <= 1 ? score * 100 : score;
  return `${Math.round(normalized)}%`;
}

const styles = `
.story-editorial-page {
  min-height: 100vh;
}

.story-editorial-shell {
  max-width: var(--max-width);
  margin: 0 auto;
  padding: 24px 24px 72px;
}

.story-editorial-hero {
  background: radial-gradient(circle at 20% 0%, var(--color-accent-subtle), transparent 36%), var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: clamp(28px, 5vw, 58px);
  overflow: hidden;
}

.story-editorial-nav {
  margin-bottom: 22px;
}

.story-editorial-nav a {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
}

.story-kicker {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 14px;
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--color-secondary);
}

.story-kicker span {
  border: 1px solid var(--color-border);
  padding: 3px 8px;
  border-radius: var(--radius-sm);
  background: rgba(12, 13, 18, 0.72);
}

.story-editorial-hero h1 {
  font-family: var(--font-display);
  font-size: clamp(38px, 6vw, 68px);
  font-weight: 400;
  font-style: italic;
  color: var(--color-text-strong);
  line-height: 1.05;
  max-width: 1040px;
  margin: 0 0 14px;
}

.story-editorial-hero p {
  color: var(--color-secondary);
  font-size: 16px;
  line-height: 1.6;
  max-width: 760px;
  margin: 0;
}

.story-hero-meta {
  margin-top: 18px;
}

.story-editorial-body {
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: 40px;
  padding: 32px 0 0;
}

.story-editorial-rail {
  display: flex;
  flex-direction: column;
  gap: 18px;
  position: sticky;
  top: 88px;
  align-self: start;
}

.story-editorial-main {
  min-width: 0;
}

.score-plate,
.story-panel {
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  border-radius: var(--radius-md);
  padding: 18px;
}

.score-plate {
  background: var(--color-bg);
}

.fdi-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.fdi-help {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  background: transparent;
  color: var(--color-muted);
  cursor: help;
}

.fdi-help:hover,
.fdi-help:focus-visible {
  color: var(--color-accent);
  border-color: var(--color-accent);
}

.fdi-help span[role="tooltip"] {
  position: absolute;
  left: 50%;
  bottom: calc(100% + 10px);
  z-index: 20;
  width: 260px;
  transform: translateX(-50%) translateY(4px);
  border: 1px solid var(--color-border-hover);
  border-radius: var(--radius-md);
  background: var(--color-surface-alt);
  color: var(--color-secondary);
  box-shadow: var(--shadow-lg);
  padding: 12px;
  font-family: var(--font-body);
  font-size: 12px;
  line-height: 1.55;
  text-align: left;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.fdi-help span[role="tooltip"] strong {
  display: block;
  color: var(--color-text-strong);
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-bottom: 6px;
}

.fdi-help:hover span[role="tooltip"],
.fdi-help:focus-visible span[role="tooltip"] {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}

.score-plate strong {
  display: block;
  font-family: var(--font-mono);
  font-size: 64px;
  line-height: 1;
  margin-top: 12px;
}

.score-plate p {
  color: var(--color-text-strong);
  margin: 2px 0 8px;
  font-size: 13px;
}

.score-plate small {
  color: var(--color-muted);
  font-family: var(--font-mono);
  font-size: 10px;
}

.story-panel {
  margin-bottom: 22px;
}

.story-panel h2,
.source-intelligence h2 {
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--color-secondary);
  margin: 0 0 12px;
}

.keyword-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.keyword-cloud span {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--color-secondary);
  border: 1px solid var(--color-border);
  padding: 4px 8px;
  border-radius: var(--radius-sm);
}

.reading-section {
  max-width: 760px;
  padding: 26px 0;
  border-bottom: 1px solid var(--color-border);
}

.reading-section:first-child {
  padding-top: 0;
}

.reading-section h2 {
  font-family: var(--font-condensed);
  font-size: 30px;
  color: var(--color-text-strong);
  margin: 0 0 10px;
}

.reading-section p {
  color: var(--color-secondary);
  font-size: 17px;
  line-height: 1.8;
  margin: 0;
}

.story-read-more {
  display: inline;
  border: 0;
  background: transparent;
  color: var(--color-accent);
  font: inherit;
  font-weight: 600;
  padding: 0 0 0 6px;
  cursor: pointer;
}

.story-read-more:hover,
.story-read-more:focus-visible {
  text-decoration: underline;
}

.story-preview-note {
  display: block;
  margin-top: 10px;
  color: var(--color-muted);
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.story-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.72);
  backdrop-filter: blur(10px);
  padding: 24px;
}

.story-modal {
  width: min(1120px, 100%);
  max-height: min(840px, calc(100vh - 48px));
  overflow: auto;
  border: 1px solid var(--color-border-hover);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  box-shadow: var(--shadow-lg);
}

.story-modal-header {
  position: sticky;
  top: 0;
  z-index: 2;
  display: flex;
  justify-content: space-between;
  gap: 18px;
  padding: 24px;
  border-bottom: 1px solid var(--color-border);
  background: linear-gradient(180deg, var(--color-surface), rgba(12, 13, 18, 0.94));
}

.story-modal-header h2 {
  color: var(--color-text-strong);
  font-family: var(--font-condensed);
  font-size: 32px;
  line-height: 1.05;
  margin: 8px 0;
}

.story-modal-header p {
  max-width: 760px;
  color: var(--color-secondary);
  font-size: 14px;
  line-height: 1.5;
  margin: 0;
}

.story-modal-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  background: transparent;
  color: var(--color-secondary);
  cursor: pointer;
  flex-shrink: 0;
}

.story-modal-close:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.story-modal-summary {
  margin: 18px 24px 0;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg);
  padding: 16px;
}

.story-modal-summary strong,
.wording-notes strong {
  display: block;
  color: var(--color-text-strong);
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  margin-bottom: 6px;
}

.story-modal-summary p {
  color: var(--color-secondary);
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
}

.story-source-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  padding: 24px;
}

.source-difference-card {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg);
  padding: 16px;
}

.source-card-top {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  align-items: flex-start;
}

.source-card-top span,
.source-card-meta,
.source-difference-card small {
  color: var(--color-muted);
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.source-card-top h3 {
  color: var(--color-text-strong);
  font-family: var(--font-condensed);
  font-size: 19px;
  line-height: 1.25;
  margin: 5px 0 0;
}

.source-card-top a {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: var(--color-accent);
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  white-space: nowrap;
}

.source-card-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 12px 0;
}

.source-card-meta span {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 3px 7px;
}

.source-difference-card > p {
  color: var(--color-secondary);
  font-size: 13px;
  line-height: 1.65;
  margin: 0 0 14px;
}

.wording-notes {
  border-top: 1px solid var(--color-border);
  padding-top: 12px;
}

.wording-notes ul {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0;
  padding-left: 18px;
  color: var(--color-secondary);
  font-size: 13px;
  line-height: 1.5;
}

.source-table-wrap {
  overflow-x: auto;
}

.source-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 860px;
}

.source-table th,
.source-table td {
  border-bottom: 1px solid var(--color-border);
  padding: 11px 10px;
  text-align: left;
}

.source-table th {
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--color-secondary);
}

.source-table td {
  color: var(--color-secondary);
  font-size: 13px;
  vertical-align: top;
}

.source-table td:first-child,
.source-table td:nth-child(6) {
  color: var(--color-text-strong);
}

.lean-cell {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}

.lean-cell i {
  display: inline-block;
  width: 7px;
  height: 7px;
  border-radius: 50%;
}

.editorial-article-list {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
}

.editorial-article-list a {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 12px;
  color: inherit;
  transition: border-color 0.15s ease, background-color 0.15s ease;
}

.editorial-article-list a:hover {
  border-color: var(--color-border-hover);
  background: var(--color-surface-alt);
}

.editorial-article-list span,
.editorial-article-list small {
  display: block;
  color: var(--color-muted);
  font-family: var(--font-mono);
  font-size: 10px;
}

.editorial-article-list strong {
  display: block;
  color: var(--color-text-strong);
  font-family: var(--font-condensed);
  font-size: 16px;
  line-height: 1.25;
  margin: 4px 0;
}

.editorial-article-list svg,
.trust-note svg {
  color: var(--color-accent);
  flex-shrink: 0;
}

.trust-note {
  display: flex;
  gap: 12px;
}

.trust-note p {
  color: var(--color-secondary);
  font-size: 14px;
  line-height: 1.65;
  margin: 0;
}

.loading-hero {
  min-height: 360px;
}

@media (max-width: 1000px) {
  .story-editorial-body {
    grid-template-columns: 1fr;
  }

  .story-editorial-rail {
    position: static;
    display: grid;
    grid-template-columns: minmax(220px, 300px) 1fr;
  }
}

@media (max-width: 680px) {
  .story-editorial-shell {
    padding: 18px 16px 48px;
  }

  .story-editorial-hero {
    padding: 24px 18px;
  }

  .story-editorial-hero h1 {
    font-size: clamp(34px, 12vw, 50px);
  }

  .story-editorial-hero p,
  .reading-section p {
    font-size: 15px;
  }

  .story-modal-backdrop {
    align-items: stretch;
    padding: 0;
  }

  .story-modal {
    width: 100%;
    max-height: 100vh;
    border-radius: 0;
  }

  .story-modal-header,
  .story-source-list {
    padding: 18px;
  }

  .story-source-list {
    grid-template-columns: 1fr;
  }

  .story-modal-summary {
    margin: 18px 18px 0;
  }

  .story-editorial-rail {
    grid-template-columns: 1fr;
  }
}
`;
