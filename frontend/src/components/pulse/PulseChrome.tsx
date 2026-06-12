"use client";

import { FormEvent, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  Bookmark,
  ChevronRight,
  Menu,
  MessageSquare,
  Radio,
  Search,
  Users,
} from "lucide-react";
import type { PlatformStats, StoryCluster } from "@/types";

export const PULSE_FALLBACK_IMAGE = "https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=1200&q=80";

export function storyImage(story: Pick<StoryCluster, "imageUrl"> | null | undefined) {
  return story?.imageUrl || PULSE_FALLBACK_IMAGE;
}

export function compactStoryText(value: string | null | undefined, maxLength = 128) {
  const clean = value?.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim() || "";
  if (!clean || clean.length <= maxLength) return clean;
  const clipped = clean.slice(0, maxLength + 1);
  const boundary = Math.max(clipped.lastIndexOf("."), clipped.lastIndexOf(","), clipped.lastIndexOf(" "));
  return `${clipped.slice(0, boundary > 72 ? boundary : maxLength).trim()}...`;
}

export function storySummary(story: StoryCluster, maxLength = 128) {
  const fallback = `Fracture is tracking how ${story.sourceCount || "multiple"} sources are framing ${story.topic}.`;
  return compactStoryText(story.summary || fallback, maxLength);
}

export function storyPulse(story: StoryCluster) {
  return Math.max(0, Math.min(99, Math.round(story.velocityScore ?? story.divergenceScore ?? 0)));
}

export function storyDivergence(story: StoryCluster) {
  return Math.max(0, Math.min(99, Math.round(story.divergenceScore ?? 0)));
}

export function fdiLevel(score: number) {
  if (score >= 70) return "High";
  if (score >= 45) return "Moderate";
  return "Low";
}

export function fdiTooltip(score: number) {
  return `Fracture Divergence Index: ${score}/100. ${fdiLevel(score)} divergence means Fracture is measuring ${score >= 70 ? "wide" : score >= 45 ? "meaningful" : "limited"} distance in framing, tone, source emphasis, or headline structure across outlets.`;
}

export function formatPulseTime(value: string | null | undefined) {
  if (!value) return "Updating";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Updating";
  const delta = Date.now() - date.getTime();
  if (delta < 60_000) return "now";
  const minutes = Math.floor(delta / 60_000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function formatClock(value: string | null | undefined) {
  const date = value ? new Date(value) : new Date();
  const safeDate = Number.isNaN(date.getTime()) ? new Date() : date;
  return safeDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function categoryLabel(value: string | null | undefined) {
  const normalized = (value || "").toLowerCase().replace(/[_-]/g, " ").trim();
  if (!normalized || normalized === "uncategorized" || normalized === "general") return "World";
  if (/\b(world|global|international|foreign|war|conflict|geopolitic|diplomac|middle east|europe|asia)\b/.test(normalized)) return "World";
  if (/\b(business|market|econom|finance|trade|company|stock|labor|supply chain)\b/.test(normalized)) return "Business";
  if (/\b(tech|technology|ai|software|cyber|cloud|chip|semiconductor|data|privacy)\b/.test(normalized)) return "Tech";
  if (/\b(policy|politic|government|congress|senate|house|election|law|court|regulat)\b/.test(normalized)) return "Policy";
  if (/\b(health|medicine|hospital|virus|disease|public health)\b/.test(normalized)) return "Health";
  if (/\b(climate|energy|environment|weather)\b/.test(normalized)) return "Climate";
  if (/\b(sport|league|team|game)\b/.test(normalized)) return "Sports";
  return normalized.replace(/\b\w/g, (char) => char.toUpperCase());
}

export function PulseFdiBadge({ score, compact = false }: { score: number; compact?: boolean }) {
  const level = fdiLevel(score);
  return (
    <span className={`pulse-fdi-badge is-${level.toLowerCase()} ${compact ? "is-compact" : ""}`} title={fdiTooltip(score)} aria-label={fdiTooltip(score)}>
      <small>FDI</small>
      <strong>{score}</strong>
      <em>{level}</em>
    </span>
  );
}

export function PulseMark() {
  return (
    <svg viewBox="0 0 70 22" aria-hidden="true" className="pulse-wordmark">
      <path d="M4 11h14l4-7 5 14 5-11 4 7h8" />
      <path d="M52 15h4V6h6v9h4" />
    </svg>
  );
}

export function PulseTopbar({ stats }: { stats?: PlatformStats }) {
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function openSearch() {
    setSearchOpen(true);
    window.setTimeout(() => inputRef.current?.focus(), 120);
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!searchOpen) {
      openSearch();
      return;
    }

    const trimmed = query.trim();
    router.push(trimmed ? `/stories?search=${encodeURIComponent(trimmed)}` : "/stories");
  }

  return (
    <header className="pulse-topbar">
      <Link className="pulse-logo" href="/" aria-label="Fracture home">
        FRACTURE
      </Link>
      <div className="pulse-live-badge"><span /> LIVE NOW</div>
      <Link className="pulse-product" href="/">
        Pulse <PulseMark />
      </Link>
      <div className="pulse-stats" aria-label="Live stats">
        <span><BarChart3 size={18} />{stats?.activeStories ?? 0}</span>
        <span title={fdiTooltip(Math.round(stats?.avgDivergence ?? 0))} aria-label={`Average ${fdiTooltip(Math.round(stats?.avgDivergence ?? 0))}`}><MessageSquare size={18} />FDI {Math.round(stats?.avgDivergence ?? 0)}</span>
        <span><Users size={18} />{compactNumber(stats?.sourcesTracked ?? 0)}</span>
        <span><Radio size={18} />{Math.max(0, Math.round((stats?.activeStories ?? 0) / 3))}</span>
      </div>
      <form className={`pulse-search-action ${searchOpen ? "is-open" : ""}`} onSubmit={submitSearch} role="search">
        <button type="submit" aria-label={searchOpen ? "Run story search" : "Open story search"}>
          {searchOpen ? <ChevronRight size={22} /> : <Search size={26} />}
        </button>
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onBlur={() => {
            if (!query.trim()) setSearchOpen(false);
          }}
          aria-label="Search stories"
          placeholder="Search stories"
          tabIndex={searchOpen ? 0 : -1}
        />
      </form>
      <div className="pulse-actions" aria-label="Site controls">
        <Link href="/stories" aria-label="Saved stories"><Bookmark size={24} /></Link>
        <button type="button" aria-label="Open menu"><Menu size={28} /></button>
      </div>
    </header>
  );
}

function compactNumber(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${Math.round(value / 100) / 10}K`;
  return String(value);
}

export const pulseChromeStyles = `
.pulse-topbar {
  height: 88px;
  display: grid;
  grid-template-columns: minmax(250px, 1fr) auto minmax(160px, 0.7fr) minmax(360px, 1fr) auto auto;
  align-items: center;
  gap: 28px;
  padding: 0 24px;
  border-bottom: 1px solid var(--line);
  background: rgba(252, 252, 248, 0.96);
}
.pulse-logo {
  font-size: clamp(40px, 4.6vw, 68px);
  line-height: 0.82;
  font-weight: 1000;
  letter-spacing: -0.05em;
}
.pulse-live-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 31px;
  padding: 0 14px;
  background: var(--orange);
  color: white;
  font-weight: 900;
  text-transform: uppercase;
  white-space: nowrap;
}
.pulse-live-badge span,
.pulse-live-dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: currentColor;
  display: inline-block;
  animation: pulseBlink 1.65s ease-in-out infinite;
}
.pulse-product {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 20px;
  font-weight: 900;
}
.pulse-wordmark {
  width: 44px;
  height: 20px;
  fill: none;
  stroke: var(--orange);
  stroke-width: 3;
  stroke-linecap: square;
  stroke-linejoin: miter;
}
.pulse-stats,
.pulse-actions,
.pulse-search-action {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: clamp(20px, 3vw, 46px);
}
.pulse-stats span {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 800;
  white-space: nowrap;
}
.pulse-stats span:nth-child(1) svg,
.pulse-stats span:nth-child(4) svg {
  color: var(--orange);
}
.pulse-stats span:nth-child(2) svg {
  color: var(--cyan);
  fill: var(--cyan);
}
.pulse-actions {
  gap: 28px;
}
.pulse-search-action {
  justify-self: end;
  width: 32px;
  height: 38px;
  gap: 8px;
  overflow: hidden;
  border: 1px solid transparent;
  background: transparent;
  transition: width 240ms cubic-bezier(.16,1,.3,1), border-color 180ms ease, background 180ms ease, padding 240ms cubic-bezier(.16,1,.3,1), box-shadow 180ms ease;
}
.pulse-search-action.is-open {
  width: min(280px, 24vw);
  padding: 0 7px 0 0;
  border-color: var(--line);
  background: white;
  box-shadow: 6px 6px 0 var(--orange);
}
.pulse-search-action input {
  min-width: 0;
  width: 100%;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--night);
  font-size: 15px;
  font-weight: 850;
  opacity: 0;
  transform: translateX(8px);
  transition: opacity 160ms ease 80ms, transform 200ms cubic-bezier(.16,1,.3,1) 50ms;
}
.pulse-search-action.is-open input {
  opacity: 1;
  transform: translateX(0);
}
.pulse-search-action input::placeholder {
  color: rgba(16, 17, 20, 0.42);
}
.pulse-actions button,
.pulse-actions a,
.pulse-search-action button {
  width: 32px;
  height: 32px;
  border: 0;
  background: transparent;
  display: grid;
  place-items: center;
  cursor: pointer;
  transition: color 160ms ease, transform 160ms ease;
}
.pulse-actions button:hover,
.pulse-actions a:hover,
.pulse-search-action button:hover {
  color: var(--orange);
  transform: translateY(-1px);
}
.pulse-fdi-badge {
  display: inline-grid;
  grid-template-columns: auto auto;
  grid-template-areas: "label score" "level score";
  align-items: center;
  column-gap: 8px;
  min-width: 76px;
  padding: 7px 9px;
  border: 1px solid currentColor;
  background: var(--chalk);
  color: var(--night);
  line-height: 1;
}
.pulse-fdi-badge small {
  grid-area: label;
  color: var(--muted);
  font-size: 10px;
  font-weight: 950;
  letter-spacing: .08em;
  text-transform: uppercase;
}
.pulse-fdi-badge strong {
  grid-area: score;
  font-size: 28px;
  line-height: .86;
  font-weight: 1000;
  letter-spacing: -0.05em;
}
.pulse-fdi-badge em {
  grid-area: level;
  margin-top: 3px;
  color: var(--orange);
  font-size: 10px;
  font-style: normal;
  font-weight: 950;
  text-transform: uppercase;
}
.pulse-fdi-badge.is-low em {
  color: var(--cyan);
}
.pulse-fdi-badge.is-compact {
  min-width: 58px;
  padding: 5px 6px;
  column-gap: 5px;
}
.pulse-fdi-badge.is-compact strong {
  font-size: 21px;
}
.pulse-fdi-badge.is-compact em {
  display: none;
}
@keyframes pulseBlink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.36; }
}
@media (max-width: 1180px) {
  .pulse-topbar {
    grid-template-columns: 1fr auto auto auto;
    height: auto;
    min-height: 86px;
    row-gap: 12px;
    padding-block: 12px;
  }
  .pulse-product,
  .pulse-stats {
    display: none;
  }
}
@media (max-width: 780px) {
  .pulse-topbar {
    grid-template-columns: 1fr auto auto;
    gap: 12px;
    padding: 12px 16px;
  }
  .pulse-logo {
    font-size: clamp(38px, 13vw, 58px);
  }
  .pulse-live-badge {
    order: 3;
    grid-column: 1 / -1;
    width: max-content;
  }
  .pulse-actions {
    gap: 12px;
  }
  .pulse-search-action.is-open {
    order: 4;
    grid-column: 1 / -1;
    justify-self: start;
    width: min(100%, 340px);
  }
  .pulse-actions a {
    display: none;
  }
}
`;
