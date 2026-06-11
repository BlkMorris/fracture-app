"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CircleUser, Moon, Search, Sparkles, Sun } from "lucide-react";
import { useStories } from "@/hooks/useStories";
import type { StoryCluster } from "@/types";

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
  return story.imageUrl || "https://images.unsplash.com/photo-1495020689067-958852a7765e?auto=format&fit=crop&w=900&q=80";
}

function storySummary(story: StoryCluster) {
  return story.summary || `Fracture is tracking coverage of ${story.topic} across ${story.sourceCount || "multiple"} outlets.`;
}

export default function StoriesPage() {
  const [dark, setDark] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [navHidden, setNavHidden] = useState(false);
  const [query, setQuery] = useState("");
  const lastScrollY = useRef(0);

  useEffect(() => {
    lastScrollY.current = window.scrollY;

    function handleScroll() {
      const currentY = window.scrollY;
      const delta = currentY - lastScrollY.current;

      if (currentY < 32) {
        setNavHidden(false);
      } else if (delta > 8) {
        setNavHidden(true);
      } else if (delta < -8) {
        setNavHidden(false);
      }

      lastScrollY.current = currentY;
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const { data, isLoading } = useStories({ limit: 60, search: query || undefined });
  const curatedStories = [...(data?.stories ?? [])].sort((a, b) => storyFdi(b) - storyFdi(a));
  const filteredStories = curatedStories;

  return (
    <div className={`fx ${dark ? "fx-dark" : ""}`}>
      <nav className={`fx-nav ${navHidden ? "hidden" : ""}`} aria-label="Fracture navigation">
        <Link href="/" className="fx-logo" aria-label="Fracture home"><span>F</span>Fracture</Link>
        <div className="fx-nav-row">
          <div className="fx-links" aria-label="Primary sections">
            <Link href="/">Home</Link>
            <Link href="/stories" className="active">Stories</Link>
            <Link href="/#source-credibility">Sources</Link>
          </div>
          <div className="fx-topic-nav" aria-label="Homepage sections">
            {SECTION_LINKS.map((item) => <Link key={item.href} href={item.href}>{item.label}</Link>)}
          </div>
          <div className="fx-nav-actions">
            <div className={`fx-search-shell ${searchOpen ? "open" : ""}`}>
              <button className="fx-icon-control" type="button" aria-label="Search stories" aria-expanded={searchOpen} onMouseDown={(event) => event.preventDefault()} onClick={() => setSearchOpen((value) => !value)}><Search size={15} /></button>
              <input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search stories" placeholder="Search stories" tabIndex={searchOpen ? 0 : -1} />
            </div>
            <button className="fx-icon-control" type="button" onClick={() => setDark((value) => !value)} aria-label="Toggle dark mode">{dark ? <Sun size={15} /> : <Moon size={15} />}</button>
            <button className="fx-icon-control" type="button" aria-label="Open user menu"><CircleUser size={16} /></button>
          </div>
        </div>
      </nav>

      <main className="fx-page fx-stories-page">
        <section className="fx-stories-hero">
          <div>
            <p className="fx-eyebrow"><Sparkles size={15} /> Curated story index</p>
            <h1>Browse the stories with the clearest framing distance.</h1>
            <p>A focused reading list of story clusters where outlet framing, tone, source selection, or emphasis meaningfully diverges.</p>
          </div>
          <label className="fx-stories-search">
            <span>Search curated stories</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by topic, headline, or framing pattern" />
          </label>
        </section>

        <section className="fx-section">
          <div className="fx-section-header"><div><p className="fx-eyebrow">Curated list</p><h2>{isLoading ? "Loading stories." : `${filteredStories.length} stories matching your view.`}</h2></div></div>
          <div className="fx-stories-list">
            {filteredStories.map((story, index) => (
              <Link key={story.id} href={`/story/${story.id}`} className="fx-stories-row">
                <span className="fx-divergence-rank">{String(index + 1).padStart(2, "0")}</span>
                <img src={storyImage(story)} alt="News story thumbnail" />
                <div><span className="fx-card-topic">{story.topicCategory || "News"}</span><h3>{story.topic}</h3><p>{storySummary(story)}</p><small>{story.topicKeywords?.slice(0, 3).join(" / ") || `${story.sourceCount} sources`}</small></div>
                <FdiBadge score={storyFdi(story)} />
              </Link>
            ))}
          </div>
        </section>
      </main>
      <style jsx global>{styles}</style>
    </div>
  );
}

function FdiBadge({ score }: { score: number }) {
  return <div className="fx-fdi" style={{ "--fdi-color": fdiColor(score), "--fdi-score": `${Math.max(4, score)}%` } as React.CSSProperties}><div className="fx-fdi-meter"><span /></div><strong>FDI: {score}/100 | {fdiLevel(score)}</strong></div>;
}

const styles = `
body:has(.fx) > .ns-navbar, body:has(.fx) > footer, body:has(.fx) .ns-navbar { display:none!important; }
.fx{--fx-bg:#F8F7F5;--fx-surface:#FFFFFF;--fx-text:#1A1918;--fx-muted:#6B6B6B;--fx-accent:#0066CC;--fx-border:#E8E6E3;--fx-blue-soft:#E3F2FF;--fx-shadow:0 18px 50px rgba(26,25,24,.09);min-height:100vh;background:var(--fx-bg);color:var(--fx-text);font-family:Inter,ui-sans-serif,system-ui,sans-serif}.fx.fx-dark{--fx-bg:#0F0F0F;--fx-surface:#1A1A1A;--fx-text:#F5F5F5;--fx-muted:#A0A0A0;--fx-accent:#3B82F6;--fx-border:#404040;--fx-blue-soft:rgba(59,130,246,.16);--fx-shadow:0 18px 60px rgba(0,0,0,.34)}.fx button,.fx input,.fx select{font:inherit}.fx a,.fx button,.fx select{transition:transform .2s ease,box-shadow .2s ease,border-color .2s ease,background .2s ease,color .2s ease}.fx h1,.fx h2,.fx h3{font-family:Georgia,"Times New Roman",serif;color:var(--fx-text)}.fx p{color:var(--fx-muted)}
.fx-nav{position:sticky;top:0;z-index:20;min-height:132px;display:grid;grid-template-columns:1fr;gap:18px;align-items:center;justify-items:center;padding:22px max(24px,calc((100vw - 1280px)/2)) 16px;background:linear-gradient(90deg,color-mix(in srgb,var(--fx-surface) 88%,transparent),color-mix(in srgb,var(--fx-bg) 86%,transparent)),color-mix(in srgb,var(--fx-bg) 92%,transparent);border-bottom:1px solid var(--fx-border);backdrop-filter:blur(18px);box-shadow:0 12px 44px rgba(26,25,24,.05);transform:translateY(0);opacity:1;transition:transform .46s cubic-bezier(.16,1,.3,1),opacity .28s ease,box-shadow .28s ease}.fx-nav.hidden{transform:translateY(calc(-100% - 18px));opacity:.98;box-shadow:none}.fx-nav-row,.fx-nav-actions,.fx-links,.fx-topic-nav{display:flex;align-items:center}.fx-nav-row{width:100%;justify-content:center;gap:clamp(22px,3vw,42px);flex-wrap:wrap}.fx-nav-actions{gap:clamp(14px,2vw,24px);position:relative;padding-left:clamp(22px,2.6vw,38px)}.fx-nav-actions:before{content:"";position:absolute;left:0;top:50%;width:1px;height:24px;background:var(--fx-border);transform:translateY(-50%)}.fx-logo{display:inline-flex;align-items:center;gap:14px;color:var(--fx-text);font-family:Georgia,"Times New Roman",serif;font-size:clamp(34px,4vw,54px);font-weight:700;letter-spacing:-.04em;line-height:.9}.fx-logo span{display:inline-flex;align-items:center;justify-content:center;width:48px;height:48px;border-radius:50%;background:var(--fx-text);color:var(--fx-bg);font-family:Georgia,serif;font-weight:700;font-size:18px}.fx-links{gap:clamp(18px,2.5vw,34px)}.fx-topic-nav{justify-content:center;gap:clamp(18px,2.5vw,36px);min-width:0}.fx-links a,.fx-topic-nav a{position:relative;border:0;background:transparent;color:var(--fx-muted);cursor:pointer;padding:4px 0;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase}.fx-links a:after,.fx-topic-nav a:after{content:"";position:absolute;left:0;right:0;bottom:-4px;height:1px;background:currentColor;transform:scaleX(0);transform-origin:center;transition:transform .18s ease}.fx-links a.active,.fx-links a:hover,.fx-topic-nav a:hover{color:var(--fx-text)}.fx-links a.active:after,.fx-links a:hover:after,.fx-topic-nav a:hover:after{transform:scaleX(1)}
.fx-icon-control{display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;border:1px solid color-mix(in srgb,var(--fx-text) 14%,var(--fx-border));border-radius:999px;background:color-mix(in srgb,var(--fx-surface) 82%,transparent);color:var(--fx-text);cursor:pointer;box-shadow:0 1px 0 rgba(26,25,24,.04);flex:0 0 auto}.fx-icon-control:hover{transform:translateY(-1px);border-color:color-mix(in srgb,var(--fx-text) 34%,var(--fx-border));box-shadow:0 12px 30px rgba(26,25,24,.08)}.fx-search-shell{display:inline-flex;align-items:center;gap:8px;min-width:34px;width:34px;height:34px;overflow:hidden;border-radius:999px;transition:width .28s cubic-bezier(.16,1,.3,1),background .22s ease,border-color .22s ease,padding .28s cubic-bezier(.16,1,.3,1),box-shadow .22s ease;-webkit-tap-highlight-color:transparent}.fx-search-shell:focus,.fx-search-shell:focus-within,.fx-search-shell .fx-icon-control:focus,.fx-search-shell .fx-icon-control:focus-visible{outline:none}.fx-search-shell.open{width:210px;padding-right:12px;border:1px solid color-mix(in srgb,var(--fx-text) 14%,var(--fx-border));background:color-mix(in srgb,var(--fx-surface) 88%,transparent);box-shadow:0 12px 30px rgba(26,25,24,.07)}.fx-search-shell.open .fx-icon-control{border-color:transparent;background:transparent;box-shadow:none}.fx-search-shell input{width:142px;min-width:0;border:0;outline:0;box-shadow:none;appearance:none;background:transparent;color:var(--fx-text);font-size:13px;opacity:0;transform:translateX(-6px);pointer-events:none;transition:opacity .18s ease .08s,transform .22s cubic-bezier(.16,1,.3,1) .06s}.fx-search-shell.open input{opacity:1;transform:translateX(0);pointer-events:auto}.fx-search-shell input:focus,.fx-search-shell input:focus-visible{outline:none;box-shadow:none}.fx-search-shell input::placeholder{color:var(--fx-muted)}
.fx-page{max-width:1240px;margin:0 auto;padding:34px 24px 72px}.fx-stories-hero{display:grid;grid-template-columns:minmax(0,1fr) 420px;gap:34px;align-items:end;padding:44px 0 38px;border-bottom:1px solid var(--fx-border)}.fx-stories-hero h1{max-width:820px;margin:12px 0 16px;font-size:clamp(42px,6vw,78px);line-height:.92;letter-spacing:-.035em}.fx-stories-hero p:not(.fx-eyebrow){max-width:680px;margin:0;color:var(--fx-muted);font-family:Georgia,serif;font-size:20px;line-height:1.58}.fx-eyebrow{display:inline-flex;gap:7px;align-items:center;margin:0;color:var(--fx-accent);font-size:12px;font-weight:700;text-transform:uppercase}.fx-stories-search{display:grid;gap:10px;padding:18px;border:1px solid var(--fx-border);background:var(--fx-surface);box-shadow:var(--fx-shadow)}.fx-stories-search span{color:var(--fx-accent);font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase}.fx-stories-search input{width:100%;height:46px;border:1px solid var(--fx-border);background:var(--fx-bg);color:var(--fx-text);padding:0 14px;outline:0}.fx-section{padding:46px 0 0}.fx-section-header{display:flex;justify-content:space-between;gap:22px;align-items:end;margin-bottom:22px}.fx-section-header h2{font-size:clamp(26px,3vw,38px);margin:7px 0 0;line-height:1.1}.fx-stories-list{display:grid;gap:14px}.fx-stories-row{display:grid;grid-template-columns:44px 170px minmax(0,1fr) 190px;gap:18px;align-items:center;padding:16px;border:1px solid var(--fx-border);background:var(--fx-surface);color:var(--fx-text);cursor:pointer;transition:transform .36s cubic-bezier(.16,1,.3,1),box-shadow .36s cubic-bezier(.16,1,.3,1),border-color .36s ease}.fx-stories-row:hover{transform:translateY(-5px);border-color:color-mix(in srgb,var(--fx-text) 18%,var(--fx-border));box-shadow:0 20px 60px rgba(26,25,24,.11)}.fx-stories-row img{width:100%;aspect-ratio:4/3;object-fit:cover}.fx-stories-row h3{margin:5px 0 8px;font-size:25px;line-height:1.08}.fx-stories-row p{margin:0 0 8px;line-height:1.45}.fx-stories-row small,.fx-divergence-rank{color:var(--fx-muted)}.fx-card-topic{color:var(--fx-accent);font-size:12px;text-transform:uppercase;font-weight:700}.fx-fdi{display:grid;gap:8px;padding:10px;background:var(--fx-blue-soft);border:1px solid color-mix(in srgb,var(--fdi-color) 28%,var(--fx-border))}.fx-fdi strong{color:var(--fx-text);font-size:12px}.fx-fdi-meter{height:9px;background:color-mix(in srgb,var(--fx-bg) 72%,var(--fx-border));overflow:hidden}.fx-fdi-meter span{display:block;height:100%;width:var(--fdi-score);background:var(--fdi-color)}
@media (max-width:920px){.fx-stories-hero{grid-template-columns:1fr}.fx-stories-row{grid-template-columns:42px 130px minmax(0,1fr)}.fx-stories-row .fx-fdi{grid-column:2/-1}.fx-topic-nav{flex-wrap:wrap}}@media (max-width:620px){.fx-page{padding:22px 16px 56px}.fx-logo{font-size:36px}.fx-logo span{width:42px;height:42px}.fx-links,.fx-topic-nav,.fx-nav-actions{justify-content:center;flex-wrap:wrap;gap:12px 18px}.fx-stories-row{grid-template-columns:1fr}.fx-stories-row img{aspect-ratio:16/9}.fx-stories-row .fx-fdi{grid-column:auto}}
`;
