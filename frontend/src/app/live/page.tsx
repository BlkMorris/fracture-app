"use client";

import Link from "next/link";
import { ChevronRight, Clock3, Radio, Search, Zap } from "lucide-react";
import { useHomepage, useStats, useStories } from "@/hooks/useStories";
import type { LatestArticle, StoryCluster } from "@/types";
import {
  categoryLabel,
  compactStoryText,
  formatClock,
  PulseFooter,
  PulseRelativeTime,
  pulseChromeStyles,
  PulseTopbar,
  storyDivergence,
} from "@/components/pulse/PulseChrome";

export default function LiveBlogPage() {
  const { data: homepage, isLoading: homepageLoading } = useHomepage();
  const { data: storiesData, isLoading: storiesLoading } = useStories({ limit: 40 });
  const { data: stats } = useStats();
  const loading = homepageLoading || storiesLoading;
  const stories = storiesData?.stories ?? [];
  const updates = buildLiveFeed(homepage?.latest ?? [], stories);
  const activeStories = stories.slice(0, 8);
  const updatedAt = updates[0]?.publishedAt ?? activeStories[0]?.newestArticleAt ?? null;

  return (
    <main className="pulse-live-page" aria-label="Fracture live blog">
      <style jsx global>{styles}</style>

      <PulseTopbar stats={stats} />

      <section className="pulse-live-hero">
        <div>
          <p><span /> Live Blog</p>
          <h1>Real-time movement across the Fracture source wire.</h1>
        </div>
        <aside>
          <Radio size={22} />
          <strong>{stats?.activeStories ?? activeStories.length}</strong>
          <span>active stories</span>
        </aside>
      </section>

      <section className="pulse-live-layout">
        <div className="pulse-live-feed">
          <div className="pulse-live-feed-head">
            <h2><Zap size={18} /> Live Updates</h2>
            <p>Updated <PulseRelativeTime value={updatedAt} /> <i /></p>
          </div>

          {loading ? <LiveFeedSkeleton /> : updates.length ? (
            <div className="pulse-live-list">
              {updates.map((item, index) => (
                <Link href={item.href} className={`pulse-live-row ${index % 2 ? "is-cyan" : "is-orange"}`} key={`${item.id}-${index}`}>
                  <time>{formatClock(item.publishedAt)}</time>
                  <div>
                    <span>{item.source}</span>
                    <h2>{compactStoryText(item.title, 118)}</h2>
                    <p>{compactStoryText(item.summary || item.topic || "Coverage is developing across tracked sources.", 150)}</p>
                  </div>
                  <ChevronRight size={20} />
                </Link>
              ))}
            </div>
          ) : (
            <div className="pulse-live-empty">
              <span>No live updates</span>
              <h2>The source wire is quiet.</h2>
              <p>Fracture will populate the live blog as new articles and active clusters arrive.</p>
              <Link href="/stories">Browse Stories</Link>
            </div>
          )}
        </div>

        <aside className="pulse-live-rail" aria-label="Live blog story rail">
          <section>
            <div className="pulse-live-rail-head">
              <h2><Clock3 size={17} /> Active Clusters</h2>
              <Link href="/newest">Newest</Link>
            </div>
            {loading ? (
              <div className="pulse-live-rail-skeleton">
                {Array.from({ length: 5 }).map((_, index) => <article key={index} />)}
              </div>
            ) : activeStories.length ? (
              <div className="pulse-live-clusters">
                {activeStories.map((story) => (
                  <Link href={`/story/${story.id}`} key={story.id}>
                    <span>{categoryLabel(story.topicCategory)}</span>
                    <strong>{compactStoryText(story.topic, 82)}</strong>
                    <small>FDI {storyDivergence(story)} / {story.sourceCount || story.articleCount} sources</small>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="pulse-live-muted">No active clusters are available.</p>
            )}
          </section>

          <section className="pulse-live-search-card">
            <Search size={20} />
            <h2>Search the live index.</h2>
            <p>Jump from the live wire into the full story search surface.</p>
            <Link href="/stories">Open Search <ChevronRight size={18} /></Link>
          </section>
        </aside>
      </section>

      <PulseFooter updatedAt={updatedAt} />
    </main>
  );
}

function buildLiveFeed(latest: LatestArticle[], stories: StoryCluster[]) {
  const articleItems = latest.map((article) => ({
    id: article.id,
    title: article.title,
    summary: article.summary,
    topic: null,
    source: article.source.name,
    publishedAt: article.publishedAt,
    href: article.storyClusterId ? `/story/${article.storyClusterId}` : `/stories?search=${encodeURIComponent(article.title)}`,
  }));
  const storyItems = stories.map((story) => ({
    id: story.id,
    title: story.topic,
    summary: story.summary,
    topic: categoryLabel(story.topicCategory),
    source: categoryLabel(story.topicCategory),
    publishedAt: story.newestArticleAt,
    href: `/story/${story.id}`,
  }));

  return [...articleItems, ...storyItems]
    .sort((a, b) => new Date(b.publishedAt ?? 0).getTime() - new Date(a.publishedAt ?? 0).getTime())
    .slice(0, 24);
}

function LiveFeedSkeleton() {
  return (
    <div className="pulse-live-list pulse-live-list-skeleton" aria-label="Loading live updates" aria-busy="true">
      {Array.from({ length: 8 }).map((_, index) => <article key={index} />)}
    </div>
  );
}

const styles = `
.pulse-live-page{--chalk:#FCFCF8;--night:#101114;--orange:#FF5A1F;--cyan:#14B8C8;--warm:#D9D4CC;--line:rgba(16,17,20,.18);--muted:#6F706F;--ink-2:#2d2e31;min-height:100vh;background:var(--chalk);color:var(--night);font-family:Inter,"Public Sans",Arial,sans-serif}.pulse-live-page *{box-sizing:border-box}.pulse-live-page a{color:inherit;text-decoration:none}
${pulseChromeStyles}
.pulse-live-hero{display:grid;grid-template-columns:minmax(0,1fr) 220px;gap:28px;align-items:end;padding:58px 24px 32px;border-bottom:1px solid var(--line)}.pulse-live-hero p{display:inline-flex;align-items:center;gap:9px;margin:0 0 18px;color:var(--orange);font-size:12px;font-weight:950;letter-spacing:.12em;text-transform:uppercase}.pulse-live-hero p span{width:10px;height:10px;border-radius:999px;background:var(--orange);animation:pulseBlink 1.65s ease-in-out infinite}.pulse-live-hero h1{max-width:1120px;margin:0;font-size:clamp(58px,9vw,142px);line-height:.84;font-weight:1000;letter-spacing:-.07em}.pulse-live-hero aside{min-height:172px;border:1px solid var(--night);background:var(--night);color:white;padding:18px;display:grid;align-content:end;gap:8px;box-shadow:8px 8px 0 var(--orange)}.pulse-live-hero aside svg{color:var(--cyan)}.pulse-live-hero aside strong{font-size:54px;line-height:.9;font-weight:1000;letter-spacing:-.05em}.pulse-live-hero aside span{color:rgba(255,255,255,.72);font-size:12px;font-weight:950;text-transform:uppercase}.pulse-live-layout{display:grid;grid-template-columns:minmax(0,1fr) 380px;gap:18px;padding:20px 24px 34px}.pulse-live-feed,.pulse-live-rail section{border:1px solid var(--line);background:rgba(255,255,255,.52)}.pulse-live-feed{min-width:0}.pulse-live-feed-head,.pulse-live-rail-head{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:15px 16px;border-bottom:1px solid var(--line)}.pulse-live-feed-head h2,.pulse-live-rail-head h2{display:inline-flex;align-items:center;gap:9px;margin:0;font-size:16px;font-weight:950;text-transform:uppercase}.pulse-live-feed-head h2 svg,.pulse-live-rail-head h2 svg{color:var(--orange)}.pulse-live-feed-head p{display:inline-flex;align-items:center;gap:8px;margin:0;color:var(--muted);font-size:13px;font-weight:850}.pulse-live-feed-head p i{width:8px;height:8px;border-radius:999px;background:var(--cyan)}.pulse-live-list{display:grid}.pulse-live-row{position:relative;display:grid;grid-template-columns:86px minmax(0,1fr) 28px;gap:18px;align-items:start;min-height:128px;padding:18px 16px 18px 24px;border-bottom:1px solid var(--line);background:white;transition:background 160ms ease,transform 160ms ease}.pulse-live-row:hover{background:var(--chalk);transform:translateX(3px)}.pulse-live-row::before{content:"";position:absolute;left:10px;top:24px;width:9px;height:9px;border-radius:999px;background:var(--orange)}.pulse-live-row.is-cyan::before{background:var(--cyan)}.pulse-live-row time{color:var(--night);font-family:"Geist Mono","IBM Plex Mono",ui-monospace,monospace;font-size:12px;font-weight:900}.pulse-live-row span{display:block;color:var(--cyan);font-size:11px;font-weight:950;text-transform:uppercase}.pulse-live-row h2{max-width:860px;margin:7px 0 8px;font-size:clamp(24px,3.2vw,44px);line-height:.96;font-weight:1000;letter-spacing:-.05em}.pulse-live-row p{max-width:760px;margin:0;color:var(--muted);font-size:15px;line-height:1.36;font-weight:760}.pulse-live-row svg{margin-top:4px;color:var(--orange)}.pulse-live-rail{position:sticky;top:18px;align-self:start;display:grid;gap:14px}.pulse-live-rail-head a{color:var(--orange);font-size:13px;font-weight:900}.pulse-live-clusters{display:grid;gap:1px;background:var(--line)}.pulse-live-clusters a{display:grid;gap:6px;background:var(--chalk);padding:13px;transition:background 160ms ease}.pulse-live-clusters a:hover{background:white}.pulse-live-clusters span{color:var(--cyan);font-size:11px;font-weight:950;text-transform:uppercase}.pulse-live-clusters strong{color:var(--night);font-size:18px;line-height:1.04;font-weight:950;letter-spacing:-.03em}.pulse-live-clusters small{color:var(--muted);font-size:12px;font-weight:850}.pulse-live-search-card{padding:18px;display:grid!important;gap:11px}.pulse-live-search-card svg{color:var(--orange)}.pulse-live-search-card h2{margin:0;font-size:30px;line-height:.95;font-weight:1000;letter-spacing:-.05em}.pulse-live-search-card p,.pulse-live-muted{margin:0;color:var(--muted);font-size:15px;line-height:1.38;font-weight:760}.pulse-live-search-card a{display:inline-flex;align-items:center;gap:8px;justify-self:start;border:1px solid var(--night);background:var(--night);color:white;padding:11px 12px;font-size:12px;font-weight:950;text-transform:uppercase}.pulse-live-empty{padding:28px}.pulse-live-empty span{color:var(--orange);font-size:12px;font-weight:950;letter-spacing:.12em;text-transform:uppercase}.pulse-live-empty h2{max-width:620px;margin:9px 0;font-size:clamp(38px,5vw,70px);line-height:.9;font-weight:1000;letter-spacing:-.055em}.pulse-live-empty p{max-width:460px;margin:0 0 18px;color:var(--muted);font-size:17px;line-height:1.4}.pulse-live-empty a{border:1px solid var(--night);background:var(--night);color:white;padding:12px 14px;font-weight:950}.pulse-live-list-skeleton article,.pulse-live-rail-skeleton article{display:block;min-height:128px;border-bottom:1px solid var(--line);background:linear-gradient(90deg,#fff,var(--warm),#fff);background-size:200% 100%;animation:skeleton 1.35s ease-in-out infinite}.pulse-live-rail-skeleton article{min-height:86px}@keyframes skeleton{to{background-position:-200% 0}}
@media(max-width:980px){.pulse-live-layout{grid-template-columns:1fr}.pulse-live-rail{position:static}.pulse-live-hero{grid-template-columns:1fr}.pulse-live-hero aside{width:min(260px,100%)}}
@media(max-width:620px){.pulse-live-page{overflow-x:hidden}.pulse-live-hero{padding:38px 12px 24px}.pulse-live-hero h1{font-size:clamp(44px,15vw,76px);line-height:.88}.pulse-live-hero aside{min-height:132px;box-shadow:5px 5px 0 var(--orange)}.pulse-live-layout{padding:14px 12px 28px}.pulse-live-feed-head,.pulse-live-rail-head{align-items:flex-start;flex-direction:column}.pulse-live-row{grid-template-columns:1fr 24px;gap:10px;min-height:122px;padding:17px 13px 17px 22px}.pulse-live-row time{grid-column:1/-1}.pulse-live-row h2{font-size:28px}.pulse-live-search-card h2{font-size:28px}}
`;
