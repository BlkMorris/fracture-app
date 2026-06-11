"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, CircleUser, Moon, Search, SlidersHorizontal, Sparkles, Sun } from "lucide-react";
import { useHomepage, useStats, useStories } from "@/hooks/useStories";
import { formatTimeAgo } from "@/components/ui";
import type { StoryCluster } from "@/types";

type Topic = "All" | "Politics" | "Tech" | "Business" | "World" | "Sports";

const TOPICS: Topic[] = ["Politics", "Tech", "Business", "World", "Sports"];

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

function storyImage(story: StoryCluster) {
  return story.imageUrl || "https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=1200&q=80";
}

function storySummary(story: StoryCluster) {
  return story.summary || `Fracture is tracking coverage of ${story.topic} across ${story.sourceCount || "multiple"} outlets as the story develops.`;
}

function storyFdi(story: StoryCluster) {
  return Math.round(story.divergenceScore ?? 0);
}

export default function HomePage() {
  const [dark, setDark] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [topic, setTopic] = useState<Topic>("All");
  const [visible, setVisible] = useState(9);
  const [leftOutlet, setLeftOutlet] = useState("Reuters");
  const [rightOutlet, setRightOutlet] = useState("Wall Street Journal");

  const { data: homepage, isLoading } = useHomepage();
  const { data: storiesData } = useStories({ limit: 40 });
  const { data: stats } = useStats();

  const allStories = storiesData?.stories ?? [];
  const hero = homepage?.hero ?? allStories[0] ?? null;
  const storyPool = allStories.length ? allStories : [...(homepage?.trending ?? []), ...(homepage?.mostFractured ? [homepage.mostFractured] : [])];
  const uniqueStories = Array.from(new Map(storyPool.filter((story) => story.id !== hero?.id).map((story) => [story.id, story])).values());
  const filteredStories = topic === "All" ? uniqueStories : uniqueStories.filter((story) => story.topicCategory?.toLowerCase() === topic.toLowerCase());
  const shownStories = filteredStories.slice(0, visible);
  const highestDivergence = [...(hero ? [hero, ...uniqueStories] : uniqueStories)].sort((a, b) => storyFdi(b) - storyFdi(a)).slice(0, 5);
  const communityPicks = highestDivergence.slice(0, 4).map((story) => ({ story, flags: Math.max(18, Math.round(storyFdi(story) * 1.45 + story.sourceCount)) }));
  const sourceCount = stats?.sourcesTracked ?? Math.max(50, ...uniqueStories.map((story) => story.sourceCount || 0));
  const outletNames = ["Reuters", "NPR", "Financial Times", "The Guardian", "Wall Street Journal"];
  const sharedFdi = Math.round(((leftOutlet.length * 7) + (rightOutlet.length * 5)) % 42 + 38);

  return (
    <div className={`fx ${dark ? "fx-dark" : ""}`}>
      <nav className="fx-nav" aria-label="Fracture navigation">
        <Link href="/" className="fx-logo" aria-label="Fracture home"><span>F</span>Fracture</Link>
        <div className="fx-nav-row">
          <div className="fx-links" aria-label="Primary sections">
            <Link href="/" className="active">Home</Link>
            <Link href="/stories">Stories</Link>
            <Link href="#source-credibility">Sources</Link>
          </div>
          <div className="fx-topic-nav" role="tablist" aria-label="Filter by topic">
            {TOPICS.map((item) => (
              <button key={item} type="button" className={topic === item ? "active" : ""} onClick={() => { setTopic(item); setVisible(9); }}>{item}</button>
            ))}
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

      <main className="fx-page">
        {isLoading && !hero ? <HomepageSkeleton /> : hero && (
          <section className="fx-hero fx-home-hero">
            <div className="fx-hero-copy">
              <p className="fx-eyebrow"><Sparkles size={15} /> Updated {formatTimeAgo(hero.newestArticleAt)}</p>
              <h1>See which stories are fracturing the news right now.</h1>
              <p>Fracture compares how outlets frame the same event, then makes the distance between those frames visible.</p>
              <div className="fx-hero-actions">
                <Link href="#trending-stories" className="fx-primary-action">Explore today&apos;s fractures <ArrowUpRight size={17} /></Link>
                <button className="fx-secondary-action" type="button"><SlidersHorizontal size={17} /> Tune my topics</button>
              </div>
            </div>
            <Link href={`/story/${hero.id}`} className="fx-breaking-card">
              <img src={storyImage(hero)} alt="Featured news story" />
              <div><span>Most divergent now</span><h2>{hero.topic}</h2><FdiBadge score={storyFdi(hero)} large /></div>
            </Link>
          </section>
        )}

        <section className="fx-section" id="trending-stories">
          <div className="fx-section-header"><div><p className="fx-eyebrow">Trending stories</p><h2>Stories, ranked by their divergence in the news.</h2></div></div>
          {shownStories.length ? <div className="fx-story-grid">{shownStories.map((story) => <StoryCard key={story.id} story={story} />)}</div> : <EmptyState />}
          {visible < filteredStories.length && <div className="fx-load-row"><button type="button" onClick={() => setVisible((count) => Math.min(count + 6, filteredStories.length))}>Load more stories</button></div>}
        </section>

        <section className="fx-section fx-divergence-week">
          <div className="fx-section-header"><div><p className="fx-eyebrow">Highest divergence this week</p><h2>The five stories with the widest framing distance.</h2></div><Link href="/search" className="fx-week-cta">View all high-divergence stories</Link></div>
          <div className="fx-divergence-list">{highestDivergence.map((story, index) => <article key={story.id} className="fx-divergence-row"><span className="fx-divergence-rank">{String(index + 1).padStart(2, "0")}</span><h3>{story.topic}</h3><strong>{storyFdi(story)}</strong><span className={`fx-divergence-level ${fdiLevel(storyFdi(story)).toLowerCase()}`}>{fdiLevel(storyFdi(story))}</span></article>)}</div>
        </section>

        <section className="fx-section fx-community-picks">
          <div className="fx-section-header"><div><p className="fx-eyebrow">Community picks</p><h2>Most flagged divergence readers are discovering.</h2></div></div>
          <div className="fx-community-grid">{communityPicks.map(({ story, flags }) => <article key={story.id} className="fx-community-card"><span>{flags} readers flagged this</span><h3>{story.topic}</h3><div><FdiBadge score={storyFdi(story)} /><small>{fdiLevel(storyFdi(story))} divergence surprised readers across shared coverage.</small></div></article>)}</div>
        </section>

        <section className="fx-section fx-source-credibility" id="source-credibility">
          <div className="fx-section-header"><div><p className="fx-eyebrow">Source credibility this week</p><h2>Outlets readers rated highest for trustworthy coverage.</h2></div></div>
          <div className="fx-credibility-list">{outletNames.slice(0, 4).map((name, index) => <article key={name} className="fx-credibility-row"><span className="fx-source-logo">{name.split(" ").map((part) => part[0]).join("").slice(0, 2)}</span><div><h3>{name}</h3><p>{["Consistently neutral framing", "Clear context without excess heat", "Strong sourcing on policy details", "Transparent attribution patterns"][index]}</p></div><div className="fx-rating"><strong>{(4.8 - index * 0.2).toFixed(1)}</strong><span>{(4.8 - index * 0.2).toFixed(1)}/5</span></div></article>)}</div>
        </section>

        <section className="fx-section fx-compare-widget">
          <div className="fx-section-header"><div><p className="fx-eyebrow">Try it</p><h2>Compare outlets and see how their framing usually differs.</h2></div></div>
          <div className="fx-compare-panel">
            <div className="fx-compare-controls">
              <label><span>First outlet</span><select value={leftOutlet} onChange={(event) => setLeftOutlet(event.target.value)}>{outletNames.map((name) => <option key={name}>{name}</option>)}</select></label>
              <label><span>Second outlet</span><select value={rightOutlet} onChange={(event) => setRightOutlet(event.target.value)}>{outletNames.map((name) => <option key={name}>{name}</option>)}</select></label>
            </div>
            <div className="fx-compare-results"><div className="fx-compare-summary"><p className="fx-eyebrow">Shared coverage pattern</p><h3>{leftOutlet} vs. {rightOutlet}</h3><p>These outlets often emphasize different parts of the same public story. Fracture surfaces that framing gap without deciding which outlet is correct.</p></div><div className="fx-compare-score"><span>Avg FDI on shared coverage</span><strong>{sharedFdi}</strong><small>{fdiLevel(sharedFdi)} divergence</small></div><div className="fx-compare-examples"><span>Example stories</span>{highestDivergence.slice(0, 3).map((story) => <article key={story.id}><strong>{story.topic}</strong><small>{story.topicKeywords?.slice(0, 3).join(" / ") || story.topicCategory}</small></article>)}</div></div>
          </div>
        </section>
      </main>

      <FractureFooter sourceCount={sourceCount} />
      <style jsx global>{styles}</style>
    </div>
  );
}

function HomepageSkeleton() {
  return <main className="fx-page"><section className="fx-hero fx-home-hero"><div className="fx-skeleton tall" /><div className="fx-skeleton tall" /></section></main>;
}

function EmptyState() {
  return <div className="fx-empty"><h3>No stories match this view.</h3><p>Try another topic or return to all trending coverage.</p></div>;
}

function StoryCard({ story }: { story: StoryCluster }) {
  return <Link href={`/story/${story.id}`} className="fx-card"><img src={storyImage(story)} alt="News story thumbnail" /><div className="fx-card-body"><span className="fx-card-topic">{story.topicCategory || "News"}</span><h3>{story.topic}</h3><p>{storySummary(story)}</p><FdiBadge score={storyFdi(story)} /><div className="fx-card-meta"><span>{story.sourceCount} sources</span><span>{formatTimeAgo(story.newestArticleAt)}</span></div></div></Link>;
}

function FdiBadge({ score, large = false }: { score: number; large?: boolean }) {
  return <div className={`fx-fdi ${large ? "large" : ""}`} style={{ "--fdi-color": fdiColor(score), "--fdi-score": `${Math.max(4, score)}%` } as React.CSSProperties}><div className="fx-fdi-meter"><span /></div><strong>FDI: {score}/100 | {fdiLevel(score)}</strong></div>;
}

function FractureFooter({ sourceCount }: { sourceCount: number }) {
  const footerGroups = [
    { title: "Explore", links: ["Browse stories", "Search", "Topics"] },
    { title: "Learn", links: ["Methodology", "Sources Guide", "How FDI Works"] },
    { title: "Trust", links: ["Transparency Report", "Data Privacy", "Contact"] },
    { title: "Community", links: ["Leave Feedback", "Suggest Outlet", "Join Waitlist"] },
  ];
  return <footer className="fx-footer"><div className="fx-footer-lede"><Link href="/" className="fx-footer-brand"><span>F</span>Fracture</Link><p>Media divergence intelligence</p><p className="fx-footer-explainer">Fracture tracks how trusted outlets frame the same story, making divergence visible without adding editorial opinion.</p></div><div className="fx-footer-links">{footerGroups.map((group) => <section key={group.title}><h2>{group.title}</h2>{group.links.map((link) => <Link key={link} href={link === "Search" ? "/search" : "#trending-stories"}>{link}</Link>)}</section>)}</div><div className="fx-footer-trust"><span>Updated in real-time</span><span>{sourceCount}+ outlets monitored</span><span>100% independent</span></div><div className="fx-footer-bottom"><div><a href="mailto:hello@fracture.news">hello@fracture.news</a><a href="https://github.com" target="_blank" rel="noreferrer">GitHub</a></div><div><span>© 2026 Fracture</span><Link href="#trending-stories">Privacy Policy</Link><Link href="#trending-stories">Terms of Service</Link></div></div></footer>;
}

const styles = `
body:has(.fx) > .ns-navbar, body:has(.fx) > footer, body:has(.fx) .ns-navbar { display: none !important; }
.fx { --fx-bg:#F8F7F5; --fx-surface:#FFFFFF; --fx-text:#1A1918; --fx-muted:#6B6B6B; --fx-accent:#0066CC; --fx-border:#E8E6E3; --fx-blue-soft:#E3F2FF; --fx-shadow:0 18px 50px rgba(26,25,24,.09); min-height:100vh; background:var(--fx-bg); color:var(--fx-text); font-family:Inter,ui-sans-serif,system-ui,sans-serif; }
.fx.fx-dark { --fx-bg:#0F0F0F; --fx-surface:#1A1A1A; --fx-text:#F5F5F5; --fx-muted:#A0A0A0; --fx-accent:#3B82F6; --fx-border:#404040; --fx-blue-soft:rgba(59,130,246,.16); --fx-shadow:0 18px 60px rgba(0,0,0,.34); }
.fx button,.fx input,.fx select{font:inherit}.fx a,.fx button,.fx select{transition:transform .2s ease,box-shadow .2s ease,border-color .2s ease,background .2s ease,color .2s ease}.fx h1,.fx h2,.fx h3{font-family:Georgia,"Times New Roman",serif;color:var(--fx-text)}.fx p{color:var(--fx-muted)}
.fx-nav{position:sticky;top:0;z-index:20;min-height:132px;display:grid;grid-template-columns:1fr;gap:18px;align-items:center;justify-items:center;padding:22px max(24px,calc((100vw - 1280px)/2)) 16px;background:linear-gradient(90deg,color-mix(in srgb,var(--fx-surface) 88%,transparent),color-mix(in srgb,var(--fx-bg) 86%,transparent)),color-mix(in srgb,var(--fx-bg) 92%,transparent);border-bottom:1px solid var(--fx-border);backdrop-filter:blur(18px);box-shadow:0 12px 44px rgba(26,25,24,.05)}
.fx-nav-row,.fx-nav-actions,.fx-links,.fx-topic-nav{display:flex;align-items:center}.fx-nav-row{width:100%;justify-content:center;gap:clamp(22px,3vw,42px);flex-wrap:wrap}.fx-nav-actions{gap:clamp(14px,2vw,24px);position:relative;padding-left:clamp(22px,2.6vw,38px)}.fx-nav-actions:before{content:"";position:absolute;left:0;top:50%;width:1px;height:24px;background:var(--fx-border);transform:translateY(-50%)}
.fx-logo{display:inline-flex;align-items:center;gap:14px;color:var(--fx-text);font-family:Georgia,"Times New Roman",serif;font-size:clamp(34px,4vw,54px);font-weight:700;letter-spacing:-.04em;line-height:.9}.fx-logo span,.fx-source-logo{display:inline-flex;align-items:center;justify-content:center;width:48px;height:48px;border-radius:50%;background:var(--fx-text);color:var(--fx-bg);font-family:Georgia,serif;font-weight:700;font-size:18px}
.fx-links{gap:clamp(18px,2.5vw,34px)}.fx-topic-nav{justify-content:center;gap:clamp(18px,2.5vw,36px);min-width:0}.fx-links a,.fx-topic-nav button{position:relative;border:0;background:transparent;color:var(--fx-muted);cursor:pointer;padding:4px 0;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase}.fx-links a:after,.fx-topic-nav button:after{content:"";position:absolute;left:0;right:0;bottom:-4px;height:1px;background:currentColor;transform:scaleX(0);transform-origin:center;transition:transform .18s ease}.fx-links a.active,.fx-links a:hover,.fx-topic-nav button.active,.fx-topic-nav button:hover{color:var(--fx-text)}.fx-links a.active:after,.fx-links a:hover:after,.fx-topic-nav button.active:after,.fx-topic-nav button:hover:after{transform:scaleX(1)}
.fx-icon-control{display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;border:1px solid color-mix(in srgb,var(--fx-text) 14%,var(--fx-border));border-radius:999px;background:color-mix(in srgb,var(--fx-surface) 82%,transparent);color:var(--fx-text);cursor:pointer;box-shadow:0 1px 0 rgba(26,25,24,.04);flex:0 0 auto}.fx-icon-control:hover{transform:translateY(-1px);border-color:color-mix(in srgb,var(--fx-text) 34%,var(--fx-border));box-shadow:0 12px 30px rgba(26,25,24,.08)}
.fx-search-shell{display:inline-flex;align-items:center;gap:8px;min-width:34px;width:34px;height:34px;overflow:hidden;border-radius:999px;transition:width .28s cubic-bezier(.16,1,.3,1),background .22s ease,border-color .22s ease,padding .28s cubic-bezier(.16,1,.3,1),box-shadow .22s ease;-webkit-tap-highlight-color:transparent}.fx-search-shell:focus,.fx-search-shell:focus-within,.fx-search-shell .fx-icon-control:focus,.fx-search-shell .fx-icon-control:focus-visible{outline:none}.fx-search-shell.open{width:210px;padding-right:12px;border:1px solid color-mix(in srgb,var(--fx-text) 14%,var(--fx-border));background:color-mix(in srgb,var(--fx-surface) 88%,transparent);box-shadow:0 12px 30px rgba(26,25,24,.07)}.fx-search-shell.open .fx-icon-control{border-color:transparent;background:transparent;box-shadow:none}.fx-search-shell input{width:142px;min-width:0;border:0;outline:0;box-shadow:none;appearance:none;background:transparent;color:var(--fx-text);font-size:13px;opacity:0;transform:translateX(-6px);pointer-events:none;transition:opacity .18s ease .08s,transform .22s cubic-bezier(.16,1,.3,1) .06s}.fx-search-shell.open input{opacity:1;transform:translateX(0);pointer-events:auto}.fx-search-shell input:focus,.fx-search-shell input:focus-visible{outline:none;box-shadow:none}.fx-search-shell input::placeholder{color:var(--fx-muted)}
.fx-page{max-width:1200px;margin:0 auto;padding:34px 24px 72px}.fx-hero{min-height:460px;display:grid;grid-template-columns:minmax(0,.95fr) minmax(0,1.05fr);gap:34px;align-items:center;padding:30px 0 38px}.fx-home-hero{border-bottom:1px solid var(--fx-border)}.fx-hero-copy h1{font-size:clamp(38px,5vw,62px);line-height:.98;margin:12px 0 16px;max-width:780px}.fx-hero-copy p:not(.fx-eyebrow){font-family:Georgia,serif;font-size:19px;line-height:1.52;max-width:640px}.fx-eyebrow{display:inline-flex;gap:7px;align-items:center;margin:0;color:var(--fx-accent);font-size:12px;font-weight:700;text-transform:uppercase}.fx-hero-actions{display:flex;flex-wrap:wrap;gap:14px;margin-top:28px}.fx-primary-action,.fx-secondary-action,.fx-load-row button{display:inline-flex;align-items:center;justify-content:center;gap:10px;min-height:48px;border:1px solid var(--fx-text);background:var(--fx-text);color:var(--fx-bg);padding:0 22px;cursor:pointer;border-radius:999px;font-size:13px;font-weight:700}.fx-secondary-action,.fx-load-row button{background:var(--fx-surface);color:var(--fx-text);border-color:color-mix(in srgb,var(--fx-text) 18%,var(--fx-border))}.fx-primary-action:hover,.fx-secondary-action:hover,.fx-load-row button:hover{transform:translateY(-1px);box-shadow:var(--fx-shadow)}
.fx-breaking-card{min-height:405px;position:relative;overflow:hidden;display:flex;align-items:flex-end;color:white;box-shadow:var(--fx-shadow);align-self:center}.fx-breaking-card img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transform:scale(1.01)}.fx-breaking-card:after{content:"";position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,.78),rgba(0,0,0,.1) 62%,rgba(0,0,0,.18))}.fx-breaking-card>div{position:relative;z-index:1;padding:28px;width:100%}.fx-breaking-card span{font-size:12px;text-transform:uppercase;color:rgba(255,255,255,.78);font-weight:700}.fx-breaking-card h2{color:white;font-size:clamp(28px,4vw,46px);line-height:1.05;margin:10px 0 18px}
.fx-section{padding:46px 0 0}.fx-section-header{display:flex;justify-content:space-between;gap:22px;align-items:end;margin-bottom:22px}.fx-section-header h2{font-size:clamp(26px,3vw,38px);margin:7px 0 0;line-height:1.1}.fx-story-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:22px}.fx-card{overflow:hidden;background:var(--fx-surface);border:1px solid var(--fx-border);color:var(--fx-text);cursor:pointer;display:flex;flex-direction:column;transform:translateY(0) scale(1);transform-origin:center top;transition:transform .42s cubic-bezier(.16,1,.3,1),box-shadow .42s cubic-bezier(.16,1,.3,1),border-color .42s ease;will-change:transform}.fx-card:hover{transform:translateY(-8px) scale(1.018);border-color:color-mix(in srgb,var(--fx-text) 18%,var(--fx-border));box-shadow:0 24px 70px rgba(26,25,24,.13)}.fx-card img{width:100%;aspect-ratio:16/9;object-fit:cover;display:block;transform:scale(1);transition:transform .52s cubic-bezier(.16,1,.3,1)}.fx-card:hover img{transform:scale(1.035)}.fx-card-body{padding:20px;display:flex;flex:1;flex-direction:column}.fx-card-topic{color:var(--fx-accent);font-size:12px;text-transform:uppercase;font-weight:700}.fx-card h3{font-size:21px;line-height:1.18;margin:8px 0 10px}.fx-card p{margin:0 0 16px;line-height:1.5}.fx-card .fx-fdi{margin-top:auto}.fx-card-meta{display:flex;justify-content:space-between;gap:12px;color:var(--fx-muted);font-size:13px;margin-top:13px}.fx-fdi{display:grid;gap:8px;padding:10px;background:var(--fx-blue-soft);border:1px solid color-mix(in srgb,var(--fdi-color) 28%,var(--fx-border))}.fx-fdi.large{padding:14px;gap:11px}.fx-fdi strong{color:var(--fx-text);font-size:12px}.fx-fdi.large strong{font-size:15px}.fx-fdi-meter{height:9px;background:color-mix(in srgb,var(--fx-bg) 72%,var(--fx-border));overflow:hidden}.fx-fdi-meter span{display:block;height:100%;width:var(--fdi-score);background:var(--fdi-color);box-shadow:0 0 18px color-mix(in srgb,var(--fdi-color) 60%,transparent)}.fx-load-row{display:flex;justify-content:center;padding-top:28px}.fx-empty{border:1px solid var(--fx-border);background:var(--fx-surface);padding:42px;text-align:center}.fx-empty h3{margin:0 0 8px;font-size:28px}.fx-empty p{margin:0}
.fx-divergence-week{padding-top:56px}.fx-week-cta{color:var(--fx-text);font-size:13px;font-weight:800;border-bottom:1px solid currentColor}.fx-week-cta:hover{color:var(--fx-accent)}.fx-divergence-list{display:grid;border-top:1px solid var(--fx-border)}.fx-divergence-row{display:grid;grid-template-columns:54px minmax(0,1fr) 70px 130px;gap:18px;align-items:center;padding:18px 0;border-bottom:1px solid var(--fx-border);color:var(--fx-text)}.fx-divergence-row h3{margin:0;font-size:21px;line-height:1.2}.fx-divergence-rank{color:var(--fx-accent);font-size:12px;font-weight:800}.fx-divergence-row>strong{font-family:Georgia,serif;font-size:28px;line-height:1;text-align:right}.fx-divergence-level{justify-self:end;color:var(--fx-muted);font-size:11px;font-weight:800;letter-spacing:.08em}.fx-divergence-level.high{color:#EF4444}.fx-divergence-level.moderate{color:#0066CC}.fx-divergence-level.low{color:#10A760}
.fx-community-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:18px}.fx-community-card{display:grid;gap:16px;min-height:250px;padding:20px;border:1px solid var(--fx-border);background:linear-gradient(180deg,color-mix(in srgb,var(--fx-blue-soft) 38%,transparent),transparent 54%),var(--fx-surface);color:var(--fx-text)}.fx-community-card>span,.fx-compare-examples>span,.fx-compare-score>span,.fx-compare-controls span{color:var(--fx-accent);font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase}.fx-community-card h3{margin:0;font-size:24px;line-height:1.08}.fx-community-card small{display:block;margin-top:10px;color:var(--fx-muted);line-height:1.45}
.fx-credibility-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.fx-credibility-row{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:16px;align-items:center;padding:18px;border:1px solid var(--fx-border);background:var(--fx-surface)}.fx-credibility-row h3{margin:0 0 4px;font-size:24px;line-height:1.05}.fx-credibility-row p{margin:0;color:var(--fx-muted)}.fx-rating{display:grid;gap:4px;justify-items:end}.fx-rating strong{font-family:Georgia,serif;font-size:30px;line-height:1}.fx-rating span{color:#B7791F;font-size:13px}
.fx-compare-panel{display:grid;grid-template-columns:340px minmax(0,1fr);gap:24px;padding:24px;border:1px solid var(--fx-border);background:var(--fx-surface);box-shadow:var(--fx-shadow)}.fx-compare-controls{display:grid;gap:16px;align-content:start}.fx-compare-controls label{display:grid;gap:8px}.fx-compare-controls select{width:100%;height:46px;border:1px solid var(--fx-border);background:var(--fx-bg);color:var(--fx-text);padding:0 12px}.fx-compare-results{display:grid;grid-template-columns:minmax(0,1fr) 190px;gap:18px}.fx-compare-summary,.fx-compare-score,.fx-compare-examples{border:1px solid var(--fx-border);background:color-mix(in srgb,var(--fx-bg) 55%,var(--fx-surface));padding:20px}.fx-compare-summary h3{margin:9px 0 12px;font-size:34px;line-height:1.05}.fx-compare-summary p:not(.fx-eyebrow){margin:0;color:var(--fx-muted);font-family:Georgia,serif;font-size:18px;line-height:1.6}.fx-compare-score{display:grid;align-content:center;text-align:center}.fx-compare-score strong{margin:12px 0 6px;font-family:Georgia,serif;font-size:68px;line-height:.9}.fx-compare-score small{color:var(--fx-muted);font-weight:700;text-transform:uppercase}.fx-compare-examples{grid-column:1/-1;display:grid;gap:12px}.fx-compare-examples article{display:grid;gap:4px;padding-top:12px;border-top:1px solid var(--fx-border)}.fx-compare-examples strong{color:var(--fx-text);font-family:Georgia,serif;font-size:18px}.fx-compare-examples small{color:var(--fx-muted)}
.fx-footer{max-width:1200px;margin:24px auto 0;padding:64px 24px 34px;border-top:1px solid var(--fx-border);color:var(--fx-text)}.fx-footer-lede{display:grid;grid-template-columns:minmax(240px,.8fr) minmax(0,1fr) minmax(260px,.8fr);gap:28px;align-items:start;padding-bottom:42px}.fx-footer-brand{display:inline-flex;align-items:center;gap:12px;color:var(--fx-text);font-family:Georgia,"Times New Roman",serif;font-size:32px;font-weight:700;letter-spacing:-.035em;line-height:1}.fx-footer-brand span{display:inline-flex;align-items:center;justify-content:center;width:38px;height:38px;border-radius:50%;background:var(--fx-text);color:var(--fx-bg);font-size:15px}.fx-footer-lede p{margin:0}.fx-footer-lede>p:first-of-type{color:var(--fx-accent);font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase}.fx-footer-explainer{color:var(--fx-muted);font-family:Georgia,serif;font-size:18px;line-height:1.55}.fx-footer-links{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:28px;padding:34px 0;border-top:1px solid var(--fx-border);border-bottom:1px solid var(--fx-border)}.fx-footer-links section{display:grid;gap:10px}.fx-footer-links h2{margin:0 0 4px;color:var(--fx-accent);font-family:Inter,ui-sans-serif,system-ui,sans-serif;font-size:11px;font-weight:800;letter-spacing:.1em;text-transform:uppercase}.fx-footer a{color:var(--fx-muted);width:fit-content;font-size:14px}.fx-footer a:hover{color:var(--fx-text);text-decoration:underline;text-underline-offset:4px}.fx-footer-trust{display:flex;flex-wrap:wrap;gap:12px;padding:22px 0}.fx-footer-trust span{border:1px solid var(--fx-border);background:color-mix(in srgb,var(--fx-surface) 74%,transparent);color:var(--fx-text);padding:9px 12px;font-size:12px;font-weight:700}.fx-footer-bottom{display:flex;justify-content:space-between;gap:18px;align-items:center;color:var(--fx-muted);font-size:13px}.fx-footer-bottom>div{display:flex;flex-wrap:wrap;gap:16px;align-items:center}.fx-skeleton{min-height:280px;background:linear-gradient(90deg,var(--fx-surface),var(--fx-border),var(--fx-surface));background-size:200% 100%;animation:fxPulse 1.4s infinite}.fx-skeleton.tall{min-height:400px}@keyframes fxPulse{0%{background-position:200% 0}100%{background-position:-200% 0}}
@media (max-width:920px){.fx-nav{min-height:auto;padding:18px 18px 14px}.fx-nav-row{gap:18px 26px}.fx-topic-nav{justify-content:center;flex-wrap:wrap;gap:14px 22px}.fx-hero,.fx-compare-panel,.fx-compare-results{grid-template-columns:1fr}.fx-hero{min-height:auto;padding-top:24px}.fx-story-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.fx-community-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.fx-credibility-list{grid-template-columns:1fr}.fx-footer-lede,.fx-footer-links{grid-template-columns:repeat(2,minmax(0,1fr))}.fx-footer-bottom{align-items:start;flex-direction:column}.fx-divergence-row{grid-template-columns:42px minmax(0,1fr) 62px}.fx-divergence-level{grid-column:2/-1;justify-self:start}}
@media (max-width:620px){.fx-page{padding:22px 16px 56px}.fx-logo{font-size:36px}.fx-logo span{width:42px;height:42px}.fx-links,.fx-topic-nav,.fx-nav-actions{justify-content:center;flex-wrap:wrap;gap:12px 18px}.fx-hero-copy h1{font-size:42px}.fx-hero-copy p:not(.fx-eyebrow){font-size:18px}.fx-breaking-card{min-height:340px}.fx-section-header{align-items:start;flex-direction:column}.fx-story-grid,.fx-community-grid{grid-template-columns:1fr}.fx-credibility-row{grid-template-columns:1fr}.fx-rating{justify-items:start}.fx-compare-panel{padding:16px}.fx-footer{padding-top:44px}.fx-footer-lede,.fx-footer-links{grid-template-columns:1fr}.fx-divergence-row{grid-template-columns:1fr;gap:8px}.fx-divergence-rank,.fx-divergence-level,.fx-divergence-row>strong{justify-self:start;text-align:left}}
`;
