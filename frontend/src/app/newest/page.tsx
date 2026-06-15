"use client";

/* eslint-disable @next/next/no-img-element */

import { FormEvent, type ReactNode, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, Clock3, Search, SlidersHorizontal, X } from "lucide-react";
import { useStats, useStories } from "@/hooks/useStories";
import type { StoryCluster } from "@/types";
import { PulseHomeTabs } from "@/components/pulse/PulseHomeTabs";
import {
  compactStoryText,
  formatClock,
  formatPulseTime,
  PulseFdiBadge,
  PulseFooter,
  pulseChromeStyles,
  PulseTopbar,
  storyCategoryLabel,
  storyDivergence,
  storyImage,
  storySummary,
} from "@/components/pulse/PulseChrome";

const recencyFilters = ["All", "24h", "7d"] as const;
const signalFilters = ["All", "Breaking", "High FDI", "Low FDI"] as const;

export default function NewestPage() {
  const { data: stats } = useStats();
  const { data, isLoading, isFetching, error } = useStories({ limit: 100 });
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [recency, setRecency] = useState<(typeof recencyFilters)[number]>("All");
  const [signal, setSignal] = useState<(typeof signalFilters)[number]>("All");
  const [currentTime, setCurrentTime] = useState(0);

  const loading = isLoading || isFetching;
  const stories = useMemo(() => data?.stories ?? [], [data?.stories]);
  const categories = useMemo(() => {
    const liveCategories = stories.map((story) => storyCategoryLabel(story));
    return ["All", ...Array.from(new Set(liveCategories)).sort()];
  }, [stories]);

  useEffect(() => {
    const timer = window.setTimeout(() => setCurrentTime(Date.now()), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const visibleStories = useMemo(() => {
    const now = currentTime || Math.max(...stories.map((story) => new Date(story.newestArticleAt ?? 0).getTime()), 0);
    const cleanQuery = query.trim().toLowerCase();

    return stories
      .filter((story) => {
        const storyCategory = storyCategoryLabel(story);
        const newestAt = story.newestArticleAt ? new Date(story.newestArticleAt).getTime() : 0;
        const ageHours = newestAt ? (now - newestAt) / 3_600_000 : Number.POSITIVE_INFINITY;
        const divergence = storyDivergence(story);
        const text = `${story.topic} ${story.summary ?? ""} ${(story.topicKeywords ?? []).join(" ")}`.toLowerCase();

        const matchesQuery = !cleanQuery || text.includes(cleanQuery);
        const matchesCategory = category === "All" || storyCategory === category;
        const matchesRecency = recency === "All" || (recency === "24h" ? ageHours <= 24 : ageHours <= 168);
        const matchesSignal =
          signal === "All" ||
          (signal === "Breaking" && story.status === "BREAKING") ||
          (signal === "High FDI" && divergence >= 70) ||
          (signal === "Low FDI" && divergence < 45);

        return matchesQuery && matchesCategory && matchesRecency && matchesSignal;
      })
      .sort((a, b) => new Date(b.newestArticleAt ?? 0).getTime() - new Date(a.newestArticleAt ?? 0).getTime());
  }, [category, currentTime, query, recency, signal, stories]);

  const newest = visibleStories[0] ?? stories[0] ?? null;

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
  }

  return (
    <main className="pulse-newest" aria-label="Fracture newest stories">
      <style jsx global>{styles}</style>

      <PulseTopbar stats={stats} />
      <PulseHomeTabs updatedAt={newest?.newestArticleAt} />

      <section className="pulse-newest-hero">
        <div>
          <p><span /> Live Feed</p>
          <h1>Newest stories, ordered by the latest source movement.</h1>
        </div>
        <form className="pulse-newest-search" onSubmit={handleSearch}>
          <Search size={22} />
          <input aria-label="Filter newest stories" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter the live feed" />
          {query ? (
            <button type="button" aria-label="Clear newest search" onClick={() => setQuery("")}>
              <X size={18} />
            </button>
          ) : (
            <button type="submit" aria-label="Apply newest search">
              <ChevronRight size={20} />
            </button>
          )}
        </form>
      </section>

      <section className="pulse-newest-shell">
        <aside className="pulse-feed-filters" aria-label="Newest story filters">
          <div className="pulse-section-head">
            <h2><span /> Feed Controls</h2>
            <SlidersHorizontal size={18} />
          </div>

          <FilterGroup label="Topic">
            {categories.map((item) => (
              <button className={category === item ? "is-active" : ""} type="button" onClick={() => setCategory(item)} key={item}>
                {item}
              </button>
            ))}
          </FilterGroup>

          <FilterGroup label="Recency">
            {recencyFilters.map((item) => (
              <button className={recency === item ? "is-active" : ""} type="button" onClick={() => setRecency(item)} key={item}>
                {item}
              </button>
            ))}
          </FilterGroup>

          <FilterGroup label="Signal">
            {signalFilters.map((item) => (
              <button className={signal === item ? "is-active" : ""} type="button" onClick={() => setSignal(item)} key={item}>
                {item}
              </button>
            ))}
          </FilterGroup>
        </aside>

        <section className="pulse-feed" aria-label="Chronological story feed">
          <div className="pulse-feed-head">
            <span><Clock3 size={16} /> Chronological</span>
            <p>{loading ? "Loading" : error ? "Unavailable" : `${visibleStories.length} stories`} / Updated {formatPulseTime(newest?.newestArticleAt)} <i /></p>
          </div>

          {error ? (
            <FeedState title="Newest stories are temporarily unavailable." body="Fracture could not reach the live story index. Try again in a moment." />
          ) : loading ? (
            <NewestSkeleton />
          ) : visibleStories.length ? (
            <div className="pulse-feed-list">
              {visibleStories.map((story, index) => <NewestStory story={story} index={index} key={story.id} />)}
            </div>
          ) : (
            <FeedState title="No stories match this feed." body="Try widening the time range, clearing search, or choosing another topic." />
          )}
        </section>
      </section>

      <PulseFooter updatedAt={newest?.newestArticleAt} />
    </main>
  );
}

function FilterGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="pulse-filter-group">
      <strong>{label}</strong>
      <div>{children}</div>
    </div>
  );
}

function NewestStory({ story, index }: { story: StoryCluster; index: number }) {
  const divergence = storyDivergence(story);

  return (
    <Link href={`/story/${story.id}`} className={`pulse-feed-story ${index % 2 ? "is-cyan" : "is-orange"}`}>
      <time>{formatClock(story.newestArticleAt)}</time>
      <div className="pulse-feed-image">
        <img src={storyImage(story)} alt="" />
        {story.status === "BREAKING" ? <span>LIVE</span> : null}
      </div>
      <div className="pulse-feed-copy">
        <p><b>{storyCategoryLabel(story)}</b><span />{formatPulseTime(story.newestArticleAt)}<span />{story.sourceCount} sources</p>
        <h2>{compactStoryText(story.topic, 120)}</h2>
        <p>{storySummary(story, 142)}</p>
      </div>
      <PulseFdiBadge score={divergence} compact />
      <ChevronRight size={22} />
    </Link>
  );
}

function NewestSkeleton() {
  return (
    <div className="pulse-feed-list pulse-feed-skeleton" aria-label="Loading newest stories" aria-busy="true">
      {Array.from({ length: 7 }).map((_, index) => (
        <article className="pulse-feed-story-skeleton" key={index}>
          <span />
          <i />
          <div>
            <b />
            <b className="wide" />
            <em />
          </div>
        </article>
      ))}
    </div>
  );
}

function FeedState({ title, body }: { title: string; body: string }) {
  return (
    <div className="pulse-feed-state">
      <span>FEED STATUS</span>
      <h2>{title}</h2>
      <p>{body}</p>
      <Link href="/stories">Open story search</Link>
    </div>
  );
}

const styles = `
.pulse-newest{--chalk:#FCFCF8;--night:#101114;--orange:#FF5A1F;--cyan:#14B8C8;--warm:#D9D4CC;--line:rgba(16,17,20,.18);--muted:#6F706F;min-height:100vh;background:var(--chalk);color:var(--night);font-family:Inter,"Public Sans",Arial,sans-serif;letter-spacing:0}.pulse-newest *,.pulse-newest *::before,.pulse-newest *::after{box-sizing:border-box}.pulse-newest a{color:inherit;text-decoration:none}.pulse-newest button,.pulse-newest input{font:inherit;color:inherit}
${pulseChromeStyles}
.pulse-newest-hero{display:grid;grid-template-columns:minmax(0,1fr) minmax(320px,430px);gap:22px;align-items:end;padding:24px 24px 22px;border-top:1px solid var(--line);border-bottom:1px solid var(--line);background:linear-gradient(90deg,rgba(255,90,31,.08),rgba(252,252,248,.24))}.pulse-newest-hero p{display:inline-flex;align-items:center;gap:9px;margin:0 0 12px;color:var(--orange);font-size:12px;font-weight:950;letter-spacing:.12em;text-transform:uppercase}.pulse-newest-hero p span{width:10px;height:10px;border:2px solid currentColor;border-radius:999px}.pulse-newest-hero h1{max-width:940px;margin:0;font-size:clamp(46px,5.8vw,88px);line-height:.88;font-weight:1000;letter-spacing:-.062em}.pulse-newest-search{height:54px;display:grid;grid-template-columns:28px minmax(0,1fr) 34px;align-items:center;gap:12px;border:1px solid var(--night);background:white;padding:0 10px 0 14px;box-shadow:6px 6px 0 var(--orange)}.pulse-newest-search input{min-width:0;border:0;outline:0;background:transparent;font-size:16px;font-weight:850}.pulse-newest-search button{width:34px;height:34px;border:1px solid var(--line);background:var(--chalk);display:grid;place-items:center;cursor:pointer}
.pulse-newest-shell{display:grid;grid-template-columns:300px minmax(0,1fr);gap:18px;padding:20px 24px 26px}.pulse-feed-filters,.pulse-feed{border:1px solid var(--line);background:rgba(255,255,255,.54)}.pulse-feed-filters{align-self:start;position:sticky;top:0;padding:15px 13px}.pulse-section-head{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:14px}.pulse-section-head h2{display:inline-flex;align-items:center;gap:10px;margin:0;font-size:15px;line-height:1;font-weight:950;text-transform:uppercase}.pulse-section-head h2 span{width:10px;height:10px;border:2px solid var(--orange);border-radius:999px}.pulse-filter-group{padding:14px 0;border-top:1px solid var(--line)}.pulse-filter-group strong{display:block;margin-bottom:9px;font-size:12px;font-weight:950;letter-spacing:.1em;text-transform:uppercase}.pulse-filter-group div{display:flex;flex-wrap:wrap;gap:7px}.pulse-filter-group button{border:1px solid var(--line);background:white;padding:8px 10px;font-size:13px;font-weight:900;cursor:pointer;transition:border-color 160ms ease,box-shadow 160ms ease,transform 160ms ease}.pulse-filter-group button:hover,.pulse-filter-group button.is-active{border-color:var(--night);box-shadow:3px 3px 0 var(--cyan);transform:translateY(-1px)}.pulse-filter-group button.is-active{background:var(--night);color:white}
.pulse-feed{padding:15px}.pulse-feed-head{display:flex;align-items:center;justify-content:space-between;gap:18px;margin-bottom:14px}.pulse-feed-head span,.pulse-feed-head p{display:inline-flex;align-items:center;gap:8px;margin:0;font-size:13px;font-weight:900;text-transform:uppercase}.pulse-feed-head span{color:var(--orange);letter-spacing:.1em}.pulse-feed-head p{color:var(--muted);text-transform:none}.pulse-feed-head i{width:8px;height:8px;border-radius:999px;background:var(--cyan);animation:pulseBlink 1.65s ease-in-out infinite}.pulse-feed-list{display:grid;gap:10px}.pulse-feed-story{min-height:132px;display:grid;grid-template-columns:72px 164px minmax(0,1fr) auto 24px;align-items:center;gap:14px;border:1px solid var(--line);background:white;padding:10px;transition:border-color 160ms ease,box-shadow 160ms ease,transform 160ms ease}.pulse-feed-story:hover{border-color:var(--night);box-shadow:5px 5px 0 var(--orange);transform:translateY(-2px)}.pulse-feed-story.is-cyan:hover{box-shadow:5px 5px 0 var(--cyan)}.pulse-feed-story>time{font-family:"Geist Mono","IBM Plex Mono",ui-monospace,monospace;font-size:13px;font-weight:900}.pulse-feed-image{position:relative;height:104px;background:#171717;overflow:hidden}.pulse-feed-image img{width:100%;height:100%;object-fit:cover;display:block;filter:saturate(.9) contrast(1.08)}.pulse-feed-image span{position:absolute;top:8px;left:8px;background:var(--orange);color:white;padding:6px 7px;font-size:11px;font-weight:950}.pulse-feed-copy{min-width:0}.pulse-feed-copy p:first-child{display:flex;align-items:center;gap:8px;margin:0;color:var(--muted);font-size:12px;font-weight:850}.pulse-feed-copy p:first-child b{color:var(--cyan);font-weight:950;text-transform:uppercase}.pulse-feed-copy p:first-child span{width:3px;height:3px;border-radius:999px;background:currentColor}.pulse-feed-copy h2{margin:8px 0 7px;font-size:clamp(24px,2.5vw,38px);line-height:.96;font-weight:1000;letter-spacing:-.045em}.pulse-feed-copy p:last-child{max-width:680px;margin:0;color:var(--muted);font-size:15px;line-height:1.35;font-weight:750}.pulse-feed-state{min-height:360px;display:grid;place-content:center;justify-items:start;border:1px solid var(--line);background:white;padding:32px}.pulse-feed-state span{color:var(--orange);font-size:12px;font-weight:950;letter-spacing:.12em}.pulse-feed-state h2{max-width:680px;margin:9px 0;font-size:clamp(36px,5vw,70px);line-height:.9;font-weight:1000;letter-spacing:-.055em}.pulse-feed-state p{max-width:460px;margin:0 0 18px;color:var(--muted);font-size:17px;line-height:1.4}.pulse-feed-state a{border:1px solid var(--night);background:var(--night);color:white;padding:12px 14px;font-weight:950}.pulse-feed-story-skeleton{min-height:132px;display:grid;grid-template-columns:72px 164px minmax(0,1fr);gap:14px;align-items:center;border:1px solid var(--line);background:white;padding:10px}.pulse-feed-story-skeleton span,.pulse-feed-story-skeleton i,.pulse-feed-story-skeleton b,.pulse-feed-story-skeleton em{display:block;background:linear-gradient(90deg,#fff,var(--warm),#fff);background-size:200% 100%;animation:skeleton 1.35s ease-in-out infinite}.pulse-feed-story-skeleton span{height:13px}.pulse-feed-story-skeleton i{height:104px}.pulse-feed-story-skeleton div{display:grid;gap:10px}.pulse-feed-story-skeleton b{width:42%;height:12px}.pulse-feed-story-skeleton b.wide{width:84%;height:30px}.pulse-feed-story-skeleton em{width:70%;height:14px}@keyframes skeleton{to{background-position:-200% 0}}
@media(max-width:980px){.pulse-newest-hero,.pulse-newest-shell{grid-template-columns:1fr}.pulse-feed-filters{position:static}.pulse-filter-group div{flex-wrap:nowrap;overflow-x:auto;padding-bottom:2px}.pulse-filter-group button{flex:0 0 auto}.pulse-feed-story{grid-template-columns:58px 138px minmax(0,1fr) auto}.pulse-feed-story>svg{display:none}}
@media(max-width:640px){.pulse-newest-hero{padding:18px 12px}.pulse-newest-hero h1{font-size:clamp(38px,12vw,58px);line-height:.94}.pulse-newest-search{height:50px;box-shadow:4px 4px 0 var(--orange)}.pulse-newest-shell{padding:14px 12px 20px;gap:14px}.pulse-feed{padding:10px}.pulse-feed-head{align-items:flex-start;flex-direction:column}.pulse-feed-story{min-height:0;grid-template-columns:82px minmax(0,1fr) auto;align-items:start}.pulse-feed-story>time{grid-column:1 / -1}.pulse-feed-image{height:86px}.pulse-feed-copy h2{font-size:23px;line-height:1}.pulse-feed-copy p:last-child{font-size:14px}.pulse-feed-story .pulse-fdi-badge{grid-column:3;grid-row:2}.pulse-feed-story-skeleton{grid-template-columns:1fr}.pulse-feed-story-skeleton i{height:92px}}
`;
