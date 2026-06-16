"use client";

/* eslint-disable @next/next/no-img-element */

import { useMemo, useState } from "react";
import Link from "next/link";
import { Bell, Check, ChevronRight, LockKeyhole, Plus, Radar, UserRound } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useStats, useStories } from "@/hooks/useStories";
import type { StoryCluster } from "@/types";
import { PulseHomeTabs } from "@/components/pulse/PulseHomeTabs";
import {
  compactStoryText,
  PulseFdiBadge,
  PulseFooter,
  PulseRelativeTime,
  pulseChromeStyles,
  PulseTopbar,
  storyCategoryLabel,
  storyDivergence,
  storyImage,
  storySummary,
} from "@/components/pulse/PulseChrome";

export default function WatchlistPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { data: stats } = useStats();
  const { data, isLoading, isFetching } = useStories({ limit: 80 });
  const stories = useMemo(() => data?.stories ?? [], [data?.stories]);
  const categories = useMemo(() => Array.from(new Set(stories.map((story) => storyCategoryLabel(story)))).sort(), [stories]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const loading = authLoading || isLoading || isFetching;
  const activeTopics = selectedTopics.length ? selectedTopics : categories.slice(0, 3);
  const watchStories = stories
    .filter((story) => activeTopics.includes(storyCategoryLabel(story)))
    .sort((a, b) => new Date(b.newestArticleAt ?? 0).getTime() - new Date(a.newestArticleAt ?? 0).getTime())
    .slice(0, 12);
  const updatedAt = watchStories[0]?.newestArticleAt ?? stories[0]?.newestArticleAt;

  function toggleTopic(topic: string) {
    setSelectedTopics((current) => current.includes(topic) ? current.filter((item) => item !== topic) : [...current, topic]);
  }

  return (
    <main className="pulse-watch-page" aria-label="Fracture watchlist">
      <style jsx global>{styles}</style>

      <PulseTopbar stats={stats} />
      <PulseHomeTabs updatedAt={updatedAt} />

      {loading ? (
        <WatchlistSkeleton />
      ) : isAuthenticated ? (
        <>
          <section className="pulse-watch-hero">
            <div>
              <p><span /> Watchlist</p>
              <h1>{user?.displayName || "Your"} live story board.</h1>
            </div>
            <div className="pulse-watch-status">
              <UserRound size={20} />
              <span>{user?.email}</span>
              <strong>{activeTopics.length} topic lanes</strong>
            </div>
          </section>

          <section className="pulse-watch-shell">
            <aside className="pulse-watch-picker" aria-label="Watchlist topics">
              <div className="pulse-section-head">
                <h2><span /> Topic Setup</h2>
                <Bell size={18} />
              </div>
              <p>Choose the story types that should stay pinned to your board.</p>
              <div className="pulse-topic-picker">
                {categories.map((topic) => {
                  const selected = activeTopics.includes(topic);
                  return (
                    <button className={selected ? "is-selected" : ""} type="button" onClick={() => toggleTopic(topic)} key={topic}>
                      {selected ? <Check size={16} /> : <Plus size={16} />}
                      {topic}
                    </button>
                  );
                })}
              </div>
            </aside>

            <section className="pulse-watch-board" aria-label="Pinned watchlist stories">
              <div className="pulse-board-head">
                <span><Radar size={16} /> Monitoring</span>
                <p>{watchStories.length} stories / Updated <PulseRelativeTime value={updatedAt} /> <i /></p>
              </div>
              {watchStories.length ? (
                <div className="pulse-watch-grid">
                  {watchStories.map((story) => <WatchStory story={story} key={story.id} />)}
                </div>
              ) : (
                <WatchState title="No stories match this watchlist yet." body="Choose more topic lanes or wait for the live story index to update." />
              )}
            </section>
          </section>
        </>
      ) : (
        <SignedOutWatchlist updatedAt={updatedAt} />
      )}

      <PulseFooter updatedAt={updatedAt} />
    </main>
  );
}

function SignedOutWatchlist({ updatedAt }: { updatedAt?: string | null }) {
  return (
    <section className="pulse-watch-login">
      <div className="pulse-login-copy">
        <p><span /> Personal Signal</p>
        <h1>Build a watchlist around the stories you care about.</h1>
        <p>Sign in to set topic types, follow active clusters, and keep your Pulse board tuned to your own news priorities.</p>
        <div>
          <Link href="/login?returnUrl=/watchlist">Login</Link>
          <Link href="/register?returnUrl=/watchlist">Create account</Link>
        </div>
      </div>
      <div className="pulse-login-panel" aria-label="Watchlist preview">
        <div className="pulse-lock-card">
          <LockKeyhole size={26} />
          <strong>Watchlist locked</strong>
          <span>Updated <PulseRelativeTime value={updatedAt} /></span>
        </div>
        {["World", "Business", "Tech", "Policy"].map((topic, index) => (
          <div className={`pulse-preview-row ${index % 2 ? "is-cyan" : "is-orange"}`} key={topic}>
            <span>{topic}</span>
            <b>{index + 2} live</b>
          </div>
        ))}
      </div>
    </section>
  );
}

function WatchStory({ story }: { story: StoryCluster }) {
  return (
    <Link href={`/story/${story.id}`} className="pulse-watch-story">
      <div className="pulse-watch-image">
        <img src={storyImage(story)} alt="" />
        {story.status === "BREAKING" ? <span>LIVE</span> : null}
      </div>
      <div className="pulse-watch-copy">
        <p><b>{storyCategoryLabel(story)}</b><span /><PulseRelativeTime value={story.newestArticleAt} /></p>
        <h2>{compactStoryText(story.topic, 96)}</h2>
        <p>{storySummary(story, 112)}</p>
      </div>
      <PulseFdiBadge score={storyDivergence(story)} compact />
      <ChevronRight size={20} />
    </Link>
  );
}

function WatchlistSkeleton() {
  return (
    <section className="pulse-watch-shell pulse-watch-skeleton" aria-label="Loading watchlist" aria-busy="true">
      <aside className="pulse-watch-picker">
        <span />
        {Array.from({ length: 8 }).map((_, index) => <i key={index} />)}
      </aside>
      <section className="pulse-watch-board">
        {Array.from({ length: 6 }).map((_, index) => <article key={index} />)}
      </section>
    </section>
  );
}

function WatchState({ title, body }: { title: string; body: string }) {
  return (
    <div className="pulse-watch-state">
      <span>WATCH STATUS</span>
      <h2>{title}</h2>
      <p>{body}</p>
      <Link href="/stories">Open stories</Link>
    </div>
  );
}

const styles = `
.pulse-watch-page{--chalk:#FCFCF8;--night:#101114;--orange:#FF5A1F;--cyan:#14B8C8;--warm:#D9D4CC;--line:rgba(16,17,20,.18);--muted:#6F706F;min-height:100vh;background:var(--chalk);color:var(--night);font-family:Inter,"Public Sans",Arial,sans-serif;letter-spacing:0}.pulse-watch-page *,.pulse-watch-page *::before,.pulse-watch-page *::after{box-sizing:border-box}.pulse-watch-page a{color:inherit;text-decoration:none}.pulse-watch-page button{font:inherit;color:inherit}
${pulseChromeStyles}
.pulse-watch-hero,.pulse-watch-login{display:grid;grid-template-columns:minmax(0,1fr) minmax(320px,430px);gap:24px;align-items:end;padding:26px 24px;border-top:1px solid var(--line);border-bottom:1px solid var(--line);background:linear-gradient(90deg,rgba(20,184,200,.08),rgba(252,252,248,.22))}.pulse-watch-hero p:first-child,.pulse-login-copy>p:first-child{display:inline-flex;align-items:center;gap:9px;margin:0 0 12px;color:var(--orange);font-size:12px;font-weight:950;letter-spacing:.12em;text-transform:uppercase}.pulse-watch-hero p:first-child span,.pulse-login-copy>p:first-child span{width:10px;height:10px;border:2px solid currentColor;border-radius:999px}.pulse-watch-hero h1,.pulse-login-copy h1{max-width:920px;margin:0;font-size:clamp(46px,5.8vw,88px);line-height:.88;font-weight:1000;letter-spacing:-.062em}.pulse-watch-status{align-self:stretch;min-height:120px;border:1px solid var(--night);background:white;box-shadow:6px 6px 0 var(--cyan);padding:18px;display:grid;align-content:center;gap:9px}.pulse-watch-status span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--muted);font-size:14px;font-weight:850}.pulse-watch-status strong{font-size:22px;line-height:1;font-weight:1000;letter-spacing:-.04em}
.pulse-watch-shell{display:grid;grid-template-columns:300px minmax(0,1fr);gap:18px;padding:20px 24px 28px}.pulse-watch-picker,.pulse-watch-board{border:1px solid var(--line);background:rgba(255,255,255,.54)}.pulse-watch-picker{align-self:start;padding:15px 13px}.pulse-section-head{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:14px}.pulse-section-head h2{display:inline-flex;align-items:center;gap:10px;margin:0;font-size:15px;line-height:1;font-weight:950;text-transform:uppercase}.pulse-section-head h2 span{width:10px;height:10px;border:2px solid var(--orange);border-radius:999px}.pulse-watch-picker>p{margin:0 0 14px;color:var(--muted);font-size:15px;line-height:1.35;font-weight:800}.pulse-topic-picker{display:grid;gap:8px}.pulse-topic-picker button{min-height:44px;display:flex;align-items:center;gap:10px;border:1px solid var(--line);background:white;padding:0 11px;font-weight:950;cursor:pointer;transition:border-color 160ms ease,box-shadow 160ms ease,transform 160ms ease}.pulse-topic-picker button:hover,.pulse-topic-picker button.is-selected{border-color:var(--night);box-shadow:4px 4px 0 var(--orange);transform:translateX(2px)}.pulse-topic-picker button.is-selected svg{color:var(--cyan)}
.pulse-watch-board{padding:15px}.pulse-board-head{display:flex;align-items:center;justify-content:space-between;gap:18px;margin-bottom:14px}.pulse-board-head span,.pulse-board-head p{display:inline-flex;align-items:center;gap:8px;margin:0;font-size:13px;font-weight:900}.pulse-board-head span{color:var(--orange);letter-spacing:.1em;text-transform:uppercase}.pulse-board-head p{color:var(--muted)}.pulse-board-head i{width:8px;height:8px;border-radius:999px;background:var(--cyan);animation:pulseBlink 1.65s ease-in-out infinite}.pulse-watch-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.pulse-watch-story{position:relative;min-height:226px;border:1px solid var(--line);background:white;display:grid;grid-template-rows:96px minmax(0,1fr);overflow:hidden;transition:border-color 160ms ease,box-shadow 160ms ease,transform 160ms ease}.pulse-watch-story:hover{border-color:var(--night);box-shadow:5px 5px 0 var(--cyan);transform:translateY(-2px)}.pulse-watch-image{position:relative;background:#171717;overflow:hidden}.pulse-watch-image img{width:100%;height:100%;object-fit:cover;display:block;filter:saturate(.9) contrast(1.08)}.pulse-watch-image span{position:absolute;top:8px;left:8px;background:var(--orange);color:white;padding:6px 7px;font-size:11px;font-weight:950}.pulse-watch-copy{padding:13px 12px 15px}.pulse-watch-copy p:first-child{display:flex;align-items:center;gap:8px;margin:0;color:var(--muted);font-size:12px;font-weight:850}.pulse-watch-copy p:first-child b{color:var(--cyan);font-weight:950;text-transform:uppercase}.pulse-watch-copy p:first-child span{width:3px;height:3px;border-radius:999px;background:currentColor}.pulse-watch-copy h2{margin:8px 0 7px;font-size:24px;line-height:1;font-weight:1000;letter-spacing:-.045em}.pulse-watch-copy p:last-child{margin:0;color:var(--muted);font-size:14px;line-height:1.35;font-weight:750}.pulse-watch-story .pulse-fdi-badge{position:absolute;top:8px;right:8px;box-shadow:4px 4px 0 var(--orange)}.pulse-watch-story>svg{position:absolute;right:10px;bottom:10px;color:var(--orange)}
.pulse-watch-login{align-items:center;min-height:calc(100vh - 260px)}.pulse-login-copy>p:last-of-type{max-width:590px;margin:16px 0 22px;color:var(--muted);font-size:18px;line-height:1.42;font-weight:800}.pulse-login-copy div{display:flex;flex-wrap:wrap;gap:11px}.pulse-login-copy a{border:1px solid var(--night);background:var(--night);color:white;padding:13px 15px;font-weight:950}.pulse-login-copy a:last-child{background:white;color:var(--night);box-shadow:4px 4px 0 var(--orange)}.pulse-login-panel{border:1px solid var(--night);background:white;box-shadow:7px 7px 0 var(--cyan);padding:14px;display:grid;gap:10px}.pulse-lock-card{min-height:122px;background:var(--night);color:white;padding:18px;display:grid;gap:8px;align-content:center}.pulse-lock-card svg{color:var(--orange)}.pulse-lock-card strong{font-size:28px;line-height:1;font-weight:1000;letter-spacing:-.045em}.pulse-lock-card span{color:rgba(255,255,255,.72);font-size:13px;font-weight:850}.pulse-preview-row{height:46px;border:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;padding:0 12px;font-weight:950}.pulse-preview-row b{color:var(--orange);font-size:12px;text-transform:uppercase}.pulse-preview-row.is-cyan b{color:var(--cyan)}.pulse-watch-state{min-height:360px;display:grid;place-content:center;justify-items:start;border:1px solid var(--line);background:white;padding:32px}.pulse-watch-state span{color:var(--orange);font-size:12px;font-weight:950;letter-spacing:.12em}.pulse-watch-state h2{max-width:680px;margin:9px 0;font-size:clamp(36px,5vw,70px);line-height:.9;font-weight:1000;letter-spacing:-.055em}.pulse-watch-state p{max-width:460px;margin:0 0 18px;color:var(--muted);font-size:17px;line-height:1.4}.pulse-watch-state a{border:1px solid var(--night);background:var(--night);color:white;padding:12px 14px;font-weight:950}.pulse-watch-skeleton .pulse-watch-picker span,.pulse-watch-skeleton .pulse-watch-picker i,.pulse-watch-skeleton article{display:block;background:linear-gradient(90deg,#fff,var(--warm),#fff);background-size:200% 100%;animation:skeleton 1.35s ease-in-out infinite}.pulse-watch-skeleton .pulse-watch-picker span{height:20px;margin-bottom:18px}.pulse-watch-skeleton .pulse-watch-picker i{height:44px;margin-top:8px}.pulse-watch-skeleton .pulse-watch-board{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.pulse-watch-skeleton article{min-height:226px;border:1px solid var(--line)}@keyframes skeleton{to{background-position:-200% 0}}
@media(max-width:940px){.pulse-watch-hero,.pulse-watch-login,.pulse-watch-shell{grid-template-columns:1fr}.pulse-watch-grid,.pulse-watch-skeleton .pulse-watch-board{grid-template-columns:1fr}.pulse-topic-picker{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:560px){.pulse-watch-hero,.pulse-watch-login{padding:18px 12px}.pulse-watch-hero h1,.pulse-login-copy h1{font-size:clamp(38px,12vw,58px);line-height:.94}.pulse-watch-shell{padding:14px 12px 22px;gap:14px}.pulse-watch-board,.pulse-watch-picker{padding:11px}.pulse-board-head{align-items:flex-start;flex-direction:column}.pulse-topic-picker{grid-template-columns:1fr}.pulse-watch-story{min-height:218px}.pulse-watch-copy h2{font-size:22px}.pulse-login-panel{box-shadow:4px 4px 0 var(--cyan)}}
`;
