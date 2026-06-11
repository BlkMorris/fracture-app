"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowUpRight,
  CircleUser,
  Moon,
  Search,
  SlidersHorizontal,
  Sparkles,
  Sun,
} from "lucide-react";

type Topic = "All" | "Politics" | "Tech" | "Business" | "World" | "Sports";

type Story = {
  id: string;
  topic: Exclude<Topic, "All">;
  title: string;
  summary: string;
  fdi: number;
  sources: number;
  updated: string;
  image: string;
  imageAlt: string;
  spectrum: string;
};

type Outlet = {
  name: string;
  logo: string;
  category: string;
  span: string;
  position: number;
  divergence: number;
  frequency: string;
  sample: string;
  headline: string;
};

export const stories: Story[] = [
  {
    id: "climate-finance",
    topic: "World",
    title: "Climate finance talks stall as summit deadline closes in",
    summary:
      "Coverage agrees the talks are under pressure, but sharply diverges on whether the central issue is historical obligation, fiscal caution, or diplomatic process.",
    fdi: 84,
    sources: 31,
    updated: "12 mins ago",
    image: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80",
    imageAlt: "Delegates walking outside a glass conference building",
    spectrum: "Accountability ← Finance Frame → Cost",
  },
  {
    id: "ai-lab-energy",
    topic: "Tech",
    title: "New AI lab energy pact draws praise and grid reliability concerns",
    summary:
      "Some outlets frame the deal as infrastructure leadership while others focus on ratepayer exposure and local oversight.",
    fdi: 63,
    sources: 24,
    updated: "28 mins ago",
    image: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80",
    imageAlt: "Circuit board detail with cool light",
    spectrum: "Innovation ← Infrastructure Frame → Risk",
  },
  {
    id: "fed-rate",
    topic: "Business",
    title: "Fed signals patience as markets debate whether inflation has cooled enough",
    summary:
      "Financial outlets emphasize timing and yield curves, while general news coverage splits over household cost pressure.",
    fdi: 48,
    sources: 19,
    updated: "43 mins ago",
    image: "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=1200&q=80",
    imageAlt: "People in a financial office reviewing charts",
    spectrum: "Consumer Pain ← Economy Frame → Market Signal",
  },
  {
    id: "border-bill",
    topic: "Politics",
    title: "Border bill negotiations reopen after competing enforcement proposals",
    summary:
      "The widest split is over whether the package represents overdue control, an election-year maneuver, or a humanitarian compromise.",
    fdi: 79,
    sources: 37,
    updated: "1 hr ago",
    image: "https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=1200&q=80",
    imageAlt: "A government building at dusk",
    spectrum: "Humanitarian ← Immigration Frame → Enforcement",
  },
  {
    id: "antitrust",
    topic: "Tech",
    title: "Antitrust case against app marketplace heads into remedy phase",
    summary:
      "Business coverage centers investor risk, while policy writers emphasize consumer choice and developer leverage.",
    fdi: 57,
    sources: 22,
    updated: "2 hrs ago",
    image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80",
    imageAlt: "Laptop with application windows on a desk",
    spectrum: "Consumer Choice ← Tech Frame → Investor Risk",
  },
  {
    id: "finals-arena",
    topic: "Sports",
    title: "Championship series shifts after late injury changes both teams' rotations",
    summary:
      "Beat writers focus on tactical adjustments; national shows push legacy narratives and officiating debate.",
    fdi: 32,
    sources: 16,
    updated: "3 hrs ago",
    image: "https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=1200&q=80",
    imageAlt: "Basketball court under arena lights",
    spectrum: "Tactics ← Sports Frame → Legacy",
  },
];

export const outlets: Outlet[] = [
  {
    name: "Reuters",
    logo: "R",
    category: "Wire",
    span: "Global / hourly",
    position: 48,
    divergence: 22,
    frequency: "182 stories / week",
    sample: "Negotiators race to close funding gap before summit",
    headline: "Climate finance talks enter final stretch with gaps unresolved",
  },
  {
    name: "The Guardian",
    logo: "G",
    category: "International",
    span: "Policy / climate",
    position: 18,
    divergence: 71,
    frequency: "86 stories / week",
    sample: "Rich nations accused of stalling climate finance deal",
    headline: "Wealthy nations under fire as finance pledge stalls",
  },
  {
    name: "Financial Times",
    logo: "FT",
    category: "Business",
    span: "Markets / policy",
    position: 55,
    divergence: 38,
    frequency: "74 stories / week",
    sample: "Funding package faces pressure from donor budgets",
    headline: "Climate funding talks strained by budget and debt concerns",
  },
  {
    name: "NPR",
    logo: "N",
    category: "Public radio",
    span: "US / public affairs",
    position: 42,
    divergence: 34,
    frequency: "69 stories / week",
    sample: "Climate talks are stuck. Here's what negotiators still need to resolve.",
    headline: "Climate finance negotiators look for compromise as clock runs down",
  },
  {
    name: "Wall Street Journal",
    logo: "WSJ",
    category: "Business",
    span: "Economy / politics",
    position: 72,
    divergence: 66,
    frequency: "91 stories / week",
    sample: "Climate pledges run into oversight and taxpayer concerns",
    headline: "Climate finance plan faces questions over cost and accountability",
  },
  {
    name: "Fox News",
    logo: "F",
    category: "National",
    span: "US / politics",
    position: 86,
    divergence: 82,
    frequency: "114 stories / week",
    sample: "Taxpayers face new climate bill as summit pressure builds",
    headline: "Summit pressure mounts for costly climate commitments",
  },
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

export function MockupFrame({
  children,
  page = "home",
  topic,
  onTopicChange,
}: {
  children: React.ReactNode;
  page?: "home" | "stories" | "story";
  topic: Topic;
  onTopicChange: (topic: Topic) => void;
}) {
  const [dark, setDark] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const topics: Topic[] = ["Politics", "Tech", "Business", "World", "Sports"];

  return (
    <div className={`fx ${dark ? "fx-dark" : ""}`}>
      <nav className="fx-nav" aria-label="Fracture mockup navigation">
        <Link href="/mockups" className="fx-logo" aria-label="Fracture mockups home">
          <span>F</span>
          Fracture
        </Link>

        <div className="fx-nav-row">
          <div className="fx-links" aria-label="Primary sections">
            <Link href="/mockups" className={page === "home" ? "active" : ""}>Home</Link>
            <Link href="/mockups/stories" className={page === "stories" ? "active" : ""}>Stories</Link>
            <a href="#sources">Sources</a>
          </div>

          <div className="fx-topic-nav" role="tablist" aria-label="Filter by topic">
            {topics.map((item) => (
              <button key={item} type="button" className={topic === item ? "active" : ""} onClick={() => onTopicChange(item)}>
                {item}
              </button>
            ))}
          </div>

          <div className="fx-nav-actions">
            <div className={`fx-search-shell ${searchOpen ? "open" : ""}`}>
              <button
                className="fx-icon-control"
                type="button"
                aria-label="Search stories, topics, outlets"
                aria-expanded={searchOpen}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => setSearchOpen((value) => !value)}
              >
                <Search size={15} />
              </button>
              <input aria-label="Search stories, topics, outlets" placeholder="Search stories" tabIndex={searchOpen ? 0 : -1} />
            </div>
            <button className="fx-icon-control" type="button" onClick={() => setDark((value) => !value)} aria-label="Toggle dark mode">
              {dark ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            <button className="fx-icon-control" type="button" aria-label="Open user menu">
              <CircleUser size={16} />
            </button>
          </div>
        </div>
      </nav>
      {children}
      <FractureFooter />
      <style jsx global>{styles}</style>
    </div>
  );
}

function FractureFooter() {
  const footerGroups = [
    { title: "Explore", links: ["Browse stories", "Search", "Topics"] },
    { title: "Learn", links: ["Methodology", "Sources Guide", "How FDI Works"] },
    { title: "Trust", links: ["Transparency Report", "Data Privacy", "Contact"] },
    { title: "Community", links: ["Leave Feedback", "Suggest Outlet", "Join Waitlist"] },
  ];

  return (
    <footer className="fx-footer" aria-label="Fracture footer">
      <div className="fx-footer-lede">
        <Link href="/mockups" className="fx-footer-brand" aria-label="Fracture mockups home">
          <span>F</span>
          Fracture
        </Link>
        <p>Media divergence intelligence</p>
        <p className="fx-footer-explainer">
          Fracture tracks how trusted outlets frame the same story, making divergence visible without adding editorial opinion.
        </p>
      </div>

      <div className="fx-footer-links">
        {footerGroups.map((group) => (
          <section key={group.title} aria-label={group.title}>
            <h2>{group.title}</h2>
            {group.links.map((link) => <a key={link} href="#trending-stories">{link}</a>)}
          </section>
        ))}
      </div>

      <div className="fx-footer-trust" aria-label="Trust signals">
        <span>Updated in real-time</span>
        <span>50+ outlets monitored</span>
        <span>100% independent</span>
      </div>

      <div className="fx-footer-bottom">
        <div>
          <a href="mailto:hello@fracture.news">hello@fracture.news</a>
          <a href="https://github.com" target="_blank" rel="noreferrer">GitHub</a>
        </div>
        <div>
          <span>© 2026 Fracture</span>
          <a href="#trending-stories">Privacy Policy</a>
          <a href="#trending-stories">Terms of Service</a>
        </div>
      </div>
    </footer>
  );
}

export function HomepageMockup() {
  const [topic, setTopic] = useState<Topic>("All");
  const [visible, setVisible] = useState(6);
  const [leftOutlet, setLeftOutlet] = useState(outlets[1].name);
  const [rightOutlet, setRightOutlet] = useState(outlets[4].name);
  const filteredStories = topic === "All" ? stories : stories.filter((story) => story.topic === topic);
  const shownStories = filteredStories.slice(0, visible);
  const highestDivergence = [...stories].sort((a, b) => b.fdi - a.fdi).slice(0, 5);
  const communityPicks = [
    { story: stories[3], flags: 124 },
    { story: stories[0], flags: 98 },
    { story: stories[1], flags: 76 },
    { story: stories[4], flags: 61 },
  ];
  const credibilityPicks = [
    { outlet: outlets[0], rating: 4.8, reason: "Consistently neutral framing" },
    { outlet: outlets[3], rating: 4.6, reason: "Clear context without excess heat" },
    { outlet: outlets[2], rating: 4.4, reason: "Strong sourcing on policy details" },
    { outlet: outlets[1], rating: 4.2, reason: "Transparent attribution patterns" },
  ];
  const selectedLeft = outlets.find((outlet) => outlet.name === leftOutlet) ?? outlets[1];
  const selectedRight = outlets.find((outlet) => outlet.name === rightOutlet) ?? outlets[4];
  const sharedFdi = Math.round((selectedLeft.divergence + selectedRight.divergence) / 2);

  return (
    <MockupFrame topic={topic} onTopicChange={(item) => { setTopic(item); setVisible(6); }}>
      <main className="fx-page">
        <section className="fx-hero fx-home-hero">
          <div className="fx-hero-copy">
            <p className="fx-eyebrow"><Sparkles size={15} /> Updated 12 mins ago</p>
            <h1>See which stories are fracturing the news right now.</h1>
            <p>
              Fracture compares how outlets frame the same event, then makes the distance between those frames visible.
            </p>
            <div className="fx-hero-actions">
              <Link href="#trending-stories" className="fx-primary-action">Explore today&apos;s fractures <ArrowUpRight size={17} /></Link>
              <button className="fx-secondary-action" type="button"><SlidersHorizontal size={17} /> Tune my topics</button>
            </div>
          </div>
          <Link href="#trending-stories" className="fx-breaking-card">
            <img src={stories[0].image} alt={stories[0].imageAlt} />
            <div>
              <span>Most divergent now</span>
              <h2>{stories[0].title}</h2>
              <FdiBadge score={stories[0].fdi} large />
            </div>
          </Link>
        </section>

        <section className="fx-section" id="trending-stories">
          <div className="fx-section-header">
            <div>
              <p className="fx-eyebrow">Trending stories</p>
              <h2>Stories, ranked by their divergence in the news.</h2>
            </div>
          </div>
          <div className="fx-story-grid">
            {shownStories.map((story) => <StoryCard key={story.id} story={story} />)}
          </div>
          <div className="fx-load-row">
            <button type="button" onClick={() => setVisible((count) => Math.min(count + 3, filteredStories.length))}>
              Load more stories
            </button>
          </div>
        </section>

        <section className="fx-section fx-divergence-week">
          <div className="fx-section-header">
            <div>
              <p className="fx-eyebrow">Highest divergence this week</p>
              <h2>The five stories with the widest framing distance.</h2>
            </div>
            <Link href="#trending-stories" className="fx-week-cta">View all high-divergence stories</Link>
          </div>

          <div className="fx-divergence-list">
            {highestDivergence.map((story, index) => (
              <article key={story.id} className="fx-divergence-row">
                <span className="fx-divergence-rank">{String(index + 1).padStart(2, "0")}</span>
                <h3>{story.title}</h3>
                <strong>{story.fdi}</strong>
                <span className={`fx-divergence-level ${fdiLevel(story.fdi).toLowerCase()}`}>{fdiLevel(story.fdi)}</span>
              </article>
            ))}
          </div>
        </section>

        <section className="fx-section fx-community-picks">
          <div className="fx-section-header">
            <div>
              <p className="fx-eyebrow">Community picks</p>
              <h2>Most flagged divergence readers are discovering.</h2>
            </div>
          </div>

          <div className="fx-community-grid">
            {communityPicks.map(({ story, flags }) => (
              <article key={story.id} className="fx-community-card">
                <span>{flags} readers flagged this</span>
                <h3>{story.title}</h3>
                <div>
                  <FdiBadge score={story.fdi} />
                  <small>{fdiLevel(story.fdi)} divergence surprised readers across shared coverage.</small>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="fx-section fx-source-credibility">
          <div className="fx-section-header">
            <div>
              <p className="fx-eyebrow">Source credibility this week</p>
              <h2>Outlets readers rated highest for trustworthy coverage.</h2>
            </div>
          </div>

          <div className="fx-credibility-list">
            {credibilityPicks.map(({ outlet, rating, reason }) => (
              <article key={outlet.name} className="fx-credibility-row">
                <span className="fx-source-logo">{outlet.logo}</span>
                <div>
                  <h3>{outlet.name}</h3>
                  <p>{reason}</p>
                </div>
                <div className="fx-rating" aria-label={`${rating} out of 5 stars`}>
                  <strong>{rating.toFixed(1)}</strong>
                  <span>{"★".repeat(Math.floor(rating))}{rating % 1 > 0 ? "½" : ""}</span>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="fx-section fx-compare-widget">
          <div className="fx-section-header">
            <div>
              <p className="fx-eyebrow">Try it</p>
              <h2>Compare outlets and see how their framing usually differs.</h2>
            </div>
          </div>

          <div className="fx-compare-panel">
            <div className="fx-compare-controls">
              <label>
                <span>First outlet</span>
                <select value={leftOutlet} onChange={(event) => setLeftOutlet(event.target.value)}>
                  {outlets.map((outlet) => <option key={outlet.name}>{outlet.name}</option>)}
                </select>
              </label>
              <label>
                <span>Second outlet</span>
                <select value={rightOutlet} onChange={(event) => setRightOutlet(event.target.value)}>
                  {outlets.map((outlet) => <option key={outlet.name}>{outlet.name}</option>)}
                </select>
              </label>
            </div>

            <div className="fx-compare-results">
              <div className="fx-compare-summary">
                <p className="fx-eyebrow">Shared coverage pattern</p>
                <h3>{selectedLeft.name} vs. {selectedRight.name}</h3>
                <p>
                  {selectedLeft.name} typically clusters around “{selectedLeft.sample.toLowerCase()},” while {selectedRight.name} more often emphasizes “{selectedRight.sample.toLowerCase()}.” Fracture surfaces that gap without deciding which frame is correct.
                </p>
              </div>

              <div className="fx-compare-score">
                <span>Avg FDI on shared coverage</span>
                <strong>{sharedFdi}</strong>
                <small>{fdiLevel(sharedFdi)} divergence</small>
              </div>

              <div className="fx-compare-examples">
                <span>Example stories</span>
                {stories.slice(0, 3).map((story) => (
                  <article key={story.id}>
                    <strong>{story.title}</strong>
                    <small>{story.spectrum}</small>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
    </MockupFrame>
  );
}

export function StoryDetailMockup() {
  const [topic, setTopic] = useState<Topic>("All");
  const [selected, setSelected] = useState(outlets[0].name);
  const [feedback, setFeedback] = useState<"accurate" | "off" | null>(null);
  const story = stories[0];
  const selectedOutlet = outlets.find((outlet) => outlet.name === selected) ?? outlets[0];

  return (
    <MockupFrame page="story" topic={topic} onTopicChange={setTopic}>
      <main className="fx-page fx-detail-page">
        <section className="fx-detail-hero">
          <div>
            <p className="fx-eyebrow"><Sparkles size={15} /> Story detail / {story.topic}</p>
            <h1>{story.title}</h1>
            <p>
              Coverage agrees the talks are under pressure, but diverges sharply on whether the central frame is obligation, fiscal caution, or diplomatic process.
            </p>
            <div className="fx-detail-meta">
              <span>{story.sources} outlets monitored</span>
              <span>First reported by Reuters</span>
              <span>Updated {story.updated}</span>
            </div>
          </div>

          <aside className="fx-detail-score">
            <FdiBadge score={story.fdi} large />
            <p>This story is being covered differently across outlets. Fracture shows the gap without adding an editorial voice.</p>
          </aside>
        </section>

        <section className="fx-section fx-neutral-summary">
          <p className="fx-eyebrow">Fracture neutral summary</p>
          <p>
            Across shared coverage, outlets describe negotiations nearing a deadline with unresolved funding questions. The split appears in who gets framed as responsible, how cost is described, and whether the delay is treated as policy process or accountability failure.
          </p>
        </section>

        <section className="fx-section fx-detail-grid">
          <div className="fx-panel fx-spectrum-panel">
            <div className="fx-section-header">
              <div>
                <p className="fx-eyebrow">Source spectrum</p>
                <h2>Accountability ← Finance frame → Cost</h2>
              </div>
            </div>
            <div className="fx-spectrum-track">
              {outlets.map((outlet) => (
                <button key={outlet.name} type="button" className={selected === outlet.name ? "active" : ""} style={{ left: `${outlet.position}%` }} onClick={() => setSelected(outlet.name)} aria-label={`Highlight ${outlet.name}`}>
                  {outlet.logo}
                </button>
              ))}
            </div>
            <div className="fx-spectrum-labels"><span>Responsibility</span><span>Diplomatic process</span><span>Cost risk</span></div>
          </div>

          <aside className="fx-panel fx-selected-outlet">
            <p className="fx-eyebrow">Selected outlet</p>
            <div className="fx-source-logo">{selectedOutlet.logo}</div>
            <h2>{selectedOutlet.name}</h2>
            <p>{selectedOutlet.sample}</p>
            <FdiBadge score={selectedOutlet.divergence} />
          </aside>
        </section>

        <section className="fx-section">
          <div className="fx-section-header">
            <div>
              <p className="fx-eyebrow">Headline comparison</p>
              <h2>Same story, different framing.</h2>
            </div>
          </div>
          <div className="fx-headline-list">
            {outlets.map((outlet) => (
              <button key={outlet.name} type="button" className={selected === outlet.name ? "active" : ""} onClick={() => setSelected(outlet.name)}>
                <span>{outlet.name}</span>
                <strong>{outlet.headline}</strong>
                <FdiBadge score={outlet.divergence} />
              </button>
            ))}
          </div>
        </section>

        <section className="fx-section fx-trust-grid">
          <div className="fx-panel">
            <p className="fx-eyebrow">Is this FDI accurate?</p>
            <div className="fx-feedback">
              <button className={feedback === "accurate" ? "active" : ""} type="button" onClick={() => setFeedback("accurate")}>Yes, it tracks</button>
              <button className={feedback === "off" ? "active" : ""} type="button" onClick={() => setFeedback("off")}>Something feels off</button>
            </div>
            {feedback && <p className="fx-feedback-note">Thanks. Reader feedback helps audit future divergence scores.</p>}
          </div>
          <div className="fx-panel">
            <p className="fx-eyebrow">Reader insight</p>
            <p className="fx-reader-note">The spectrum makes it clear that outlets can cite the same deadline but choose different responsible actors.</p>
            <span className="fx-feedback-note">Maya C. / 14 replies</span>
          </div>
        </section>

        <section className="fx-section">
          <div className="fx-section-header">
            <div>
              <p className="fx-eyebrow">Related stories</p>
              <h2>More coverage with visible framing distance.</h2>
            </div>
          </div>
          <div className="fx-story-grid compact">
            {stories.slice(1, 4).map((item) => <StoryCard key={item.id} story={item} />)}
          </div>
        </section>
      </main>
    </MockupFrame>
  );
}

export function StoriesMockup() {
  const [topic, setTopic] = useState<Topic>("All");
  const [query, setQuery] = useState("");
  const curatedStories = [...stories].sort((a, b) => b.fdi - a.fdi);
  const filteredStories = curatedStories.filter((story) => {
    const matchesTopic = topic === "All" || story.topic === topic;
    const searchText = `${story.title} ${story.summary} ${story.topic} ${story.spectrum}`.toLowerCase();
    return matchesTopic && searchText.includes(query.toLowerCase());
  });

  return (
    <MockupFrame page="stories" topic={topic} onTopicChange={setTopic}>
      <main className="fx-page fx-stories-page">
        <section className="fx-stories-hero">
          <div>
            <p className="fx-eyebrow"><Sparkles size={15} /> Curated story index</p>
            <h1>Browse the stories with the clearest framing distance.</h1>
            <p>
              A focused reading list of story clusters where outlet framing, tone, source selection, or emphasis meaningfully diverges.
            </p>
          </div>

          <label className="fx-stories-search">
            <span>Search curated stories</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by topic, headline, or framing pattern" />
          </label>
        </section>

        <section className="fx-section">
          <div className="fx-section-header">
            <div>
              <p className="fx-eyebrow">Curated list</p>
              <h2>{filteredStories.length} stories matching your view.</h2>
            </div>
          </div>

          <div className="fx-stories-list">
            {filteredStories.map((story, index) => (
              <article key={story.id} className="fx-stories-row">
                <span className="fx-divergence-rank">{String(index + 1).padStart(2, "0")}</span>
                <img src={story.image} alt={story.imageAlt} />
                <div>
                  <span className="fx-card-topic">{story.topic}</span>
                  <h3>{story.title}</h3>
                  <p>{story.summary}</p>
                  <small>{story.spectrum}</small>
                </div>
                <FdiBadge score={story.fdi} />
              </article>
            ))}
          </div>
        </section>
      </main>
    </MockupFrame>
  );
}

function StoryCard({ story }: { story: Story }) {
  return (
    <article className="fx-card">
      <img src={story.image} alt={story.imageAlt} />
      <div className="fx-card-body">
        <span className="fx-card-topic">{story.topic}</span>
        <h3>{story.title}</h3>
        <p>{story.summary}</p>
        <FdiBadge score={story.fdi} />
        <div className="fx-card-meta">
          <span>{story.sources} sources</span>
          <span>{story.updated}</span>
        </div>
      </div>
    </article>
  );
}

function FdiBadge({ score, large = false }: { score: number; large?: boolean }) {
  const color = fdiColor(score);
  return (
    <div className={`fx-fdi ${large ? "large" : ""}`} style={{ "--fdi-color": color, "--fdi-score": `${score}%` } as React.CSSProperties}>
      <div className="fx-fdi-meter"><span /></div>
      <strong>FDI: {score}/100 | {fdiLevel(score)}</strong>
    </div>
  );
}

const styles = `
body:has(.fx) > .ns-navbar,
body:has(.fx) > footer,
body:has(.fx) .ns-navbar {
  display: none !important;
}
.fx {
  --fx-bg: #F8F7F5;
  --fx-surface: #FFFFFF;
  --fx-text: #1A1918;
  --fx-muted: #6B6B6B;
  --fx-accent: #0066CC;
  --fx-border: #E8E6E3;
  --fx-blue-soft: #E3F2FF;
  --fx-shadow: 0 18px 50px rgba(26, 25, 24, 0.09);
  min-height: 100vh;
  background: var(--fx-bg);
  color: var(--fx-text);
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
.fx.fx-dark {
  --fx-bg: #0F0F0F;
  --fx-surface: #1A1A1A;
  --fx-text: #F5F5F5;
  --fx-muted: #A0A0A0;
  --fx-accent: #3B82F6;
  --fx-border: #404040;
  --fx-blue-soft: rgba(59, 130, 246, 0.16);
  --fx-shadow: 0 18px 60px rgba(0, 0, 0, 0.34);
}
.fx button, .fx input, .fx select { font: inherit; }
.fx button, .fx select, .fx a { transition: transform 200ms ease, box-shadow 200ms ease, border-color 200ms ease, background 200ms ease, color 200ms ease; }
.fx button:focus-visible, .fx a:focus-visible, .fx input:focus-visible, .fx select:focus-visible { outline: 2px solid var(--fx-accent); outline-offset: 3px; }
.fx h1, .fx h2, .fx h3 { font-family: Georgia, "Times New Roman", serif; letter-spacing: 0; color: var(--fx-text); }
.fx p { color: var(--fx-muted); }
.fx-nav {
  position: sticky;
  top: 0;
  z-index: 20;
  min-height: 132px;
  display: grid;
  grid-template-columns: 1fr;
  gap: 18px;
  align-items: center;
  justify-items: center;
  padding: 22px max(24px, calc((100vw - 1280px) / 2)) 16px;
  background:
    linear-gradient(90deg, color-mix(in srgb, var(--fx-surface) 88%, transparent), color-mix(in srgb, var(--fx-bg) 86%, transparent)),
    color-mix(in srgb, var(--fx-bg) 92%, transparent);
  border-bottom: 1px solid var(--fx-border);
  backdrop-filter: blur(18px);
  box-shadow: 0 12px 44px rgba(26, 25, 24, 0.05);
}
.fx-nav-row,
.fx-nav-actions,
.fx-links,
.fx-topic-nav {
  display: flex;
  align-items: center;
}
.fx-nav-row {
  width: 100%;
  justify-content: center;
  gap: clamp(22px, 3vw, 42px);
  flex-wrap: wrap;
}
.fx-nav-actions {
  gap: clamp(14px, 2vw, 24px);
  position: relative;
  padding-left: clamp(22px, 2.6vw, 38px);
}
.fx-nav-actions::before {
  content: "";
  position: absolute;
  left: 0;
  top: 50%;
  width: 1px;
  height: 24px;
  background: var(--fx-border);
  transform: translateY(-50%);
}
.fx-logo {
  display: inline-flex;
  align-items: center;
  gap: 14px;
  color: var(--fx-text);
  font-family: Georgia, "Times New Roman", serif;
  font-size: clamp(34px, 4vw, 54px);
  font-weight: 700;
  letter-spacing: -.04em;
  line-height: .9;
}
.fx-logo span, .fx-source-logo {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--fx-text);
  color: var(--fx-bg);
  font-family: Georgia, serif;
  font-weight: 700;
  font-size: 18px;
}
.fx-links {
  gap: clamp(18px, 2.5vw, 34px);
}
.fx-links a,
.fx-topic-nav button {
  position: relative;
  border: 0;
  background: transparent;
  color: var(--fx-muted);
  cursor: pointer;
  padding: 4px 0;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: .08em;
  text-transform: uppercase;
}
.fx-icon-control {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border: 1px solid color-mix(in srgb, var(--fx-text) 14%, var(--fx-border));
  border-radius: 999px;
  background: color-mix(in srgb, var(--fx-surface) 82%, transparent);
  color: var(--fx-text);
  cursor: pointer;
  box-shadow: 0 1px 0 rgba(26, 25, 24, 0.04);
  flex: 0 0 auto;
}
.fx-icon-control:hover {
  transform: translateY(-1px);
  border-color: color-mix(in srgb, var(--fx-text) 34%, var(--fx-border));
  box-shadow: 0 12px 30px rgba(26, 25, 24, 0.08);
}
.fx-search-shell {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 34px;
  width: 34px;
  height: 34px;
  overflow: hidden;
  border-radius: 999px;
  transition:
    width 280ms cubic-bezier(.16, 1, .3, 1),
    background 220ms ease,
    border-color 220ms ease,
    padding 280ms cubic-bezier(.16, 1, .3, 1),
    box-shadow 220ms ease;
  -webkit-tap-highlight-color: transparent;
}
.fx-search-shell:focus,
.fx-search-shell:focus-within {
  outline: none;
}
.fx-search-shell .fx-icon-control:focus,
.fx-search-shell .fx-icon-control:focus-visible {
  outline: none;
}
.fx-search-shell.open {
  width: 210px;
  padding-right: 12px;
  border: 1px solid color-mix(in srgb, var(--fx-text) 14%, var(--fx-border));
  background: color-mix(in srgb, var(--fx-surface) 88%, transparent);
  box-shadow: 0 12px 30px rgba(26, 25, 24, 0.07);
}
.fx-search-shell.open .fx-icon-control {
  border-color: transparent;
  background: transparent;
  box-shadow: none;
}
.fx-search-shell input {
  width: 142px;
  min-width: 0;
  border: 0;
  outline: 0;
  box-shadow: none;
  -webkit-appearance: none;
  appearance: none;
  background: transparent;
  color: var(--fx-text);
  font-size: 13px;
  opacity: 0;
  transform: translateX(-6px);
  pointer-events: none;
  transition: opacity 180ms ease 80ms, transform 220ms cubic-bezier(.16, 1, .3, 1) 60ms;
}
.fx-search-shell.open input {
  opacity: 1;
  transform: translateX(0);
  pointer-events: auto;
}
.fx-search-shell input:focus,
.fx-search-shell input:focus-visible {
  outline: none;
  box-shadow: none;
}
.fx-search-shell input::placeholder {
  color: var(--fx-muted);
}
.fx-topic-nav {
  justify-content: center;
  gap: clamp(18px, 2.5vw, 36px);
  min-width: 0;
}
.fx-links a::after,
.fx-topic-nav button::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  bottom: -4px;
  height: 1px;
  background: currentColor;
  transform: scaleX(0);
  transform-origin: center;
  transition: transform 180ms ease;
}
.fx-links a.active,
.fx-links a:hover,
.fx-topic-nav button.active,
.fx-topic-nav button:hover {
  color: var(--fx-text);
}
.fx-links a.active::after,
.fx-links a:hover::after,
.fx-topic-nav button.active::after,
.fx-topic-nav button:hover::after {
  transform: scaleX(1);
}
.fx-page { max-width: 1200px; margin: 0 auto; padding: 34px 24px 72px; }
.fx-hero {
  min-height: 460px;
  display: grid;
  grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.05fr);
  gap: 34px;
  align-items: center;
  padding: 30px 0 38px;
}
.fx-home-hero { border-bottom: 1px solid var(--fx-border); }
.fx-hero-copy { align-self: center; }
.fx-hero-copy h1, .fx-story-hero h1 { font-size: clamp(38px, 5vw, 62px); line-height: 0.98; margin: 12px 0 16px; max-width: 780px; }
.fx-hero-copy p:not(.fx-eyebrow), .fx-summary { font-family: Georgia, serif; font-size: 19px; line-height: 1.52; max-width: 640px; }
.fx-eyebrow {
  display: inline-flex;
  gap: 7px;
  align-items: center;
  margin: 0;
  color: var(--fx-accent);
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0;
}
.fx-hero-actions { display: flex; flex-wrap: wrap; gap: 14px; margin-top: 28px; }
.fx-primary-action, .fx-secondary-action, .fx-load-row button, .fx-feedback button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 48px;
  border: 1px solid var(--fx-text);
  background: var(--fx-text);
  color: var(--fx-bg);
  padding: 0 22px;
  cursor: pointer;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: .02em;
}
.fx-secondary-action, .fx-load-row button, .fx-feedback button {
  background: var(--fx-surface);
  color: var(--fx-text);
  border-color: color-mix(in srgb, var(--fx-text) 18%, var(--fx-border));
}
.fx-primary-action:hover, .fx-secondary-action:hover, .fx-load-row button:hover, .fx-feedback button:hover { transform: translateY(-1px); box-shadow: var(--fx-shadow); }
.fx-breaking-card {
  min-height: 405px;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: flex-end;
  color: white;
  box-shadow: var(--fx-shadow);
  align-self: center;
}
.fx-breaking-card img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; transform: scale(1.01); }
.fx-breaking-card::after { content: ""; position: absolute; inset: 0; background: linear-gradient(to top, rgba(0,0,0,.78), rgba(0,0,0,.1) 62%, rgba(0,0,0,.18)); }
.fx-breaking-card > div { position: relative; z-index: 1; padding: 28px; width: 100%; }
.fx-breaking-card span { font-size: 12px; text-transform: uppercase; color: rgba(255,255,255,.78); font-weight: 700; }
.fx-breaking-card h2 { color: white; font-size: clamp(28px, 4vw, 46px); line-height: 1.05; margin: 10px 0 18px; }
.fx-stories-page {
  max-width: 1240px;
}
.fx-stories-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 420px;
  gap: 34px;
  align-items: end;
  padding: 44px 0 38px;
  border-bottom: 1px solid var(--fx-border);
}
.fx-stories-hero h1 {
  max-width: 820px;
  margin: 12px 0 16px;
  font-size: clamp(42px, 6vw, 78px);
  line-height: .92;
  letter-spacing: -.035em;
}
.fx-stories-hero p:not(.fx-eyebrow) {
  max-width: 680px;
  margin: 0;
  color: var(--fx-muted);
  font-family: Georgia, serif;
  font-size: 20px;
  line-height: 1.58;
}
.fx-stories-search {
  display: grid;
  gap: 10px;
  padding: 18px;
  border: 1px solid var(--fx-border);
  background: var(--fx-surface);
  box-shadow: var(--fx-shadow);
}
.fx-stories-search span {
  color: var(--fx-accent);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: .08em;
  text-transform: uppercase;
}
.fx-stories-search input {
  width: 100%;
  height: 46px;
  border: 1px solid var(--fx-border);
  background: var(--fx-bg);
  color: var(--fx-text);
  padding: 0 14px;
  outline: 0;
}
.fx-stories-search input:focus {
  border-color: color-mix(in srgb, var(--fx-text) 28%, var(--fx-border));
  box-shadow: 0 0 0 3px var(--fx-blue-soft);
}
.fx-stories-list {
  display: grid;
  gap: 14px;
}
.fx-stories-row {
  display: grid;
  grid-template-columns: 44px 170px minmax(0, 1fr) 190px;
  gap: 18px;
  align-items: center;
  padding: 16px;
  border: 1px solid var(--fx-border);
  background: var(--fx-surface);
  color: var(--fx-text);
  cursor: pointer;
  transition: transform 360ms cubic-bezier(.16, 1, .3, 1), box-shadow 360ms cubic-bezier(.16, 1, .3, 1), border-color 360ms ease;
}
.fx-stories-row:hover {
  transform: translateY(-5px);
  border-color: color-mix(in srgb, var(--fx-text) 18%, var(--fx-border));
  box-shadow: 0 20px 60px rgba(26, 25, 24, 0.11);
}
.fx-stories-row img {
  width: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
}
.fx-stories-row h3 {
  margin: 5px 0 8px;
  font-size: 25px;
  line-height: 1.08;
}
.fx-stories-row p {
  margin: 0 0 8px;
  line-height: 1.45;
}
.fx-stories-row small {
  color: var(--fx-muted);
}
.fx-section { padding: 46px 0 0; }
.fx-section-header { display: flex; justify-content: space-between; gap: 22px; align-items: end; margin-bottom: 22px; }
.fx-section-header h2 { font-size: clamp(26px, 3vw, 38px); margin: 7px 0 0; line-height: 1.1; }
.fx-story-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 22px; }
.fx-story-grid.compact { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.fx-card {
  overflow: hidden;
  background: var(--fx-surface);
  border: 1px solid var(--fx-border);
  color: var(--fx-text);
  cursor: pointer;
  transform: translateY(0) scale(1);
  transform-origin: center top;
  transition:
    transform 420ms cubic-bezier(.16, 1, .3, 1),
    box-shadow 420ms cubic-bezier(.16, 1, .3, 1),
    border-color 420ms ease;
  will-change: transform;
}
.fx-card:hover {
  transform: translateY(-8px) scale(1.018);
  border-color: color-mix(in srgb, var(--fx-text) 18%, var(--fx-border));
  box-shadow: 0 24px 70px rgba(26, 25, 24, 0.13);
}
.fx-card img {
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
  display: block;
  transform: scale(1);
  transition: transform 520ms cubic-bezier(.16, 1, .3, 1);
}
.fx-card:hover img { transform: scale(1.035); }
.fx-card-body { padding: 20px; }
.fx-card-topic { color: var(--fx-accent); font-size: 12px; text-transform: uppercase; font-weight: 700; }
.fx-card h3 { font-size: 21px; line-height: 1.18; margin: 8px 0 10px; }
.fx-card p { margin: 0 0 16px; line-height: 1.5; }
.fx-card-meta { display: flex; justify-content: space-between; gap: 12px; color: var(--fx-muted); font-size: 13px; margin-top: 13px; }
.fx-fdi {
  display: grid;
  gap: 8px;
  padding: 10px;
  background: var(--fx-blue-soft);
  border: 1px solid color-mix(in srgb, var(--fdi-color) 28%, var(--fx-border));
}
.fx-fdi.large { padding: 14px; gap: 11px; }
.fx-fdi strong { color: var(--fx-text); font-size: 12px; letter-spacing: 0; }
.fx-fdi.large strong { font-size: 15px; }
.fx-fdi-meter { height: 9px; background: color-mix(in srgb, var(--fx-bg) 72%, var(--fx-border)); overflow: hidden; }
.fx-fdi-meter span { display: block; height: 100%; width: var(--fdi-score); background: var(--fdi-color); box-shadow: 0 0 18px color-mix(in srgb, var(--fdi-color) 60%, transparent); }
.fx-load-row { display: flex; justify-content: center; padding-top: 28px; }
.fx-divergence-week {
  padding-top: 56px;
}
.fx-week-cta {
  color: var(--fx-text);
  font-size: 13px;
  font-weight: 800;
  letter-spacing: .02em;
  border-bottom: 1px solid currentColor;
}
.fx-week-cta:hover {
  color: var(--fx-accent);
}
.fx-divergence-list {
  display: grid;
  border-top: 1px solid var(--fx-border);
}
.fx-divergence-row {
  display: grid;
  grid-template-columns: 54px minmax(0, 1fr) 70px 130px;
  gap: 18px;
  align-items: center;
  padding: 18px 0;
  border-bottom: 1px solid var(--fx-border);
  color: var(--fx-text);
}
.fx-divergence-row h3 {
  margin: 0;
  font-size: 21px;
  line-height: 1.2;
}
.fx-divergence-rank {
  color: var(--fx-accent);
  font-size: 12px;
  font-weight: 800;
}
.fx-divergence-row > strong {
  font-family: Georgia, serif;
  font-size: 28px;
  line-height: 1;
  text-align: right;
}
.fx-divergence-level {
  justify-self: end;
  color: var(--fx-muted);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: .08em;
}
.fx-divergence-level.high { color: #EF4444; }
.fx-divergence-level.moderate { color: #0066CC; }
.fx-divergence-level.low { color: #10A760; }
.fx-community-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 18px;
}
.fx-community-card {
  display: grid;
  gap: 16px;
  min-height: 250px;
  padding: 20px;
  border: 1px solid var(--fx-border);
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--fx-blue-soft) 38%, transparent), transparent 54%),
    var(--fx-surface);
  color: var(--fx-text);
}
.fx-community-card > span,
.fx-compare-examples > span,
.fx-compare-score > span,
.fx-compare-controls span {
  color: var(--fx-accent);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: .08em;
  text-transform: uppercase;
}
.fx-community-card h3 {
  margin: 0;
  font-size: 24px;
  line-height: 1.08;
}
.fx-community-card small {
  display: block;
  margin-top: 10px;
  color: var(--fx-muted);
  line-height: 1.45;
}
.fx-credibility-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}
.fx-credibility-row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 16px;
  align-items: center;
  padding: 18px;
  border: 1px solid var(--fx-border);
  background: var(--fx-surface);
}
.fx-credibility-row h3 {
  margin: 0 0 4px;
  font-size: 24px;
  line-height: 1.05;
}
.fx-credibility-row p {
  margin: 0;
  color: var(--fx-muted);
}
.fx-rating {
  display: grid;
  gap: 4px;
  justify-items: end;
}
.fx-rating strong {
  font-family: Georgia, serif;
  font-size: 30px;
  line-height: 1;
}
.fx-rating span {
  color: #B7791F;
  font-size: 13px;
  letter-spacing: .04em;
}
.fx-compare-panel {
  display: grid;
  grid-template-columns: 340px minmax(0, 1fr);
  gap: 24px;
  padding: 24px;
  border: 1px solid var(--fx-border);
  background: var(--fx-surface);
  box-shadow: var(--fx-shadow);
}
.fx-compare-controls {
  display: grid;
  gap: 16px;
  align-content: start;
}
.fx-compare-controls label {
  display: grid;
  gap: 8px;
}
.fx-compare-controls select {
  width: 100%;
  height: 46px;
  border: 1px solid var(--fx-border);
  background: var(--fx-bg);
  color: var(--fx-text);
  padding: 0 12px;
}
.fx-compare-results {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 190px;
  gap: 18px;
}
.fx-compare-summary,
.fx-compare-score,
.fx-compare-examples {
  border: 1px solid var(--fx-border);
  background: color-mix(in srgb, var(--fx-bg) 55%, var(--fx-surface));
  padding: 20px;
}
.fx-compare-summary h3 {
  margin: 9px 0 12px;
  font-size: 34px;
  line-height: 1.05;
}
.fx-compare-summary p:not(.fx-eyebrow) {
  margin: 0;
  color: var(--fx-muted);
  font-family: Georgia, serif;
  font-size: 18px;
  line-height: 1.6;
}
.fx-compare-score {
  display: grid;
  align-content: center;
  text-align: center;
}
.fx-compare-score strong {
  margin: 12px 0 6px;
  font-family: Georgia, serif;
  font-size: 68px;
  line-height: .9;
}
.fx-compare-score small {
  color: var(--fx-muted);
  font-weight: 700;
  text-transform: uppercase;
}
.fx-compare-examples {
  grid-column: 1 / -1;
  display: grid;
  gap: 12px;
}
.fx-compare-examples article {
  display: grid;
  gap: 4px;
  padding-top: 12px;
  border-top: 1px solid var(--fx-border);
}
.fx-compare-examples strong {
  color: var(--fx-text);
  font-family: Georgia, serif;
  font-size: 18px;
}
.fx-compare-examples small {
  color: var(--fx-muted);
}
.fx-detail-page { max-width: 1240px; }
.fx-detail-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: 34px;
  align-items: center;
  padding: 44px 0 38px;
  border-bottom: 1px solid var(--fx-border);
}
.fx-detail-hero h1 {
  max-width: 880px;
  margin: 12px 0 16px;
  font-size: clamp(42px, 6vw, 82px);
  line-height: .92;
  letter-spacing: -.04em;
}
.fx-detail-hero p:not(.fx-eyebrow),
.fx-neutral-summary > p:last-child {
  max-width: 760px;
  margin: 0;
  color: var(--fx-muted);
  font-family: Georgia, serif;
  font-size: 20px;
  line-height: 1.62;
}
.fx-detail-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 24px;
  color: var(--fx-muted);
  font-size: 13px;
}
.fx-detail-meta span {
  border-top: 1px solid var(--fx-border);
  padding-top: 8px;
}
.fx-detail-score {
  display: grid;
  gap: 18px;
  padding: 24px;
  border: 1px solid var(--fx-border);
  background: radial-gradient(circle at 50% 10%, var(--fx-blue-soft), transparent 60%), var(--fx-surface);
  box-shadow: var(--fx-shadow);
}
.fx-detail-score p {
  margin: 0;
  font-family: Georgia, serif;
  line-height: 1.55;
}
.fx-neutral-summary {
  padding: 28px;
  border: 1px solid var(--fx-border);
  background: var(--fx-surface);
}
.fx-detail-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 340px;
  gap: 22px;
  align-items: start;
}
.fx-panel {
  background: var(--fx-surface);
  border: 1px solid var(--fx-border);
  padding: 24px;
  box-shadow: 0 1px 0 rgba(0,0,0,.02);
}
.fx-spectrum-panel { min-height: 310px; }
.fx-spectrum-track {
  position: relative;
  height: 134px;
  margin: 40px 12px 16px;
  border-bottom: 2px solid var(--fx-border);
}
.fx-spectrum-track::before {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  bottom: -2px;
  height: 2px;
  background: linear-gradient(90deg, #EF4444, #0066CC 50%, #10A760);
}
.fx-spectrum-track button {
  position: absolute;
  bottom: -21px;
  transform: translateX(-50%);
  width: 46px;
  height: 46px;
  border-radius: 50%;
  border: 2px solid var(--fx-surface);
  background: var(--fx-text);
  color: var(--fx-bg);
  cursor: pointer;
  font-weight: 800;
}
.fx-spectrum-track button.active {
  transform: translateX(-50%) scale(1.2);
  box-shadow: 0 0 0 7px var(--fx-blue-soft);
}
.fx-spectrum-labels {
  display: flex;
  justify-content: space-between;
  color: var(--fx-muted);
  font-size: 13px;
  padding-top: 18px;
}
.fx-selected-outlet h2,
.fx-panel h2 {
  font-size: 30px;
  margin: 12px 0 10px;
}
.fx-headline-list { display: grid; gap: 10px; }
.fx-headline-list button {
  display: grid;
  grid-template-columns: 150px 1fr 170px;
  gap: 18px;
  align-items: center;
  text-align: left;
  width: 100%;
  border: 1px solid var(--fx-border);
  background: var(--fx-surface);
  color: var(--fx-text);
  padding: 14px 16px;
  cursor: pointer;
}
.fx-headline-list button.active {
  border-color: var(--fx-accent);
  box-shadow: 0 0 0 3px var(--fx-blue-soft);
}
.fx-headline-list span { color: var(--fx-muted); }
.fx-headline-list strong {
  font-family: Georgia, serif;
  font-size: 18px;
}
.fx-trust-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 22px;
}
.fx-feedback { display: flex; flex-wrap: wrap; gap: 10px; }
.fx-feedback button {
  min-height: 42px;
  border: 1px solid var(--fx-border);
  background: var(--fx-surface);
  color: var(--fx-text);
  padding: 0 14px;
  cursor: pointer;
}
.fx-feedback button.active {
  background: var(--fx-text);
  color: var(--fx-bg);
  border-color: var(--fx-text);
}
.fx-feedback-note {
  color: var(--fx-accent);
  font-size: 13px;
  margin: 14px 0 0;
}
.fx-reader-note {
  font-family: Georgia, serif;
  font-size: 20px;
  line-height: 1.5;
  color: var(--fx-text);
}
.fx-footer {
  max-width: 1200px;
  margin: 24px auto 0;
  padding: 64px 24px 34px;
  border-top: 1px solid var(--fx-border);
  color: var(--fx-text);
}
.fx-footer-lede {
  display: grid;
  grid-template-columns: minmax(240px, .8fr) minmax(0, 1fr) minmax(260px, .8fr);
  gap: 28px;
  align-items: start;
  padding-bottom: 42px;
}
.fx-footer-brand {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  color: var(--fx-text);
  font-family: Georgia, "Times New Roman", serif;
  font-size: 32px;
  font-weight: 700;
  letter-spacing: -.035em;
  line-height: 1;
}
.fx-footer-brand span {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: var(--fx-text);
  color: var(--fx-bg);
  font-size: 15px;
}
.fx-footer-lede p {
  margin: 0;
}
.fx-footer-lede > p:first-of-type {
  color: var(--fx-accent);
  font-size: 12px;
  font-weight: 800;
  letter-spacing: .08em;
  text-transform: uppercase;
}
.fx-footer-explainer {
  color: var(--fx-muted);
  font-family: Georgia, serif;
  font-size: 18px;
  line-height: 1.55;
}
.fx-footer-links {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 28px;
  padding: 34px 0;
  border-top: 1px solid var(--fx-border);
  border-bottom: 1px solid var(--fx-border);
}
.fx-footer-links section {
  display: grid;
  gap: 10px;
}
.fx-footer-links h2 {
  margin: 0 0 4px;
  color: var(--fx-accent);
  font-family: Inter, ui-sans-serif, system-ui, sans-serif;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: .1em;
  text-transform: uppercase;
}
.fx-footer a {
  color: var(--fx-muted);
  width: fit-content;
  font-size: 14px;
}
.fx-footer a:hover {
  color: var(--fx-text);
  text-decoration: underline;
  text-underline-offset: 4px;
}
.fx-footer-trust {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  padding: 22px 0;
}
.fx-footer-trust span {
  border: 1px solid var(--fx-border);
  background: color-mix(in srgb, var(--fx-surface) 74%, transparent);
  color: var(--fx-text);
  padding: 9px 12px;
  font-size: 12px;
  font-weight: 700;
}
.fx-footer-bottom {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  align-items: center;
  color: var(--fx-muted);
  font-size: 13px;
}
.fx-footer-bottom > div {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: center;
}
.fx-story-detail { display: grid; gap: 34px; }
.fx-story-hero {
  display: grid;
  grid-template-columns: 1.1fr 420px;
  gap: 34px;
  align-items: center;
  padding: 44px 0 18px;
}
.fx-meta-line { display: flex; flex-wrap: wrap; gap: 14px; color: var(--fx-muted); font-size: 14px; }
.fx-meta-line span { display: inline-flex; gap: 7px; align-items: center; }
.fx-hero-score {
  min-height: 360px;
  padding: 24px;
  background: radial-gradient(circle at center, var(--fx-blue-soft), transparent 68%), var(--fx-surface);
  border: 1px solid var(--fx-border);
  display: grid;
  align-content: space-between;
  box-shadow: var(--fx-shadow);
}
.fx-score-orbit { position: relative; min-height: 230px; }
.fx-score-orbit::before { content: ""; position: absolute; inset: 16px; border: 1px solid var(--fx-border); border-radius: 50%; }
.fx-score-orbit::after { content: ""; position: absolute; left: 50%; top: 50%; width: 74%; height: 2px; background: linear-gradient(90deg, #EF4444, #0066CC, #10A760); transform: translate(-50%, -50%) rotate(-18deg); }
.fx-score-orbit span {
  position: absolute;
  left: var(--x);
  top: var(--y);
  width: 42px;
  height: 42px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: var(--fx-text);
  color: var(--fx-bg);
  font-weight: 800;
  z-index: 1;
}
.fx-panel {
  background: var(--fx-surface);
  border: 1px solid var(--fx-border);
  padding: 24px;
  box-shadow: 0 1px 0 rgba(0,0,0,.02);
}
.fx-neutral p:last-child { font-family: Georgia, serif; font-size: 20px; line-height: 1.65; margin-bottom: 0; }
.fx-two-column { display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: 22px; align-items: start; }
.fx-spectrum { min-height: 300px; }
.fx-spectrum-track {
  position: relative;
  height: 134px;
  margin: 40px 12px 16px;
  border-bottom: 2px solid var(--fx-border);
}
.fx-spectrum-track::before { content: ""; position: absolute; left: 0; right: 0; bottom: -2px; height: 2px; background: linear-gradient(90deg, #EF4444, #0066CC 50%, #10A760); }
.fx-spectrum-track button {
  position: absolute;
  bottom: -21px;
  transform: translateX(-50%);
  width: 46px;
  height: 46px;
  border-radius: 50%;
  border: 2px solid var(--fx-surface);
  background: var(--fx-text);
  color: var(--fx-bg);
  cursor: pointer;
  font-weight: 800;
}
.fx-spectrum-track button.active { transform: translateX(-50%) scale(1.2); box-shadow: 0 0 0 7px var(--fx-blue-soft); }
.fx-spectrum-labels { display: flex; justify-content: space-between; color: var(--fx-muted); font-size: 13px; padding-top: 18px; }
.fx-selected-outlet h2, .fx-source-drawer h2, .fx-panel h2 { font-size: 30px; margin: 12px 0 10px; }
.fx-comparison-table { display: grid; gap: 10px; }
.fx-comparison-table button {
  display: grid;
  grid-template-columns: 150px 1fr 140px;
  gap: 18px;
  align-items: center;
  text-align: left;
  width: 100%;
  border: 1px solid var(--fx-border);
  background: var(--fx-surface);
  color: var(--fx-text);
  padding: 14px 16px;
  cursor: pointer;
}
.fx-comparison-table button.active { border-color: var(--fx-accent); box-shadow: 0 0 0 3px var(--fx-blue-soft); }
.fx-comparison-table span { color: var(--fx-muted); }
.fx-comparison-table strong { font-family: Georgia, serif; font-size: 18px; font-weight: 700; }
.fx-fdi-mini { display: grid; grid-template-columns: 1fr auto; gap: 10px; align-items: center; }
.fx-fdi-mini i { display: block; height: 8px; background: linear-gradient(90deg, var(--fdi-color) var(--fdi-score), color-mix(in srgb, var(--fx-bg) 72%, var(--fx-border)) 0); }
.fx-bottom-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 22px; }
.fx-feedback { display: flex; flex-wrap: wrap; gap: 10px; }
.fx-feedback button.active { background: var(--fx-text); color: var(--fx-bg); border-color: var(--fx-text); }
.fx-feedback-note, .fx-comment-meta { color: var(--fx-accent); font-size: 13px; margin: 14px 0 0; }
.fx-comment { font-family: Georgia, serif; font-size: 20px; line-height: 1.5; color: var(--fx-text); }
.fx-sources-hero { min-height: 430px; grid-template-columns: 1fr 380px; align-items: center; border-bottom: 1px solid var(--fx-border); }
.fx-method-card {
  background: var(--fx-surface);
  border: 1px solid var(--fx-border);
  padding: 28px;
  box-shadow: var(--fx-shadow);
}
.fx-method-card span { color: var(--fx-muted); text-transform: uppercase; font-size: 12px; font-weight: 700; }
.fx-method-card strong { display: block; font-family: Georgia, serif; font-size: 62px; line-height: 1; margin: 14px 0; }
.fx-two-column.sources { grid-template-columns: 1fr 360px; }
.fx-source-directory { display: grid; gap: 10px; }
.fx-source-directory button {
  width: 100%;
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 14px;
  align-items: center;
  text-align: left;
  padding: 16px;
  background: var(--fx-surface);
  border: 1px solid var(--fx-border);
  color: var(--fx-text);
  cursor: pointer;
}
.fx-source-directory button.active { border-color: var(--fx-accent); box-shadow: 0 0 0 3px var(--fx-blue-soft); }
.fx-source-directory small { display: block; color: var(--fx-muted); margin-top: 3px; }
.fx-source-drawer { position: sticky; top: 86px; }
.fx-source-drawer dl { display: grid; gap: 12px; margin: 20px 0 0; }
.fx-source-drawer div { display: flex; justify-content: space-between; gap: 14px; border-top: 1px solid var(--fx-border); padding-top: 12px; }
.fx-source-drawer dt { color: var(--fx-muted); }
.fx-source-drawer dd { margin: 0; color: var(--fx-text); font-weight: 700; }
.fx-methodology {
  display: grid;
  grid-template-columns: 1fr 0.9fr;
  gap: 34px;
  padding: 34px;
  background: var(--fx-surface);
  border: 1px solid var(--fx-border);
}
.fx-methodology h2 { font-size: 42px; margin: 10px 0 12px; }
.fx-methodology p { font-family: Georgia, serif; font-size: 19px; line-height: 1.65; }
.fx-method-steps { display: grid; gap: 12px; align-content: center; }
.fx-method-steps span { padding: 14px 16px; background: var(--fx-bg); border: 1px solid var(--fx-border); color: var(--fx-text); }
@media (max-width: 920px) {
  .fx-nav { min-height: auto; padding: 18px 18px 14px; }
  .fx-nav-row { gap: 18px 26px; }
  .fx-topic-nav { justify-content: center; flex-wrap: wrap; gap: 14px 22px; }
  .fx-hero, .fx-story-hero, .fx-sources-hero, .fx-stories-hero, .fx-two-column, .fx-two-column.sources, .fx-methodology, .fx-bottom-grid { grid-template-columns: 1fr; }
  .fx-hero { min-height: auto; padding-top: 24px; }
  .fx-story-grid, .fx-story-grid.compact { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .fx-stories-row { grid-template-columns: 42px 130px minmax(0, 1fr); }
  .fx-stories-row .fx-fdi { grid-column: 2 / -1; }
  .fx-community-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .fx-credibility-list { grid-template-columns: 1fr; }
  .fx-compare-panel, .fx-compare-results { grid-template-columns: 1fr; }
  .fx-detail-hero, .fx-detail-grid, .fx-trust-grid { grid-template-columns: 1fr; }
  .fx-headline-list button { grid-template-columns: 1fr; }
  .fx-footer-lede, .fx-footer-links { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .fx-footer-bottom { align-items: start; flex-direction: column; }
  .fx-divergence-row { grid-template-columns: 42px minmax(0, 1fr) 62px; }
  .fx-divergence-level { grid-column: 2 / -1; justify-self: start; }
  .fx-comparison-table button { grid-template-columns: 1fr; }
  .fx-source-drawer { position: static; }
}
@media (max-width: 620px) {
  .fx-page { padding: 22px 16px 56px; }
  .fx-logo { font-size: 36px; }
  .fx-logo span { width: 42px; height: 42px; }
  .fx-links, .fx-topic-nav, .fx-nav-actions { justify-content: center; flex-wrap: wrap; gap: 12px 18px; }
  .fx-hero-copy h1, .fx-story-hero h1 { font-size: 42px; }
  .fx-hero-copy p:not(.fx-eyebrow), .fx-summary { font-size: 18px; }
  .fx-breaking-card { min-height: 340px; }
  .fx-section-header { align-items: start; flex-direction: column; }
  .fx-story-grid, .fx-story-grid.compact { grid-template-columns: 1fr; }
  .fx-stories-row { grid-template-columns: 1fr; }
  .fx-stories-row img { aspect-ratio: 16 / 9; }
  .fx-stories-row .fx-fdi { grid-column: auto; }
  .fx-community-grid { grid-template-columns: 1fr; }
  .fx-credibility-row { grid-template-columns: 1fr; }
  .fx-rating { justify-items: start; }
  .fx-compare-panel { padding: 16px; }
  .fx-detail-hero h1 { font-size: 42px; }
  .fx-detail-score, .fx-neutral-summary, .fx-panel { padding: 18px; }
  .fx-spectrum-track { margin-left: 4px; margin-right: 4px; }
  .fx-spectrum-track button { width: 38px; height: 38px; font-size: 12px; }
  .fx-footer { padding-top: 44px; }
  .fx-footer-lede, .fx-footer-links { grid-template-columns: 1fr; }
  .fx-divergence-row { grid-template-columns: 1fr; gap: 8px; }
  .fx-divergence-rank, .fx-divergence-level, .fx-divergence-row > strong { justify-self: start; text-align: left; }
  .fx-hero-score { min-height: 310px; }
}
`;
