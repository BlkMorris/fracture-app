> ⚠️ Superseded by UX_AUDIT_v3.md — March 2026.
> Kept for historical reference only.

# Fracture Frontend — UX Audit v2

> **Date:** March 2026
> **Scope:** Every page and production component in `frontend/src/` as it exists after all four simplification passes documented in `SIMPLIFICATION_REPORT.md`.
> **Two users:**
> 1. **Free visitor** — must understand Fracture in 10 seconds, read a story from multiple perspectives without friction, and hit the paywall after experiencing value.
> 2. **Paid subscriber** — must have fast access to analytical depth, move between reading and analysis without confusion, and trust the data.

---

## 1. What Improved Since v1

The four simplification passes addressed the most damaging findings from the original audit. Specifics:

- **Single terminology source of truth.** All six sub-metric labels (`Headline Tone`, `Framing Approach`, `Entity Portrayal`, `Language Similarity`, `Source Selection`, `Structural Difference`) are now defined in `src/lib/TERMINOLOGY_CONSTANTS.ts` and imported by every page that displays them — `page.tsx` (homepage), `story/[clusterId]/page.tsx`, and `compare/page.tsx`. The original audit found six different names for the same six sub-metrics across pages; that problem is resolved.

- **Political lean terminology unified.** `leanCategory()` in `TERMINOLOGY_CONSTANTS.ts` is the single converter from numeric lean to human label (`Far Left` → `Far Right`). Production components (`BiasMap`, `NarrativeSpectrum`, `SourceSpectrum`, `StoryFractureGraph`, `HighlightedText`, `NarrativeDivergenceIndicator`, `StoryComparisonPanel`, `NarrativeTimeline`) all use it. Raw lean floats like `Bias: -0.38` no longer appear. "Bias" and "Stance" labels are gone from production components.

- **Sentiment/tone vocabulary unified.** `toneCategory()` converts raw sentiment floats to `Positive` / `Neutral` / `Negative`. `CompareArticlePanel`, `StoryComparisonPanel`, `NarrativeTimeline`, `HeadlineComparison` all use it. The "Critical"/"Favorable" vocabulary clash is resolved. Abbreviated metric labels like `H. Sentiment` and `B. Sentiment` are replaced by `Headline tone` and `Article tone` from `SENTIMENT_HEADLINE` / `SENTIMENT_BODY`.

- **Divergence severity thresholds unified.** `DivergenceMeter`, `DivergenceBadge`, `NarrativeSnapshotCard`, and `FracturedStoryCard` all use the canonical 30/60/80 breakpoints from `DIVERGENCE_LOW_MAX` / `DIVERGENCE_MODERATE_MAX` / `DIVERGENCE_HIGH_MAX`. The original audit found three different threshold sets (30/60, 40/70, 30/60/80); all now match.

- **Story and Journey merged into one route.** `story/[clusterId]/page.tsx` now serves both the dashboard and the guided chapter-by-chapter view via `?view=dashboard` (default) and `?view=guided`. A toggle control sits at the top of both views. The old `/journey/[clusterId]` route redirects to `?view=guided`. This resolves the most significant structural finding from v1 — two separate pages rendering identical data with no link between them.

- **Dead nav links removed.** "Trending" and "Saved" are gone from `Navbar.tsx`. Footer links (`Methodology`, `About`, `API`) are now non-clickable `<span>` elements with TODO comments. SSO button stubs on `login/page.tsx` are hidden.

- **Tooltips on every abbreviation.** `SCORE_TOOLTIP`, `BADGE_FRACTURED_TOOLTIP`, and all six `SUBMETRIC_TOOLTIPS` entries now power hover-tooltips via the `Tooltip` component on the story page's FDI score, FRACTURED badge, and divergence breakdown bars.

- **FirstVisitBanner on homepage.** `src/components/ui/FirstVisitBanner.tsx` explains Fracture's value prop and the FDI scale for first-time visitors, dismissible via `localStorage`.

- **Blindspot warnings contextualised.** `FracturedStoryCard` replaced bare `⚠ Left-heavy` / `⚠ Right-heavy` labels with a neutral `⚠ Uneven coverage` wrapped in a `Tooltip` explaining the direction.

- **Homepage density reduced.** Velocity Score and Trend Boost removed from the hero eyebrow. The homepage was refactored from a 1,044-line monolith into four composable zones (`LeadStory`, `SecondaryStoryGrid`, `MostFracturedSection`, `MoreStoriesList`), each showing progressively less data.

---

## 2. Per-Page Audit

### 2.1 Homepage (`app/page.tsx`)

**Purpose.** The front door. Should communicate Fracture's value prop and pull the user into a story. After the refactor, it is structured as four zones: lead story, secondary grid, most-fractured highlight, and a more-stories list. The zones provide clear visual hierarchy — the single lead story dominates, secondary cards offer breadth, and the most-fractured section draws attention to the highest-divergence stories. The page is doing its job.

**Information load.** Significantly improved from v1. The hero no longer shows velocity scores or trend boosts. Each zone escalates data density: Zone 1 shows a headline, qualitative divergence label, and two CTAs; Zone 2 shows topic + headline + qualitative label; Zone 3 adds the numeric FDI and severity tier. For User 1, the qualitative labels ("Sharply divided", "Coverage varies", "Outlets agree") replace raw numbers — a genuine clarity win. For User 2, the FDI scores appear in Zone 3 and any `FRACTURED` badges in Zone 2. The total data density is appropriate.

**Clarity.** The `LeadStory` component shows the FDI score only to paid users (gated by `userTier`), so free visitors see the qualitative label without numeric noise. However, the qualitative divergence label logic (`divergenceLabel()`) is hardcoded in three separate files (`LeadStory.tsx`, `SecondaryStoryGrid.tsx`, `MoreStoriesList.tsx`) rather than imported from `TERMINOLOGY_CONSTANTS.ts`. The thresholds (60/30) inside these duplicated functions are not guaranteed to stay in sync with the canonical `DIVERGENCE_LOW_MAX` / `DIVERGENCE_MODERATE_MAX` constants. The "FRACTURED" badge text in `SecondaryStoryGrid` is hardcoded instead of using `BADGE_FRACTURED`. `MoreStoriesList` does not import from `TERMINOLOGY_CONSTANTS` at all.

**Flow.** Lead story links to `/story/{id}`, secondary cards link to `/story/{id}`, most-fractured items link to `/story/{id}`. There is no direct path to the guided view from the homepage — every link goes to `?view=dashboard` by default. The Compare page is not linked from the homepage body (only reachable via navbar). The Journey landing page (`/journey`) is not linked from the homepage at all and is absent from the main navbar — discoverable only if a user guesses the URL or bookmarks it from elsewhere.

### 2.2 Story Page — Dashboard View (`story/[clusterId]/page.tsx?view=dashboard`)

**Purpose.** The primary story detail page for returning analysts. Displays the Fracture Brief, headline, summary, all articles grouped by outlet lean, and — behind the paywall — FDI score, source spectrum, divergence breakdown, narrative frames, and headline comparison. The reading zone (Fracture Brief + OutletArticleList) sits above the gate; the analysis zone sits below it. This is the correct architecture for the two-user model.

**Information load.** The reading zone is clean: brief, headline, summary, and the article list grouped into Left-Leaning / Center / Right-Leaning columns. Free users see this and nothing else. Behind the gate, paid users get the FDI meter, source spectrum, divergence breakdown (6 sub-metrics with tooltips), narrative frames pull-quotes, a timeline, and the "How They Headlined It" 3-column comparison. The analysis zone is dense but appropriate for User 2 — each section is visually separated and labeled.

**Clarity.** The Fracture Brief is the strongest clarity asset on the page. It gives User 1 an instant editorial summary before any data appears. Section headers use terminology constants. Sub-metric bars use tooltips. The "FRACTURED" badge has a tooltip. The one remaining raw numeric in the reading zone is the FDI score in the meta bar — but it appears inside the gated zone only for paid users, so it is acceptable. The narrative frames section still says "LEFT FRAME" and "RIGHT FRAME" — correct but consider "Left-Leaning Frame" for consistency with the column headers in the headline comparison section, which say "Left-Leaning".

**Flow.** The view toggle ("Dashboard" / "Guided Analysis") is clear and well-positioned. The "Compare articles side by side →" cross-link sits right-aligned in the toggle row. Back navigation is absent in dashboard view — there is no "← Back to feed" link at the top (the guided view has one, pointing to `/journey`). The OutletArticleList has a "Show more coverage" toggle. External article links open in new tabs.

### 2.3 Story Page — Guided View (`story/[clusterId]/page.tsx?view=guided`)

**Purpose.** A scroll-driven, chapter-by-chapter narrative analysis. Seven chapters from "What is this story?" through "Show me all the articles." This remains the best progressive disclosure in the app.

**Information load.** Chapter 1 shows headline, brief, summary, stats, and a scroll prompt — free to all users. Chapters 2–7 are behind the `AnalysisGate`. Chapter 2 dumps all 6 sub-metrics in a 2-column grid at once — the same density concern flagged in v1. Chapters 3–7 each focus on a single dimension (spectrum, frames, headlines, timeline, articles) — well-paced.

**Clarity.** Chapter question labels remain excellent. Sub-metric labels in Chapter 2 now use the canonical constants from `SUBMETRIC_LABELS`. The Fracture Brief appears in Chapter 1, providing context before any data. The `SCORE_ABBREV` label in the Chapter 2 gauge reads "FDI Score" — this is fine for paid users who have already seen the tooltip in the dashboard view, but a first-time guided-view user arrives at this gauge without having seen the tooltip. Consider adding the `SCORE_TOOLTIP` here too.

**Flow.** The "← All Stories" back link at the top of the guided view points to `/journey` — the Journey landing page. This is correct. The scroll prompt ("Scroll to explore ↓") is a good affordance. There is no chapter navigation / table of contents — a long page with no way to jump to Chapter 5. The `ChapterSpacer` (80px gap) provides pacing. The "End of Story Analysis" footer is a satisfying closure cue.

### 2.4 Compare Page (`compare/page.tsx`)

**Purpose.** Side-by-side article comparison with keyword highlighting and structural metrics. The most analytically powerful page in the app.

**Information load.** Still the densest page. The newspaper column layout shows: source byline, lean badge, time, headline (with keyword highlighting for paid users), summary, framing badge, lede type label, and 6 structural metrics per column. The center gutter adds 6 comparison bars. Free users see the newspaper columns without keyword highlighting and with a blurred gutter + "Upgrade" prompt. The `More Perspectives` grid is limited to 2 cards for free users (vs 6 for paid). Progressive disclosure was flagged as needed in v1 (finding M2) and remains unaddressed.

**Clarity.** After Pass 2, the gutter labels are now `H.Tone` / `B.Tone` / `Gap` / `Sources` / `Named%` / `Lean` — improved from the cryptic `H.Sent` / `B.Sent` / `H-B`. The `SENTIMENT_HEADLINE` / `SENTIMENT_BODY` / `SENTIMENT_GAP_SHORT` constants are used in the `MetaRow` labels within each column. However, the column still shows **"Lede:"** as a label — this is journalism jargon that most readers won't understand. The `avgSentiment()` function in `FramingSummary` still renders raw signed floats like `+0.42` — it should use `toneCategory()` for consistency.

**Flow.** Cross-links at the top (Back to feed, View Story dashboard, Read guided analysis) are well-placed. The cluster selector dropdown works. Source picker dropdowns allow article swapping. `StoryFractureGraph` is still commented out. The "More Perspectives" → "Select to compare →" hover interaction is the most powerful feature on this page.

### 2.5 Search Page (`search/page.tsx`)

**Purpose.** Find stories by keyword, with trending topics for discovery. This page remains one of the cleanest in the app.

**Information load.** Appropriate. Empty state shows discovery prompts (trending topics + suggested searches). Results show story clusters and related articles in a 2-column layout with a sidebar for related topics and trending topics.

**Clarity.** The eyebrow label was simplified from "Discovery Search" to "Search" in Pass 1. The `SearchClusterCard` renders `FDI` as a hardcoded string next to the score — this should use `SCORE_ABBREV` from constants. Framing type pills on `SearchArticleCard` use `framingLabel()` from style-utils, which is fine.

**Flow.** Search submits on Enter. Trending topics and related topics are clickable and populate the search. Results link to `/story/{id}` for clusters and to the cluster page or external URL for articles. The sidebar "Back to Feed" link is present. No autocomplete or search-as-you-type — flagged in v1, still absent but acceptable given the trending topic discovery pattern.

### 2.6 Digest Page (`digest/page.tsx`)

**Purpose.** A personalized narrative intelligence feed with divergence updates, alerts, coverage shifts, and configuration. This page is gated entirely — free users see a full-page upsell; only paid users see the feed.

**Information load.** For paid users, the page remains the densest in the app (1,312 lines). The left sidebar shows a topic list with FDI scores, quick stats, and a coverage matrix heatmap. The main feed shows divergence update cards (each with 12+ data points), alert cards, and coverage shift cards. The coverage matrix uses 2-letter outlet abbreviations without tooltips — still opaque (v1 finding L5, unaddressed).

**Clarity.** The upsell page for free users (`DigestUpsell`) is well-written — it describes benefits in plain language ("Know instantly when a story's coverage becomes more divided") rather than feature names. However, the `DigestFeedContent` for paid users contains several hardcoded `"FDI"` strings that should use `SCORE_ABBREV`: in alert message templates (`FDI reached ${fdi}`) and in the alert config modal (`"FDI"` label, `"FDI > ${rule.threshold}"` description). Alert rules are still stored in React state only — not persisted (v1 finding M4, unaddressed).

**Flow.** Feed filter bar (All / Alerts / Divergence / Coverage) works. Topic filter in sidebar is click-to-toggle. All feed cards link to `/story/{id}`. Alert config modal allows adding/removing rules. The page requires authentication via `isPaidTier()` — correct.

### 2.7 Journey Landing (`journey/page.tsx`)

**Purpose.** Browse all story clusters in a guided-experience format. Now links to `?view=guided` on the unified story page.

**Information load.** Each `JourneyCard` shows: image, status badge, fractured badge, topic category, FDI score with `SCORE_ABBREV`, title, summary, divergence bar, article/source counts, and time ago. This is 10+ data points per card — the same density concern from v1. The `JOURNEY_TAGLINE` constant is used for the subtitle. The FDI score uses `SCORE_ABBREV` from constants.

**Clarity.** The "Journey" heading with compass icon is clear enough if the user has arrived here intentionally, but the word "Journey" does not self-explain — User 1 would not know this is a guided analysis mode. The tagline ("Follow a story chapter by chapter…") helps. Card links now correctly point to `/story/{id}?view=guided`.

**Flow.** Sort controls (Divergence / Recent / Trending) are clear. Pagination works. There is no search or topic filter — users who want a specific story must use the Search page. The Journey landing page is **not in the navbar** and is not linked from the homepage. It is discoverable only from the guided view's "← All Stories" back link, making it a near-hidden page.

### 2.8 Pricing Page (`pricing/page.tsx`)

**Purpose.** Convert free visitors to paid subscribers. Two-tier pricing: Free ($0) and Pro ($9/month), plus an Enterprise callout.

**Information load.** Minimal and appropriate. Feature lists are benefit-oriented. The free tier lists 5 features; the pro tier lists 7 features.

**Clarity.** The Pro feature list item "Story-level analysis chapters (FDI, spectrum, frames, timelines)" uses the hardcoded abbreviation "FDI" — should use `SCORE_ABBREV`. The rest of the copy is clear and benefit-focused. The Free tier CTA ("Start reading") links to `/`. The Pro tier CTA ("Get Pro access") links to `/register?plan=pro`. The Enterprise callout links to `mailto:enterprise@fracture.news`. The footer note about independence and funding is a strong trust signal.

**Flow.** Clear two-card layout. The "Recommended" badge on Pro is a standard conversion pattern. The "← Back to feed" link at the bottom provides an escape. Missing: no annual pricing toggle, no FAQ section, no social proof (testimonials or user count).

### 2.9 Login Page (`login/page.tsx`)

**Purpose.** Authenticate existing users via email/password.

**Information load.** Minimal — email field, password field, submit button. No clutter.

**Clarity.** The tagline "See how every outlet frames the same story" reinforces the value prop on the login page — good. SSO buttons are hidden (resolved from v1). The "Forgot password?" link is present. The "Don't have an account? Create one" link goes to `/register`. The login page uses `text-primary` / `text-secondary` semantic color classes that differ from the editorial design system used elsewhere (`text-ink`, `text-ink-muted`) — this is a minor inconsistency.

**Flow.** `returnUrl` query param enables post-login redirect. Auto-redirect if already authenticated. Error display is clear.

---

## 3. Cross-Page Audit

### Paywall consistency

`AnalysisGate` (`src/components/story/AnalysisGate.tsx`) renders consistently on the story page (both views) and the compare page. It blurs the first child behind the gate, overlays a lock icon, and shows an upgrade prompt card. The prompt copy reads "See the full picture" with a description of what analysis reveals. For authenticated free users the CTA is "Upgrade to Pro →" linking to `/pricing`. For unauthenticated visitors the CTA is "Get full access →" with a secondary "Sign in" link. On the compare page, the center gutter has its own separate blur + "Upgrade" button (not using `AnalysisGate` — it's a custom inline implementation in `compare/page.tsx`). The "More Perspectives" section on the compare page also has its own inline upgrade prompt. This means there are three different upgrade prompt implementations: `AnalysisGate` (story page), the gutter blur (compare page), and the more-perspectives prompt (compare page). The language differs across them — "See the full picture" vs. bare "Upgrade" vs. "See all perspectives →". The Digest page uses a fourth approach: `DigestUpsell`, a full-page component with its own benefit-focused copy ("Your narrative intelligence feed") and "Upgrade to Pro →" CTA. The messaging is benefit-oriented in all cases, which is good, but the inconsistency means a user who encounters the paywall on different pages gets different language for the same action.

### Fracture Brief

`FractureBrief` (`src/components/story/FractureBrief.tsx`) fetches from `/api/brief/{clusterId}` on mount, shows a skeleton while loading, renders nothing on error, and displays a styled card on success. It appears in both dashboard and guided views of the story page. The position is correct — it sits above the paywall gate in both views, so free users see it. The loading skeleton is well-structured (matching the card layout). The Tooltip on the "Fracture Brief" label explains it as an "AI-synthesized editorial summary." The brief creates genuine upgrade intent because it demonstrates analytical value (how coverage diverges) without giving away the full analysis (FDI scores, sub-metrics, source spectrum). The brief API route (`api/brief/[clusterId]/route.ts`) calls the Groq API with a system prompt that instructs concise, editorially-voiced synthesis. It caches for 30 minutes via `revalidate = 1800`. If the `GROQ_API_KEY` env var is missing, it returns `null` gracefully — the component renders nothing. This is the single highest-value component for User 1's first visit.

### Navigation

The navbar (`Navbar.tsx`) shows four items: Today (`/`), Compare (`/compare`), Search (`/search`), and Digest/My Feed (`/digest`). The label switches between "Digest" (paid) and "My Feed" (free) based on `userTier` — a subtle but correct tier-awareness. Authenticated users see a user menu dropdown with tier badge, settings stub, and logout. Unauthenticated users see a "Get full access" link (from `NAV_UPGRADE`). The navbar correctly handles all auth states. The Journey landing page (`/journey`) has **no nav item** — it is reachable only from the guided view's back link. This makes the guided analysis mode essentially invisible to new users who browse from the homepage. The Search page is both a nav icon and a full nav link — it appears twice in the desktop nav (as a nav item and as a search icon button). The mobile drawer provides full parity.

### Terminology

Fresh check against `TERMINOLOGY_CONSTANTS.ts`:

- **Remaining hardcoded `"FDI"` strings:** `SearchClusterCard` in `search/page.tsx` renders `"FDI"` as a literal string next to the score. `digest/page.tsx` has at least 4 hardcoded `"FDI"` strings in alert messages and config modal. `pricing/page.tsx` has 1 hardcoded `"FDI"` in a Pro feature description. These should all use `SCORE_ABBREV`.
- **Hardcoded `"Lede"` label:** `compare/page.tsx` line 764 renders `"Lede:"` as a user-facing label in the newspaper column. This journalism jargon should be replaced with a human-readable label (e.g., "Opening style") and added to `TERMINOLOGY_CONSTANTS.ts`.
- **Duplicated divergence label logic:** `LeadStory.tsx`, `SecondaryStoryGrid.tsx`, and `MoreStoriesList.tsx` all contain independent `divergenceLabel()` functions with hardcoded 60/30 thresholds. These should be centralized into `TERMINOLOGY_CONSTANTS.ts` using the canonical `DIVERGENCE_LOW_MAX` / `DIVERGENCE_MODERATE_MAX` constants.
- **`MoreStoriesList.tsx` imports nothing from constants.** It is the only homepage component that does not import from `TERMINOLOGY_CONSTANTS.ts`.
- **"FRACTURED" badge:** `SecondaryStoryGrid.tsx` renders the hardcoded string `"FRACTURED"` instead of using `BADGE_FRACTURED` from constants.
- **Raw sentiment float in compare page:** `FramingSummary` in `compare/page.tsx` renders `avgSentiment()` as a signed float (`+0.42`). This should use `toneCategory()` for consistency with the rest of the app.

### Mobile

Pages changed since v1 that need mobile verification:

- **Homepage** — refactored into four zone components. The `LeadStory` component uses responsive classes but should be tested for image aspect ratio and CTA button wrapping on narrow screens.
- **Story page** — now 1,422 lines serving both views. The view toggle buttons are `flex-wrap` so they should stack on mobile, but the guided view's 2-column sub-metric grid (`grid-cols-2`) in Chapter 2 may be too tight on small screens.
- **Compare page** — the 12-column grid (`grid-cols-12` with 5/2/5 split for newspaper columns) will likely break on screens under 768px. The center gutter with its tiny `text-[8px]` labels will be unreadable. This page needs a mobile-specific layout (stack columns vertically with the gutter between them).
- **Digest page** — the sidebar is `hidden lg:flex`, so mobile users lose the topic filter, quick stats, and coverage matrix entirely. The feed filter bar should remain accessible.

---

## 4. Prioritized Findings

| # | Sev | Finding | File(s) | User | Recommendation |
|---|-----|---------|---------|------|----------------|
| 1 | 🟠 | Journey landing page is not in navbar and not linked from homepage — the guided analysis mode is effectively hidden from new users. | `Navbar.tsx`, `page.tsx` | User 1 | Add a visible entry point to guided analysis. Either add Journey to the nav, or add a "Read the guided analysis" CTA on the homepage lead story card. |
| 2 | 🟠 | Compare page has no progressive disclosure — 12+ metrics visible simultaneously in the newspaper comparison view. | `compare/page.tsx` | Both | Collapse the 6 structural metrics per column behind a "Show metrics" toggle. Default the newspaper columns to headline + summary + framing badge only. |
| 3 | 🟠 | Three different paywall prompt implementations with inconsistent language across AnalysisGate, the compare gutter, the more-perspectives section, and DigestUpsell. | `AnalysisGate.tsx`, `compare/page.tsx`, `digest/page.tsx` | User 1 | Standardize upgrade prompt copy. Create a shared `UpgradePrompt` component or at minimum import prompt strings from `TERMINOLOGY_CONSTANTS.ts`. |
| 4 | 🟠 | Compare page renders `avgSentiment()` as raw signed float (`+0.42`) and displays `"Lede:"` as a user-facing label. | `compare/page.tsx` | Both | Replace `avgSentiment()` output with `toneCategory()`. Replace "Lede" with a human-readable label from a new `LEDE_LABEL` constant. |
| 5 | 🟡 | Divergence label logic (`divergenceLabel()`) is copy-pasted across three homepage components with hardcoded 60/30 thresholds that may drift from the canonical constants. | `LeadStory.tsx`, `SecondaryStoryGrid.tsx`, `MoreStoriesList.tsx` | Both | Extract `divergenceLabel()` into `TERMINOLOGY_CONSTANTS.ts` using `DIVERGENCE_LOW_MAX` / `DIVERGENCE_MODERATE_MAX`. Import from all three files. |
| 6 | 🟡 | `MoreStoriesList.tsx` imports nothing from `TERMINOLOGY_CONSTANTS.ts`. Section header "More Stories" is hardcoded. | `MoreStoriesList.tsx` | Both | Import constants and add `SECTION_MORE_STORIES` to `TERMINOLOGY_CONSTANTS.ts`. |
| 7 | 🟡 | Six hardcoded `"FDI"` strings remain in production components — `search/page.tsx`, `digest/page.tsx` (×4), `pricing/page.tsx`. | Multiple | Both | Replace all with `SCORE_ABBREV` import. |
| 8 | 🟡 | `SecondaryStoryGrid.tsx` renders `"FRACTURED"` as a hardcoded string instead of using `BADGE_FRACTURED`. | `SecondaryStoryGrid.tsx` | Both | Import and use `BADGE_FRACTURED` from `TERMINOLOGY_CONSTANTS.ts`. |
| 9 | 🟡 | Guided view Chapter 2 dumps all 6 sub-metrics simultaneously in a 2-column grid. No progressive disclosure within the chapter. | `story/[clusterId]/page.tsx` | User 2 | Consider showing only the top 2–3 sub-metrics by default with an "All metrics" expand toggle. |
| 10 | 🟡 | Dashboard view has no "← Back to feed" link at the top. Guided view has one (pointing to `/journey`), creating inconsistency. | `story/[clusterId]/page.tsx` | Both | Add a "← Back to feed" link at the top of the dashboard view, pointing to `/`. |
| 11 | 🟡 | Digest page alert rules stored in React state only — refreshing resets all rules. | `digest/page.tsx` | User 2 | Persist alert rules to backend or `localStorage` at minimum. |
| 12 | 🟡 | Guided view FDI gauge shows `SCORE_ABBREV + " Score"` but has no `SCORE_TOOLTIP` — a first-time guided-view user may not have seen the tooltip elsewhere. | `story/[clusterId]/page.tsx` | User 1 | Wrap the guided-view FDI gauge in a `Tooltip` with `SCORE_TOOLTIP`. |
| 13 | 🟡 | Compare page's 12-column newspaper layout breaks on mobile. Center gutter `text-[8px]` labels are unreadable on small screens. | `compare/page.tsx` | Both | Add a responsive breakpoint that stacks columns vertically on `< md` screens. |
| 14 | 🟡 | Coverage matrix in Digest sidebar uses 2-letter outlet abbreviations with no hover tooltips. | `digest/page.tsx` | User 2 | Add a `title` attribute or `Tooltip` on each matrix cell showing the full outlet name. |
| 15 | 🟢 | Login page uses `text-primary` / `text-secondary` color classes instead of the editorial `text-ink` / `text-ink-muted` used everywhere else. | `login/page.tsx` | Both | Align with the editorial design system tokens. |
| 16 | 🟢 | "LEFT FRAME" / "RIGHT FRAME" labels in dashboard narrative frames section use all-caps, while the headline comparison says "Left-Leaning" / "Right-Leaning". | `story/[clusterId]/page.tsx` | User 2 | Standardize to "Left-Leaning Frame" / "Right-Leaning Frame" or use `LEAN_LEFT` / `LEAN_RIGHT` constants. |
| 17 | 🟢 | Pricing page has no annual pricing toggle, FAQ section, or social proof. | `pricing/page.tsx` | User 1 | Add at minimum a short FAQ addressing "What happens to my stories if I cancel?" and "Is there a free trial?" |
| 18 | 🟢 | Footer links (Methodology, About, API) are non-clickable spans with TODOs — better than dead links, but still placeholder-feeling. | `Footer.tsx` | Both | Either build a minimal /about page or remove the spans entirely until real content exists. |
| 19 | 🟢 | Guided view has no chapter navigation — no way to jump directly to Chapter 5 without scrolling through 1–4. | `story/[clusterId]/page.tsx` | User 2 | Add a sticky mini table-of-contents or chapter dot-nav on the side for screens ≥ `lg`. |
| 20 | 🟢 | `StoryFractureGraph` is still commented out on the compare page. | `compare/page.tsx` | User 2 | Either finish and ship it or remove the commented-out code. |
| 21 | ✅ | Fracture Brief provides instant value to User 1 — AI-synthesized summary above the paywall, with graceful loading/error states. | `FractureBrief.tsx`, `api/brief/[clusterId]/route.ts` | Both | Keep as-is. |
| 22 | ✅ | View toggle between Dashboard and Guided Analysis is fast (no data refetch), URL-shareable, and clearly labeled. | `story/[clusterId]/page.tsx` | Both | Keep as-is. |
| 23 | ✅ | Unified terminology for sub-metrics, lean labels, tone labels, and severity thresholds via `TERMINOLOGY_CONSTANTS.ts`. | Multiple | Both | Keep as-is. Extend to remaining gaps identified above. |
| 24 | ✅ | Search page empty state with trending topics and suggested searches is the best discovery pattern in the app. | `search/page.tsx` | User 1 | Keep as-is. |
| 25 | ✅ | Digest upsell page (`DigestUpsell`) communicates benefits in plain language rather than feature names. | `digest/page.tsx` | User 1 | Keep as-is. |
| 26 | ✅ | Keyword highlighting on Compare page with lean-colored backgrounds is a genuinely novel and useful feature. | `compare/page.tsx`, `lib/framing.ts` | User 2 | Keep as-is. |
| 27 | ✅ | "How They Headlined It" section — 3-column newspaper layout is the most immediately understandable visualization of the core value prop. | `story/[clusterId]/page.tsx` | Both | Keep as-is. |
| 28 | ✅ | AnalysisGate places the paywall at the correct boundary — after the reading experience (brief + articles), before the analytical depth. | `AnalysisGate.tsx`, `story/[clusterId]/page.tsx` | User 1 | Keep as-is. |

---

## 5. Conversion Funnel Audit

### Step 1: Homepage → Story

The homepage lead story has two CTAs: "Read the full picture →" (links to `/story/{id}`) and "Compare coverage" (links to `/compare?cluster={id}`). Secondary story cards link to `/story/{id}`. The most-fractured section has "See how coverage divides →". The primary path is clear — click any story, arrive at the story page. **Friction:** None. The story link is the dominant action on every card. **Value clarity:** The qualitative divergence labels ("Sharply divided") preview what the user will find. **Next step:** Obvious — click the headline or CTA.

### Step 2: Story (free read) → AnalysisGate

The free user lands on the story page and sees the Fracture Brief (AI summary), the headline, the full summary, and the OutletArticleList (articles grouped by lean). This is the free value — reading coverage from multiple perspectives. The user scrolls past the article list and hits a thick rule (`<div className="my-8 h-px bg-ink/20" />`), then the `AnalysisGate`. The blurred first section (FDI meter + source spectrum) teases what's behind the gate. **Friction:** The thick rule is subtle — there is no explicit "You've read the articles. Here's what the analysis reveals." transition text. The gate appears abruptly. In the guided view, the gate appears between Chapter 1 and Chapter 2, which is more natural (the question "How divided is the coverage?" creates curiosity). **Value clarity:** The Fracture Brief already demonstrates analytical value, making the gate feel like a natural next step. **Next step:** The gate CTA says "Upgrade to Pro →" or "Get full access →".

### Step 3: AnalysisGate → Pricing

The "Upgrade to Pro →" / "Get full access →" links in `AnalysisGate` go to `/pricing`. This is a direct link with no intermediate steps. **Friction:** None. **Value clarity:** The gate copy ("See the full picture — Fracture's analysis shows you exactly how and why coverage of this story diverges") is benefit-oriented. **Next step:** Obvious — click the CTA to see pricing.

### Step 4: Pricing → Register

The pricing page shows Free ($0) and Pro ($9/month) side by side. The Pro card has a "Recommended" badge and an "Get Pro access" CTA linking to `/register?plan=pro`. **Friction:** The user must create a new account from scratch — there is no SSO. The registration form requires name, email, password, and confirm password. No payment integration exists yet — the `?plan=pro` query param is captured but there is no Stripe or payment flow. This is the **biggest funnel break**: the user clicks "Get Pro access," fills out a registration form, and then... nothing. There is no payment collection, no trial activation, and no immediate upgrade. **Value clarity:** The feature list is clear. **Next step:** Broken — registration does not result in a paid account.

### Step 5: Register → Return to story

After registration, `login/page.tsx` redirects to the `returnUrl` param. If the user came from the pricing page, the `returnUrl` is not set (the pricing page links directly to `/register?plan=pro`, not `/register?plan=pro&returnUrl=/story/...`). The user would land on `/` after registration, losing context of the story they were reading. **Friction:** Loss of reading context. The return URL should be propagated from the story page through the gate, to the pricing page, and into the register link.

---

## 6. What to Build Next

### Quick wins — copy/label changes, no engineering needed

1. **Replace 6 remaining hardcoded `"FDI"` strings** with `SCORE_ABBREV` imports in `search/page.tsx`, `digest/page.tsx`, and `pricing/page.tsx`.
2. **Replace `"Lede:"` label** in `compare/page.tsx` with a human-readable label (`"Opening style"` or `"Lead type"`); add the label to `TERMINOLOGY_CONSTANTS.ts`.
3. **Replace `avgSentiment()` raw float output** in `compare/page.tsx` `FramingSummary` with `toneCategory()` call.
4. **Import `BADGE_FRACTURED`** in `SecondaryStoryGrid.tsx` and use it instead of the hardcoded `"FRACTURED"` string.
5. **Standardize "LEFT FRAME"/"RIGHT FRAME" labels** in the dashboard view narrative frames section to match the lean label format used in the headline comparison columns.
6. **Add `SCORE_TOOLTIP`** to the guided-view FDI gauge in Chapter 2 by wrapping the score in a `Tooltip` component.

### Frontend changes — component or layout work

7. **Extract `divergenceLabel()` into `TERMINOLOGY_CONSTANTS.ts`** using canonical threshold constants, and import it in `LeadStory.tsx`, `SecondaryStoryGrid.tsx`, and `MoreStoriesList.tsx` — eliminating the triplicated function.
8. **Add a "← Back to feed" link** at the top of the story page dashboard view, matching the guided view's "← All Stories" link.
9. **Standardize upgrade prompt copy.** Create a shared `UPGRADE_HEADLINE` / `UPGRADE_DESCRIPTION` constant set in `TERMINOLOGY_CONSTANTS.ts` and use it in `AnalysisGate`, the compare page gutter, the compare page more-perspectives section, and `DigestUpsell` — or extract a shared `UpgradePromptCard` component.
10. **Add progressive disclosure to the compare page newspaper columns.** Collapse the 6 structural metrics behind a "Show analysis" toggle. Show only headline, summary, and framing badge by default.
11. **Add responsive mobile layout to the compare page.** Stack the newspaper columns vertically on `< md` screens with the gutter metrics between them.
12. **Propagate `returnUrl` through the conversion funnel.** When `AnalysisGate` links to `/pricing`, append `?returnUrl=` with the current story URL. When the pricing page links to `/register`, forward the `returnUrl`. After registration/login, redirect to the story the user was reading.
13. **Add a visible entry point to guided analysis from the homepage.** Either add a "Guided Analysis" nav item, or add a secondary CTA on the lead story card linking to `?view=guided`, or add the Journey landing page to the navbar.
14. **Add chapter dot-navigation** to the guided view for `lg`+ screens — a sticky vertical set of dots on the left side that highlight the current chapter and allow click-to-jump.

### Backend required — features that need API or data changes

15. **Persist digest alert rules to the backend.** The `alertRules` state in `digest/page.tsx` resets on refresh. This requires a user-preferences API endpoint in the NestJS backend to store and retrieve alert configurations per user.
16. **Implement payment flow.** The pricing page links to `/register?plan=pro` but there is no payment collection. Integrate Stripe (or equivalent) so that the Pro CTA results in an actual subscription. Without this, the entire conversion funnel is broken at Step 4.
17. **Build the Methodology page.** The footer "Methodology" span has a TODO comment. This page should explain the FDI calculation, the six sub-metrics, the source lean estimation methodology, and the framing detection approach. It is the single most important trust-building content for both User 1 and User 2.

### Product decisions — things that need a human decision before code is written

18. **Decide whether the Journey landing page should be in the main nav or removed.** Currently it is a near-hidden page at `/journey` with no nav link and no homepage link. Options: (a) add it to the nav as a discovery surface for guided analysis, (b) remove it and make the guided view accessible only via the toggle on story pages, or (c) make the homepage link to `?view=guided` for certain stories.
19. **Decide the free-tier paywall boundary for the compare page.** Currently, free users see the newspaper columns without keyword highlighting, a blurred gutter, and only 2 perspective cards. Is this too generous (they see the full articles) or too restrictive (they can't see metrics at all)? The AnalysisGate on the story page lets free users read all articles but hides analysis. The compare page lets free users read two articles side-by-side. These boundaries should be an intentional product choice.
20. **Decide whether the digest page upsell is sufficient or if a "preview mode" would convert better.** Currently free users see zero feed content on the digest page — just a marketing page. Consider showing 1–2 sample feed items (read-only, from a public story) above the upgrade prompt to demonstrate the feed's value before asking for payment.
21. **Decide on the annual pricing model.** The pricing page currently shows only monthly pricing ($9/month). Offering an annual plan ($7/month billed annually) is a standard conversion optimization. This is a business decision that affects the Stripe integration scope.

---

*End of audit. No code files were modified.*
