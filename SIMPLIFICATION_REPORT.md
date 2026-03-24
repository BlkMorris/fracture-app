# UX Simplification Report

> **Date:** June 2025
> **Scope:** Frontend UX clarity and terminology — no functionality, routing, or API changes.
> **Audit reference:** `UX_AUDIT.md`

---

## Summary

This changeset implements the highest-priority recommendations from the UX audit:

1. **Single terminology source of truth** — all user-facing labels now import from one file.
2. **Dead links removed** — navbar, footer, and login page cleaned up.
3. **Cross-links added** — Story, Journey, and Compare pages now link to each other.
4. **Jargon replaced** — six sub-metric labels, section headers, and score labels standardized.
5. **Tooltips added** — FDI score, FRACTURED badge, and all six sub-metrics now have hover explanations.
6. **Onboarding banner** — first-time visitors see a brief explanation of what Fracture does and what the FDI means.
7. **Homepage density reduced** — removed Velocity Score and Trend Boost from hero eyebrow.
8. **Journey differentiated** — landing page subtitle replaced with a tagline emphasizing guided chapter-by-chapter analysis.

---

## Files Created (3)

| File | Purpose |
|---|---|
| `src/lib/TERMINOLOGY_CONSTANTS.ts` | Single source of truth for all user-facing labels: score names, sub-metric labels, section headers, tooltips, navigation labels, lean/tone vocabulary, severity tiers, cross-link CTAs. |
| `src/components/ui/Tooltip.tsx` | Lightweight hover-tooltip component with auto-positioning (above/below). |
| `src/components/ui/FirstVisitBanner.tsx` | Dismissible onboarding banner explaining Fracture's value prop and FDI scale. Remembers dismissal in `localStorage`. |

## Files Modified (11)

| File | Changes |
|---|---|
| `src/components/ui/index.ts` | Added `Tooltip` export. |
| `src/components/layout/Navbar.tsx` | Removed "Trending" and "Saved" nav links (no pages exist). Removed unused `TrendingUp`/`Bookmark` imports. |
| `src/components/layout/Footer.tsx` | Replaced three dead `<a href="#">` links (Methodology, About, API) with non-clickable `<span>` elements + TODO comments. |
| `src/app/login/page.tsx` | Hid SSO button stubs (Google, GitHub) and "or" divider — replaced with a comment noting they're hidden until backend OAuth is ready. |
| `src/app/page.tsx` | Imported `TERMINOLOGY_CONSTANTS` for sub-metric labels and `SCORE_ABBREV`. Replaced 6 PerspectiveContrast sub-score labels with constants. Replaced 3 "FDI" text labels with `SCORE_ABBREV`. Removed `trendBoost` and `velocityScore` from hero eyebrow. Removed unused `Activity` import. Added `FirstVisitBanner` at top of page. |
| `src/app/story/[clusterId]/page.tsx` | Imported `TERMINOLOGY_CONSTANTS` and `Tooltip`. Replaced "Story Cluster" label with "Story". Added cross-link banner (Journey + Compare). Replaced "Fracture Divergence Index" label with `SCORE_FULL_NAME`. Wrapped FDI score in `Tooltip` with `SCORE_TOOLTIP`. Wrapped FRACTURED badge in `Tooltip` with `BADGE_FRACTURED_TOOLTIP`. Replaced 6 sidebar sub-metric labels with constants + tooltips. Replaced "Source Spectrum" / "Narrative Frames" / "All Coverage" headers with constants. Replaced raw lean numbers in source spectrum tooltip with `leanLabel()`. |
| `src/app/journey/page.tsx` | Imported `SCORE_ABBREV` and `JOURNEY_TAGLINE`. Replaced "FDI" label with constant. Replaced subtitle text with `JOURNEY_TAGLINE`. |
| `src/app/journey/[clusterId]/page.tsx` | Imported `SUBMETRIC_LABELS`, `SCORE_ABBREV`, cross-link CTAs. Replaced hardcoded `metricLabels` dictionary with `SUBMETRIC_LABELS` from constants. Replaced "FDI Score" label with constant. Added cross-link banner (Story + Compare) below story stats. Replaced raw lean numbers in headlines chapter with `leanLabel()`. |
| `src/app/compare/page.tsx` | Imported cross-link CTAs. Uncommented and enhanced back-to-feed link with Story and Journey cross-links. |
| `src/app/search/page.tsx` | Replaced "Discovery Search" eyebrow label with "Search". |

---

## Audit Findings Addressed

| Finding ID | Description | Status |
|---|---|---|
| **C1** | No onboarding or explanation of core concepts | ✅ FirstVisitBanner + tooltips on FDI/FRACTURED/sub-metrics |
| **C3** | Sub-metric labels inconsistent across pages | ✅ All 6 sub-metrics now use one canonical name from `SUBMETRIC_LABELS` |
| **H1** | Homepage information density overwhelming | ✅ Removed velocity/trend boost from hero; onboarding banner provides context |
| **H2** | Expert jargon in labels | ✅ "Framing Entropy" → "Framing Approach", "Entity Framing Divergence" → "Entity Portrayal", etc. |
| **H3** | Navbar dead links (Trending, Saved) | ✅ Removed |
| **M6** | Footer dead links | ✅ Replaced with non-clickable spans |
| **M8** | No cross-links between detail pages | ✅ Story ↔ Journey ↔ Compare cross-links on all three pages |
| **L4** | SSO button stubs on login | ✅ Hidden |
| **P1** | Name it once, name it everywhere | ✅ `TERMINOLOGY_CONSTANTS.ts` is the single source |
| **P4** | Every abbreviation earns a tooltip | ✅ Tooltip component + tooltips on FDI, FRACTURED, all sub-metrics |
| **P6** | Explain on first sight | ✅ FirstVisitBanner on homepage |
| **P7** | Don't ship dead links | ✅ Navbar, footer, login all cleaned up |
| **P8** | Connect the views | ✅ Cross-links on Story, Journey detail, Compare |

## Audit Findings Not Yet Addressed

| Finding ID | Description | Reason |
|---|---|---|
| **C2** | Journey and Story are duplicate pages | Architectural decision — requires merging or view-toggle, beyond scope of terminology/UX pass |
| **H4** | Political lean terminology inconsistent across components | Partially addressed (Journey detail lean labels fixed); full component sweep (BiasMap, StoryComparisonPanel, etc.) deferred |
| **H5** | Sentiment/tone vocabulary clash | Deferred — requires touching narrative components |
| **M1** | Divergence severity thresholds inconsistent | `severityTier()` function created in constants but not yet wired into components |
| **M2** | Compare page analytically dense | No progressive disclosure added — separate effort |
| **M3** | LatestFeed external links with no return path | Not addressed — requires UI pattern change |
| **M4** | Digest alert rules not persisted | Backend feature — out of scope |

---

## Build Verification

```
✅ tsc --noEmit — 0 errors
✅ npm run build — clean production build, all routes compiled
```

---

*No functionality, routing logic, data fetching, or API calls were changed.*

---

## Pass 2 — Terminology Completion

> **Date:** March 2026
> **Scope:** Wire remaining terminology constants and threshold standardization into all production components. Addresses H4, M1, and H5 from the UX audit.

### Files Modified

| File | Changes |
|---|---|
| `src/lib/TERMINOLOGY_CONSTANTS.ts` | Added: `LEAN_LEFT_SHORT`, `LEAN_RIGHT_SHORT`, `LEAN_LABEL`, `leanCategory()`, `SENTIMENT_HEADLINE`, `SENTIMENT_BODY`, `SENTIMENT_GAP`, `SENTIMENT_GAP_SHORT`, `toneCategory()`, `DIVERGENCE_LOW_MAX`, `DIVERGENCE_MODERATE_MAX`, `DIVERGENCE_HIGH_MAX`, `severityColor()`, `severityTextClass()`, `severityBgClass()`. Updated `severityTier()` to use named threshold constants. |
| `src/components/visualizations/BiasMap.tsx` | **H4**: "Bias Map" → "Lean Map". "Stance × Sentiment" → "Lean × Sentiment". "Left Stance"/"Right Stance" axis labels → `LEAN_LEFT_SHORT`/`LEAN_RIGHT_SHORT`. Raw `Bias: -0.38` tooltip → `Lean: Left-Leaning` via `leanCategory()`. Raw `Sentiment: 0.42` → `Sentiment: Positive` via `toneCategory()`. |
| `src/components/visualizations/NarrativeSpectrum.tsx` | **H4/H5**: `Bias: {float}` tooltip → `Lean: {leanCategory()}`. Local `sentimentLabel()` function now delegates to `toneCategory()` from constants. |
| `src/components/visualizations/SourceSpectrum.tsx` | **H4**: `Lean: {float}` tooltip → `Lean: {leanCategory()}`. |
| `src/components/visualizations/StoryFractureGraph.tsx` | **H4**: `Lean +{float}` tooltip → `Lean {leanCategory()}`. |
| `src/components/narrative/HighlightedText.tsx` | **H4**: Keyword tooltip `lean: +0.3, weight: 5` → `Lean: Right-Leaning` via `leanCategory()`. |
| `src/components/narrative/NarrativeDivergenceIndicator.tsx` | **H4/H5**: "Political Lean" label → `LEAN_LABEL`. "Headline Sentiment" → `SENTIMENT_HEADLINE`. "Body Sentiment" → `SENTIMENT_BODY`. "Headline–Body Gap" → `SENTIMENT_GAP`. |
| `src/components/narrative/StoryComparisonPanel.tsx` | **H5**: `getToneLabel()` now returns `TONE_NEGATIVE`/`TONE_POSITIVE`/`TONE_NEUTRAL` from constants instead of "Critical"/"Favorable"/"Neutral". |
| `src/components/narrative/CompareArticlePanel.tsx` | **H5**: "H. Sentiment" → `SENTIMENT_HEADLINE`. "B. Sentiment" → `SENTIMENT_BODY`. "H–B Gap" → `SENTIMENT_GAP_SHORT`. |
| `src/components/narrative/NarrativeTimeline.tsx` (vertical list) | **H5**: `toneInfo()` labels now use `TONE_NEGATIVE`/`TONE_POSITIVE`/`TONE_NEUTRAL` from constants. Local `leanLabel()` replaced with `leanCategory()` from constants. Raw `toneScore.toFixed(2)` removed from dot title attribute. |
| `src/components/story/HeadlineComparison.tsx` | **H5**: Raw `sentiment.toFixed(2)` replaced with `toneCategory(sentiment)`. |
| `src/components/narrative/DivergenceMeter.tsx` | **M1**: `getScoreColor()` now uses `severityColor()` from constants (canonical 30/60/80 thresholds). `getScoreLabel()` now uses `severityTier()`. Previously used 40/70 for colors and 30/60/80 for labels (mismatched). |
| `src/components/narrative/DivergenceBadge.tsx` | **M1**: Replaced hardcoded 40/70 two-tier thresholds with `DIVERGENCE_LOW_MAX`/`DIVERGENCE_MODERATE_MAX`/`DIVERGENCE_HIGH_MAX`. Added EXTREME tier (score ≥ 80). Uses `severityTier()` and `severityTextClass()`. "FDI" → `SCORE_ABBREV`. |
| `src/components/narrative/NarrativeSnapshotCard.tsx` | **M1**: `scoreColor()` and `barColor()` now use `severityTextClass()` and `severityBgClass()` from constants (canonical 30/60/80 thresholds). Previously used 30/60 two-tier thresholds. |
| `src/components/articles/FracturedStoryCard.tsx` | **M1**: `barColor()` and `scoreColor()` now use `severityBgClass()` and `severityTextClass()` from constants. Previously used 40/70 thresholds. "FDI" → `SCORE_ABBREV`. |
| `src/app/compare/page.tsx` | **H4/H5**: `biasLabel()` now returns `LEAN_LEFT_SHORT`/`LEAN_CENTER`/`LEAN_RIGHT_SHORT`. CoverageBreakdown section labels use constants. Raw `politicalLean.toFixed(2)` removed from source byline. "H. Sentiment" → `SENTIMENT_HEADLINE`. "B. Sentiment" → `SENTIMENT_BODY`. "H–B Gap" → `SENTIMENT_GAP_SHORT`. Gutter labels "H.Sent"/"B.Sent"/"H-B" → "H.Tone"/"B.Tone"/"Gap". "Lean" → `LEAN_LABEL`. |
| `src/app/story/[clusterId]/page.tsx` | **H5**: Raw `leftFrame.sentiment.toFixed(2)` → `toneCategory()`. Raw `rightFrame.sentiment.toFixed(2)` → `toneCategory()`. "Avg sentiment" → "Avg tone". |
| `src/app/journey/[clusterId]/page.tsx` | **H5**: Raw `leftFrame.sentiment.toFixed(2)` → `toneCategory()`. Raw `rightFrame.sentiment.toFixed(2)` → `toneCategory()`. "Avg sentiment" → "Avg tone". |

### Findings Resolved

| Finding ID | Description | Previous Status | New Status |
|---|---|---|---|
| **H4** | Political lean terminology inconsistent across components | Partially addressed | ✅ Resolved — all production components now use `LEAN_*` constants and `leanCategory()` for labels. No raw lean floats rendered to users. |
| **H5** | Sentiment/tone vocabulary clash | Deferred | ✅ Resolved — "Critical"/"Favorable" replaced with `TONE_NEGATIVE`/`TONE_POSITIVE`. Abbreviated labels ("H. Sentiment", "B. Sentiment", "H–B Gap") replaced with `SENTIMENT_*` constants. Raw sentiment floats replaced with `toneCategory()`. |
| **M1** | Divergence severity thresholds inconsistent | `severityTier()` created but not wired | ✅ Resolved — DivergenceMeter, DivergenceBadge, NarrativeSnapshotCard, and FracturedStoryCard all use canonical 30/60/80 thresholds from constants. DivergenceBadge now includes the EXTREME tier. |

### Remaining Deferred Items

| Finding ID | Description | Reason |
|---|---|---|
| **C2** | Journey and Story are duplicate pages | Architectural decision — requires merging or view-toggle, beyond scope of terminology pass |
| **M2** | Compare page analytically dense | Requires progressive disclosure UI patterns — separate design effort |
| **M3** | LatestFeed external links with no return path | Requires UI pattern change — separate effort |
| **M4** | Digest page alert rules not persisted | Backend feature — out of scope |
| **M7** | FracturedStoryCard blindspot warnings need context | Tooltip enhancement — could be added in a future pass |
| **L6** | HighlightedText keyword tooltips show raw data | ✅ Now fixed — tooltip shows lean label instead of raw float + weight |

### Threshold Consistency Verification

| Score | DivergenceMeter | DivergenceBadge | NarrativeSnapshotCard | FracturedStoryCard |
|---|---|---|---|---|
| 25 | LOW (green) | Low (green) | green | green |
| 45 | MODERATE (yellow) | Moderate (yellow) | yellow | yellow |
| 70 | HIGH (red) | High (red) | red | red |
| 85 | EXTREME (red) | Extreme (red) | red | red |

All four components now use the canonical thresholds: `DIVERGENCE_LOW_MAX` (30), `DIVERGENCE_MODERATE_MAX` (60), `DIVERGENCE_HIGH_MAX` (80).

### Build Verification

```
✅ tsc --noEmit — 0 errors
✅ npm run build — clean production build, all routes compiled
✅ grep verification — zero instances of "Bias"/"Stance"/"Critical"/"Favorable"/"H. Sentiment"/"B. Sentiment"/"H–B"/"Political Lean" as user-facing labels in production components
```

### Constants Added to TERMINOLOGY_CONSTANTS.ts

| Constant | Value | Purpose |
|---|---|---|
| `LEAN_LEFT_SHORT` | "Left" | Short lean label for tight spaces |
| `LEAN_RIGHT_SHORT` | "Right" | Short lean label for tight spaces |
| `LEAN_LABEL` | "Lean" | Field/section label for lean indicators |
| `leanCategory(lean)` | → Far Left/Left-Leaning/Center/Right-Leaning/Far Right | Convert numeric lean to label |
| `SENTIMENT_HEADLINE` | "Headline tone" | Label for headline sentiment metric |
| `SENTIMENT_BODY` | "Article tone" | Label for body sentiment metric |
| `SENTIMENT_GAP` | "Headline vs. article tone gap" | Full label for H–B gap |
| `SENTIMENT_GAP_SHORT` | "Tone gap" | Short label for H–B gap |
| `toneCategory(sentiment)` | → Positive/Neutral/Negative | Convert numeric sentiment to label |
| `DIVERGENCE_LOW_MAX` | 30 | Threshold: scores below → Low |
| `DIVERGENCE_MODERATE_MAX` | 60 | Threshold: scores below → Moderate |
| `DIVERGENCE_HIGH_MAX` | 80 | Threshold: scores below → High (above → Extreme) |
| `severityColor(score)` | → CSS variable | Color for divergence score |
| `severityTextClass(score)` | → Tailwind text class | Text color class for divergence score |
| `severityBgClass(score)` | → Tailwind bg class | Background color class for divergence score |

---

---

## Pass 3 — Blindspot Warning Labels (M7)

`src/components/articles/FracturedStoryCard.tsx` — Replaced bare "⚠ Left-heavy" / "⚠ Right-heavy" / "⚠ Center-only" labels with a directionally neutral "⚠ Uneven coverage" label wrapped in a `Tooltip` that explains which perspective may be underrepresented. Finding **M7** resolved.

---

## Pass 4 — Story / Journey Merge (C2)

> **Date:** March 2026
> **Scope:** Merge the Story detail page and Journey detail page into a single unified route with a view toggle. Resolves **C2** — the most significant architectural finding from the UX audit.

### Problem

The Story page (`/story/[clusterId]`) and Journey detail page (`/journey/[clusterId]`) fetched identical data via the same hooks (`useStory`, `useSnapshot`) and rendered the same cluster information in two completely different layouts — a 2-column dashboard and a chapter-by-chapter guided scroll. Users had no indication both views existed or any way to switch between them.

### Solution

A single unified route at `/story/[clusterId]` now serves both experiences via a `?view=` query parameter:

- `?view=dashboard` (default) — the original Story page 2-column dashboard layout
- `?view=guided` — the original Journey chapter-by-chapter scroll layout

A toggle control ("Dashboard" | "Guided Analysis") appears at the top of both views, styled using the existing sort-button pattern (`bg-ink text-cream` active / `bg-bone text-ink-muted` inactive). Switching views updates the URL via `router.replace()` (no history entry, no data refetch) and scrolls to top. A "Compare articles side by side →" tertiary link is right-aligned in the toggle row.

The old `/journey/[clusterId]` route is now a server-side redirect to `/story/[clusterId]?view=guided`, preserving any existing bookmarks or external links.

### Files Created

| File | Purpose |
|---|---|
| `src/app/story/[clusterId]/page.tsx` | Unified page with view toggle, dashboard view, and guided view (replaces previous file) |

### Files Replaced

| File | Change |
|---|---|
| `src/app/journey/[clusterId]/page.tsx` | Full 820-line Journey detail page → 10-line server-side redirect to `/story/[clusterId]?view=guided` |

### Files Modified

| File | Changes |
|---|---|
| `src/app/journey/page.tsx` | JourneyCard links updated from `/journey/${cluster.id}` to `/story/${cluster.id}?view=guided` |
| `src/app/compare/page.tsx` | Cross-link URLs updated: Story → `/story/${id}?view=dashboard`, Journey → `/story/${id}?view=guided` |

### Finding Resolved

| Finding ID | Description | Previous Status | New Status |
|---|---|---|---|
| **C2** | Journey and Story are duplicate pages | Architectural decision, deferred | ✅ Resolved — unified into single route with view toggle |

### Architecture Note

The `?view=` query parameter pattern was chosen because:

1. **Shareability** — users can share or bookmark a specific view (`?view=guided` opens directly in guided mode)
2. **No data refetch** — both views consume the same `useStory()` + `useSnapshot()` hook data; switching views is purely a render-path change
3. **Backward compatibility** — the `/journey/[clusterId]` redirect ensures no broken links
4. **Progressive enhancement** — the Journey landing page (`/journey`) remains a separate discovery surface linking to `?view=guided`; the default Story route opens in dashboard mode for returning power users

### Remaining Deferred Items

| Finding ID | Description | Reason |
|---|---|---|
| **M2** | Compare page analytically dense | Requires progressive disclosure UI patterns — separate design effort |
| **M3** | LatestFeed external links with no return path | Requires UI pattern change — separate effort |
| **M4** | Digest page alert rules not persisted | Backend feature — out of scope |

### Build Verification

```
✅ tsc --noEmit — 0 errors
✅ npm run build — clean production build, all routes compiled
```

---

*No data fetching, API calls, or hook signatures were changed in Pass 4. Routing was consolidated, not changed — all data flows remain identical.*
