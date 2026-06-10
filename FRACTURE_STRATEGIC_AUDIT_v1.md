# FRACTURE — Strategic Audit & Redesign Framework v1

**Version:** 1.0  
**Date:** June 9, 2026  
**Status:** Strategic direction and implementation roadmap

---

## The Strategic Center (Your North Star)

Fracture is fundamentally a **media trust platform**, not a news organization. You're solving: *"I trust my usual sources, but am I getting the full picture?"* 

The flow is:
1. **User sees trending stories** (what's actually breaking/popular across the media landscape)
2. **User discovers which trending stories are most divergent** (FDI becomes the hook that keeps them engaged)
3. **User clicks story and sees side-by-side framing comparison** (the aha moment: "Oh, this outlet framed it totally differently")
4. **User reads Fracture's neutral summary** + **sees source spectrum** + **can filter/compare outlets**
5. **User comments and shares insight** (community credibility layer)
6. **User leaves with knowledge they then share** ("Did you know outlet X reported this differently?")

This is **elegant, differentiated, and not cluttered**. The issue is that your current architecture scatters these moments across disconnected pages.

---

## IMMEDIATE CLEANUP: What to Remove

These are the "dashboard cruft" items that are making the app feel choppy and analytics-focused:

| Item | Why Remove | Action |
|---|---|---|
| **Stats page** | It's analytical and dashboard-like. Users don't care about "total articles analyzed" or "sources monitored." | Delete `/stats` route and references. |
| **Briefing page** (if it duplicates homepage) | One canonical homepage experience. If briefing is just a text-based version, it's clutter. | Consolidate into homepage or delete. |
| **Trending page** (if separate) | Trending should be *within* the homepage, not a separate page. | Integrate into homepage filtering/sorting. |
| **Dashboard/Account routes** | Don't promise these until you're ready. Remove from nav. | Delete broken links immediately. |
| **Checkout/Enterprise/Pricing CTAs** | Remove until subscription is built. Replace with waitlist CTA or remove entirely. | Hide or delete. |
| **Legal pages as placeholders** | Add `/privacy` and `/terms` with real copy before launch. | Either build now or remove links. |
| **Mockups directory** | Cleanup artifact. | Delete `/app/mockups`. |
| **`app/var(...)` artifact files** | Filesystem clutter. | Delete. |

**Result:** Your core app is **homepage → story detail → search**. Elegant. Focused. News-outlet-like.

---

## PAGE ARCHITECTURE: What Should Exist (and How)

Here's the refined page structure that will feel like a **unified news experience**:

### 1. Homepage (The Heart)

This is where the magic happens. Structure it as:

```
┌─ Header: Logo, Search, Light/Dark toggle, User menu
├─ Alert Banner (optional): "Breaking" indicator if major story in last hour
├─ Story Grid/Feed (Primary):
│  ├─ Trending stories sorted by volume
│  ├─ FDI badge prominently displayed on each card
│  ├─ Visual: [Large Image] [Headline] [Summary excerpt]
│  │          [FDI badge + "High Divergence"] [Source count: "12 outlets"]
│  └─ Load more / Pagination
├─ Sidebar OR Top Nav Filters:
│  ├─ Topics: All, Politics, Tech, Business, Sports, etc.
│  ├─ FDI Filter: "Only High Divergence" toggle (optional secondary path)
│  └─ Refresh indicator: "Last updated 2 mins ago"
└─ Footer: Sources guide, About, Contact
```

**Design principle:** Light, airy, magazine-like. Large images. Breathing room. Not a wall of text. The FDI badge should be visually interesting (maybe a divergence meter or spectrum visualization) but not overwhelming.

---

### 2. Story Detail Page (The Deep Dive)

This is where **divergence comparison becomes the hero**. Structure:

```
┌─ Header: [Story headline] [FDI badge with large visualization]
├─ Fracture Summary Section:
│  ├─ Auto-generated neutral summary of the story (2-3 sentences)
│  └─ "Why we're covering this: [FDI score is 78/100 - high divergence]"
├─ Source Spectrum Visualization (THIS IS KEY):
│  ├─ Visual spectrum showing where each outlet sits on the story
│  ├─ Example: Conservative ←→ Centrist ←→ Progressive
│  │  OR: Skeptical ←→ Neutral ←→ Enthusiastic (depending on story type)
│  └─ Click outlet → see that outlet's headline + framing
├─ Headline Comparison Table:
│  ├─ Side-by-side headline view (not full articles)
│  ├─ Outlet | Headline | Sentiment | Divergence from average | View source (small link)
│  ├─ Color-code divergence (green = moderate, red = high divergence)
│  └─ Allow sort: "Most divergent" vs "Most coverage" vs "Recency"
├─ Story Details:
│  ├─ First reported by: [outlet + timestamp]
│  ├─ Coverage span: [timeline showing when outlets reported]
│  └─ Story category/beat
├─ User Comments Section:
│  ├─ "What do you make of this divergence?"
│  └─ Users share insights, flag inaccuracies
├─ Feedback Widget (Subtle):
│  ├─ "Is this FDI score accurate?" [Thumbs up/down]
│  └─ "Flag an error" link → simple form
└─ Footer: Sources guide, Related stories
```

**Design principle:** The divergence visualization should be *stunning*. This is the aha moment. Make it feel revelatory, not analytical.

---

### 3. Search Page

Keep minimal. It's a utility page. Structure:

```
┌─ Large search input (Google-style)
├─ Filter panel:
│  ├─ Time range: Last 24h, Week, Month, Year
│  ├─ Topic/beats
│  ├─ FDI range: "Show me high divergence only"
│  └─ Source filter: "Only from these outlets" (optional)
├─ Results:
│  ├─ Grid or list view
│  └─ Same card format as homepage (consistency!)
└─ Empty state: "No stories match. Try broadening your filters."
```

---

### 4. Sources Guide Page (NEW - CRITICAL FOR TRUST)

This is huge for transparency. Structure:

```
┌─ Header: "How Fracture Sources News"
├─ Overview:
│  ├─ "Fracture monitors [N] news outlets across [regions/beats]"
│  ├─ "All sources are listed below. No outlet is hidden."
│  └─ "We measure divergence, not bias. All viewpoints matter."
├─ Source Directory:
│  ├─ Table or grid: Logo | Name | Category | Coverage span | Learn more
│  └─ Clicking → shows:
│      - How many stories they publish per day
│      - Their typical FDI range (do they tend to diverge?)
│      - Sample stories they broke
│      - User feedback score (crowd-sourced trust rating?)
├─ Methodology Section:
│  ├─ "How we measure divergence"
│  ├─ "How we assign topics/beats"
│  ├─ "How we generate summaries"
│  └─ "How we ensure accuracy"
├─ Transparency Report (maybe monthly):
│  ├─ "Sources we removed and why"
│  ├─ "Accuracy improvements made"
│  └─ "User feedback themes"
└─ Feedback: "Flag an outlet" or "Suggest an outlet"
```

**Why this is important:** Users need to trust Fracture's *curation* of sources. Transparency = credibility.

---

### 5. Topics/Beats Pages (Optional, but Nice)

If you support topic filtering, make dedicated pages optional:

```
/topics/politics
/topics/tech
/topics/business
/topics/sports
```

Each shows:
- Top stories in that beat (same feed format)
- Source breakdown for that beat (e.g., "Tech stories average 3 more outlets than Politics")
- Maybe a beat-specific guide or summary

These can be *generated* rather than hand-curated (totally automated).

---

### Pages to DELETE
- `/stats`
- `/briefing` (if duplicative)
- `/trending` (fold into homepage filtering)
- `/dashboard`
- `/account`
- `/checkout`, `/enterprise` (until ready)

---

## UI/UX COHESION STRATEGY: Making It Feel Like One Elegant App

Right now it feels "choppy" because each page has different visual hierarchy, spacing, and interaction patterns. Here's how to unify it:

### Design System Principles (Replace "Dark Flight Deck" with "Premium News Outlet")

| Aspect | Current (Dashboard) | New (News Outlet) |
|---|---|---|
| **Color Scheme** | Dark gray + red accent | Light (primary) + Dark (toggle). Accent: A vibrant but sophisticated color (maybe teal or amber). |
| **Typography** | Condensed, all-caps, technical | Elegant serif for headlines (like FT Serif or Publico), clean sans-serif for body (Inter, etc.). |
| **Spacing** | Dense, grid-heavy | Generous whitespace. Breathing room. Magazine-like. |
| **Imagery** | Small, technical | Large, high-quality images. Hero images on story cards. |
| **Interaction Feedback** | Minimal, technical | Smooth, delightful. Hover states, transitions, micro-interactions. |
| **Information Density** | High (dashboards show lots) | Medium (cards are rich but not overwhelming). |

### Consistent Patterns Across Pages

#### 1. Story Cards (used on homepage, search, topics, related stories)

```
┌─────────────────────────────┐
│ [Image (16:9 aspect)]       │
│                             │
├─ [Headline - serif, large] │
│  [Summary - 1-2 lines]     │
│  [FDI badge] [12 outlets]  │
│  [Time ago]                 │
└─────────────────────────────┘
```

Make this the atomic unit. Use everywhere.

#### 2. FDI Badge Design (key visual differentiator)

Design it as a "divergence meter" or "spectrum bar"
Not just text. Make it visual, intuitive, beautiful.

```
Example:
┌──────────────────────────┐
│ FDI: 78/100             │
│ ████████░░  HIGH        │
│ (Show brief explanation) │
└──────────────────────────┘
```

#### 3. Navigation (consistent across all pages)

```
Top: [Logo] [Search] [Topic filter dropdown] [Light/Dark toggle] [User menu]

No changing nav structures. Consistent placement.
```

#### 4. Empty/Loading States (uniform, elegant)

Use skeleton cards, subtle animations.
Not jarring spinners. Magazine-like grace.

#### 5. Color Usage

- **Accent color**: Used for CTAs, FDI badges, highlights
- **Neutral grays**: Text, dividers, borders (light mode)
- **Success/Warning/Alert colors**: Feedback, flags, errors (but use sparingly)

### Dark Mode Implementation

Use CSS variables for theme switching. One toggle, all pages instantly switch. No jarring transitions.

---

## STORY PAGE DEEP-DIVE: The Hero Experience

Since the story page is where users realize *Fracture's value*, this needs to be exceptional:

### Above the Fold (First 80% of viewport)

```
┌─────────────────────────────────────┐
│ Headline (serif, 2.5rem)            │
│ Subheading (supporting context)     │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │    FDI DIVERGENCE METER         │ │
│ │  ████████░░  78/100 - HIGH      │ │
│ │                                 │ │
│ │  "This story is covered         │ │
│ │   differently across outlets.   │ │
│ │   See how below."               │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Published [X outlets] • First by    │
│ [Outlet name] • [timestamp]         │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │     SOURCE SPECTRUM (VIZ)        │ │
│ │ Left ← outlets → Right           │ │
│ │ [interactive viz here]           │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

### Middle Section

Fracture Summary (neutral, auto-generated)
+ Headline Comparison Table (sortable, color-coded)
+ Links to sources (subtle, not prominent)

### Bottom Section

Comments + Feedback
Related Stories (use same card format as homepage)

**Key principle:** The story page should be *visual-first*. The divergence visualization should make users go "oh wow, I had no idea this was reported so differently."

---

## CONTENT & CURATION STRATEGY

### What Fracture Should Produce

1. **Auto-generated summaries** (neutral, balanced, pulling from all outlets' coverage)
2. **Source spectrum visualizations** (algorithmic, based on headline analysis and sentiment)
3. **FDI scores** (your core differentiator)
4. **Topic/beat categorization** (automated tagging)
5. **Trending detection** (what's actually breaking right now)
6. **User comments** (community trust layer)

### What Fracture Should NOT Produce

- Editorial opinion pieces
- Fact-checking/debunking articles
- Staff-written analysis
- Opinion columns

You're a *mirror*, not a voice. The neutrality is your strength.

### User Feedback Loop (Critical)

```
User sees story → FDI badge → Story detail → 
"Is this FDI accurate?" → Feedback collected → 
Improves algorithm → Better future scores
```

Add a simple feedback widget on every story:
- "Was the divergence score accurate?" [Helpful] [Not helpful]
- "Flag an error" → simple form (headline misflagged, category wrong, etc.)

This serves two purposes:
1. **Improves your algorithm** (crowdsourced QA)
2. **Builds user investment** (users feel heard, become advocates)

---

## TRUST & TRANSPARENCY STRATEGY

This is where Fracture differentiates from every other news aggregator:

1. **Sources Guide page** → Show every outlet, no hidden curation
2. **Methodology transparency** → Explain how FDI is calculated (don't make it a black box)
3. **Monthly transparency reports** → "Here's what we improved, here's what broke"
4. **User feedback visibility** → "Users flagged X inaccuracies this month, we fixed Y"
5. **Source ratings** → Let users see which outlets they've found credible (crowd-sourced)

---

## MONETIZATION STRATEGY (Light Touch for Now)

**For launch (stay free):**
- No ads
- No paywalls
- No dark patterns

**For future (when ready):**

### Free tier

- All core features (homepage, story detail, search, sources guide)
- See comments, but limited commenting (like Medium)

### Premium tier ($X/month)

- Unlimited commenting
- Email alerts (breaking stories in topics you care about)
- Custom topic dashboards (save your favorite beats)
- Source ratings you've created (personal scorecard)
- Export/archive stories for research
- Maybe: API access for professionals/researchers

### B2B tier (Enterprise)

- API access for newsrooms
- White-label Fracture for internal story monitoring
- Custom source sets

Don't build this yet. Just keep it in mind for architecture (e.g., don't block feature flags for subscriptions until you need them).

---

## FINAL RECOMMENDATIONS: Priority Order

### Phase 0 (This Week): Cleanup & Cohesion

1. Delete unnecessary pages (stats, briefing, trending, mockups, app artifacts)
2. Delete broken route links (checkout, account, dashboard, privacy, terms)
3. Rebuild homepage design system:
   - Light theme as primary (dark toggle)
   - Magazine-style spacing and imagery
   - Consistent story card component
4. Rebuild header/nav to be consistent across all pages

### Phase 1 (Next 2 Weeks): Story Page Excellence

1. Design and build the "source spectrum visualization" (this is your hero feature)
2. Build headline comparison table with sorting
3. Implement Fracture summary display
4. Add feedback widget ("Is this FDI accurate?")
5. Build user comment section (simple MVP)

### Phase 2 (Week 3-4): Trust & Transparency

1. Build Sources Guide page
2. Add transparency/methodology section
3. Make all source outlets visible with metadata

### Phase 3 (Week 5+): Polish & Distribution

1. Add topic/beat filtering (UI + backend filtering)
2. Implement dark mode toggle
3. Add breaking news indicator
4. Refine search page
5. Cross-device testing (mobile looks elegant, not cramped)

---

## Next Phase: Visual Direction & Styling

This section should be completed with design system finalization:

1. **Color Palette** (TBD)
2. **Typography System** (TBD)
3. **Component Library** (TBD)
4. **Brand Identity** (TBD)
5. **Interactive Patterns** (TBD)

See "FRACTURE_VISUAL_DIRECTION.md" for detailed styling specifications.

---

## Key Questions for Implementation

1. **FDI Visualization**: What form should the divergence visualization take? A spectrum bar? A scatter plot? A visual network of outlets? Do you have strong feelings here?

2. **Outlet Attribution**: On story cards and story detail, how prominently should individual outlet links appear? Should it be a hidden link or visible CTA? (You said "more hidden" — what does that look like?)

3. **Comment Moderation**: How will you handle toxic comments? Simple flag/report system? Moderation queue?

4. **Real-time Updates**: Should the homepage auto-refresh with new stories every few minutes? Or is manual refresh fine?

5. **Mobile Experience**: Are you targeting mobile-first, or desktop-first with responsive fallback?

---

## Document History

- **v1.0** (June 9, 2026): Initial strategic audit and redesign framework based on discovery conversations.
