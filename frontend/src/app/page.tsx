"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import type { CSSProperties } from "react";
import { motion } from "framer-motion";
import { BarChart3, ChevronRight, Code2, Globe2, Landmark, Play } from "lucide-react";
import { useHomepage, useStats, useStories } from "@/hooks/useStories";
import type { LatestArticle, StoryCluster } from "@/types";
import { normalizeHeadline, normalizeSummary, truncatePlainText } from "@/lib/text-normalization";
import { PulseHomeTabs } from "@/components/pulse/PulseHomeTabs";
import {
  categoryLabel,
  compactStoryText,
  formatClock,
  PulseFdiBadge,
  PulseFooter,
  PulseRelativeTime,
  pulseChromeStyles,
  PulseTopbar,
  storyDivergence,
  storyImage,
} from "@/components/pulse/PulseChrome";

const topicIcons = [Globe2, BarChart3, Code2, Landmark];
const HERO_HEADLINE_MAX_CHARS = 36;
const HERO_HEADLINE_MAX_WORDS = 6;

export default function HomePage() {
  const { data: homepage, isLoading: homepageLoading } = useHomepage();
  const { data: storiesData, isLoading: storiesLoading } = useStories({ limit: 40 });
  const { data: stats } = useStats();
  const contentReady = !homepageLoading && !storiesLoading && !!homepage && !!storiesData;

  const allStories = contentReady ? storiesData?.stories ?? [] : [];
  const hero = contentReady ? homepage?.hero ?? allStories[0] ?? null : null;
  const storyPool = contentReady ? buildStoryPool(homepage?.trending ?? [], homepage?.mostFractured, allStories, hero) : [];
  const secondaryStories = storyPool.slice(0, 4);
  const latest = contentReady ? homepage?.latest ?? [] : [];
  const latestByStoryId = new Map(latest.filter((article) => article.storyClusterId).map((article) => [article.storyClusterId, article]));
  const heroArticle = hero ? homepage?.heroArticle ?? latestByStoryId.get(hero.id) ?? null : null;
  const liveItems = buildLiveItems(latest, storyPool, hero);
  const timeline = buildTimeline(latest, storyPool, hero);
  const topics = buildTopics([...(hero ? [hero] : []), ...storyPool]);
  const divergenceWatch = buildDivergenceWatch([...(hero ? [hero] : []), ...storyPool]);
  const sourceWire = latest.slice(0, 6);

  return (
    <main className="pulse-home" aria-label="Fracture Pulse Editorial homepage">
      <style jsx global>{styles}</style>

      <PulseTopbar stats={stats} />

      <PulseHomeTabs updatedAt={hero?.newestArticleAt ?? homepage?.latest?.[0]?.publishedAt} />

      {!contentReady ? <HomepageSkeleton /> : (
        <section className="pulse-dashboard">
          <div className="pulse-main-column">
            {hero ? <LeadStory story={hero} article={heroArticle} generatedHeadline={homepage?.heroHeadline ?? null} /> : <EmptyState />}
            <div className="pulse-story-grid">
              {secondaryStories.map((story) => <StoryTile story={story} article={latestByStoryId.get(story.id) ?? null} key={story.id} />)}
            </div>
          </div>

          <aside className="pulse-updates" aria-label="Live updates">
            <div className="pulse-section-head">
              <h2><span /> Live Updates</h2>
              <Link href="/live">See all</Link>
            </div>
            <div className="pulse-update-list">
              {liveItems.map((item, index) => (
                <Link href={item.href} className={`pulse-update ${index % 2 ? "is-cyan" : "is-orange"}`} key={`${item.time}-${item.title}`}>
                  <time>{item.time}</time>
                  <div>
                    <b>{item.label}</b>
                    <p>{item.title}</p>
                  </div>
                  <span aria-hidden="true" />
                </Link>
              ))}
            </div>
            <Link href="/live" className="pulse-live-blog">
              <span><i /> Live Blog</span>
              <strong>{stats?.activeStories ?? storyPool.length}</strong>
              <ChevronRight size={20} />
            </Link>
          </aside>
        </section>
      )}

      {contentReady ? (
        <section className="pulse-timeline" aria-label="Live timeline">
          <div className="pulse-timeline-label">LIVE<br />TIMELINE</div>
          <div className="pulse-timeline-track">
            {timeline.map((item, index) => (
              <Link href={item.href} className={`pulse-time-node ${index < 2 ? "is-orange" : "is-cyan"}`} key={`${item.time}-${item.title}`}>
                <span />
                <time>{item.time}</time>
                <p>{item.title}</p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {contentReady ? (
        <div className="pulse-context-divider" aria-label="Homepage context modules">
          <span>Context Desk</span>
          <p>Topic routes and global story movement</p>
        </div>
      ) : null}

      {contentReady ? <section className="pulse-lower">
        <div className="pulse-topics">
          <div className="pulse-section-head">
            <h2>Explore Topics</h2>
            <Link href="/stories">View all</Link>
          </div>
          <div className="pulse-topic-grid">
            {topics.map((topic, index) => {
              const Icon = topicIcons[index % topicIcons.length];
              return (
                <Link href={`/stories?topic=${encodeURIComponent(topic.label)}`} className={`pulse-topic ${index % 2 ? "is-orange" : "is-cyan"}`} key={topic.label}>
                  <Icon size={44} strokeWidth={1.8} />
                  <span><strong>{topic.label}</strong><small>{topic.count} updates</small></span>
                  <ChevronRight size={22} />
                </Link>
              );
            })}
          </div>
        </div>

        <div className="pulse-global">
          <div className="pulse-section-head">
            <h2>Global Watch</h2>
            <Link href="/stories">View all</Link>
          </div>
          <div className="pulse-global-body">
            <div className="pulse-city-list">
              {topics.map((topic, index) => (
                <Link href={`/stories?topic=${encodeURIComponent(topic.label)}`} className="pulse-city-row" key={topic.label}>
                  <span>{topic.label}</span>
                  <b className={index === 2 ? "is-cyan" : "is-orange"}>{index === 2 ? "UPDATING" : "LIVE"}</b>
                  <time>{formatClock(topic.latest)}</time>
                </Link>
              ))}
            </div>
            <div className="pulse-map" aria-hidden="true">
              <i className="pin-one" /><i className="pin-two" /><i className="pin-three" /><i className="pin-four" />
            </div>
          </div>
        </div>
      </section> : null}

      {contentReady ? (
        <div className="pulse-context-divider is-secondary" aria-label="Homepage signal modules">
          <span>Signal Desk</span>
          <p>Divergence leaders and source-level updates</p>
        </div>
      ) : null}

      {contentReady ? (
        <section className="pulse-expanded" aria-label="Expanded homepage coverage">
          <div className="pulse-divergence">
            <div className="pulse-section-head">
              <h2><span /> Divergence Watch</h2>
              <Link href="/stories">Open index</Link>
            </div>
            <div className="pulse-divergence-grid">
              {divergenceWatch.map((story, index) => (
                <Link href={`/story/${story.id}`} className="pulse-divergence-card" key={story.id}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <p><b>{homepageCategoryLabel(story)}</b><i />{story.sourceCount || story.articleCount} sources</p>
                    <h3>{compactStoryText(story.topic, 92)}</h3>
                  </div>
                  <PulseFdiBadge score={storyDivergence(story)} compact />
                </Link>
              ))}
            </div>
          </div>

          <div className="pulse-source-wire">
            <div className="pulse-section-head">
              <h2>Source Wire</h2>
              <Link href="/stories">View all</Link>
            </div>
            <div className="pulse-wire-list">
              {sourceWire.map((article) => (
                <Link href={article.storyClusterId ? `/story/${article.storyClusterId}` : `/stories?search=${encodeURIComponent(article.title)}`} className="pulse-wire-item" key={article.id}>
                  <time>{formatClock(article.publishedAt)}</time>
                  <strong>{article.source.name}</strong>
                  <p>{compactStoryText(article.title, 92)}</p>
                  <ChevronRight size={18} />
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <PulseFooter updatedAt={hero?.newestArticleAt ?? homepage?.latest?.[0]?.publishedAt} />

    </main>
  );
}

function LeadStory({ story, article, generatedHeadline }: { story: StoryCluster; article: LatestArticle | null; generatedHeadline: string | null }) {
  const label = homepageCategoryLabel(story);
  const displayHeadline = bestHeroHeadline(story, article, generatedHeadline);
  const deck = heroDeckSnippet(article?.summary || story.summary || `Latest coverage from ${article?.source.name || "tracked sources"} as this story develops.`);

  return (
    <Link href={`/story/${story.id}`} className="pulse-lead">
      <div className="pulse-lead-copy">
        <span className="pulse-chip">LIVE</span>
        <motion.h1
          initial={{ y: 18, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          style={heroHeadlineStyle(displayHeadline)}
          transition={{ duration: 0.42 }}
        >
          {displayHeadline}
        </motion.h1>
        <p className="pulse-meta"><b>{label}</b><span /><PulseRelativeTime value={story.newestArticleAt} /></p>
        <p className="pulse-deck"><span>{deck}</span><em>Read more</em></p>
        <div className="pulse-watch">
          <i><Play size={18} fill="currentColor" /></i>
          <strong>Watch Live</strong>
          <em />
          <b>{story.articleCount || story.sourceCount} updates</b>
        </div>
      </div>
      <div className="pulse-lead-image">
        <img src={storyImage(story)} alt="" />
        <span className="pulse-city">{label.slice(0, 10)}</span>
        <span className="pulse-image-live"><i /> LIVE</span>
        <PulseFdiBadge score={storyDivergence(story)} />
      </div>
    </Link>
  );
}

function StoryTile({ story, article }: { story: StoryCluster; article: LatestArticle | null }) {
  const headline = truncatePlainText(normalizeHeadline(article?.title || story.topic), 86, { headline: true });
  const timestamp = article?.publishedAt ?? story.newestArticleAt;
  const label = homepageCategoryLabel(story);

  return (
    <Link href={`/story/${story.id}`} className="pulse-story-card">
      <img src={storyImage(story)} alt="" />
      <div>
        <p><b>{label}</b><span />{article?.source.name || <PulseRelativeTime value={timestamp} />}</p>
        <h2>{headline}</h2>
      </div>
      <PulseFdiBadge score={storyDivergence(story)} compact />
    </Link>
  );
}

function bestHeroHeadline(story: StoryCluster, article: LatestArticle | null, generatedHeadline: string | null) {
  const candidates = [generatedHeadline, article?.title, story.topic];
  for (const candidate of candidates) {
    const headline = conciseHeroHeadline(candidate);
    if (headline) return headline;
  }

  return "Story Split Widens";
}

function conciseHeroHeadline(value: string | null | undefined) {
  const clean = normalizeHeadline(value, "")
    .replace(/^fracture\s+(is\s+)?(tracking|watching|monitoring|comparing|covering)\s+/i, "")
    .replace(/^latest coverage\s+(shows|from|on)\s+/i, "")
    .replace(/\s+\|\s+.+$/g, "")
    .replace(/\s+-\s+(AP|BBC|CNN|Fox News|NBC News|Reuters|The Associated Press)$/i, "")
    .trim();
  if (!clean) return "";

  const firstClause = clean.split(/\s[-:;]\s|,\s(?=(as|after|amid|while|with|but|and)\b)/i)[0]?.trim() || clean;
  const words = firstClause.split(/\s+/).filter(Boolean);
  const selected: string[] = [];

  for (const word of words) {
    const next = [...selected, word];
    if (next.length > HERO_HEADLINE_MAX_WORDS) break;
    if (next.join(" ").length > HERO_HEADLINE_MAX_CHARS && selected.length >= 3) break;
    selected.push(word);
  }

  const headline = removeHeroHeadlineDanglingTail(selected.join(" "));
  return headline ? toHeroTitleCase(headline) : "";
}

function removeHeroHeadlineDanglingTail(value: string) {
  return value
    .replace(/\s+\b(a|an|and|as|at|but|by|for|from|in|of|on|or|over|the|to|while|with)$/i, "")
    .replace(/[,:;-]+$/g, "")
    .trim();
}

function toHeroTitleCase(value: string) {
  const smallWords = new Set(["a", "an", "and", "as", "at", "but", "by", "for", "from", "in", "of", "on", "or", "over", "the", "to", "while", "with"]);
  return value.split(/\s+/).map((word, index) => {
    if (/^[A-Z0-9]{2,}$/.test(word)) return word;
    const lower = word.toLowerCase();
    if (index > 0 && smallWords.has(lower)) return lower;
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  }).join(" ");
}

function heroHeadlineStyle(headline: string): CSSProperties {
  const length = headline.length;
  const wordCount = headline.split(/\s+/).filter(Boolean).length;
  const size =
    length <= 54 && wordCount <= 8
      ? "clamp(34px, 2.85vw, 48px)"
      : length <= 78
        ? "clamp(32px, 2.65vw, 42px)"
        : length <= 108
          ? "clamp(30px, 2.45vw, 38px)"
          : "clamp(28px, 2.25vw, 34px)";
  const lineHeight = length > 78 ? "1.08" : "1.06";

  return {
    "--hero-headline-size": size,
    "--hero-headline-line": lineHeight,
  } as CSSProperties;
}

function heroDeckSnippet(value: string | null | undefined) {
  const clean = normalizeSummary(value);
  if (!clean) return "Live coverage is developing across tracked sources.";
  return truncatePlainText(clean, 150, { sentence: true });
}

function HomepageSkeleton() {
  return (
    <>
      <section className="pulse-dashboard pulse-home-skeleton" aria-label="Loading homepage stories" aria-busy="true">
        <div className="pulse-main-column">
          <div className="pulse-skeleton-lead">
            <div className="pulse-skel-copy">
              <span className="pulse-skel-chip" />
              <span className="pulse-skel-line is-xl" />
              <span className="pulse-skel-line is-xl short" />
              <span className="pulse-skel-line" />
              <span className="pulse-skel-line narrow" />
              <span className="pulse-skel-actions" />
            </div>
            <div className="pulse-skel-media" />
          </div>
          <div className="pulse-story-grid">
            {Array.from({ length: 4 }).map((_, index) => (
              <div className="pulse-card-skeleton" key={index}>
                <span />
                <i />
                <b />
              </div>
            ))}
          </div>
        </div>
        <aside className="pulse-updates pulse-rail-skeleton">
          <div className="pulse-section-head"><h2><span /> Live Updates</h2></div>
          {Array.from({ length: 5 }).map((_, index) => <div className="pulse-update-skeleton" key={index} />)}
          <div className="pulse-live-blog pulse-live-blog-skeleton" />
        </aside>
      </section>
      <section className="pulse-timeline pulse-timeline-skeleton" aria-hidden="true">
        <div className="pulse-timeline-label">LIVE<br />TIMELINE</div>
        <div className="pulse-timeline-track">
          {Array.from({ length: 5 }).map((_, index) => <div className="pulse-time-skeleton" key={index} />)}
        </div>
      </section>
      <section className="pulse-lower pulse-lower-skeleton" aria-hidden="true">
        <div className="pulse-topics">
          <div className="pulse-section-head"><h2>Explore Topics</h2></div>
          <div className="pulse-topic-grid">
            {Array.from({ length: 4 }).map((_, index) => <div className="pulse-topic-skeleton" key={index} />)}
          </div>
        </div>
        <div className="pulse-global">
          <div className="pulse-section-head"><h2>Global Watch</h2></div>
          <div className="pulse-global-skeleton" />
        </div>
      </section>
      <div className="pulse-context-divider pulse-divider-skeleton" aria-hidden="true">
        <span />
        <p />
      </div>
      <section className="pulse-expanded pulse-expanded-skeleton" aria-hidden="true">
        <div className="pulse-divergence">
          <div className="pulse-section-head"><h2><span /> Divergence Watch</h2></div>
          <div className="pulse-divergence-grid">
            {Array.from({ length: 4 }).map((_, index) => <div className="pulse-divergence-skeleton" key={index} />)}
          </div>
        </div>
        <div className="pulse-source-wire">
          <div className="pulse-section-head"><h2>Source Wire</h2></div>
          <div className="pulse-wire-list">
            {Array.from({ length: 4 }).map((_, index) => <div className="pulse-wire-skeleton" key={index} />)}
          </div>
        </div>
      </section>
    </>
  );
}

function EmptyState() {
  return (
    <div className="pulse-empty">
      <span>NO LIVE CLUSTERS</span>
      <h1>Fracture is indexing live coverage.</h1>
      <p>Stories will appear as soon as the backend returns active clusters.</p>
      <Link href="/stories">Open story search</Link>
    </div>
  );
}

function buildStoryPool(trending: StoryCluster[], fractured: StoryCluster | null | undefined, allStories: StoryCluster[], hero: StoryCluster | null) {
  const pool = [...trending, ...(fractured ? [fractured] : []), ...allStories].filter((story) => story.id !== hero?.id);
  return Array.from(new Map(pool.map((story) => [story.id, story])).values()).slice(0, 24);
}

function buildLiveItems(latest: LatestArticle[], stories: StoryCluster[], hero: StoryCluster | null, limit = 5) {
  const articleItems = latest.map((article) => ({
    label: article.source.name,
    title: article.title,
    time: formatClock(article.publishedAt),
    href: article.storyClusterId ? `/story/${article.storyClusterId}` : `/stories?search=${encodeURIComponent(article.title)}`,
  }));
  const storyItems = [hero, ...stories].filter(Boolean).map((story) => ({
    label: homepageCategoryLabel(story!),
    title: story!.topic,
    time: formatClock(story!.newestArticleAt),
    href: `/story/${story!.id}`,
  }));
  return [...articleItems, ...storyItems].slice(0, limit);
}

function buildTimeline(latest: LatestArticle[], stories: StoryCluster[], hero: StoryCluster | null) {
  return buildLiveItems(latest, stories, hero, 14);
}

function buildTopics(stories: StoryCluster[]) {
  const map = new Map<string, { label: string; count: number; latest: string | null }>();
  stories.forEach((story) => {
    const label = homepageCategoryLabel(story);
    const existing = map.get(label);
    const count = story.articleCount || story.sourceCount || 1;
    if (!existing) map.set(label, { label, count, latest: story.newestArticleAt });
    else {
      existing.count += count;
      if (story.newestArticleAt && (!existing.latest || new Date(story.newestArticleAt) > new Date(existing.latest))) existing.latest = story.newestArticleAt;
    }
  });
  return Array.from(map.values()).sort((a, b) => b.count - a.count).slice(0, 4);
}

function buildDivergenceWatch(stories: StoryCluster[]) {
  return Array.from(new Map(stories.map((story) => [story.id, story])).values())
    .sort((a, b) => storyDivergence(b) - storyDivergence(a))
    .slice(0, 4);
}

function homepageCategoryLabel(story: StoryCluster) {
  const base = categoryLabel(story.topicCategory);
  const text = `${story.topic} ${(story.topicKeywords ?? []).join(" ")}`.toLowerCase();
  const inferred = inferHomepageCategory(text);

  if (inferred && ["World", "Politics", "Policy"].includes(base)) return inferred;
  return inferred ?? base;
}

function inferHomepageCategory(text: string) {
  if (/\b(ai|artificial intelligence|chip|semiconductor|software|cyber|cloud|data|privacy|tech|technology)\b/.test(text)) return "Tech";
  if (/\b(market|markets|stock|stocks|inflation|recession|fed|rate|rates|trade|tariff|economy|economic|finance|bank|jobs|labor|supply chain|oil|crypto|bitcoin)\b/.test(text)) return "Business";
  if (/\b(election|elections|campaign|ballot|primary|voter|voting|poll|polls|candidate|candidates)\b/.test(text)) return "Elections";
  if (/\b(climate|energy|environment|weather|epa|emissions|wildfire|storm|storms)\b/.test(text)) return "Climate";
  if (/\b(health|medicine|hospital|virus|disease|public health|medicaid|medicare|vaccine|vaccines)\b/.test(text)) return "Health";
  if (/\b(war|strike|strikes|military|attack|attacks|bomb|missile|invasion|troops|combat|airstrike|ceasefire|hostage|terrorism|nato|pentagon|defense|nuclear|sanctions|escalation|retaliation|ukraine|russia|gaza|israel|hamas|iran)\b/.test(text)) return "Conflict";
  if (/\b(geopolitic|geopolitics|superpower|alliance|sovereignty|territory|occupation|arms deal|espionage|diplomat|diplomatic|summit|g7|g20|brics)\b/.test(text)) return "Geopolitics";
  if (/\b(policy|regulation|regulations|executive order|bill|law|court|reform|mandate|budget|funding|congress|senate|house)\b/.test(text)) return "Policy";
  if (/\b(sport|sports|league|team|game|tournament|match|season)\b/.test(text)) return "Sports";
  return null;
}

const styles = `
.pulse-home { --chalk:#FCFCF8; --night:#101114; --orange:#FF5A1F; --cyan:#14B8C8; --warm:#D9D4CC; --line:rgba(16,17,20,.18); --muted:#6F706F; min-height:100vh; background:var(--chalk); color:var(--night); font-family:Inter,"Public Sans",Arial,sans-serif; letter-spacing:0; }
.pulse-home *,.pulse-home *::before,.pulse-home *::after{box-sizing:border-box}.pulse-home a{color:inherit;text-decoration:none}.pulse-home button{color:inherit;font:inherit}
${pulseChromeStyles}
.pulse-dashboard{display:grid;grid-template-columns:minmax(0,1fr) 388px;gap:18px;padding:8px 20px 18px}.pulse-main-column{min-width:0}.pulse-lead{height:364px;display:grid;grid-template-columns:47% 53%;background:var(--night);color:white;overflow:hidden}.pulse-lead-copy{height:364px;padding:28px 24px 22px;display:flex;flex-direction:column;justify-content:flex-start;gap:clamp(9px,1vw,12px);min-width:0;overflow:hidden}.pulse-chip,.pulse-image-live{align-self:flex-start;display:inline-flex;align-items:center;gap:7px;background:var(--orange);color:white;font-size:15px;line-height:1;font-weight:950;padding:9px 10px;flex:0 0 auto}.pulse-lead h1{max-width:100%;display:block;overflow:visible;color:white;-webkit-text-fill-color:white;font-family:Inter,"Public Sans",Arial,sans-serif;font-size:var(--hero-headline-size,clamp(36px,3.05vw,50px));line-height:var(--hero-headline-line,1.06);font-weight:1000;font-variation-settings:"wght" 1000;-webkit-font-smoothing:antialiased;text-rendering:geometricPrecision;letter-spacing:-.052em;margin:0;flex:0 0 auto}.pulse-meta,.pulse-story-card p{display:flex;align-items:center;gap:9px;margin:0;color:rgba(255,255,255,.82);font-size:15px;flex:0 0 auto}.pulse-meta b,.pulse-story-card b,.pulse-update b{color:var(--cyan);text-transform:uppercase;font-size:12px;font-weight:950}.pulse-meta span,.pulse-story-card p span{width:3px;height:3px;border-radius:999px;background:currentColor}.pulse-deck{max-width:540px;margin:0;color:rgba(255,255,255,.9);font-size:18px;line-height:1.3;display:block;flex:0 0 auto}.pulse-deck span{display:inline}.pulse-deck em{display:inline-flex;align-items:center;margin-left:10px;color:var(--orange);font-size:12px;line-height:1;font-style:normal;font-weight:950;text-transform:uppercase;white-space:nowrap}.pulse-deck em::after{content:"";width:22px;height:1px;margin-left:7px;background:currentColor}.pulse-watch{display:flex;align-items:center;gap:12px;margin-top:2px;font-size:15px;flex:0 0 auto}.pulse-watch i{width:34px;height:34px;border-radius:999px;display:grid;place-items:center;background:white;color:var(--night);font-style:normal}.pulse-watch em{width:1px;height:24px;background:rgba(255,255,255,.42)}.pulse-watch b{color:var(--orange)}
.pulse-lead-image{position:relative;height:364px;background:#171717;overflow:hidden}.pulse-lead-image img,.pulse-story-card img{width:100%;height:100%;object-fit:cover;display:block;filter:saturate(.9) contrast(1.08);transition:transform 260ms ease}.pulse-lead:hover img,.pulse-story-card:hover img{transform:scale(1.035)}.pulse-lead-image::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(16,17,20,.35),transparent 35%,rgba(16,17,20,.22));pointer-events:none}.pulse-lead-image .pulse-fdi-badge{position:absolute;left:18px;bottom:18px;z-index:1;box-shadow:5px 5px 0 var(--orange)}.pulse-city{position:absolute;top:21px;right:130px;z-index:1;color:white;font-size:22px;font-weight:950;letter-spacing:.08em;text-transform:uppercase}.pulse-image-live{position:absolute;top:18px;right:22px;z-index:1}.pulse-image-live i{width:10px;height:10px;border-radius:999px;background:currentColor;animation:pulseBlink 1.65s ease-in-out infinite}
.pulse-story-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:18px;margin-top:12px}.pulse-story-card{position:relative;height:202px;border:1px solid var(--line);background:white;display:grid;grid-template-rows:90px 112px;overflow:hidden}.pulse-story-card>img{height:90px;min-height:90px}.pulse-story-card div{min-height:112px;padding:13px 10px 15px;background:white;min-width:0;z-index:1}.pulse-story-card p{color:var(--night);gap:8px;font-size:12px}.pulse-story-card h2{color:var(--night);font-size:18px;line-height:1.08;font-weight:950;letter-spacing:-.03em;display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden}.pulse-story-card>.pulse-fdi-badge{position:absolute;right:8px;top:8px;z-index:2;box-shadow:4px 4px 0 rgba(255,90,31,.9)}
.pulse-updates,.pulse-topics,.pulse-global{border:1px solid var(--line);background:rgba(255,255,255,.48)}.pulse-updates{padding:16px 14px 14px}.pulse-section-head{display:flex;align-items:center;justify-content:space-between;gap:18px;margin-bottom:14px}.pulse-section-head h2{display:inline-flex;align-items:center;gap:12px;margin:0;font-size:16px;line-height:1;font-weight:950;text-transform:uppercase}.pulse-section-head h2 span{width:10px;height:10px;border:2px solid var(--orange);border-radius:999px}.pulse-section-head a{color:var(--orange);font-size:14px;font-weight:800}.pulse-update-list{position:relative;padding:0 0 0 9px}.pulse-update-list::before{content:"";position:absolute;top:18px;bottom:18px;left:11px;width:1px;background:var(--line)}.pulse-update{position:relative;display:grid;grid-template-columns:72px 1fr 18px;gap:10px;min-height:76px;padding:1px 0 14px 20px;transition:transform 160ms ease}.pulse-update:hover{transform:translateX(3px)}.pulse-update::before{content:"";position:absolute;left:-3px;top:7px;width:10px;height:10px;border-radius:999px;background:var(--orange);z-index:1}.pulse-update.is-cyan::before{background:var(--cyan)}.pulse-update time,.pulse-city-row time,.pulse-time-node time{font-family:"Geist Mono","IBM Plex Mono",ui-monospace,SFMono-Regular,monospace}.pulse-update p{margin:4px 0 0;font-size:15px;line-height:1.14}.pulse-update>span{border:1px solid rgba(16,17,20,.3);height:18px}.pulse-live-blog{height:45px;margin-top:7px;padding:0 10px 0 14px;border:1px solid var(--line);display:grid;grid-template-columns:1fr auto auto;align-items:center;gap:12px;font-size:16px}.pulse-live-blog span{display:inline-flex;align-items:center;gap:9px}.pulse-live-blog i{width:10px;height:10px;border-radius:999px;background:var(--orange)}
.pulse-timeline{margin:0 20px 18px;min-height:72px;border:1px solid var(--line);display:grid;grid-template-columns:92px minmax(0,1fr);background:rgba(255,255,255,.36);overflow:hidden}.pulse-timeline-label{position:relative;z-index:2;display:grid;place-items:center;background:var(--orange);color:white;font-size:16px;line-height:1.04;font-weight:950}.pulse-timeline-label::after{content:"";position:absolute;right:-14px;top:50%;transform:translateY(-50%);border-top:14px solid transparent;border-bottom:14px solid transparent;border-left:14px solid var(--orange)}.pulse-timeline-track{display:flex;align-items:stretch;min-width:0;overflow-x:auto;overscroll-behavior-x:contain;scroll-snap-type:x proximity;padding-left:44px;scrollbar-width:thin;scrollbar-color:var(--orange) rgba(16,17,20,.08)}.pulse-timeline-track::-webkit-scrollbar{height:8px}.pulse-timeline-track::-webkit-scrollbar-track{background:rgba(16,17,20,.08)}.pulse-timeline-track::-webkit-scrollbar-thumb{background:var(--orange)}.pulse-time-node{position:relative;flex:0 0 184px;scroll-snap-align:start;padding:11px 12px 8px;border-left:1px solid var(--line);font-size:13px}.pulse-time-node span{position:absolute;top:-5px;left:-5px;width:10px;height:10px;border-radius:999px;background:var(--cyan)}.pulse-time-node.is-orange span{background:var(--orange)}.pulse-time-node time{font-weight:800}.pulse-time-node p{margin:4px 0 0;max-width:142px;line-height:1.18}
.pulse-context-divider{min-height:54px;margin:0 20px 14px;border-top:3px solid var(--night);border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;gap:18px;background:linear-gradient(90deg,rgba(255,90,31,.08),rgba(255,255,255,.22));padding:0 12px}.pulse-context-divider span{display:inline-flex;align-items:center;gap:9px;color:var(--night);font-size:18px;font-weight:1000;letter-spacing:-.035em;text-transform:uppercase}.pulse-context-divider span::before{content:"";width:10px;height:10px;border:2px solid var(--orange);border-radius:999px}.pulse-context-divider p{margin:0;color:var(--muted);font-size:13px;font-weight:850;text-transform:uppercase}.pulse-context-divider.is-secondary{margin-top:4px;background:linear-gradient(90deg,rgba(20,184,200,.08),rgba(255,255,255,.22))}.pulse-context-divider.is-secondary span::before{border-color:var(--cyan)}
.pulse-lower{display:grid;grid-template-columns:minmax(0,1fr) 38.6%;gap:18px;padding:0 20px 12px}.pulse-topics,.pulse-global{padding:15px 12px 10px}.pulse-topic-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}.pulse-topic{min-height:103px;border:1px solid var(--line);background:white;padding:18px;display:grid;grid-template-columns:54px 1fr auto;align-items:center;gap:14px;transition:border-color 160ms ease,transform 160ms ease}.pulse-topic:hover{border-color:var(--night);transform:translateY(-2px)}.pulse-topic.is-cyan svg{color:var(--cyan)}.pulse-topic.is-orange svg{color:var(--orange)}.pulse-topic strong,.pulse-topic small{display:block}.pulse-topic strong{font-size:18px;font-weight:950}.pulse-topic small{margin-top:4px;color:var(--night);font-size:14px}.pulse-global-body{display:grid;grid-template-columns:250px minmax(0,1fr);gap:18px;align-items:center}.pulse-city-list{display:grid;gap:7px}.pulse-city-row{display:grid;grid-template-columns:1fr auto 46px;align-items:center;gap:12px;font-size:14px}.pulse-city-row span{font-weight:800}.pulse-city-row b{border-radius:999px;padding:3px 7px;color:white;font-size:9px;line-height:1;font-weight:950}.pulse-city-row b.is-orange{background:var(--orange)}.pulse-city-row b.is-cyan{background:var(--cyan)}.pulse-map{position:relative;height:105px;opacity:.86;background-image:radial-gradient(circle,rgba(16,17,20,.3) 1.15px,transparent 1.3px);background-size:7px 7px;clip-path:polygon(2% 41%,15% 25%,32% 29%,44% 18%,54% 34%,68% 25%,86% 33%,98% 48%,88% 70%,68% 62%,56% 77%,40% 67%,28% 79%,14% 65%)}.pulse-map i{position:absolute;width:8px;height:8px;border-radius:999px;background:var(--orange)}.pin-one{left:33%;top:47%}.pin-two{left:54%;top:28%}.pin-three{left:69%;top:43%;background:var(--cyan)!important}.pin-four{left:84%;top:37%;background:var(--cyan)!important}
.pulse-expanded{display:grid;grid-template-columns:minmax(0,1fr) 38.6%;gap:18px;padding:0 20px 20px}.pulse-divergence,.pulse-source-wire{border:1px solid var(--line);background:rgba(255,255,255,.48);padding:15px 12px}.pulse-divergence-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.pulse-divergence-card{min-height:170px;border:1px solid var(--line);background:white;padding:14px;display:grid;grid-template-rows:auto 1fr auto;gap:12px;position:relative;transition:border-color 160ms ease,transform 160ms ease}.pulse-divergence-card:hover{border-color:var(--night);transform:translateY(-2px)}.pulse-divergence-card>span{color:var(--orange);font-family:"Geist Mono","IBM Plex Mono",ui-monospace,monospace;font-size:12px;font-weight:950}.pulse-divergence-card p{display:flex;align-items:center;gap:8px;margin:0;color:var(--night);font-size:12px;font-weight:850}.pulse-divergence-card p b{color:var(--cyan);font-size:11px;font-weight:950;text-transform:uppercase}.pulse-divergence-card p i{width:3px;height:3px;border-radius:999px;background:currentColor}.pulse-divergence-card h3{margin:9px 0 0;color:var(--night);font-size:20px;line-height:1.02;font-weight:1000;letter-spacing:-.04em}.pulse-divergence-card .pulse-fdi-badge{justify-self:start}.pulse-wire-list{display:grid;gap:1px;background:var(--line)}.pulse-wire-item{min-height:58px;background:white;display:grid;grid-template-columns:54px 84px minmax(0,1fr) 22px;align-items:center;gap:10px;padding:10px 11px;transition:background 160ms ease,transform 160ms ease}.pulse-wire-item:hover{background:var(--chalk);transform:translateX(2px)}.pulse-wire-item time{font-family:"Geist Mono","IBM Plex Mono",ui-monospace,monospace;font-size:11px;font-weight:850}.pulse-wire-item strong{color:var(--cyan);font-size:11px;font-weight:950;text-transform:uppercase;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.pulse-wire-item p{margin:0;color:var(--night);font-size:14px;line-height:1.18;font-weight:850}.pulse-wire-item svg{color:var(--orange)}.pulse-skeleton-lead,.pulse-card-skeleton,.pulse-update-skeleton,.pulse-live-blog-skeleton,.pulse-time-skeleton,.pulse-topic-skeleton,.pulse-global-skeleton,.pulse-divergence-skeleton,.pulse-wire-skeleton,.pulse-divider-skeleton span,.pulse-divider-skeleton p,.pulse-skel-line,.pulse-skel-chip,.pulse-skel-actions{background:linear-gradient(90deg,#fff,var(--warm),#fff);background-size:200% 100%;animation:skeleton 1.35s ease-in-out infinite}.pulse-skeleton-lead{min-height:364px;display:grid;grid-template-columns:47% 53%;background:var(--night);overflow:hidden}.pulse-skel-copy{padding:24px;display:flex;flex-direction:column;justify-content:center;gap:14px}.pulse-skel-media{background:linear-gradient(90deg,rgba(252,252,248,.1),rgba(217,212,204,.52),rgba(252,252,248,.08));background-size:200% 100%;animation:skeleton 1.35s ease-in-out infinite}.pulse-skel-chip{width:52px;height:29px}.pulse-skel-line{display:block;width:78%;height:18px}.pulse-skel-line.is-xl{height:52px;width:92%}.pulse-skel-line.short{width:74%}.pulse-skel-line.narrow{width:58%}.pulse-skel-actions{width:172px;height:36px;margin-top:8px}.pulse-card-skeleton{min-height:202px;border:1px solid var(--line);background:white;display:grid;grid-template-rows:90px 1fr;padding:0}.pulse-card-skeleton span{display:block;background:linear-gradient(90deg,#f8f8f4,var(--warm),#f8f8f4);background-size:200% 100%;animation:skeleton 1.35s ease-in-out infinite}.pulse-card-skeleton i,.pulse-card-skeleton b{display:block;margin:13px 10px 0;height:10px;background:var(--warm);opacity:.9}.pulse-card-skeleton b{width:76%;height:18px}.pulse-card-skeleton i{width:44%}.pulse-rail-skeleton .pulse-section-head{margin-bottom:18px}.pulse-update-skeleton{height:62px;margin:0 0 14px 20px;border-left:1px solid var(--line)}.pulse-live-blog-skeleton{border-color:var(--line);background:linear-gradient(90deg,#fff,var(--warm),#fff);background-size:200% 100%}.pulse-timeline-skeleton .pulse-timeline-track{grid-template-columns:repeat(5,minmax(120px,1fr))}.pulse-time-skeleton{min-height:72px;border-left:1px solid var(--line);background:linear-gradient(90deg,#fff,var(--warm),#fff);background-size:200% 100%;animation:skeleton 1.35s ease-in-out infinite}.pulse-topic-skeleton{min-height:103px;border:1px solid var(--line);background:linear-gradient(90deg,#fff,var(--warm),#fff);background-size:200% 100%;animation:skeleton 1.35s ease-in-out infinite}.pulse-global-skeleton{height:105px;border:1px solid var(--line);background-image:radial-gradient(circle,rgba(16,17,20,.18) 1.15px,transparent 1.3px),linear-gradient(90deg,#fff,var(--warm),#fff);background-size:7px 7px,200% 100%;animation:skeleton 1.35s ease-in-out infinite}.pulse-divergence-skeleton{min-height:170px;border:1px solid var(--line)}.pulse-wire-skeleton{height:58px;background:linear-gradient(90deg,#fff,var(--warm),#fff);background-size:200% 100%;animation:skeleton 1.35s ease-in-out infinite}.pulse-divider-skeleton span{width:150px;height:18px}.pulse-divider-skeleton p{width:230px;height:13px}.pulse-empty{min-height:364px;border:1px solid var(--night);background:white;display:grid;place-content:center;justify-items:start;padding:34px}.pulse-empty span{color:var(--orange);font-size:12px;font-weight:950;letter-spacing:.12em}.pulse-empty h1{max-width:640px;margin:10px 0 8px;font-size:clamp(42px,5vw,70px);line-height:.92;font-weight:1000;letter-spacing:-.055em}.pulse-empty p{max-width:480px;margin:0 0 22px;color:var(--muted);font-size:18px}.pulse-empty a{border:1px solid var(--night);background:var(--night);color:white;padding:12px 14px;font-weight:950}@keyframes skeleton{to{background-position:-200% 0}}
@media(max-width:1180px){.pulse-dashboard,.pulse-lower,.pulse-expanded{grid-template-columns:1fr}.pulse-tabs p{margin-right:0}.pulse-topic-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:780px){.pulse-tabs{align-items:start;flex-direction:column;padding:14px 16px 0}.pulse-tab-list{width:100%;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}.pulse-tabs a{font-size:16px}.pulse-dashboard{padding:10px 16px 16px}.pulse-lead,.pulse-skeleton-lead{height:auto;grid-template-columns:1fr}.pulse-lead-copy{height:auto;min-height:352px;order:2;padding-top:28px}.pulse-lead-image{order:1}.pulse-skel-copy{min-height:300px;order:2}.pulse-skel-media{order:1}.pulse-lead h1{font-size:min(var(--hero-headline-size,40px),40px);line-height:1.08}.pulse-lead-image,.pulse-skel-media{height:245px;min-height:245px}.pulse-city{right:auto;left:18px}.pulse-story-grid,.pulse-topic-grid,.pulse-global-body,.pulse-divergence-grid{grid-template-columns:1fr}.pulse-wire-item{grid-template-columns:50px minmax(0,1fr) 20px}.pulse-wire-item strong{display:none}.pulse-timeline{margin-inline:16px;grid-template-columns:1fr}.pulse-timeline-label{min-height:48px}.pulse-timeline-label::after{display:none}.pulse-timeline-track,.pulse-timeline-skeleton .pulse-timeline-track{grid-template-columns:1fr;padding-left:20px}.pulse-time-node,.pulse-time-skeleton{min-height:66px}.pulse-lower,.pulse-expanded{padding-inline:16px}}
@media(max-width:520px){.pulse-home{overflow-x:hidden}.pulse-tabs{gap:10px;padding:12px 12px 0}.pulse-tab-list{overflow-x:auto;justify-content:flex-start;padding-bottom:1px;scrollbar-width:none}.pulse-tab-list::-webkit-scrollbar{display:none}.pulse-tabs a{flex:0 0 auto;font-size:15px}.pulse-tabs p{font-size:13px;white-space:normal}.pulse-dashboard{padding:10px 12px 14px;gap:14px}.pulse-lead-copy{min-height:0;padding:18px;justify-content:flex-start}.pulse-skel-copy{min-height:218px}.pulse-chip,.pulse-image-live{font-size:13px;padding:8px 9px}.pulse-lead h1{font-size:min(var(--hero-headline-size,36px),36px);line-height:1.08}.pulse-meta{font-size:13px}.pulse-deck{font-size:17px;line-height:1.32;-webkit-line-clamp:3}.pulse-watch{flex-wrap:wrap;gap:10px;margin-top:2px}.pulse-lead-image,.pulse-skel-media{height:230px;min-height:230px}.pulse-city{top:16px;left:16px;max-width:calc(100% - 122px);font-size:16px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.pulse-image-live{right:14px;top:14px}.pulse-lead-image .pulse-fdi-badge{left:14px;bottom:14px}.pulse-story-grid{gap:12px}.pulse-story-card{height:218px;grid-template-rows:96px 122px}.pulse-story-card>img{height:96px;min-height:96px}.pulse-story-card div{min-height:122px;padding:12px 10px 14px}.pulse-story-card h2{font-size:17px;-webkit-line-clamp:4}.pulse-story-card>.pulse-fdi-badge{right:7px;top:7px}.pulse-update{grid-template-columns:62px minmax(0,1fr);padding-right:0}.pulse-update>span{display:none}.pulse-update p{font-size:14px}.pulse-live-blog{grid-template-columns:1fr auto auto}.pulse-timeline{margin-inline:12px}.pulse-timeline-track,.pulse-timeline-skeleton .pulse-timeline-track{padding-left:12px}.pulse-lower,.pulse-expanded{gap:14px;padding-inline:12px}.pulse-topics,.pulse-global,.pulse-divergence,.pulse-source-wire{padding:13px 10px}.pulse-topic{min-height:94px;grid-template-columns:44px minmax(0,1fr) auto;padding:14px;gap:10px}.pulse-topic svg{width:36px;height:36px}.pulse-global-body{gap:12px}.pulse-city-row{grid-template-columns:minmax(0,1fr) auto 42px;gap:8px}.pulse-city-row span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.pulse-map{height:92px}.pulse-divergence-card{min-height:150px}.pulse-divergence-card h3{font-size:19px}.pulse-wire-item{min-height:64px}}
.pulse-timeline-skeleton .pulse-timeline-track{display:flex}.pulse-time-skeleton{flex:0 0 184px}@media(max-width:780px){.pulse-timeline-track,.pulse-timeline-skeleton .pulse-timeline-track{grid-template-columns:none}.pulse-time-node,.pulse-time-skeleton{flex-basis:176px}}
`;
