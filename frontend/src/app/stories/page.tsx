"use client";

/* eslint-disable @next/next/no-img-element */

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  Bookmark,
  ChevronRight,
  Clock3,
  Filter,
  Flame,
  Globe2,
  Search,
  SlidersHorizontal,
  TrendingUp,
  X,
} from "lucide-react";
import { useStats, useStories } from "@/hooks/useStories";
import type { StoryCluster } from "@/types";
import {
  categoryLabel,
  formatPulseTime,
  PulseFdiBadge,
  PulseFooter,
  pulseChromeStyles,
  PulseTopbar,
  storyDivergence,
  storyImage,
  storyPulse,
  storySummary,
} from "@/components/pulse/PulseChrome";

const filters = ["All", "Live", "World", "Politics", "Policy", "Elections", "Business", "Conflict", "Geopolitics", "Tech", "Health", "Climate"];

export default function StoriesPage() {
  const [query, setQuery] = useState(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("search") || "";
  });
  const [activeFilter, setActiveFilter] = useState(() => {
    if (typeof window === "undefined") return "All";
    const topic = categoryLabel(new URLSearchParams(window.location.search).get("topic"));
    return filters.includes(topic) ? topic : "All";
  });
  const { data: stats } = useStats();

  const { data, isLoading, isFetching, error } = useStories({ limit: 60, search: query || undefined });
  const loadingStories = isLoading || isFetching;
  const allStories = useMemo(() => data?.stories ?? [], [data?.stories]);

  const visibleStories = useMemo(() => {
    return allStories
      .filter((story) => {
        const category = categoryLabel(story.topicCategory);
        const matchesFilter =
          activeFilter === "All" ||
          category === activeFilter ||
          (activeFilter === "Live" && story.status === "BREAKING");
        return matchesFilter;
      })
      .sort((a, b) => storyPulse(b) - storyPulse(a));
  }, [activeFilter, allStories]);

  const topSearches = buildLiveQueries(allStories);
  const watchlist = visibleStories.slice(0, 4);
  const lead = visibleStories[0] ?? null;
  const filterOptions = useMemo(() => {
    const categories = allStories.map((story) => categoryLabel(story.topicCategory)).filter(Boolean);
    return Array.from(new Set([...filters, ...categories, activeFilter]));
  }, [activeFilter, allStories]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = query.trim();
    window.history.replaceState(null, "", trimmed ? `/stories?search=${encodeURIComponent(trimmed)}` : "/stories");
  }

  function clearSearch() {
    setQuery("");
    window.history.replaceState(null, "", "/stories");
  }

  return (
    <main className="pulse-stories" aria-label="Fracture Pulse Editorial stories search">
      <style jsx global>{styles}</style>

      <PulseTopbar stats={stats} />

      <section className="pulse-search-hero">
        <div className="pulse-search-copy">
          <p><span /> Story Search</p>
          <motion.h1 initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.4 }}>
            Find the signal inside the live news cycle.
          </motion.h1>
        </div>
        <form className="pulse-search-box" onSubmit={handleSubmit}>
          <Search size={28} />
          <input
            aria-label="Search stories"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search stories, sources, topics, or frames"
          />
          {query ? (
            <button type="button" aria-label="Clear search" onClick={clearSearch}>
              <X size={20} />
            </button>
          ) : (
            <button type="submit" aria-label="Run search">
              <ChevronRight size={24} />
            </button>
          )}
        </form>
      </section>

      <nav className="pulse-filterbar" aria-label="Search filters">
        <div>
          {filterOptions.map((filter) => (
            <button className={activeFilter === filter ? "is-active" : ""} type="button" onClick={() => setActiveFilter(filter)} key={filter}>
              {filter}
            </button>
          ))}
        </div>
        <button type="button"><SlidersHorizontal size={18} /> Refine</button>
      </nav>

      <section className="pulse-stories-layout">
        <div className="pulse-results">
          <div className="pulse-section-head">
            <h2>Curated Top Stories</h2>
            <p>{loadingStories ? "Loading" : error ? "Unavailable" : `${visibleStories.length} results`} / Updated {formatPulseTime(lead?.newestArticleAt)} <span /></p>
          </div>

          {error ? (
            <StoriesState
              tone="error"
              title="Story search is temporarily unavailable."
              body="Fracture could not reach the live story index. Try again in a moment or return to the homepage."
              actionLabel="Return home"
              actionHref="/"
            />
          ) : loadingStories ? <StoriesSkeleton /> : visibleStories.length ? (
            <div className="pulse-result-grid">
              {visibleStories.map((story, index) => <StoryResult story={story} index={index} key={story.id} />)}
            </div>
          ) : (
            <StoriesState
              title={query ? `No stories found for "${query}".` : "No curated stories are available yet."}
              body={query ? "Try a broader topic, source, or frame. The live index updates as new clusters arrive." : "Fracture is waiting for enough active clusters to populate the story index."}
              actionLabel={query ? "Clear search" : "Browse all stories"}
              onAction={query ? clearSearch : undefined}
              actionHref={query ? undefined : "/stories"}
            />
          )}
        </div>

        <aside className="pulse-search-rail" aria-label="Search intelligence">
          {loadingStories ? <StoriesRailSkeleton /> : (
            <>
              <section className="pulse-rail-block pulse-now">
                <div className="pulse-section-head">
                  <h2><span /> Live Searches</h2>
                  <Link href="/stories">View</Link>
                </div>
                <div className="pulse-query-list">
                  {topSearches.length ? topSearches.map((item, index) => (
                    <button type="button" onClick={() => setQuery(item)} key={`${item}-${index}`}>
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      {item}
                      <TrendingUp size={16} />
                    </button>
                  )) : <p className="pulse-rail-empty">Live search cues will appear with the next story sync.</p>}
                </div>
              </section>

              <section className="pulse-rail-block">
                <div className="pulse-section-head">
                  <h2>Watchlist</h2>
                  <Bookmark size={18} />
                </div>
                <div className="pulse-watchlist">
                  {watchlist.length ? watchlist.map((story) => (
                    <Link href={`/story/${story.id}`} key={story.id}>
                      <strong>{categoryLabel(story.topicCategory)}</strong>
                      <span>{story.articleCount || story.sourceCount} updates</span>
                      <ChevronRight size={18} />
                    </Link>
                  )) : <p className="pulse-rail-empty">No watchlist stories match this view.</p>}
                </div>
              </section>

              <section className="pulse-rail-block pulse-index">
                <h2><Flame size={18} /> Story Index</h2>
                <div>
                  {buildIndex(allStories).map((item) => (
                    <FragmentLike label={item.label} value={item.value} key={item.label} />
                  ))}
                </div>
              </section>
            </>
          )}
        </aside>
      </section>

      <section className="pulse-bottom-strip" aria-label="Search status">
        <strong>FRACTURE</strong>
        <span><Clock3 size={16} /> Indexed {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
        <span><Filter size={16} /> Source-aware search</span>
        <span><Globe2 size={16} /> {stats?.sourcesTracked ?? 0} sources tracked</span>
      </section>

      <PulseFooter updatedAt={lead?.newestArticleAt} />

    </main>
  );
}

function StoryResult({ story, index }: { story: StoryCluster; index: number }) {
  return (
    <Link href={`/story/${story.id}`} className={`pulse-result ${index === 0 ? "is-lead" : ""} ${index % 2 ? "is-cyan" : "is-orange"}`}>
      <div className="pulse-result-image">
        <img src={storyImage(story)} alt="" />
        {story.status === "BREAKING" || index === 0 ? <span>LIVE</span> : null}
      </div>
      <div className="pulse-result-copy">
        <p className="pulse-meta"><b>{categoryLabel(story.topicCategory)}</b><span />{formatPulseTime(story.newestArticleAt)}<span />{story.sourceCount} sources</p>
        <h3>{story.topic}</h3>
        <p>{storySummary(story, index === 0 ? 150 : 112)}</p>
        <div className="pulse-tags">
          {buildTags(story).map((tag) => <span key={tag}>{tag}</span>)}
        </div>
      </div>
      <div className="pulse-score">
        <PulseFdiBadge score={storyDivergence(story) || storyPulse(story)} compact />
      </div>
    </Link>
  );
}

function StoriesSkeleton() {
  return (
    <div className="pulse-result-grid pulse-results-skeleton" aria-label="Loading story results" aria-busy="true">
      {Array.from({ length: 5 }).map((_, index) => (
        <article className={`pulse-result-skeleton ${index === 0 ? "is-lead" : ""}`} key={index}>
          <span />
          <div>
            <i />
            <b />
            <b className="short" />
            <em />
          </div>
        </article>
      ))}
    </div>
  );
}

function StoriesRailSkeleton() {
  return (
    <>
      {Array.from({ length: 3 }).map((_, block) => (
        <section className="pulse-rail-block pulse-rail-loading" aria-hidden="true" key={block}>
          <div className="pulse-section-head"><h2>{block === 0 ? <span /> : null}{block === 0 ? "Live Searches" : block === 1 ? "Watchlist" : "Story Index"}</h2></div>
          {Array.from({ length: block === 2 ? 4 : 5 }).map((__, row) => <i key={row} />)}
        </section>
      ))}
    </>
  );
}

function StoriesState({ title, body, actionLabel, actionHref, onAction, tone }: {
  title: string;
  body: string;
  actionLabel: string;
  actionHref?: string;
  onAction?: () => void;
  tone?: "error";
}) {
  const content = (
    <>
      {tone === "error" ? <AlertTriangle size={22} /> : <Search size={22} />}
      <h3>{title}</h3>
      <p>{body}</p>
    </>
  );

  return (
    <div className={`pulse-stories-state ${tone === "error" ? "is-error" : ""}`}>
      {content}
      {actionHref ? <Link href={actionHref}>{actionLabel}</Link> : <button type="button" onClick={onAction}>{actionLabel}</button>}
    </div>
  );
}

function FragmentLike({ label, value }: { label: string; value: number }) {
  return (
    <>
      <span>{label}</span>
      <meter value={value} min="0" max="100" />
    </>
  );
}

function buildTags(story: StoryCluster) {
  const tags = [categoryLabel(story.topicCategory), ...story.topicKeywords].filter(Boolean);
  return Array.from(new Set(tags)).slice(0, 3);
}

function buildLiveQueries(stories: StoryCluster[]) {
  const terms = stories.flatMap((story) => [categoryLabel(story.topicCategory), ...story.topicKeywords, story.topic.split(" ").slice(0, 2).join(" ")]);
  return Array.from(new Set(terms.filter(Boolean))).slice(0, 5);
}

function buildIndex(stories: StoryCluster[]) {
  const map = new Map<string, number>();
  stories.forEach((story) => {
    const label = categoryLabel(story.topicCategory);
    map.set(label, (map.get(label) ?? 0) + 1);
  });
  const max = Math.max(1, ...map.values());
  return Array.from(map.entries()).slice(0, 4).map(([label, count]) => ({ label, value: Math.round((count / max) * 100) }));
}

const styles = `
.pulse-stories{--chalk:#FCFCF8;--night:#101114;--orange:#FF5A1F;--cyan:#14B8C8;--warm:#D9D4CC;--line:rgba(16,17,20,.18);--muted:#6F706F;--soft:#F0EEE7;min-height:100vh;background:var(--chalk);color:var(--night);font-family:Inter,"Public Sans",Arial,sans-serif;letter-spacing:0}.pulse-stories *,.pulse-stories *::before,.pulse-stories *::after{box-sizing:border-box}.pulse-stories a{color:inherit;text-decoration:none}.pulse-stories button,.pulse-stories input{color:inherit;font:inherit}
${pulseChromeStyles}
.pulse-search-hero{display:grid;grid-template-columns:minmax(340px,.85fr) minmax(420px,1.15fr);gap:34px;align-items:end;padding:38px 24px 26px;border-bottom:1px solid var(--line)}.pulse-search-copy p{display:inline-flex;align-items:center;gap:10px;margin:0 0 14px;color:var(--orange);font-size:12px;font-weight:950;letter-spacing:.1em;text-transform:uppercase}.pulse-search-copy p span{width:10px;height:10px;border:2px solid var(--orange);border-radius:999px}.pulse-search-copy h1{max-width:760px;margin:0;font-size:clamp(48px,6vw,92px);line-height:.92;font-weight:1000;letter-spacing:-.055em}.pulse-search-box{min-height:86px;display:grid;grid-template-columns:auto minmax(0,1fr) 48px;align-items:center;gap:18px;padding:0 18px 0 22px;border:2px solid var(--night);background:white;box-shadow:10px 10px 0 var(--orange)}.pulse-search-box input{min-width:0;border:0;outline:0;background:transparent;font-size:clamp(22px,2.2vw,34px);font-weight:900;letter-spacing:-.035em}.pulse-search-box input::placeholder{color:rgba(16,17,20,.35)}.pulse-search-box button{width:48px;height:48px;border:0;background:var(--night);color:white;display:grid;place-items:center;cursor:pointer}
.pulse-filterbar{min-height:64px;display:flex;align-items:center;justify-content:space-between;gap:20px;padding:0 24px;border-bottom:1px solid var(--line)}.pulse-filterbar div{display:flex;flex-wrap:wrap;gap:28px}.pulse-filterbar button{border:0;background:transparent;cursor:pointer;font-size:16px;font-weight:950}.pulse-filterbar div button{position:relative;padding:20px 0}.pulse-filterbar div button.is-active::after{content:"";position:absolute;left:0;right:0;bottom:0;height:2px;background:var(--orange)}.pulse-filterbar>button{display:inline-flex;align-items:center;gap:8px;padding:8px 0}
.pulse-stories-layout{display:grid;grid-template-columns:minmax(0,1fr) 360px;gap:20px;padding:20px 24px 24px}.pulse-section-head{display:flex;align-items:center;justify-content:space-between;gap:18px;margin-bottom:14px}.pulse-section-head h2{display:inline-flex;align-items:center;gap:12px;margin:0;font-size:16px;line-height:1;font-weight:950;text-transform:uppercase}.pulse-section-head h2 span{width:10px;height:10px;border:2px solid var(--orange);border-radius:999px}.pulse-section-head p{display:inline-flex;align-items:center;gap:7px;margin:0;color:var(--muted);font-size:14px;font-weight:800}.pulse-section-head p span{width:8px;height:8px;border-radius:999px;background:var(--cyan)}.pulse-section-head a{color:var(--orange);font-size:14px;font-weight:900}
.pulse-result-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.pulse-result{position:relative;min-height:210px;border:1px solid var(--line);background:white;display:grid;grid-template-columns:210px minmax(0,1fr);overflow:hidden;transition:border-color 160ms ease,transform 160ms ease}.pulse-result:hover{border-color:var(--night);transform:translateY(-2px)}.pulse-result.is-lead{grid-column:1/-1;min-height:320px;grid-template-columns:45% minmax(0,1fr);background:var(--night);color:white}.pulse-result-image{position:relative;min-height:100%;overflow:hidden;background:var(--night)}.pulse-result-image img{width:100%;height:100%;min-height:210px;object-fit:cover;display:block;filter:saturate(.92) contrast(1.08);transition:transform 260ms ease}.pulse-result:hover img{transform:scale(1.035)}.pulse-result-image span{position:absolute;top:18px;left:18px;background:var(--orange);color:white;padding:9px 10px;font-size:14px;font-weight:950}.pulse-result-copy{min-width:0;padding:20px 72px 18px 20px}.pulse-result.is-lead .pulse-result-copy{padding:34px 92px 28px 30px}.pulse-meta{display:flex;flex-wrap:wrap;align-items:center;gap:9px;margin:0;color:var(--muted);font-size:13px;font-weight:800}.pulse-result.is-lead .pulse-meta{color:rgba(255,255,255,.82)}.pulse-meta b{color:var(--cyan);text-transform:uppercase;font-size:12px;font-weight:950}.pulse-meta span{width:3px;height:3px;border-radius:999px;background:currentColor}.pulse-result h3{margin:10px 0 9px;font-size:clamp(24px,2.4vw,38px);line-height:.98;font-weight:1000;letter-spacing:-.045em}.pulse-result.is-lead h3{font-size:clamp(44px,5vw,72px);line-height:.92}.pulse-result-copy>p:not(.pulse-meta){margin:0;color:var(--muted);font-size:15px;line-height:1.28}.pulse-result.is-lead .pulse-result-copy>p:not(.pulse-meta){max-width:560px;color:rgba(255,255,255,.86);font-size:19px}.pulse-tags{display:flex;flex-wrap:wrap;gap:8px;margin-top:18px}.pulse-tags span{border:1px solid var(--line);padding:5px 8px;background:var(--soft);color:var(--night);font-size:12px;font-weight:900}.pulse-result.is-lead .pulse-tags span{border-color:rgba(255,255,255,.22);background:rgba(255,255,255,.1);color:white}.pulse-score{position:absolute;top:16px;right:16px;color:var(--night)}.pulse-result.is-lead .pulse-score .pulse-fdi-badge{box-shadow:5px 5px 0 var(--orange)}
.pulse-search-rail{display:grid;gap:16px;align-content:start}.pulse-rail-block{border:1px solid var(--line);background:rgba(255,255,255,.5);padding:15px 14px}.pulse-now{border-color:var(--night)}.pulse-query-list,.pulse-watchlist{display:grid;gap:8px}.pulse-query-list button,.pulse-watchlist a{min-height:48px;border:1px solid var(--line);background:white;display:grid;align-items:center;gap:10px;padding:0 11px;cursor:pointer;transition:border-color 160ms ease,transform 160ms ease}.pulse-query-list button{grid-template-columns:34px 1fr auto;text-align:left;font-weight:950}.pulse-query-list button:hover,.pulse-watchlist a:hover{border-color:var(--night);transform:translateX(2px)}.pulse-query-list button span{color:var(--orange);font-family:"Geist Mono","IBM Plex Mono",ui-monospace,monospace;font-size:12px}.pulse-query-list button svg{color:var(--cyan)}.pulse-watchlist a{grid-template-columns:1fr auto auto}.pulse-watchlist strong{font-size:15px;font-weight:950}.pulse-watchlist span{color:var(--orange);font-size:12px;font-weight:900}.pulse-index h2{display:inline-flex;align-items:center;gap:8px;margin:0 0 14px;font-size:16px;font-weight:950;text-transform:uppercase}.pulse-index h2 svg{color:var(--orange)}.pulse-index div{display:grid;grid-template-columns:86px 1fr;align-items:center;gap:10px 12px}.pulse-index span{font-size:13px;font-weight:900}.pulse-index meter{width:100%;height:10px}
.pulse-bottom-strip{min-height:58px;display:flex;flex-wrap:wrap;align-items:center;gap:26px;padding:0 24px;background:var(--night);color:white}.pulse-bottom-strip strong{margin-right:18px;font-size:20px;font-weight:1000;letter-spacing:-.04em}.pulse-bottom-strip span{display:inline-flex;align-items:center;gap:8px;color:rgba(255,255,255,.86);font-size:14px;font-weight:800}.pulse-bottom-strip svg{color:var(--cyan)}
.pulse-result-skeleton{min-height:210px;border:1px solid var(--line);background:white;display:grid;grid-template-columns:210px minmax(0,1fr);overflow:hidden}.pulse-result-skeleton.is-lead{grid-column:1/-1;min-height:320px;grid-template-columns:45% minmax(0,1fr);background:var(--night)}.pulse-result-skeleton>span,.pulse-result-skeleton i,.pulse-result-skeleton b,.pulse-result-skeleton em,.pulse-rail-loading i{display:block;background:linear-gradient(90deg,#fff,var(--warm),#fff);background-size:200% 100%;animation:skeleton 1.35s ease-in-out infinite}.pulse-result-skeleton.is-lead>span,.pulse-result-skeleton.is-lead i,.pulse-result-skeleton.is-lead b,.pulse-result-skeleton.is-lead em{background:linear-gradient(90deg,rgba(252,252,248,.08),rgba(217,212,204,.5),rgba(252,252,248,.08));background-size:200% 100%}.pulse-result-skeleton>div{padding:22px 72px 18px 20px}.pulse-result-skeleton.is-lead>div{padding:38px 92px 28px 30px}.pulse-result-skeleton i{width:45%;height:13px;margin-bottom:16px}.pulse-result-skeleton b{width:92%;height:34px;margin-bottom:12px}.pulse-result-skeleton b.short{width:68%}.pulse-result-skeleton em{width:160px;height:26px;margin-top:22px}.pulse-rail-loading{display:grid;gap:9px}.pulse-rail-loading i{height:43px}.pulse-rail-empty{margin:0;border:1px solid var(--line);background:white;padding:13px;color:var(--muted);font-size:13px;line-height:1.35}.pulse-stories-state{min-height:420px;border:1px solid var(--night);background:white;display:grid;align-content:center;justify-items:start;padding:34px}.pulse-stories-state svg{color:var(--cyan);margin-bottom:14px}.pulse-stories-state.is-error svg{color:var(--orange)}.pulse-stories-state h3{max-width:680px;margin:0 0 12px;font-size:clamp(34px,4vw,58px);line-height:.95;font-weight:1000;letter-spacing:-.055em}.pulse-stories-state p{max-width:540px;margin:0 0 22px;color:var(--muted);font-size:17px;line-height:1.42}.pulse-stories-state a,.pulse-stories-state button{border:1px solid var(--night);background:var(--night);color:white;padding:11px 13px;font-size:14px;font-weight:950;cursor:pointer}@keyframes skeleton{to{background-position:-200% 0}}
@media(max-width:1180px){.pulse-search-hero,.pulse-stories-layout{grid-template-columns:1fr}}
@media(max-width:760px){.pulse-search-hero{padding:28px 16px 24px;grid-template-columns:1fr}.pulse-search-copy h1{font-size:clamp(46px,14vw,64px);line-height:.95}.pulse-search-box{min-height:72px;grid-template-columns:auto minmax(0,1fr) 42px;gap:12px;padding-inline:14px;box-shadow:6px 6px 0 var(--orange)}.pulse-search-box input{font-size:20px}.pulse-search-box button{width:42px;height:42px}.pulse-filterbar{align-items:flex-start;flex-direction:column;padding:0 16px 14px}.pulse-filterbar div{gap:20px}.pulse-stories-layout{padding:16px}.pulse-section-head{align-items:flex-start;flex-direction:column}.pulse-result-grid,.pulse-result,.pulse-result.is-lead,.pulse-result-skeleton,.pulse-result-skeleton.is-lead{grid-template-columns:1fr}.pulse-result,.pulse-result.is-lead,.pulse-result-skeleton,.pulse-result-skeleton.is-lead{min-height:0}.pulse-result-image img,.pulse-result-skeleton>span{min-height:220px}.pulse-result-copy,.pulse-result.is-lead .pulse-result-copy,.pulse-result-skeleton>div,.pulse-result-skeleton.is-lead>div{padding:20px 70px 20px 18px}.pulse-result.is-lead h3{font-size:clamp(40px,12vw,56px);line-height:.98}.pulse-stories-state{min-height:340px;padding:24px}.pulse-bottom-strip{padding:16px}}
@media(max-width:520px){.pulse-stories{overflow-x:hidden}.pulse-search-hero{padding:24px 12px 22px;gap:22px}.pulse-search-copy h1{font-size:clamp(38px,12vw,56px)}.pulse-search-box{min-height:66px;grid-template-columns:24px minmax(0,1fr) 40px;gap:10px;padding-inline:12px;box-shadow:5px 5px 0 var(--orange)}.pulse-search-box input{font-size:18px;letter-spacing:0}.pulse-search-box button{width:40px;height:40px}.pulse-filterbar{padding:0 12px 12px;gap:12px}.pulse-filterbar div{width:100%;display:flex;flex-wrap:nowrap;gap:18px;overflow-x:auto;scrollbar-width:none}.pulse-filterbar div::-webkit-scrollbar{display:none}.pulse-filterbar div button{flex:0 0 auto;padding:14px 0}.pulse-stories-layout{padding:14px 12px}.pulse-result-grid{gap:12px}.pulse-result-copy,.pulse-result.is-lead .pulse-result-copy,.pulse-result-skeleton>div,.pulse-result-skeleton.is-lead>div{padding:18px}.pulse-result h3,.pulse-result.is-lead h3{font-size:clamp(30px,9vw,44px);line-height:1}.pulse-result-copy>p:not(.pulse-meta),.pulse-result.is-lead .pulse-result-copy>p:not(.pulse-meta){font-size:15px}.pulse-result-image img,.pulse-result-skeleton>span{min-height:190px}.pulse-score{position:static;padding:0 18px 18px;justify-self:start}.pulse-result.is-lead .pulse-score .pulse-fdi-badge{box-shadow:4px 4px 0 var(--orange)}.pulse-tags{margin-top:14px}.pulse-query-list button{grid-template-columns:30px minmax(0,1fr) auto}.pulse-watchlist a{grid-template-columns:minmax(0,1fr) auto}.pulse-watchlist a svg{display:none}.pulse-index div{grid-template-columns:72px minmax(0,1fr)}.pulse-result-skeleton{grid-template-rows:auto auto}.pulse-result-skeleton em{width:118px}.pulse-rail-loading i{height:39px}.pulse-stories-state{min-height:300px;padding:22px}.pulse-stories-state h3{font-size:clamp(30px,9vw,44px)}.pulse-bottom-strip{gap:12px 18px;padding:15px 12px}.pulse-bottom-strip strong{width:100%;margin-right:0}}
`;
