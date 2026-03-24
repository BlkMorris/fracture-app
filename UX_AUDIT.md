> ⚠️ Superseded by UX_AUDIT_v2.md — kept for historical reference only.

# Fracture Frontend — Comprehensive UX Audit

> **Date:** June 2025
> **Scope:** Every page and component in `frontend/src/`
> **Principle:** *"See how every news outlet covers the same story differently, so you can form your own informed opinion."*
> **Two users:** (1) First-time visitor — must understand the product in 10 seconds. (2) Returning power user — fast access to analytical depth.

---

## Table of Contents

1. [Per-Page Audit](#1-per-page-audit)
2. [Cross-Page Audit](#2-cross-page-audit)
3. [Prioritized Findings](#3-prioritized-findings)
4. [Simplification Principles](#4-simplification-principles)

---

## 1. Per-Page Audit

### 1.1 Homepage (`app/page.tsx` — 1,044 lines)

**Purpose:** The front door. Should communicate Fracture's value prop instantly and pull the user into a story.

#### Information Overload
The homepage packs **five distinct sections** above the scroll:

| Section | Data Points Shown |
|---|---|
| **HeroWithSidebar** | Hero image, headline, topic badge, breaking/trending badge, velocity score, trend boost, article count, source count, FDI score, summary, 2 CTAs |
| **Trending sidebar** | Numbered list of stories, each with FDI score + title |
| **PerspectiveContrast** | Left vs Right article with source names, lean labels, framing type pills, sentiment emojis, DiGauge (SVG arc), 6 sub-score bars (Sentiment, Framing, Entity, Linguistic, Source Sel., Structure) |
| **FracturedSection** | "Most Fractured" header, FDI number, divergence bar, two-pane article comparison |
| **MoreStoriesList** | 2-column list of 12 stories, each with FDI, title, article/source count, topic, time |

A first-time visitor sees *divergence scores, framing types, political lean dots, sentiment emojis, and six unnamed sub-metrics* — all before scrolling. There is no sentence explaining what any of this means.

#### Clarity & Terminology
- **"FDI"** appears as a colored number next to every story. The three-letter abbreviation is never expanded on-page. A new user cannot guess what it stands for.
- **PerspectiveContrast sub-scores** use terse labels: "Sentiment", "Framing", "Entity", "Linguistic", "Source Sel.", "Structure". These abbreviations are different from labels used on other pages (see Cross-Page §2.3).
- **Framing type pills** (Conflict, Human Interest, Economic, Moral, Responsibility) appear with icons but no explanation of what "framing type" means.
- **Sentiment emojis** (🟢🟡⚪🟠🔴) are shown in the LatestFeed featured card — clever, but the scale is never explained.
- **"Trend Boost"**, **"Velocity Score"** appear in meta bars. Both are insider analytics jargon.

#### User Flow
- Hero CTA buttons are **"Deep Dive →"** (→ `/story/{id}`) and **"Compare Coverage"** (→ `/compare?cluster={id}`). Good — two clear entry points.
- MoreStoriesList rows link to `/story/{id}`. There is no link to `/journey/{id}` from the homepage, so the Journey experience is only discoverable via the navbar.
- LatestFeed articles link to external source URLs (`target="_blank"`). The user leaves Fracture entirely — no way to return to the cluster context.
- The "Compare All Coverage →" link inside PerspectiveContrast is the **only visible path** to the Compare page from the homepage body.

#### Redundancy
- The **FracturedSection** and **PerspectiveContrast** both show the same story's left-vs-right comparison in different formats within the same viewport. The user sees the same data twice.
- **MagazineCard** and **MoreStoriesRow** both show FDI + title + article/source counts — overlapping information in different visual formats within the same scroll.

---

### 1.2 Story Detail (`app/story/[clusterId]/page.tsx` — 610 lines)

**Purpose:** Full analytical deep-dive on a single story cluster.

#### Information Overload
This page is structured as a 2-column layout (8 + 4 grid) with:

| Area | Contents |
|---|---|
| **Label bar** | Topic category, "Story Cluster" tag, trending badge |
| **Header** | Headline, FRACTURED badge, time ago, article count, source count |
| **Summary** | Blockquote |
| **Main: FDI Meter** | Circular gauge + "Fracture Divergence Index" label |
| **Main: Source Spectrum** | Horizontal bar with LEFT/RIGHT labels, source dots |
| **Sidebar: Divergence Breakdown** | 6 sub-metric bars with labels + percentages |
| **Sidebar: Narrative Frames** | Left frame / Right frame quoted summaries |
| **Sidebar: Timeline** | Compact timeline entries |
| **"How They Headlined It"** | 3-column newspaper layout (Left-Leaning / Center / Right-Leaning) |
| **"All Coverage"** | Full article grid with show more/less |

The sidebar alone shows **6 labeled metric bars**, each with a percentage. The sub-metric labels here are: "Headline Sentiment", "Framing Entropy", "Entity Framing", "Linguistic Spread", "Source Variance", "Structural Divergence". A returning analyst might love this; a casual reader will bounce.

#### Clarity & Terminology
- **"Fracture Divergence Index"** — the full name appears here (and almost nowhere else). Good, but it would be better as an ever-present definition.
- **"Framing Entropy"** — entropy is a physics/information-theory term. Most readers will not understand it.
- **"Entity Framing Divergence"** — what entities? Named people? Organizations? Unexplained.
- **"Linguistic Embedding Spread"** (rendered as "Linguistic Spread") — this is an NLP implementation detail leaking into the UI.
- **"Story Cluster"** tag in the label bar — the word "cluster" is technical. To a user, it's just "a story."
- **"How They Headlined It"** — by far the most intuitive section name on the page.

#### User Flow
- Links to individual external articles open in new tabs — good.
- "Narrative Frames" section in the sidebar shows quoted summaries with source names. There is no CTA to expand or compare further.
- No breadcrumb or "back to feed" link at the top.
- No link from this page to the Journey version of the same story, even though both exist for the same `clusterId`.

#### Redundancy
- The "Source Spectrum" bar and the "How They Headlined It" 3-column layout both communicate the same core idea (who is left/center/right). The spectrum is more compact; the headlines are more tangible. Both are valuable, but the spectrum could be folded into the headline section header rather than being a standalone card.

---

### 1.3 Journey Landing (`app/journey/page.tsx` — 285 lines)

**Purpose:** Browse all story clusters in a guided-experience format.

#### Information Overload
Each JourneyCard shows: image, status badge, fractured badge, topic category, FDI score, title, summary, divergence bar, article count, source count, and time. That is **10+ data points per card** in a grid of cards. The grid format means the user sees 6–9 of these simultaneously.

#### Clarity & Terminology
- **"Journey"** — the header says "Journey" with a compass icon and a subtitle about "the media landscape." The word Journey does not convey "guided narrative analysis of a news story."
- **Status badges** ("Active", "Developing", "Archived") appear but their meaning is derived from `updatedAt` timestamps, not explicit editorial status. "Developing" doesn't appear in the code — only "BREAKING", "ACTIVE", "ARCHIVED" (from `statusBadge()` in style-utils).
- The sort options ("Divergence", "Recent", "Trending") are clear.

#### User Flow
- Cards link to `/journey/{clusterId}`. Good.
- Pagination controls at the bottom. Standard.
- No search or filter beyond sort. If a user wants a specific topic, they must use the Search page (which is a separate nav item).

#### Redundancy
- This page is essentially a differently-styled version of the homepage MoreStoriesList. Both show the same clusters from the same API, with the same data points, linking to different detail pages (`/story/` vs `/journey/`).

---

### 1.4 Journey Detail (`app/journey/[clusterId]/page.tsx` — 811 lines)

**Purpose:** A chapter-based, scroll-driven narrative experience for understanding a story's fracture.

#### Information Overload
The page is broken into **7 chapters**, each answering a question:

| Chapter | Question | Content |
|---|---|---|
| 1 | "What is this story?" | Headline, image, summary, stats |
| 2 | "How divided is the coverage?" | 192px circular FDI gauge, 6 sub-metrics in 2-col grid |
| 3 | "Who is covering it?" | Source spectrum bar, source chips |
| 4 | "How are the two sides framing it?" | Left/Right frame comparison with VS divider |
| 5 | "What are the actual headlines?" | Full headline list with lean indicators |
| 6 | "How did this story evolve?" | Vertical timeline |
| 7 | "Show me all the articles" | Article cards with show more/less |

**This is the best progressive disclosure in the entire app.** The chapter structure guides the user step by step. However, Chapter 2 dumps all 6 sub-metrics at once (the same problem as the Story page sidebar) and uses full technical names: "Headline Sentiment Spread", "Framing Type Entropy", "Entity Framing Divergence", "Linguistic Embedding Spread", "Source Selection Variance", "Structural Divergence".

#### Clarity & Terminology
- Chapter question labels are **excellent**: "What is this story?", "How divided is the coverage?" — plain English, genuinely inviting.
- The sub-metric labels in Chapter 2 are pulled from a `metricLabels` dictionary using the full technical names from the type system. These should be human-readable.
- **"FDI Score"** label in Chapter 2 is better than just "FDI" but still assumes the reader knows the acronym.
- The **"VS" divider** in Chapter 4 is a strong visual metaphor that immediately communicates comparison.
- **"End of Story Analysis"** footer is a satisfying closure cue.

#### User Flow
- Chapters are rendered with `ChapterSpacer` (80px gap) and scroll-reveal animations — the pacing is intentional and well-executed.
- Chapter 1 has a **bouncing scroll prompt** ("Scroll to begin ↓") — good affordance for the scroll-driven model.
- No table of contents or chapter navigation — on a long page, users cannot jump to Chapter 5 without scrolling through 1–4.
- No link to the Story page (`/story/{id}`) or Compare page from here. The two detail experiences are siloed.

#### Redundancy
- **This page shows identical data to the Story page** (`/story/[clusterId]`). Both use `useStory()` + `useSnapshot()` hooks to fetch the same cluster + snapshot data. The Journey page presents it as chapters; the Story page presents it as a dashboard. The user has no indication that these are two views of the same thing, and there is no toggle or link between them.

---

### 1.5 Compare Page (`app/compare/page.tsx` — 835 lines)

**Purpose:** Side-by-side article comparison for a story cluster, with keyword highlighting and structural metrics.

#### Information Overload
This is the most analytically dense page in the app:

| Section | Data Points |
|---|---|
| **Masthead** | Cluster selector, headline, "Fracture Divergence Index" in meta bar, summary |
| **CoverageBreakdown** | Left/Center/Right article counts |
| **SourceSpectrum** | Source positions on lean axis |
| **Divergence strip** | Colored bar |
| **FramingSummary** | Dominant framing for left vs right sources + avg sentiment |
| **Newspaper columns** | Left article + Right article, each with highlighted keywords, framing badge, lede type, and **6 structural metrics** (H. Sentiment, B. Sentiment, H–B Gap, Sources, Quote Ratio, Divergence) |
| **Center gutter** | 6 metric comparison bars (H.Sent, B.Sent, H-B, Sources, Named%, Lean) between the two columns |
| **More Perspectives** | Grid of other articles to swap into comparison |
| **Keyword Legend** | Left-leaning / Neutral / Right-leaning color key |

The newspaper column layout is visually stunning — it genuinely looks like comparing two newspaper front pages. But each column contains **6 structural metrics** (H. Sentiment, B. Sentiment, H–B Gap, Sources, Quote Ratio, Divergence), plus the center gutter shows **6 more comparison bars**. That's 12+ metrics in the comparison view alone.

#### Clarity & Terminology
- **"H. Sentiment"**, **"B. Sentiment"**, **"H–B Gap"** — abbreviated journalism metrics that even many journalists wouldn't recognize.
- **"Lede"** — industry-specific spelling of "lead paragraph." Almost no general reader knows this word.
- **"Named Source Ratio"**, **"Quote-to-Narrative Ratio"** — these are structural analysis metrics borrowed from academic media studies.
- **"Metrics Gap"** label on the center gutter — what gap? Between the two articles? The label needs more context.
- **Keyword Legend** explaining "Left-leaning / Neutral / Right-leaning" highlighting is a **genuinely helpful** affordance.

#### User Flow
- The cluster selector dropdown at the top lets the user switch stories — good.
- Source picker dropdowns let the user choose which left/right articles to compare — excellent interaction.
- "More Perspectives" grid lets the user click other articles to swap them into the comparison — this is the most powerful interactive feature in the app and it works well.
- **StoryFractureGraph is commented out** — an unfinished feature visible in source.
- A "Back to feed" link exists but is also commented out.

#### Redundancy
- CoverageBreakdown, SourceSpectrum, and the newspaper column source badges all communicate "who is left/center/right" in three different formats on the same page.

---

### 1.6 Search / Discovery (`app/search/page.tsx` — 693 lines)

**Purpose:** Find stories by keyword, with trending topics as discovery prompts.

#### Information Overload
The search page is relatively clean compared to others. The results view shows:
- **Top Story Clusters** — SearchClusterCard with thumbnail, topic keywords, FDI, title, summary, article/source counts
- **Related Articles** — SearchArticleCard with lean indicator, source, framing type, title, summary
- **Sidebar** — Related Topics pills, Trending Now list, Back to Feed link

This is one of the least overloaded pages — **well done**.

#### Clarity & Terminology
- **"Discovery Search"** eyebrow label — "Discovery" is unnecessary. "Search" alone is sufficient.
- Empty state shows **"Discover Stories"** heading with trending topics and suggested searches — excellent onboarding pattern.
- **"FDI"** appears in search results without explanation (consistent problem).
- Topic keyword pills on SearchClusterCard are helpful context.

#### User Flow
- Search form submits on Enter, with a clear search icon button.
- Empty state provides **trending topics** (clickable pills that populate the search) and **suggested searches** (pre-set queries). This is the best empty state in the app.
- Results link to `/story/{id}` for clusters and either `/story/{id}` or external URL for articles.
- Sidebar "Related Topics" are clickable — good for exploration.
- No autocomplete or search-as-you-type.

#### Redundancy
- Minimal. The search page serves a distinct purpose and doesn't duplicate other pages' content.

---

### 1.7 Digest / Intelligence Feed (`app/digest/page.tsx` — 1,217 lines)

**Purpose:** A personalized intelligence feed with alerts, divergence updates, coverage shifts, and a configurable alert system.

#### Information Overload
This is the **longest page in the entire app** (1,217 lines) and the most complex:

| Area | Contents |
|---|---|
| **Left sidebar** | Topic list with FDI scores + trend arrows, Quick Stats (5 metrics), Coverage Matrix (sources × stories heatmap) |
| **Feed** | Unified stream of Divergence Update cards, Alert cards, Coverage Shift cards — each with multiple data points |
| **Alert config modal** | Rule management with type/topic/threshold configuration |

Each **Divergence Update card** contains: topic color dot, category, fractured badge, headline, FDI score (large), trend direction + delta, article/source count, sparkline chart, left/right frame quotes, source chips — **that's 12+ data points per card**, and the feed shows many of these simultaneously.

The **Coverage Matrix** in the sidebar is a heatmap of outlets × stories with 2-letter abbreviations. It requires a data analytics background to interpret correctly.

#### Clarity & Terminology
- **"Intelligence Feed"** — positions this as a professional intelligence tool, not a consumer news reader.
- **"Divergence Spike"**, **"Framing Shift"**, **"Omission Alert"**, **"New Coverage"** — alert type names that are clear to power users but opaque to newcomers.
- **"Coverage Matrix"** — a heatmap is an advanced visualization that most news readers have never seen.
- Quick stats include **"Most Fractured"** (what does it mean for a story to be fractured?), **"Avg Divergence"** (what is divergence?), **"Sources Tracked"**.

#### User Flow
- Feed filter bar (All / Alerts Only / Divergence / Coverage) is straightforward.
- Topic filter in sidebar is click-to-toggle — clean.
- Alert configuration modal lets users add rules — but **alert rules are stored only in local React state**, not persisted to the backend. Refreshing the page resets them to defaults.
- All feed cards link to `/story/{id}` — consistent.
- The page requires auth context (`useAuth`) but doesn't enforce protected routing.

#### Redundancy
- Divergence Update cards in the feed contain mini-versions of what the Story page shows (FDI, frames, source chips, sparkline). This is intentional for a dashboard pattern but creates significant visual density.

---

### 1.8 Auth Pages (`login`, `register`, `forgot-password`, `unauthorized`)

**Purpose:** Authentication flow.

These pages are straightforward forms with minimal data. Briefly:
- **Login** — email/password form with SSO button stubs (Google, GitHub, Twitter), link to register and forgot password.
- **Register** — name/email/password/confirm form.
- **Forgot Password** — email input with stub success state.
- **Unauthorized** — "Access Denied" message with link to login.

**UX notes:**
- Auth pages use the same editorial design system (serif headings, mono labels) — consistent.
- SSO buttons are non-functional stubs — they should either work or not be shown.
- No password strength indicator on registration.
- The `FRACTURE` brand header on auth pages links home — good escape hatch.

---

## 2. Cross-Page Audit

### 2.1 Navigation Audit

**Navbar links:** Feed (→ `/`), Digest (→ `/digest`), Journey (→ `/journey`), Compare (→ `/compare`), Trending, Saved

Issues:
- **"Trending"** and **"Saved"** appear in the navbar but have **no corresponding pages**. Clicking them would 404 or go nowhere.
- **"Feed"** and **"Digest"** are two names for content feeds. The distinction (Feed = homepage with hero/trending; Digest = intelligence dashboard) is not obvious from the labels alone.
- **"Journey"** is a unique brand term. New users don't know what a "Journey" is vs. a "Story."
- **"Compare"** requires a cluster context to be useful. Navigating to `/compare` without a `?cluster=` parameter shows a cluster selector, which works, but the empty state could be disorienting.
- The **search icon** in the navbar links to `/search` — good, but it's visually separate from the navigation links and might be missed.

### 2.2 Journey vs Story Page Differentiation

This is the single most significant structural issue in the app.

**Both pages:**
- Fetch the same data (`useStory()` + `useSnapshot()` + `useClusterArticles()`)
- Display the same cluster's headline, summary, FDI score, sub-metrics, source spectrum, left/right frames, headlines, timeline, and article list
- Use the same types (`StoryCluster`, `NarrativeSnapshot`, `Article`)

**Differences:**
| Dimension | Story Page | Journey Page |
|---|---|---|
| Layout | 2-column dashboard | Single-column scroll |
| Progressive disclosure | All visible at once | Chapter-by-chapter reveal |
| Section labels | Dashboard headers | Question prompts ("How divided is the coverage?") |
| Visual density | High — everything on screen | Moderate — spacers between chapters |
| Linking | Linked from homepage, search | Linked from Journey landing page only |

**The problem:** A user who visits `/story/abc123` and `/journey/abc123` sees the same story told two ways with no explanation of why both exist, no toggle between them, and no indication that the other view is available.

**Recommendation:** Either (a) merge them into a single page with a layout toggle (Dashboard / Guided), or (b) clearly differentiate their purposes — e.g., Journey = "first time understanding this story", Story = "returning for the latest data."

### 2.3 Terminology Consistency

The same concept is labeled differently across pages and components:

| Concept | Homepage | Story Page | Journey Detail | Compare Page | Digest | Components |
|---|---|---|---|---|---|---|
| **Divergence score** | "FDI" | "Fracture Divergence Index" | "FDI Score" | "Fracture Divergence Index" | "FDI" | "FDI", "Narrative Divergence" |
| **Sub-metric: Sentiment** | "Sentiment" | "Headline Sentiment" | "Headline Sentiment Spread" | "H. Sentiment" | — | "Headline Sentiment" |
| **Sub-metric: Framing** | "Framing" | "Framing Entropy" | "Framing Type Entropy" | — | — | "Framing" |
| **Sub-metric: Entity** | "Entity" | "Entity Framing" | "Entity Framing Divergence" | — | — | "Entity" |
| **Sub-metric: Linguistic** | "Linguistic" | "Linguistic Spread" | "Linguistic Embedding Spread" | — | — | — |
| **Sub-metric: Source** | "Source Sel." | "Source Variance" | "Source Selection Variance" | — | — | — |
| **Sub-metric: Structure** | "Structure" | "Structural Divergence" | "Structural Divergence" | — | — | — |
| **Political position** | "Left"/"Right" | "Left-Leaning"/"Right-Leaning" | "LEFT"/"RIGHT" | "Left"/"Right" | "Left Frame"/"Right Frame" | "Lean", "Stance", "Bias" |
| **Tone** | (emoji) | (none) | (none) | "H. Sentiment"/"B. Sentiment" | — | "Critical"/"Favorable"/"Neutral" vs "Negative"/"Positive"/"Neutral" |
| **Score severity** | — | — | — | — | — | 30/60 vs 30/60/80 vs 40/70 (inconsistent thresholds) |

**The core problem:** Six different names for the same six sub-metrics, three different terms for political lean, two different tone vocabularies, and inconsistent severity thresholds.

### 2.4 Progressive Disclosure

**What works:**
- Journey detail page chapters — the best progressive disclosure in the app.
- Search empty state with trending topics → results → detail page.
- Compare page "More Perspectives" grid for swapping articles.
- Story page "How They Headlined It" section — concrete and tangible after abstract metrics.

**What doesn't work:**
- Homepage dumps Hero + PerspectiveContrast + FracturedSection + MoreStoriesList + LatestFeed on the user all at once.
- Story page sidebar shows all 6 sub-metrics simultaneously with no option to expand/collapse.
- Compare page shows 12+ metrics in the comparison view with no way to simplify.
- Digest page feed cards contain 12+ data points each.

### 2.5 Onboarding Gap

There is **zero onboarding** anywhere in the app:

- No explanation of what **"Fracture Divergence Index"** means or how it's calculated.
- No explanation of what makes a story **"Fractured"** (threshold ≥ 60? never stated).
- No explanation of the **left/center/right political spectrum** used to classify sources.
- No explanation of what **framing types** are or why they matter.
- No tooltip, popover, or help icon on any metric label.
- No "How It Works" page, onboarding tour, or first-visit experience.
- No glossary or methodology page (the footer links to `#` — dead links).

A first-time visitor sees numbers, colored bars, and jargon with no way to learn what any of it means. The app assumes domain expertise that most users do not have.

### 2.6 Mobile Considerations

Based on code analysis:
- **Homepage:** Uses responsive `lg:grid-cols-12` → stacks to single column on mobile. The PerspectiveContrast with its 6 sub-metric bars becomes very tall.
- **Story page:** 2-column `lg:grid-cols-12` → sidebar stacks below main content. Sidebar metrics move far below the fold.
- **Journey detail:** Single-column layout works well on mobile — this is inherently mobile-friendly.
- **Compare page:** The newspaper column layout (`grid-cols-12` with 5/2/5 split) collapses. The center gutter metrics and side-by-side comparison break on narrow screens.
- **Digest page:** The 320px sidebar is hidden on mobile (`hidden lg:flex`). Mobile users lose the topic filter, quick stats, and coverage matrix.
- **Navbar:** Has a mobile drawer with search and all links — good parity.

### 2.7 Dead Links & Stubs

| Item | Location | Issue |
|---|---|---|
| Navbar "Trending" | `Navbar.tsx` | No `/trending` page exists |
| Navbar "Saved" | `Navbar.tsx` | No `/saved` page exists |
| Footer "Methodology" | `Footer.tsx` | Links to `#` |
| Footer "About" | `Footer.tsx` | Links to `#` |
| Footer "API" | `Footer.tsx` | Links to `#` |
| SSO buttons | `login/page.tsx` | Non-functional stubs |
| StoryFractureGraph | `compare/page.tsx` | Commented out |
| "Back to feed" link | `compare/page.tsx` | Commented out |
| Alert rules persistence | `digest/page.tsx` | Local state only — not persisted |

---

## 3. Prioritized Findings

### 🔴 Critical — Blocks core value delivery

**C1. No onboarding or explanation of core concepts.**
The central metric (FDI) is a three-letter acronym shown on every page, every card, and every ticker item. It is never defined for the user. A first-time visitor cannot form an informed opinion because they cannot interpret the data. This directly undermines the value proposition.

**C2. Journey and Story are duplicate pages with no differentiation.**
Two separate pages show identical data for the same story with different layouts. No toggle, no link between them, no explanation of which to use. This doubles maintenance cost and confuses navigation.

**C3. Sub-metric labels are inconsistent across pages.**
The same six divergence sub-metrics have different names on the homepage, Story page, Journey detail, and in components. This makes the analytical framework feel unreliable.

### 🟠 High — Significant UX friction

**H1. Homepage information density is overwhelming.**
Five content sections with 50+ data points visible on first load. The hero alone has 10+ distinct pieces of information. New users have no visual hierarchy guiding them to the most important element.

**H2. Expert jargon in user-facing labels.**
Terms like "Framing Entropy", "Entity Framing Divergence", "Linguistic Embedding Spread", "Lede", "Named Source Ratio", "Quote-to-Narrative Ratio", "H–B Gap" appear in the UI. These are implementation details from the NLP pipeline, not user-facing concepts.

**H3. Navbar contains dead links (Trending, Saved).**
Two primary navigation items lead nowhere. This erodes trust and makes the app feel unfinished.

**H4. Political lean terminology is inconsistent.**
The same concept is called "Lean", "Bias", "Stance", and "Political Lean" across different components. The lean indicator uses `leanLabel()` in some places and raw numeric values in others.

**H5. Sentiment/tone vocabulary clash.**
`StoryComparisonPanel` uses "Critical"/"Favorable"/"Neutral" while `narrative/NarrativeTimeline` uses "Negative"/"Positive"/"Neutral". The BiasMap uses raw numeric sentiment values. Three different systems for the same concept.

### 🟡 Medium — Noticeable issues

**M1. Divergence severity thresholds are inconsistent.**
`DivergenceMeter` uses 30/60/80 (four tiers: LOW/MODERATE/HIGH/EXTREME). `DivergenceBadge` uses thresholds that map to Low/Moderate/High (three tiers). `NarrativeSnapshotCard` uses 30/60 (three tiers). The color breaks differ, so the same score can be "moderate" in one component and "high" in another.

**M2. Compare page is analytically dense without progressive disclosure.**
12+ metrics visible simultaneously in the newspaper column comparison. No way to collapse the structural metrics or show a simplified view.

**M3. LatestFeed articles link externally with no return path.**
Users who click "Read Article" in the LatestFeed leave Fracture entirely. There is no "Read on [source] and return to the story cluster" pattern.

**M4. Digest page alert rules are not persisted.**
The alert configuration modal stores rules in React state. Refreshing the page resets all rules to hardcoded defaults. This breaks the personalization promise of the Intelligence Feed.

**M5. Two components named `NarrativeTimeline`.**
`components/story/NarrativeTimeline.tsx` (scatter plot) and `components/narrative/NarrativeTimeline.tsx` (vertical list) share the same name but have completely different UIs and semantics.

**M6. Footer links are dead.**
"Methodology", "About", and "API" all link to `#`. The Methodology link is especially important — it's where users should go to understand the analytical framework.

**M7. FracturedStoryCard blindspot warnings need context.**
Labels like "⚠ Left-heavy" and "⚠ Right-heavy" on story cards could be interpreted as editorial judgment rather than coverage-gap analysis. A tooltip explaining "This story has more coverage from left-leaning sources" would help.

**M8. No breadcrumbs or cross-links between detail pages.**
Story, Journey, and Compare pages for the same cluster have no links to each other. A user on `/story/abc` cannot discover `/journey/abc` or `/compare?cluster=abc` without returning to navigation.

### 🟢 Low — Polish items

**L1. `FadeImage` uses `<img>` instead of Next.js `<Image>`.**
Loses automatic optimization (lazy loading, WebP conversion, responsive sizing).

**L2. `StoryFractureGraph` has non-deterministic layout.**
Random X offsets on leaf nodes mean the tree renders differently on each visit.

**L3. No colorblind-safe alternatives for lean colors.**
The blue (left) / red (right) / gray (center) scheme is accessible to most colorblind users, but the divergence scale (green → yellow → red) is problematic for red-green colorblindness.

**L4. SSO buttons are non-functional stubs.**
Login page shows Google, GitHub, and Twitter SSO buttons that do nothing. Better to hide them until implemented.

**L5. Coverage Matrix in Digest sidebar uses 2-letter outlet abbreviations.**
Abbreviations like "NW" for unknown outlets are uninterpretable without hover, and there are no hover tooltips.

**L6. HighlightedText keyword tooltips show raw data.**
Tooltip text like `"economy" — lean: +0.3, weight: 5` exposes implementation details. Should be something like `"economy" — tends to appear in right-leaning coverage`.

### ✅ Things Working Well

**W1. Journey detail chapter structure.**
The question-driven chapters ("What is this story?", "How divided is the coverage?") are the best progressive disclosure pattern in the app. The pacing, scroll prompts, and spacers create a genuinely engaging reading experience.

**W2. Search empty state.**
Trending topics and suggested searches provide excellent discovery for new users. This is the best onboarding-adjacent experience in the app.

**W3. Compare page source picker.**
The ability to pick which articles to compare, plus "More Perspectives" for swapping, is a powerful and well-implemented interaction.

**W4. Editorial visual design system.**
The bone/cream palette, serif headlines, mono metadata, and newspaper-inspired layouts create a distinctive, trustworthy aesthetic. The design feels like a credible analytical publication.

**W5. Consistent color semantics.**
Blue = left, red = right, green/yellow/red = divergence severity. The color system is applied consistently across the app (with the caveat of threshold inconsistencies).

**W6. Keyword highlighting on Compare page.**
The framing keyword system (from `lib/framing.ts`) that highlights politically-loaded terms in article text with lean-colored backgrounds is a genuinely novel and useful feature.

**W7. "How They Headlined It" section.**
The 3-column newspaper layout on the Story page is the most immediately understandable visualization of the core value prop: same story, different headlines.

**W8. Skeleton loading states.**
Every page has detailed, structurally-accurate loading skeletons that match the real layout. This prevents layout shift and maintains perceived performance.

**W9. FDI color coding.**
The green (low) → amber (moderate) → red (high) color progression for divergence scores is immediately intuitive — higher divergence = more red = more attention-worthy.

**W10. Responsive mobile nav.**
The Navbar mobile drawer provides full search and navigation parity with desktop.

---

## 4. Simplification Principles for Fracture

These principles are derived directly from the audit findings above. They are specific to Fracture's domain of media analysis.

### P1. "Name it once, name it everywhere."
Choose one canonical name for each concept and use it consistently:
- The score is the **"Fracture Divergence Index (FDI)"** — always show both on first occurrence per page, then abbreviate.
- Political position is **"lean"** — not bias, stance, or political lean.
- Tone is **"sentiment"** — positive, neutral, negative. Never "critical/favorable."
- Sub-metrics get **one set of human names**: e.g., "Headline Tone Gap" instead of both "Headline Sentiment" and "Headline Sentiment Spread".

### P2. "Show the story first, show the data second."
For every section, lead with the concrete (a headline, a quote, a source name) and follow with the abstract (a score, a bar, a metric). The Compare page's newspaper columns do this well. The homepage's PerspectiveContrast does the opposite — it leads with a DiGauge and sub-score bars.

### P3. "Two numbers, not twelve."
On any single view, show at most **two primary metrics** (FDI score + one supporting dimension). Offer the remaining metrics behind an "expand" or "details" affordance. The Journey chapter model already achieves this — each chapter focuses on one dimension.

### P4. "Every abbreviation earns a tooltip."
Any label shorter than a full word (FDI, H. Sent, H–B) must have a tooltip explaining what it stands for. Any concept with a score (FDI, sentiment, lean) must have a tooltip explaining the scale. This is the lowest-effort, highest-impact fix in the audit.

### P5. "One story, one page."
A story should not have two parallel detail pages. Either unify Journey and Story into one page with a view toggle, or make Journey the default and eliminate the Story page as a separate route.

### P6. "Explain on first sight."
The first time a user encounters FDI, framing types, or lean labels in a session, show an inline explanation or contextual popover. Subsequent occurrences can use the abbreviated form. This can be implemented with a dismissible "first visit" banner or a contextual `?` icon.

### P7. "Don't ship dead links."
Remove Trending and Saved from the navbar until those features exist. Remove SSO buttons until they work. Point footer links to real pages or remove them. Unfinished features that are visible to users damage credibility more than missing features do.

### P8. "Connect the views."
When a user is on any detail page for a story, show lightweight links to the other views: "View as guided analysis →" (Journey), "View dashboard →" (Story), "Compare articles →" (Compare). This turns siloed pages into a connected experience.

---

*End of audit. No code was modified.*
