"use client";

import Link from "next/link";
import { use, useEffect, useRef, useState } from "react";
import { CircleUser, Moon, Search, Sparkles, Sun } from "lucide-react";
import { useStories, useStory } from "@/hooks/useStories";
import { formatTimeAgo } from "@/components/ui";
import type { Article, HeadlineEntry, StoryCluster, TimelineEntry } from "@/types";

const SECTION_LINKS = [
  { href: "/#trending-stories", label: "Trending" },
  { href: "/#highest-divergence", label: "Highest diverged" },
  { href: "/#community-picks", label: "Community" },
  { href: "/#source-credibility", label: "Credibility" },
  { href: "/#compare-outlets", label: "Try it" },
];

function fdiLevel(score: number) {
  if (score >= 70) return "HIGH";
  if (score >= 45) return "MODERATE";
  return "LOW";
}

function fdiColor(score: number) {
  if (score >= 70) return "#EF4444";
  if (score >= 45) return "#0066CC";
  return "#10A760";
}

function storyFdi(story: StoryCluster) {
  return Math.round(story.divergenceScore ?? 0);
}

function storyImage(story: StoryCluster) {
  return story.imageUrl || "https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=1200&q=80";
}

export default function StoryPage({ params }: { params: Promise<{ clusterId: string }> }) {
  const { clusterId } = use(params);
  const { data, isLoading, error } = useStory(clusterId);
  const { data: relatedData } = useStories({ limit: 8 });
  const [dark, setDark] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [navHidden, setNavHidden] = useState(false);
  const [feedback, setFeedback] = useState<"accurate" | "off" | null>(null);
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  const lastScrollY = useRef(0);

  useEffect(() => {
    lastScrollY.current = window.scrollY;

    function handleScroll() {
      const currentY = window.scrollY;
      const delta = currentY - lastScrollY.current;
      if (currentY < 32) setNavHidden(false);
      else if (delta > 8) setNavHidden(true);
      else if (delta < -8) setNavHidden(false);
      lastScrollY.current = currentY;
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (error) return <StoryError />;
  if (isLoading || !data) return <StoryLoading />;

  const { cluster, articles, headlineComparison, timeline } = data;
  const fdi = storyFdi(cluster);
  const sortedArticles = sortArticles(articles);
  const selectedArticle = sortedArticles.find((article) => article.id === selectedArticleId) ?? sortedArticles[0] ?? null;
  const summary = buildStoryOverview(cluster, sortedArticles);
  const headlineRows = buildHeadlineRows(headlineComparison, sortedArticles).slice(0, 8);
  const pulseItems = buildPulseItems(timeline, sortedArticles).slice(0, 5);
  const relatedStories = (relatedData?.stories ?? []).filter((story) => story.id !== cluster.id).slice(0, 3);

  return (
    <div className={`fx ${dark ? "fx-dark" : ""}`}>
      <nav className={`fx-nav ${navHidden ? "hidden" : ""}`} aria-label="Fracture navigation">
        <Link href="/" className="fx-logo" aria-label="Fracture home"><span>F</span>Fracture</Link>
        <div className="fx-nav-row">
          <div className="fx-links" aria-label="Primary sections">
            <Link href="/">Home</Link>
            <Link href="/stories">Stories</Link>
            <Link href="/#source-credibility">Sources</Link>
          </div>
          <div className="fx-topic-nav" aria-label="Homepage sections">
            {SECTION_LINKS.map((item) => <Link key={item.href} href={item.href}>{item.label}</Link>)}
          </div>
          <div className="fx-nav-actions">
            <div className={`fx-search-shell ${searchOpen ? "open" : ""}`}>
              <button className="fx-icon-control" type="button" aria-label="Search stories" aria-expanded={searchOpen} onMouseDown={(event) => event.preventDefault()} onClick={() => setSearchOpen((value) => !value)}><Search size={15} /></button>
              <input aria-label="Search stories" placeholder="Search stories" tabIndex={searchOpen ? 0 : -1} />
            </div>
            <button className="fx-icon-control" type="button" onClick={() => setDark((value) => !value)} aria-label="Toggle dark mode">{dark ? <Sun size={15} /> : <Moon size={15} />}</button>
            <button className="fx-icon-control" type="button" aria-label="Open user menu"><CircleUser size={16} /></button>
          </div>
        </div>
      </nav>

      <main className="fx-page fx-detail-page">
        <section className="fx-detail-hero">
          <div>
            <p className="fx-eyebrow"><Sparkles size={15} /> Story detail / {cluster.topicCategory || "News"}</p>
            <h1>{cluster.topic}</h1>
            <p>{summary}</p>
            <div className="fx-detail-meta">
              <span>{cluster.sourceCount || sortedArticles.length} outlets monitored</span>
              <span>{selectedArticle?.source?.name ? `First tracked from ${selectedArticle.source.name}` : `${cluster.articleCount} articles tracked`}</span>
              <span>Updated {formatTimeAgo(cluster.newestArticleAt)}</span>
            </div>
          </div>
          <aside className="fx-detail-score">
            <FdiBadge score={fdi} large />
            <p>This story is being covered differently across outlets. Fracture shows the gap without adding an editorial voice.</p>
          </aside>
        </section>

        <section className="fx-section fx-neutral-summary">
          <p className="fx-eyebrow">Fracture neutral summary</p>
          <p>{summary}</p>
        </section>

        <section className="fx-section fx-context-grid">
          <article className="fx-panel fx-why-panel">
            <p className="fx-eyebrow">Why we&apos;re covering this</p>
            <h2>{fdi}/100 FDI indicates {fdiLevel(fdi).toLowerCase()} framing distance.</h2>
            <p>{whyCoverageMatters(cluster, fdi, sortedArticles)}</p>
          </article>
          <article className="fx-panel fx-timeline-panel">
            <p className="fx-eyebrow">Coverage pulse</p>
            <div className="fx-coverage-pulse" aria-label="Coverage pulse timeline">
              {pulseItems.map((item) => <span key={`${item.sourceName}-${item.left}`} style={{ left: `${item.left}%` }}>{sourceInitials(item.sourceName)}</span>)}
            </div>
            <small>{coveragePulseSummary(pulseItems.length, cluster)}</small>
          </article>
        </section>

        <section className="fx-section fx-framing-cards">
          <article><span>Where coverage agrees</span><h3>{agreementHeadline(cluster)}</h3><p>Most coverage is tied to the same underlying event and shared timeline, even when outlets emphasize different consequences.</p></article>
          <article><span>Where framing splits</span><h3>{splitHeadline(sortedArticles)}</h3><p>Fracture detects shifts in headline tone, framing type, source emphasis, and the actors each outlet foregrounds.</p></article>
          <article><span>What readers should notice</span><h3>The same facts can create different narratives.</h3><p>Fracture does not rank the frames as right or wrong. It shows where emphasis moves across coverage.</p></article>
        </section>

        <section className="fx-section fx-detail-grid">
          <div className="fx-panel fx-spectrum-panel">
            <div className="fx-section-header"><div><p className="fx-eyebrow">Source spectrum</p><h2>Accountability ← Coverage frame → Cost</h2></div></div>
            <div className="fx-spectrum-track">
              {sortedArticles.slice(0, 8).map((article, index) => (
                <button key={article.id} type="button" className={selectedArticle?.id === article.id ? "active" : ""} style={{ left: `${spectrumPosition(article, index, sortedArticles.length)}%` }} onClick={() => setSelectedArticleId(article.id)} aria-label={`Highlight ${article.source?.name || "source"}`}>{sourceInitials(article.source?.name || "?")}</button>
              ))}
            </div>
            <div className="fx-spectrum-labels"><span>Responsibility</span><span>Process</span><span>Risk</span></div>
          </div>
          <aside className="fx-panel fx-selected-outlet">
            <p className="fx-eyebrow">Selected outlet</p>
            <div className="fx-source-logo">{sourceInitials(selectedArticle?.source?.name || "F")}</div>
            <h2>{selectedArticle?.source?.name || "Fracture"}</h2>
            <p>{cleanText(selectedArticle?.title) || "Select an outlet to inspect how its headline frames this story."}</p>
            {selectedArticle?.url ? <a className="fx-source-link" href={selectedArticle.url} target="_blank" rel="noreferrer">Read original coverage</a> : null}
          </aside>
        </section>

        <section className="fx-section">
          <div className="fx-section-header"><div><p className="fx-eyebrow">Headline comparison</p><h2>Same story, different framing.</h2></div></div>
          <div className="fx-headline-list">
            {headlineRows.map((row) => (
              <a key={row.id} className={selectedArticle?.id === row.id ? "active" : ""} href={row.url || "#"} target={row.url ? "_blank" : undefined} rel={row.url ? "noreferrer" : undefined} onMouseEnter={() => setSelectedArticleId(row.id)}>
                <span>{row.sourceName}</span><strong>{row.headline}</strong><FdiBadge score={row.score} />
              </a>
            ))}
          </div>
        </section>

        <section className="fx-section fx-method-note">
          <div><p className="fx-eyebrow">Transparency note</p><h2>How this score is being interpreted.</h2></div>
          <p>FDI is a reader-facing signal, not an editorial verdict. The score combines headline tone, framing language, source selection, and structural emphasis across outlets covering the same underlying event.</p>
        </section>

        <section className="fx-section fx-trust-grid">
          <div className="fx-panel"><p className="fx-eyebrow">Is this FDI accurate?</p><div className="fx-feedback"><button className={feedback === "accurate" ? "active" : ""} type="button" onClick={() => setFeedback("accurate")}>Yes, it tracks</button><button className={feedback === "off" ? "active" : ""} type="button" onClick={() => setFeedback("off")}>Something feels off</button></div>{feedback && <p className="fx-feedback-note">Thanks. Reader feedback helps audit future divergence scores.</p>}</div>
          <div className="fx-panel"><p className="fx-eyebrow">Reader insight</p><p className="fx-reader-note">The spectrum makes it easier to see when outlets cite the same event but choose different responsible actors or consequences.</p><span className="fx-feedback-note">Community review / live story</span></div>
        </section>

        {relatedStories.length > 0 && (
          <section className="fx-section">
            <div className="fx-section-header"><div><p className="fx-eyebrow">Related stories</p><h2>More coverage with visible framing distance.</h2></div></div>
            <div className="fx-story-grid compact">{relatedStories.map((story) => <StoryCard key={story.id} story={story} />)}</div>
          </section>
        )}
      </main>

      <FractureFooter />
      <style jsx global>{styles}</style>
    </div>
  );
}

function StoryError() {
  return <div className="fx"><main className="fx-page fx-state"><h1>Story not found</h1><p>We couldn&apos;t find the story you&apos;re looking for.</p><Link href="/stories" className="fx-primary-action">Back to stories</Link><style jsx global>{styles}</style></main></div>;
}

function StoryLoading() {
  return <div className="fx"><main className="fx-page fx-detail-page" aria-busy="true"><section className="fx-detail-hero"><div className="fx-skeleton tall" /><div className="fx-skeleton tall" /></section><section className="fx-section fx-context-grid"><div className="fx-skeleton" /><div className="fx-skeleton" /></section><style jsx global>{styles}</style></main></div>;
}

function FdiBadge({ score, large = false }: { score: number; large?: boolean }) {
  return <div className={`fx-fdi ${large ? "large" : ""}`} style={{ "--fdi-color": fdiColor(score), "--fdi-score": `${Math.max(4, score)}%` } as React.CSSProperties}><div className="fx-fdi-meter"><span /></div><strong>FDI: {score}/100 | {fdiLevel(score)}</strong></div>;
}

function StoryCard({ story }: { story: StoryCluster }) {
  return <Link href={`/story/${story.id}`} className="fx-card"><img src={storyImage(story)} alt="Related news story" /><div className="fx-card-body"><span className="fx-card-topic">{story.topicCategory || "News"}</span><h3>{story.topic}</h3><p>{story.summary || `Fracture is tracking coverage across ${story.sourceCount} outlets.`}</p><FdiBadge score={storyFdi(story)} /><div className="fx-card-meta"><span>{story.sourceCount} sources</span><span>{formatTimeAgo(story.newestArticleAt)}</span></div></div></Link>;
}

function FractureFooter() {
  return <footer className="fx-footer"><div className="fx-footer-lede"><Link href="/" className="fx-footer-brand"><span>F</span>Fracture</Link><p>Media divergence intelligence</p><p className="fx-footer-explainer">Fracture tracks how trusted outlets frame the same story, making divergence visible without adding editorial opinion.</p></div><div className="fx-footer-bottom"><div><a href="mailto:hello@fracture.news">hello@fracture.news</a><a href="https://github.com" target="_blank" rel="noreferrer">GitHub</a></div><div><span>© 2026 Fracture</span><Link href="/stories">Stories</Link><Link href="/search">Search</Link></div></div></footer>;
}

function sortArticles(articles: Article[]) {
  return [...articles].sort((a, b) => (a.politicalLeanScore ?? 0) - (b.politicalLeanScore ?? 0));
}

function cleanText(value: string | null | undefined) {
  return value?.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim() || null;
}

function buildStoryOverview(cluster: StoryCluster, articles: Article[]) {
  if (cluster.summary?.trim()) return cluster.summary.trim();
  const summary = articles.map((article) => cleanText(article.summary)).find((value): value is string => Boolean(value && value.length > 50));
  if (summary) return `Across shared coverage, outlets describe ${summary.charAt(0).toLowerCase()}${summary.slice(1)}`;
  return `Fracture is tracking how ${cluster.sourceCount} sources and ${cluster.articleCount} articles frame ${cluster.topic}.`;
}

function whyCoverageMatters(cluster: StoryCluster, fdi: number, articles: Article[]) {
  const sourceCount = cluster.sourceCount || articles.length;
  return `Readers may leave with a different understanding depending on which of the ${sourceCount} tracked outlets they encounter first. A ${fdi}/100 score means Fracture sees measurable distance in framing, tone, or emphasis.`;
}

function agreementHeadline(cluster: StoryCluster) {
  return `${cluster.topicCategory || "The story"} is the shared center.`;
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
  const entries = timeline.length ? timeline : articles.map((article) => ({ sourceName: article.source?.name || "Source", publishedAt: article.publishedAt || "" }));
  return entries.map((entry, index) => ({ sourceName: entry.sourceName, left: entries.length <= 1 ? 50 : 8 + (index / (entries.length - 1)) * 84 }));
}

function coveragePulseSummary(count: number, cluster: StoryCluster) {
  return count > 1 ? `First reports and follow-ups are distributed across ${count} visible outlets; divergence changes as new headlines enter the cluster.` : `Fracture will expand the pulse as more outlets publish coverage of this ${cluster.topicCategory || "story"}.`;
}

function buildHeadlineRows(headlines: HeadlineEntry[], articles: Article[]) {
  if (headlines.length) return headlines.map((headline) => ({ id: headline.articleId, sourceName: headline.sourceName, headline: headline.headline, score: Math.round(Math.abs(headline.sentiment ?? 0) * 45 + Math.abs(headline.lean ?? 0) * 35 + 20), url: articles.find((article) => article.id === headline.articleId)?.url }));
  return articles.map((article) => ({ id: article.id, sourceName: article.source?.name || "Source", headline: article.title, score: Math.round(Math.abs(article.headlineSentiment ?? 0) * 45 + Math.abs(article.politicalLeanScore ?? 0) * 35 + 20), url: article.url }));
}

const styles = `
body:has(.fx) > .ns-navbar, body:has(.fx) > footer, body:has(.fx) .ns-navbar { display: none !important; }
.fx{--fx-bg:#F8F7F5;--fx-surface:#FFFFFF;--fx-text:#1A1918;--fx-muted:#6B6B6B;--fx-accent:#0066CC;--fx-border:#E8E6E3;--fx-blue-soft:#E3F2FF;--fx-shadow:0 18px 50px rgba(26,25,24,.09);min-height:100vh;background:var(--fx-bg);color:var(--fx-text);font-family:Inter,ui-sans-serif,system-ui,sans-serif}.fx.fx-dark{--fx-bg:#0F0F0F;--fx-surface:#1A1A1A;--fx-text:#F5F5F5;--fx-muted:#A0A0A0;--fx-accent:#3B82F6;--fx-border:#404040;--fx-blue-soft:rgba(59,130,246,.16);--fx-shadow:0 18px 60px rgba(0,0,0,.34)}.fx button,.fx input{font:inherit}.fx a,.fx button{transition:transform .2s ease,box-shadow .2s ease,border-color .2s ease,background .2s ease,color .2s ease}.fx h1,.fx h2,.fx h3{font-family:Georgia,"Times New Roman",serif;color:var(--fx-text)}.fx p{color:var(--fx-muted)}
.fx-nav{position:sticky;top:0;z-index:20;min-height:132px;display:grid;gap:18px;align-items:center;justify-items:center;padding:22px max(24px,calc((100vw - 1280px)/2)) 16px;background:linear-gradient(90deg,color-mix(in srgb,var(--fx-surface) 88%,transparent),color-mix(in srgb,var(--fx-bg) 86%,transparent)),color-mix(in srgb,var(--fx-bg) 92%,transparent);border-bottom:1px solid var(--fx-border);backdrop-filter:blur(18px);box-shadow:0 12px 44px rgba(26,25,24,.05);transform:translateY(0);transition:transform .46s cubic-bezier(.16,1,.3,1),box-shadow .28s ease}.fx-nav.hidden{transform:translateY(calc(-100% - 18px));box-shadow:none}.fx-nav-row,.fx-nav-actions,.fx-links,.fx-topic-nav{display:flex;align-items:center}.fx-nav-row{width:100%;justify-content:center;gap:clamp(22px,3vw,42px);flex-wrap:wrap}.fx-nav-actions{gap:clamp(14px,2vw,24px);position:relative;padding-left:clamp(22px,2.6vw,38px)}.fx-nav-actions:before{content:"";position:absolute;left:0;top:50%;width:1px;height:24px;background:var(--fx-border);transform:translateY(-50%)}.fx-logo{display:inline-flex;align-items:center;gap:14px;color:var(--fx-text);font-family:Georgia,"Times New Roman",serif;font-size:clamp(34px,4vw,54px);font-weight:700;letter-spacing:-.04em;line-height:.9}.fx-logo span,.fx-source-logo{display:inline-flex;align-items:center;justify-content:center;width:48px;height:48px;border-radius:50%;background:var(--fx-text);color:var(--fx-bg);font-family:Georgia,serif;font-weight:700;font-size:18px}.fx-links,.fx-topic-nav{gap:clamp(18px,2.5vw,34px)}.fx-links a,.fx-topic-nav a{position:relative;color:var(--fx-muted);padding:4px 0;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase}.fx-links a:after,.fx-topic-nav a:after{content:"";position:absolute;left:0;right:0;bottom:-4px;height:1px;background:currentColor;transform:scaleX(0);transition:transform .18s ease}.fx-links a:hover,.fx-topic-nav a:hover{color:var(--fx-text)}.fx-links a:hover:after,.fx-topic-nav a:hover:after{transform:scaleX(1)}.fx-icon-control{display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;border:1px solid color-mix(in srgb,var(--fx-text) 14%,var(--fx-border));border-radius:999px;background:color-mix(in srgb,var(--fx-surface) 82%,transparent);color:var(--fx-text);cursor:pointer}.fx-search-shell{display:inline-flex;align-items:center;gap:8px;width:34px;height:34px;overflow:hidden;border-radius:999px;transition:width .28s cubic-bezier(.16,1,.3,1),background .22s ease,padding .28s cubic-bezier(.16,1,.3,1)}.fx-search-shell.open{width:210px;padding-right:12px;border:1px solid color-mix(in srgb,var(--fx-text) 14%,var(--fx-border));background:color-mix(in srgb,var(--fx-surface) 88%,transparent)}.fx-search-shell input{width:142px;border:0;outline:0;background:transparent;color:var(--fx-text);font-size:13px;opacity:0;pointer-events:none}.fx-search-shell.open input{opacity:1;pointer-events:auto}
.fx-page{max-width:1200px;margin:0 auto;padding:34px 24px 72px}.fx-detail-page{max-width:1240px}.fx-section{padding:46px 0 0}.fx-eyebrow{display:inline-flex;gap:7px;align-items:center;margin:0;color:var(--fx-accent);font-size:12px;font-weight:700;text-transform:uppercase}.fx-detail-hero{display:grid;grid-template-columns:minmax(0,1fr) 360px;gap:34px;align-items:center;padding:44px 0 38px;border-bottom:1px solid var(--fx-border)}.fx-detail-hero h1{max-width:880px;margin:12px 0 16px;font-size:clamp(42px,6vw,82px);line-height:.92;letter-spacing:-.04em}.fx-detail-hero p:not(.fx-eyebrow),.fx-neutral-summary>p:last-child{max-width:760px;margin:0;color:var(--fx-muted);font-family:Georgia,serif;font-size:20px;line-height:1.62}.fx-detail-meta{display:flex;flex-wrap:wrap;gap:12px;margin-top:24px;color:var(--fx-muted);font-size:13px}.fx-detail-meta span{border-top:1px solid var(--fx-border);padding-top:8px}.fx-detail-score{display:grid;gap:18px;padding:24px;border:1px solid var(--fx-border);background:radial-gradient(circle at 50% 10%,var(--fx-blue-soft),transparent 60%),var(--fx-surface);box-shadow:var(--fx-shadow)}.fx-detail-score p{margin:0;font-family:Georgia,serif;line-height:1.55}.fx-neutral-summary{padding:28px;border:1px solid var(--fx-border);background:var(--fx-surface)}.fx-panel{background:var(--fx-surface);border:1px solid var(--fx-border);padding:24px;box-shadow:0 1px 0 rgba(0,0,0,.02)}.fx-context-grid{display:grid;grid-template-columns:minmax(0,.95fr) minmax(0,1.05fr);gap:22px}.fx-why-panel h2{margin:10px 0 12px;font-size:clamp(28px,4vw,44px);line-height:1.02}.fx-why-panel p:last-child,.fx-timeline-panel small{color:var(--fx-muted);font-family:Georgia,serif;font-size:18px;line-height:1.55}.fx-coverage-pulse{position:relative;height:124px;margin:24px 0 18px;border-bottom:1px solid var(--fx-border)}.fx-coverage-pulse:before{content:"";position:absolute;left:0;right:0;bottom:-1px;height:2px;background:linear-gradient(90deg,var(--fx-accent),color-mix(in srgb,var(--fx-accent) 20%,var(--fx-border)))}.fx-coverage-pulse span{position:absolute;bottom:-14px;transform:translateX(-50%);display:grid;place-items:center;width:72px;height:28px;border:1px solid var(--fx-border);background:var(--fx-surface);color:var(--fx-text);font-size:11px;font-weight:800}.fx-framing-cards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}.fx-framing-cards article{display:grid;gap:10px;min-height:220px;padding:22px;border:1px solid var(--fx-border);background:linear-gradient(180deg,color-mix(in srgb,var(--fx-blue-soft) 34%,transparent),transparent 58%),var(--fx-surface)}.fx-framing-cards span{color:var(--fx-accent);font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase}.fx-framing-cards h3{margin:0;font-size:27px;line-height:1.04}.fx-framing-cards p{margin:0;line-height:1.5}
.fx-detail-grid{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:22px;align-items:start}.fx-section-header{display:flex;justify-content:space-between;gap:22px;align-items:end;margin-bottom:22px}.fx-section-header h2{font-size:clamp(26px,3vw,38px);margin:7px 0 0;line-height:1.1}.fx-spectrum-panel{min-height:310px}.fx-spectrum-track{position:relative;height:134px;margin:40px 12px 16px;border-bottom:2px solid var(--fx-border)}.fx-spectrum-track:before{content:"";position:absolute;left:0;right:0;bottom:-2px;height:2px;background:linear-gradient(90deg,#EF4444,#0066CC 50%,#10A760)}.fx-spectrum-track button{position:absolute;bottom:-21px;transform:translateX(-50%);width:46px;height:46px;border-radius:50%;border:2px solid var(--fx-surface);background:var(--fx-text);color:var(--fx-bg);cursor:pointer;font-weight:800}.fx-spectrum-track button.active{transform:translateX(-50%) scale(1.2);box-shadow:0 0 0 7px var(--fx-blue-soft)}.fx-spectrum-labels{display:flex;justify-content:space-between;color:var(--fx-muted);font-size:13px;padding-top:18px}.fx-selected-outlet h2,.fx-panel h2{font-size:30px;margin:12px 0 10px}.fx-source-link{display:inline-flex;margin-top:12px;color:var(--fx-accent);font-size:13px;font-weight:800}.fx-headline-list{display:grid;gap:10px}.fx-headline-list a{display:grid;grid-template-columns:150px 1fr 170px;gap:18px;align-items:center;text-align:left;width:100%;border:1px solid var(--fx-border);background:var(--fx-surface);color:var(--fx-text);padding:14px 16px}.fx-headline-list a.active{border-color:var(--fx-accent);box-shadow:0 0 0 3px var(--fx-blue-soft)}.fx-headline-list span{color:var(--fx-muted)}.fx-headline-list strong{font-family:Georgia,serif;font-size:18px}.fx-method-note{display:grid;grid-template-columns:340px minmax(0,1fr);gap:28px;align-items:start;padding:28px;border:1px solid var(--fx-border);background:color-mix(in srgb,var(--fx-blue-soft) 24%,var(--fx-surface))}.fx-method-note h2{margin:10px 0 0;font-size:34px;line-height:1.05}.fx-method-note>p{margin:0;color:var(--fx-muted);font-family:Georgia,serif;font-size:19px;line-height:1.6}.fx-trust-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:22px}.fx-feedback{display:flex;flex-wrap:wrap;gap:10px}.fx-feedback button,.fx-primary-action{min-height:42px;border:1px solid var(--fx-border);background:var(--fx-surface);color:var(--fx-text);padding:0 14px;cursor:pointer}.fx-feedback button.active,.fx-primary-action{background:var(--fx-text);color:var(--fx-bg);border-color:var(--fx-text)}.fx-feedback-note{color:var(--fx-accent);font-size:13px;margin:14px 0 0}.fx-reader-note{font-family:Georgia,serif;font-size:20px;line-height:1.5;color:var(--fx-text)}
.fx-fdi{display:grid;gap:8px;padding:10px;background:var(--fx-blue-soft);border:1px solid color-mix(in srgb,var(--fdi-color) 28%,var(--fx-border))}.fx-fdi.large{padding:14px;gap:11px}.fx-fdi strong{color:var(--fx-text);font-size:12px}.fx-fdi.large strong{font-size:15px}.fx-fdi-meter{height:9px;background:color-mix(in srgb,var(--fx-bg) 72%,var(--fx-border));overflow:hidden}.fx-fdi-meter span{display:block;height:100%;width:var(--fdi-score);background:var(--fdi-color);box-shadow:0 0 18px color-mix(in srgb,var(--fdi-color) 60%,transparent)}.fx-story-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:22px}.fx-card{overflow:hidden;background:var(--fx-surface);border:1px solid var(--fx-border);color:var(--fx-text);display:flex;flex-direction:column;transition:transform .42s cubic-bezier(.16,1,.3,1),box-shadow .42s cubic-bezier(.16,1,.3,1),border-color .42s ease}.fx-card:hover{transform:translateY(-8px) scale(1.018);border-color:color-mix(in srgb,var(--fx-text) 18%,var(--fx-border));box-shadow:0 24px 70px rgba(26,25,24,.13)}.fx-card img{width:100%;aspect-ratio:16/9;object-fit:cover;display:block}.fx-card-body{padding:20px;display:flex;flex:1;flex-direction:column}.fx-card-topic{color:var(--fx-accent);font-size:12px;text-transform:uppercase;font-weight:700}.fx-card h3{font-size:21px;line-height:1.18;margin:8px 0 10px}.fx-card p{margin:0 0 16px;line-height:1.5}.fx-card .fx-fdi{margin-top:auto}.fx-card-meta{display:flex;justify-content:space-between;gap:12px;color:var(--fx-muted);font-size:13px;margin-top:13px}.fx-footer{max-width:1200px;margin:24px auto 0;padding:64px 24px 34px;border-top:1px solid var(--fx-border);color:var(--fx-text)}.fx-footer-lede{display:grid;grid-template-columns:minmax(240px,.8fr) minmax(0,1fr) minmax(260px,.8fr);gap:28px;align-items:start;padding-bottom:42px}.fx-footer-brand{display:inline-flex;align-items:center;gap:12px;color:var(--fx-text);font-family:Georgia,"Times New Roman",serif;font-size:32px;font-weight:700;letter-spacing:-.035em}.fx-footer-brand span{display:inline-flex;align-items:center;justify-content:center;width:38px;height:38px;border-radius:50%;background:var(--fx-text);color:var(--fx-bg);font-size:15px}.fx-footer-lede p{margin:0}.fx-footer-lede>p:first-of-type{color:var(--fx-accent);font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase}.fx-footer-explainer{font-family:Georgia,serif;font-size:18px;line-height:1.55}.fx-footer-bottom{display:flex;justify-content:space-between;gap:18px;align-items:center;color:var(--fx-muted);font-size:13px}.fx-footer-bottom>div{display:flex;flex-wrap:wrap;gap:16px;align-items:center}.fx-footer a{color:var(--fx-muted)}.fx-footer a:hover{color:var(--fx-text);text-decoration:underline;text-underline-offset:4px}.fx-skeleton{min-height:280px;background:linear-gradient(90deg,color-mix(in srgb,var(--fx-border) 65%,transparent),color-mix(in srgb,var(--fx-surface) 80%,transparent),color-mix(in srgb,var(--fx-border) 65%,transparent));background-size:200% 100%;animation:fxPulse 1.2s ease-in-out infinite}.fx-skeleton.tall{min-height:320px}.fx-state{min-height:60vh;display:grid;place-content:center;text-align:center;gap:16px}@keyframes fxPulse{to{background-position:-200% 0}}
.fx-nav{position:sticky;top:0;z-index:20;min-height:132px;display:grid;grid-template-columns:1fr;gap:18px;align-items:center;justify-items:center;padding:22px max(24px,calc((100vw - 1280px)/2)) 16px;background:linear-gradient(90deg,color-mix(in srgb,var(--fx-surface) 88%,transparent),color-mix(in srgb,var(--fx-bg) 86%,transparent)),color-mix(in srgb,var(--fx-bg) 92%,transparent);border-bottom:1px solid var(--fx-border);backdrop-filter:blur(18px);box-shadow:0 12px 44px rgba(26,25,24,.05);transform:translateY(0);opacity:1;transition:transform .46s cubic-bezier(.16,1,.3,1),opacity .28s ease,box-shadow .28s ease}.fx-nav.hidden{transform:translateY(calc(-100% - 18px));opacity:.98;box-shadow:none}.fx-nav-row,.fx-nav-actions,.fx-links,.fx-topic-nav{display:flex;align-items:center}.fx-nav-row{width:100%;justify-content:center;gap:clamp(22px,3vw,42px);flex-wrap:wrap}.fx-nav-actions{gap:clamp(14px,2vw,24px);position:relative;padding-left:clamp(22px,2.6vw,38px)}.fx-nav-actions:before{content:"";position:absolute;left:0;top:50%;width:1px;height:24px;background:var(--fx-border);transform:translateY(-50%)}.fx-logo{display:inline-flex;align-items:center;gap:14px;color:var(--fx-text);font-family:Georgia,"Times New Roman",serif;font-size:clamp(34px,4vw,54px);font-weight:700;letter-spacing:-.04em;line-height:.9}.fx-logo span,.fx-source-logo{display:inline-flex;align-items:center;justify-content:center;width:48px;height:48px;border-radius:50%;background:var(--fx-text);color:var(--fx-bg);font-family:Georgia,serif;font-weight:700;font-size:18px}.fx-links{gap:clamp(18px,2.5vw,34px)}.fx-topic-nav{justify-content:center;gap:clamp(18px,2.5vw,36px);min-width:0}.fx-links a,.fx-topic-nav a{position:relative;border:0;background:transparent;color:var(--fx-muted);cursor:pointer;padding:4px 0;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase}.fx-links a:after,.fx-topic-nav a:after{content:"";position:absolute;left:0;right:0;bottom:-4px;height:1px;background:currentColor;transform:scaleX(0);transform-origin:center;transition:transform .18s ease}.fx-links a:hover,.fx-topic-nav a:hover{color:var(--fx-text)}.fx-links a:hover:after,.fx-topic-nav a:hover:after{transform:scaleX(1)}.fx-icon-control{display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;border:1px solid color-mix(in srgb,var(--fx-text) 14%,var(--fx-border));border-radius:999px;background:color-mix(in srgb,var(--fx-surface) 82%,transparent);color:var(--fx-text);cursor:pointer;box-shadow:0 1px 0 rgba(26,25,24,.04);flex:0 0 auto}.fx-icon-control:hover{transform:translateY(-1px);border-color:color-mix(in srgb,var(--fx-text) 34%,var(--fx-border));box-shadow:0 12px 30px rgba(26,25,24,.08)}.fx-search-shell{display:inline-flex;align-items:center;gap:8px;min-width:34px;width:34px;height:34px;overflow:hidden;border-radius:999px;transition:width .28s cubic-bezier(.16,1,.3,1),background .22s ease,border-color .22s ease,padding .28s cubic-bezier(.16,1,.3,1),box-shadow .22s ease;-webkit-tap-highlight-color:transparent}.fx-search-shell:focus,.fx-search-shell:focus-within,.fx-search-shell .fx-icon-control:focus,.fx-search-shell .fx-icon-control:focus-visible{outline:none}.fx-search-shell.open{width:210px;padding-right:12px;border:1px solid color-mix(in srgb,var(--fx-text) 14%,var(--fx-border));background:color-mix(in srgb,var(--fx-surface) 88%,transparent);box-shadow:0 12px 30px rgba(26,25,24,.07)}.fx-search-shell.open .fx-icon-control{border-color:transparent;background:transparent;box-shadow:none}.fx-search-shell input{width:142px;min-width:0;border:0;outline:0;box-shadow:none;appearance:none;background:transparent;color:var(--fx-text);font-size:13px;opacity:0;transform:translateX(-6px);pointer-events:none;transition:opacity .18s ease .08s,transform .22s cubic-bezier(.16,1,.3,1) .06s}.fx-search-shell.open input{opacity:1;transform:translateX(0);pointer-events:auto}.fx-search-shell input:focus,.fx-search-shell input:focus-visible{outline:none;box-shadow:none}.fx-search-shell input::placeholder{color:var(--fx-muted)}
@media (max-width:920px){.fx-nav{min-height:auto;padding:18px 18px 14px}.fx-nav-row{gap:18px 26px}.fx-topic-nav{justify-content:center;flex-wrap:wrap;gap:14px 22px}.fx-detail-hero,.fx-context-grid,.fx-detail-grid,.fx-method-note,.fx-trust-grid{grid-template-columns:1fr}.fx-framing-cards,.fx-story-grid{grid-template-columns:1fr}.fx-headline-list a{grid-template-columns:1fr}.fx-footer-lede{grid-template-columns:1fr}.fx-footer-bottom{align-items:start;flex-direction:column}}
@media (max-width:620px){.fx-page{padding:22px 16px 56px}.fx-logo{font-size:36px}.fx-logo span{width:42px;height:42px}.fx-links,.fx-topic-nav,.fx-nav-actions{justify-content:center;flex-wrap:wrap;gap:12px 18px}.fx-detail-hero h1{font-size:42px}.fx-detail-score,.fx-neutral-summary,.fx-panel,.fx-method-note{padding:18px}.fx-framing-cards article{min-height:auto;padding:18px}.fx-spectrum-track{margin-left:4px;margin-right:4px}.fx-spectrum-track button{width:38px;height:38px;font-size:12px}}
`;
