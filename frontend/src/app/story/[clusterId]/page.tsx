"use client";

import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Bookmark, Clock3, Headphones, Share2, Sparkles } from "lucide-react";
import { useStats, useStories, useStory } from "@/hooks/useStories";
import type { Article, HeadlineEntry, StoryCluster, TimelineEntry } from "@/types";
import {
  categoryLabel,
  compactStoryText,
  formatClock,
  formatPulseTime,
  PulseFdiBadge,
  pulseChromeStyles,
  PulseTopbar,
  storyDivergence,
  storySummary,
} from "@/components/pulse/PulseChrome";

export default function StoryPage({ params }: { params: Promise<{ clusterId: string }> }) {
  const { clusterId } = use(params);
  const { data, isLoading, error } = useStory(clusterId);
  const { data: stats } = useStats();
  const { data: relatedData } = useStories({ limit: 8 });
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  const [sourceModalArticle, setSourceModalArticle] = useState<Article | null>(null);

  const sortedArticles = useMemo(() => sortArticles(data?.articles ?? []), [data?.articles]);

  useEffect(() => {
    function handleKeydown(event: KeyboardEvent) {
      if (event.key === "Escape") setSourceModalArticle(null);
    }

    if (sourceModalArticle) {
      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeydown);
      return () => {
        document.body.style.overflow = previousOverflow;
        window.removeEventListener("keydown", handleKeydown);
      };
    }

    return undefined;
  }, [sourceModalArticle]);

  if (error) return <StoryState title="Story not found" body="We could not find the story you are looking for." />;
  if (isLoading || !data) return <StoryLoading stats={stats} />;

  const { cluster, headlineComparison, timeline, divergenceIndex, narrativeFrames } = data;
  const selectedArticle = sortedArticles.find((article) => article.id === selectedArticleId) ?? sortedArticles[0] ?? null;
  const headlineRows = buildHeadlineRows(headlineComparison, sortedArticles).slice(0, 7);
  const pulseItems = buildPulseItems(timeline, sortedArticles).slice(0, 5);
  const relatedStories = (relatedData?.stories ?? []).filter((story) => story.id !== cluster.id).slice(0, 3);
  const summary = storySummary(cluster, 168);
  const score = storyDivergence(cluster);
  const agreement = narrativeFrames[0]?.title || `${categoryLabel(cluster.topicCategory)} is the shared center.`;
  const split = narrativeFrames[1]?.title || splitHeadline(sortedArticles);

  return (
    <main className="pulse-detail" aria-label="Fracture Pulse Editorial story detail">
      <style jsx global>{styles}</style>

      <PulseTopbar stats={stats} />

      <div className="pulse-detail-layout">
        <aside className="pulse-tools" aria-label="Story actions">
          <button type="button" aria-label="Save story"><Bookmark size={18} /><span>Save</span></button>
          <button type="button" aria-label="Share story"><Share2 size={18} /><span>Share</span></button>
          <button type="button" aria-label="Listen to story"><Headphones size={18} /><span>Listen</span></button>
        </aside>

        <article className="pulse-story">
          <header className="pulse-hero">
            <div className="pulse-kicker"><Sparkles size={15} /> Story Detail / {categoryLabel(cluster.topicCategory)}</div>
            <motion.h1 initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.42, ease: "easeOut" }}>
              {cluster.topic}
            </motion.h1>
            <p className="pulse-deck">{summary}</p>
            <div className="pulse-meta">
              <span><Clock3 size={14} /> Updated {formatPulseTime(cluster.newestArticleAt)}</span>
              <span>{cluster.sourceCount || sortedArticles.length} sources</span>
              <PulseFdiBadge score={score} compact />
            </div>
          </header>

          <section className="pulse-summary">
            <p className="pulse-label">Context</p>
            <p>{summary}</p>
          </section>

          <section className="pulse-signal-grid" aria-label="Story signal cards">
            <article><span>Where coverage agrees</span><h2>{agreement}</h2><p>Most coverage is tied to the same underlying event and shared timeline, even as outlets emphasize different consequences.</p></article>
            <article><span>Where framing splits</span><h2>{split}</h2><p>Fracture detects shifts in headline tone, framing type, source emphasis, and the actors each outlet foregrounds.</p></article>
            <article><span>Reader cue</span><h2>Watch the verbs.</h2><p>Headlines can steer readers toward different interpretations through emphasis, urgency, and accountability language.</p></article>
          </section>

          <section className="pulse-spectrum" aria-label="Source map">
            <div className="pulse-section-heading">
              <p className="pulse-label">Source Map</p>
              <h2>Utility frame to urgency frame</h2>
            </div>
            <div className="pulse-track">
              <span>Utility</span><span>Process</span><span>Urgency</span>
              {sortedArticles.slice(0, 8).map((article, index) => (
                <button
                  type="button"
                  key={article.id}
                  className={selectedArticle?.id === article.id ? "active" : ""}
                  style={{ left: `${spectrumPosition(article, index, sortedArticles.length)}%` }}
                  onClick={() => {
                    setSelectedArticleId(article.id);
                    setSourceModalArticle(article);
                  }}
                  aria-label={`Inspect ${article.source?.name || "source"}`}
                >
                  {sourceInitials(article.source?.name || "?")}
                </button>
              ))}
            </div>
            <div className="pulse-source-list">
              {sortedArticles.slice(0, 5).map((article) => (
                <button type="button" onClick={() => setSourceModalArticle(article)} key={article.id}>
                  <span>{article.source?.name || "Source"}</span>
                  <strong>{compactStoryText(cleanText(article.title), 82)}</strong>
                  <i>{article.framingType ? categoryLabel(article.framingType) : "Frame pending"}</i>
                </button>
              ))}
            </div>
          </section>

          <section className="pulse-copy-block">
            <div className="pulse-reading-label">
              <p className="pulse-label">Fracture reading</p>
              <span>{categoryLabel(cluster.topicCategory)}</span>
            </div>
            <div className="pulse-reading-body">
              <h2>{score}/100 divergence means this story is moving across frames.</h2>
              <p>{whyCoverageMatters(cluster, score, sortedArticles)}</p>
            </div>
          </section>

          <section className="pulse-headlines">
            <div className="pulse-section-heading">
              <p className="pulse-label">Headline comparison</p>
              <h2>Same story, different framing</h2>
            </div>
            <div className="pulse-headline-list">
              {headlineRows.map((row) => {
                const rowArticle = sortedArticles.find((article) => article.id === row.id) ?? null;
                return (
                  <button
                    type="button"
                    className={selectedArticle?.id === row.id ? "active" : ""}
                    onMouseEnter={() => setSelectedArticleId(row.id)}
                    onFocus={() => setSelectedArticleId(row.id)}
                    onClick={() => rowArticle ? setSourceModalArticle(rowArticle) : null}
                    key={row.id}
                  >
                    <span>{row.sourceName}</span>
                    <strong>{compactStoryText(row.headline, 108)}</strong>
                    <small>{row.score}</small>
                  </button>
                );
              })}
            </div>
          </section>
        </article>

        <aside className="pulse-rail" aria-label="Live context rail">
          <section className="pulse-rail-card pulse-score">
            <p className="pulse-label">Fracture Divergence Index</p>
            <PulseFdiBadge score={score} />
            <span className="pulse-score-count">{cluster.articleCount || sortedArticles.length} articles / {cluster.sourceCount || sortedArticles.length} sources</span>
            <div className="pulse-meter"><i style={{ width: `${Math.max(8, score)}%` }} /></div>
          </section>

          <section className="pulse-rail-card" id="timeline">
            <div className="pulse-section-heading compact">
              <p className="pulse-label">Timeline</p>
              <h2>Latest movement</h2>
            </div>
            <div className="pulse-timeline">
              {pulseItems.map((item, index) => (
                <article className={index % 2 ? "tone-cyan" : "tone-orange"} key={`${item.time}-${item.sourceName}`}>
                  <time>{item.time}</time>
                  <strong>{item.sourceName}</strong>
                  <p>{item.title}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="pulse-rail-card">
            <p className="pulse-label">Selected source</p>
            <div className="pulse-selected-source">
              <strong>{selectedArticle?.source?.name || "Source"}</strong>
              <p>{compactStoryText(cleanText(selectedArticle?.title), 120) || "Select a source on the spectrum to inspect its headline."}</p>
              {selectedArticle ? <button type="button" onClick={() => setSourceModalArticle(selectedArticle)}>View source brief</button> : null}
            </div>
          </section>

          {divergenceIndex ? (
            <section className="pulse-rail-card">
              <p className="pulse-label">Divergence mix</p>
              <div className="pulse-mix">
                <span>Headlines <b>{Math.round(divergenceIndex.headlineSentimentSpread)}</b></span>
                <span>Frames <b>{Math.round(divergenceIndex.framingTypeEntropy)}</b></span>
                <span>Structure <b>{Math.round(divergenceIndex.structuralDivergence)}</b></span>
              </div>
            </section>
          ) : null}

          {relatedStories.length ? (
            <section className="pulse-rail-card">
              <p className="pulse-label">Related</p>
              <div className="pulse-related">
                {relatedStories.map((story) => (
                  <Link href={`/story/${story.id}`} key={story.id}>
                    <span>{categoryLabel(story.topicCategory)}</span>
                    <strong>{compactStoryText(story.topic, 74)}</strong>
                    <small>{story.sourceCount} sources</small>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
        </aside>
      </div>

      {sourceModalArticle ? <SourceArticleModal article={sourceModalArticle} onClose={() => setSourceModalArticle(null)} /> : null}

    </main>
  );
}

function SourceArticleModal({ article, onClose }: { article: Article; onClose: () => void }) {
  return (
    <div className="pulse-source-modal" role="dialog" aria-modal="true" aria-labelledby="source-modal-title">
      <button className="pulse-source-modal-backdrop" type="button" aria-label="Close source brief" onClick={onClose} />
      <section className="pulse-source-modal-panel">
        <div className="pulse-source-modal-head">
          <p className="pulse-label">Source brief</p>
          <button type="button" aria-label="Close source brief" onClick={onClose}>Close</button>
        </div>
        <div className="pulse-source-modal-meta">
          <span>{article.source?.name || "Source"}</span>
          <span>{article.framingType ? categoryLabel(article.framingType) : "Frame pending"}</span>
          <time>{formatPulseTime(article.publishedAt)}</time>
        </div>
        <h2 id="source-modal-title">{cleanText(article.title)}</h2>
        <p>{compactStoryText(cleanText(article.summary) || cleanText(article.title), 320)}</p>
        <dl>
          <div><dt>Outlet</dt><dd>{article.source?.name || "Source"}</dd></div>
          <div><dt>Published</dt><dd>{article.publishedAt ? `${formatClock(article.publishedAt)} / ${formatPulseTime(article.publishedAt)}` : "Updating"}</dd></div>
          <div><dt>Source URL</dt><dd>{article.url || "Unavailable"}</dd></div>
        </dl>
      </section>
    </div>
  );
}

function StoryLoading({ stats }: { stats?: ReturnType<typeof useStats>["data"] }) {
  return (
    <main className="pulse-detail">
      <style jsx global>{styles}</style>

      <PulseTopbar stats={stats} />
      <div className="pulse-detail-layout pulse-detail-skeleton" aria-label="Loading story detail" aria-busy="true">
        <aside className="pulse-tools">
          {Array.from({ length: 3 }).map((_, index) => <div className="pulse-tool-skeleton" key={index} />)}
        </aside>
        <article className="pulse-story">
          <header className="pulse-hero pulse-hero-skeleton">
            <span className="pulse-skel-kicker" />
            <span className="pulse-skel-title" />
            <span className="pulse-skel-title short" />
            <span className="pulse-skel-deck" />
            <span className="pulse-skel-deck narrow" />
            <div className="pulse-skel-meta"><i /><i /><i /></div>
          </header>
          <section className="pulse-summary pulse-summary-skeleton">
            <span />
            <div><i /><i /></div>
          </section>
          <section className="pulse-signal-grid">
            {Array.from({ length: 3 }).map((_, index) => <article className="pulse-signal-skeleton" key={index}><span /><i /><b /></article>)}
          </section>
          <section className="pulse-spectrum pulse-spectrum-skeleton">
            <span />
            <i />
            <div>{Array.from({ length: 5 }).map((_, index) => <b key={index} />)}</div>
          </section>
        </article>
        <aside className="pulse-rail">
          {Array.from({ length: 4 }).map((_, index) => <section className={`pulse-rail-card pulse-rail-card-skeleton ${index === 0 ? "is-score" : ""}`} key={index}><span /><i /><b /></section>)}
        </aside>
      </div>
    </main>
  );
}

function StoryState({ title, body }: { title: string; body: string }) {
  return (
    <main className="pulse-detail">
      <style jsx global>{styles}</style>

      <PulseTopbar />
      <section className="pulse-state">
        <div>
          <p className="pulse-label">Story signal unavailable</p>
          <h1>{title}</h1>
          <p>{body}</p>
          <nav>
            <Link href="/stories">Back to stories</Link>
            <Link href="/">Return home</Link>
          </nav>
        </div>
      </section>
    </main>
  );
}

function sortArticles(articles: Article[]) {
  return [...articles].sort((a, b) => (a.politicalLeanScore ?? 0) - (b.politicalLeanScore ?? 0));
}

function cleanText(value: string | null | undefined) {
  return value?.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim() || "";
}

function whyCoverageMatters(cluster: StoryCluster, score: number, articles: Article[]) {
  const sourceCount = cluster.sourceCount || articles.length;
  return `Readers may leave with a different understanding depending on which of the ${sourceCount} tracked outlets they encounter first. A ${score}/100 score means Fracture sees measurable distance in framing, tone, or emphasis.`;
}

function splitHeadline(articles: Article[]) {
  const frames = Array.from(new Set(articles.map((article) => article.framingType).filter(Boolean)));
  return frames.length > 1 ? `${frames.length} framing patterns are visible.` : "Tone and emphasis vary by outlet.";
}

function sourceInitials(name: string) {
  return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

function spectrumPosition(article: Article, index: number, total: number) {
  if (typeof article.politicalLeanScore === "number") return Math.min(92, Math.max(8, ((article.politicalLeanScore + 1) / 2) * 84 + 8));
  return total <= 1 ? 50 : 8 + (index / (total - 1)) * 84;
}

function buildPulseItems(timeline: TimelineEntry[], articles: Article[]) {
  const entries = timeline.length
    ? timeline.map((item) => ({ sourceName: item.sourceName, time: item.publishedAt, title: item.title }))
    : articles.map((article) => ({ sourceName: article.source?.name || "Source", time: article.publishedAt || "", title: article.title }));
  return entries.map((entry) => ({ sourceName: entry.sourceName, time: formatClock(entry.time), title: cleanText(entry.title) })).slice(0, 5);
}

function buildHeadlineRows(headlines: HeadlineEntry[], articles: Article[]) {
  if (headlines.length) {
    return headlines.map((headline) => ({
      id: headline.articleId,
      sourceName: headline.sourceName,
      headline: cleanText(headline.headline),
      score: Math.round(Math.abs(headline.sentiment ?? 0) * 45 + Math.abs(headline.lean ?? 0) * 35 + 20),
      url: articles.find((article) => article.id === headline.articleId)?.url,
    }));
  }
  return articles.map((article) => ({
    id: article.id,
    sourceName: article.source?.name || "Source",
    headline: cleanText(article.title),
    score: Math.round(Math.abs(article.headlineSentiment ?? 0) * 45 + Math.abs(article.politicalLeanScore ?? 0) * 35 + 20),
    url: article.url,
  }));
}

const styles = `
.pulse-detail{--chalk:#FCFCF8;--night:#101114;--orange:#FF5A1F;--cyan:#14B8C8;--warm:#D9D4CC;--ink-2:#323338;--muted:#717174;--line:rgba(16,17,20,.16);--soft:#F0EEE7;min-height:100vh;background:var(--chalk);color:var(--night);font-family:Inter,"Public Sans",Arial,sans-serif;letter-spacing:0}.pulse-detail *,.pulse-detail *::before,.pulse-detail *::after{box-sizing:border-box}.pulse-detail a{color:inherit;text-decoration:none}.pulse-detail button{font:inherit}
${pulseChromeStyles}
.pulse-detail-layout{display:grid;grid-template-columns:76px minmax(0,1fr) 340px;gap:28px;padding:28px max(18px,calc((100vw - 1420px)/2)) 64px}.pulse-tools{position:sticky;top:28px;align-self:start;display:grid;gap:10px}.pulse-tools button{display:inline-flex;align-items:center;justify-content:center;border:1px solid currentColor;background:var(--chalk);color:inherit;cursor:pointer;width:58px;height:58px;transition:color 160ms ease,transform 160ms ease}.pulse-tools button:hover{color:var(--orange);transform:translateY(-1px)}.pulse-tools span{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)}
.pulse-story{min-width:0;background:rgba(255,255,255,.34)}.pulse-hero{padding:38px 0 34px;border-bottom:3px solid var(--night)}.pulse-kicker,.pulse-meta>span:not(.pulse-fdi-badge){display:inline-flex;align-items:center}.pulse-kicker{gap:8px;color:var(--orange);font-size:12px;font-weight:950;letter-spacing:.1em;text-transform:uppercase}.pulse-hero h1{max-width:980px;margin:20px 0 18px;color:var(--night);font-size:clamp(54px,7vw,112px);line-height:.88;font-weight:1000;letter-spacing:-.065em}.pulse-deck{max-width:760px;margin:0;color:var(--ink-2);font-size:22px;line-height:1.36}.pulse-meta{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin-top:24px}.pulse-meta>span:not(.pulse-fdi-badge){gap:7px;border:1px solid var(--line);background:var(--soft);color:var(--night);padding:8px 10px;font-size:12px;font-weight:850}
.pulse-summary{display:grid;grid-template-columns:180px minmax(0,1fr);gap:28px;padding:28px 0;border-bottom:1px solid var(--line)}.pulse-summary p:last-child{margin:0;color:var(--night);font-size:24px;line-height:1.34;font-weight:760;letter-spacing:-.02em}.pulse-label{margin:0;color:var(--orange);font-size:11px;font-weight:950;letter-spacing:.1em;text-transform:uppercase}
.pulse-signal-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));border-bottom:1px solid var(--line)}.pulse-signal-grid article{min-height:220px;padding:24px 22px 24px 0;border-right:1px solid var(--line)}.pulse-signal-grid article+article{padding-left:22px}.pulse-signal-grid article:last-child{border-right:0}.pulse-signal-grid span,.pulse-source-list span,.pulse-related span{color:var(--cyan);font-size:11px;font-weight:950;text-transform:uppercase}.pulse-signal-grid h2,.pulse-copy-block h2,.pulse-section-heading h2{margin:8px 0 10px;color:var(--night);font-size:28px;line-height:1.02;font-weight:950;letter-spacing:-.04em}.pulse-signal-grid p,.pulse-copy-block p,.pulse-timeline p{margin:0;color:var(--muted);line-height:1.45}
.pulse-spectrum,.pulse-copy-block,.pulse-headlines{padding:30px 0;border-bottom:1px solid var(--line)}.pulse-section-heading{display:flex;align-items:end;justify-content:space-between;gap:22px;margin-bottom:24px}.pulse-section-heading.compact{display:block;margin-bottom:14px}.pulse-section-heading.compact h2{font-size:22px}.pulse-track{position:relative;height:138px;margin:26px 4px 32px;border-block:1px solid var(--night)}.pulse-track::before{content:"";position:absolute;left:0;right:0;top:50%;height:2px;background:var(--night);transform:translateY(-50%)}.pulse-track>span{position:absolute;top:12px;color:var(--muted);font-size:12px;font-weight:850}.pulse-track>span:nth-child(1){left:0}.pulse-track>span:nth-child(2){left:50%;transform:translateX(-50%)}.pulse-track>span:nth-child(3){right:0}.pulse-track button{position:absolute;top:50%;width:44px;height:44px;border:2px solid var(--night);background:var(--chalk);color:var(--night);font-weight:950;transform:translate(-50%,-50%);cursor:pointer;transition:background 160ms ease,color 160ms ease,transform 160ms ease}.pulse-track button:hover,.pulse-track button.active{background:var(--orange);color:var(--chalk);transform:translate(-50%,-50%) scale(1.08)}
.pulse-source-list{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:1px;background:var(--line)}.pulse-source-list button{min-height:150px;padding:16px;border:0;background:var(--chalk);color:var(--night);text-align:left;cursor:pointer;transition:background 160ms ease,transform 160ms ease}.pulse-source-list button:hover{background:white;transform:translateY(-2px)}.pulse-source-list strong{display:block;margin:8px 0 10px;font-size:15px;line-height:1.2}.pulse-source-list i{color:var(--orange);font-size:12px;font-style:normal;font-weight:850}.pulse-copy-block{display:grid;grid-template-columns:minmax(150px,190px) minmax(0,1fr);gap:30px;align-items:start;background:linear-gradient(90deg,rgba(255,255,255,.64),rgba(255,255,255,.22));padding:34px 28px;border:1px solid var(--line);border-inline:0}.pulse-reading-label{display:grid;gap:12px;align-content:start}.pulse-reading-label span{display:inline-flex;width:max-content;max-width:100%;border:1px solid var(--line);background:var(--soft);padding:8px 10px;color:var(--night);font-size:12px;font-weight:950;text-transform:uppercase}.pulse-reading-body{max-width:800px}.pulse-copy-block h2{margin:0;font-size:44px;max-width:760px}.pulse-copy-block p:last-child{max-width:760px;margin:18px 0 0;color:var(--ink-2);font-size:19px;line-height:1.58}
.pulse-headline-list{display:grid;gap:8px}.pulse-headline-list button{display:grid;grid-template-columns:150px minmax(0,1fr) 52px;gap:16px;align-items:center;border:1px solid var(--line);background:white;color:var(--night);padding:14px 16px;text-align:left;cursor:pointer;transition:border-color 160ms ease,transform 160ms ease}.pulse-headline-list button:hover,.pulse-headline-list button.active{border-color:var(--night);transform:translateX(2px)}.pulse-headline-list span{color:var(--cyan);font-size:12px;font-weight:950;text-transform:uppercase}.pulse-headline-list strong{font-size:16px;line-height:1.18}.pulse-headline-list small{display:grid;place-items:center;background:var(--night);color:white;width:44px;height:34px;font-weight:950}
.pulse-rail{position:sticky;top:28px;align-self:start;display:grid;gap:14px}.pulse-rail-card{border:1px solid var(--night);background:var(--chalk);padding:16px}.pulse-score{display:grid;gap:14px;background:var(--night);color:var(--chalk);padding:18px}.pulse-score .pulse-label{color:var(--cyan)}.pulse-score .pulse-fdi-badge{width:100%;grid-template-columns:minmax(0,1fr) auto;margin:0;color:var(--night);box-shadow:5px 5px 0 var(--orange)}.pulse-score .pulse-fdi-badge strong{justify-self:end}.pulse-score-count{display:block;border-top:1px solid rgba(252,252,248,.18);border-bottom:1px solid rgba(252,252,248,.18);padding:11px 0;color:rgba(252,252,248,.78);font-size:13px;font-weight:850;line-height:1.3}.pulse-meter{height:9px;background:rgba(252,252,248,.18)}.pulse-meter i{display:block;height:100%;background:var(--orange)}.pulse-timeline{display:grid;border-top:1px solid var(--line)}.pulse-timeline article{position:relative;padding:13px 0 13px 18px;border-bottom:1px solid var(--line)}.pulse-timeline article::before{content:"";position:absolute;left:0;top:18px;width:8px;height:8px;border-radius:999px;background:var(--muted)}.pulse-timeline .tone-orange::before{background:var(--orange)}.pulse-timeline .tone-cyan::before{background:var(--cyan)}.pulse-timeline time{color:var(--muted);font-family:"Geist Mono","IBM Plex Mono",ui-monospace,monospace;font-size:11px}.pulse-timeline strong{display:block;margin:4px 0;color:var(--night);font-size:14px}.pulse-selected-source strong{display:block;margin:8px 0;font-size:22px;letter-spacing:-.03em}.pulse-selected-source p{color:var(--muted);line-height:1.4}.pulse-selected-source button{border:0;background:transparent;color:var(--orange);padding:0;font-size:13px;font-weight:950;cursor:pointer}.pulse-mix{display:grid;gap:8px}.pulse-mix span{display:flex;justify-content:space-between;border-top:1px solid var(--line);padding-top:8px;font-size:13px}.pulse-related{display:grid;gap:1px;background:var(--line)}.pulse-related a{display:grid;gap:5px;background:var(--chalk);padding:12px}.pulse-related strong{color:var(--night);font-size:15px;line-height:1.18}.pulse-related small{color:var(--muted)}
.pulse-source-modal{position:fixed;inset:0;z-index:500;display:grid;place-items:center;padding:24px}.pulse-source-modal-backdrop{position:absolute;inset:0;border:0;background:rgba(16,17,20,.58);cursor:pointer}.pulse-source-modal-panel{position:relative;z-index:1;width:min(760px,100%);max-height:min(82vh,760px);overflow:auto;border:1px solid var(--night);background:var(--chalk);color:var(--night);padding:24px;box-shadow:12px 12px 0 var(--orange)}.pulse-source-modal-head{display:flex;align-items:center;justify-content:space-between;gap:18px;border-bottom:1px solid var(--line);padding-bottom:14px}.pulse-source-modal-head button{border:1px solid var(--night);background:white;color:var(--night);height:36px;padding:0 12px;font-size:12px;font-weight:950;text-transform:uppercase;cursor:pointer}.pulse-source-modal-meta{display:flex;flex-wrap:wrap;gap:8px;margin:18px 0}.pulse-source-modal-meta span,.pulse-source-modal-meta time{border:1px solid var(--line);background:white;padding:7px 9px;font-size:12px;font-weight:900}.pulse-source-modal-meta span:first-child{color:var(--cyan);text-transform:uppercase}.pulse-source-modal h2{max-width:680px;margin:0;font-size:clamp(34px,5vw,64px);line-height:.94;font-weight:1000;letter-spacing:-.055em}.pulse-source-modal-panel>p{max-width:620px;margin:18px 0 22px;color:var(--ink-2);font-size:18px;line-height:1.5}.pulse-source-modal dl{display:grid;gap:1px;margin:0;background:var(--line)}.pulse-source-modal dl div{display:grid;grid-template-columns:140px minmax(0,1fr);gap:14px;background:white;padding:13px}.pulse-source-modal dt{color:var(--orange);font-size:11px;font-weight:950;letter-spacing:.1em;text-transform:uppercase}.pulse-source-modal dd{min-width:0;margin:0;color:var(--night);font-size:13px;font-weight:800;line-height:1.35;overflow-wrap:anywhere}
.pulse-tool-skeleton,.pulse-hero-skeleton span,.pulse-hero-skeleton i,.pulse-summary-skeleton span,.pulse-summary-skeleton i,.pulse-signal-skeleton span,.pulse-signal-skeleton i,.pulse-signal-skeleton b,.pulse-spectrum-skeleton span,.pulse-spectrum-skeleton i,.pulse-spectrum-skeleton b,.pulse-rail-card-skeleton span,.pulse-rail-card-skeleton i,.pulse-rail-card-skeleton b{display:block;background:linear-gradient(90deg,#fff,var(--warm),#fff);background-size:200% 100%;animation:skeleton 1.35s ease-in-out infinite}.pulse-tool-skeleton{width:58px;height:58px;border:1px solid var(--line)}.pulse-hero-skeleton{min-height:360px}.pulse-skel-kicker{width:220px;height:13px}.pulse-skel-title{width:min(880px,92%);height:78px;margin-top:24px}.pulse-skel-title.short{width:min(620px,70%);margin-top:12px}.pulse-skel-deck{width:min(720px,76%);height:22px;margin-top:24px}.pulse-skel-deck.narrow{width:min(520px,58%);margin-top:10px}.pulse-skel-meta{display:flex;flex-wrap:wrap;gap:10px;margin-top:26px}.pulse-skel-meta i{width:132px;height:34px}.pulse-summary-skeleton span{height:14px;width:92px}.pulse-summary-skeleton i{height:24px;width:86%;margin-bottom:10px}.pulse-summary-skeleton i:last-child{width:62%}.pulse-signal-skeleton span{height:12px;width:46%}.pulse-signal-skeleton i{height:36px;width:88%;margin:18px 0 12px}.pulse-signal-skeleton b{height:58px;width:96%}.pulse-spectrum-skeleton span{height:13px;width:150px}.pulse-spectrum-skeleton i{height:138px;margin:26px 4px 32px}.pulse-spectrum-skeleton div{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:1px;background:var(--line)}.pulse-spectrum-skeleton b{height:150px;background-color:var(--chalk)}.pulse-rail-card-skeleton{min-height:132px}.pulse-rail-card-skeleton.is-score{min-height:224px;background:var(--night)}.pulse-rail-card-skeleton span{width:60px;height:12px}.pulse-rail-card-skeleton i{width:72%;height:42px;margin:16px 0}.pulse-rail-card-skeleton b{width:100%;height:11px}.pulse-rail-card-skeleton.is-score span,.pulse-rail-card-skeleton.is-score i,.pulse-rail-card-skeleton.is-score b{background:linear-gradient(90deg,rgba(252,252,248,.1),rgba(217,212,204,.48),rgba(252,252,248,.1));background-size:200% 100%}.pulse-state{min-height:calc(100vh - 92px);display:grid;place-items:center;padding:48px 18px}.pulse-state>div{width:min(760px,100%);border:1px solid var(--night);background:white;padding:38px;box-shadow:10px 10px 0 var(--orange)}.pulse-state h1{max-width:660px;margin:10px 0 12px;font-size:clamp(44px,6vw,82px);line-height:.9;font-weight:1000;letter-spacing:-.06em}.pulse-state p:not(.pulse-label){max-width:520px;margin:0;color:var(--muted);font-size:18px;line-height:1.42}.pulse-state nav{display:flex;flex-wrap:wrap;gap:10px;margin-top:24px}.pulse-state a{border:1px solid var(--night);padding:11px 13px;font-size:14px;font-weight:950}.pulse-state a:first-child{background:var(--night);color:white}.pulse-state a:last-child{background:var(--chalk);color:var(--night)}@keyframes skeleton{to{background-position:-200% 0}}
@media(max-width:1100px){.pulse-detail-layout{grid-template-columns:minmax(0,1fr)}.pulse-tools,.pulse-rail{position:static}.pulse-tools{display:flex;order:2}.pulse-story{order:1}.pulse-rail{order:3;grid-template-columns:repeat(2,minmax(0,1fr))}.pulse-rail-card:first-child{grid-column:1/-1}.pulse-source-list,.pulse-spectrum-skeleton div{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:760px){.pulse-detail-layout{padding-inline:14px}.pulse-summary,.pulse-copy-block{grid-template-columns:1fr}.pulse-signal-grid,.pulse-source-list,.pulse-rail,.pulse-spectrum-skeleton div{grid-template-columns:1fr}.pulse-signal-grid article,.pulse-signal-grid article+article{padding:22px 0;border-right:0;border-bottom:1px solid var(--line)}.pulse-hero h1{font-size:clamp(42px,13vw,62px);line-height:.96}.pulse-deck{font-size:19px}.pulse-tools{gap:8px}.pulse-tools button,.pulse-tool-skeleton{width:48px;height:48px}.pulse-headline-list button{grid-template-columns:1fr}.pulse-copy-block{padding:26px 20px}.pulse-copy-block h2{font-size:34px}.pulse-section-heading{display:block}.pulse-skel-title{height:50px}.pulse-state h1{font-size:44px}.pulse-state>div{padding:26px;box-shadow:6px 6px 0 var(--orange)}}
@media(max-width:520px){.pulse-detail{overflow-x:hidden}.pulse-detail-layout{gap:18px;padding:20px 12px 44px}.pulse-hero{padding:24px 0 26px}.pulse-kicker{font-size:11px;line-height:1.3}.pulse-hero h1{font-size:clamp(36px,11vw,54px);letter-spacing:-.045em}.pulse-deck{font-size:18px}.pulse-meta{gap:8px;margin-top:18px}.pulse-meta>span:not(.pulse-fdi-badge){max-width:100%;font-size:12px}.pulse-summary{gap:12px;padding:22px 0}.pulse-summary p:last-child{font-size:20px}.pulse-signal-grid article,.pulse-signal-grid article+article{min-height:auto;padding:20px 0}.pulse-signal-grid h2,.pulse-section-heading h2{font-size:24px}.pulse-spectrum,.pulse-headlines{padding:24px 0}.pulse-track{height:126px;margin:22px 22px 26px}.pulse-track button{width:38px;height:38px;font-size:12px}.pulse-track>span{font-size:11px}.pulse-source-list button{min-height:auto;padding:14px}.pulse-copy-block{gap:14px;padding:22px 16px}.pulse-reading-label{gap:9px}.pulse-reading-label span{padding:7px 9px;font-size:11px}.pulse-copy-block h2{font-size:30px;line-height:1.04}.pulse-copy-block p:last-child{font-size:17px;margin-top:14px}.pulse-headline-list button{gap:9px;padding:13px}.pulse-headline-list small{width:40px;height:30px}.pulse-tools{overflow-x:auto;padding-bottom:2px;scrollbar-width:none}.pulse-tools::-webkit-scrollbar{display:none}.pulse-tools button,.pulse-tool-skeleton{flex:0 0 46px;width:46px;height:46px}.pulse-rail{gap:12px}.pulse-rail-card{padding:14px}.pulse-score{gap:12px;padding:15px}.pulse-score .pulse-fdi-badge{box-shadow:4px 4px 0 var(--orange)}.pulse-score-count{padding:10px 0}.pulse-selected-source strong{font-size:20px}.pulse-skel-title{width:100%;height:46px}.pulse-skel-title.short{width:72%}.pulse-skel-deck{width:88%}.pulse-skel-meta i{width:112px;height:32px}.pulse-spectrum-skeleton i{height:126px;margin:22px 4px 26px}.pulse-spectrum-skeleton b{height:96px}.pulse-rail-card-skeleton{min-height:116px}.pulse-rail-card-skeleton.is-score{min-height:200px}.pulse-source-modal{padding:12px}.pulse-source-modal-panel{max-height:86vh;padding:18px;box-shadow:6px 6px 0 var(--orange)}.pulse-source-modal-head{align-items:flex-start}.pulse-source-modal h2{font-size:clamp(30px,10vw,46px)}.pulse-source-modal-panel>p{font-size:16px}.pulse-source-modal dl div{grid-template-columns:1fr;gap:6px}.pulse-state{padding:32px 12px}.pulse-state>div{padding:22px}.pulse-state h1{font-size:clamp(34px,10vw,48px)}.pulse-state nav{display:grid;grid-template-columns:1fr}.pulse-state a{justify-content:center;text-align:center}}
`;
