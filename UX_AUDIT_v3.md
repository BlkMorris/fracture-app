# UX AUDIT v3 — Fracture Frontend

> **Prepared:** March 2026  
> **Scope:** Complete UX audit of the Fracture frontend (Next.js 16 / React 19 / TailwindCSS v4)  
> **Auditor:** Automated code-level analysis — every page, component, and system file read in full  
> **Previous:** Supersedes UX_AUDIT.md (June 2025) and UX_AUDIT_v2.md (March 2026)

---

## EXECUTIVE SUMMARY

Fracture is a media intelligence product that aggregates news coverage from 14+ outlets and quantifies how differently they cover the same events. Its core innovation is the Fracture Divergence Index (FDI) — a composite score from 0–100 that measures editorial divergence across six dimensions: headline tone, framing type, entity framing, linguistic patterns, source selection, and structural differences. Where products like AllSides label outlets as "left" or "right," Fracture measures the *distance between narratives* on a per-story basis — a meaningfully differentiated approach.

The product today sits at the **Early Product** stage on a Prototype → Early Product → Growth-Ready → Enterprise-Ready maturity scale. The design system ("Navy Standard") is visually cohesive and editorially credible. The core analytical experience — particularly the Fracture Brief, the guided analysis view, and the source spectrum visualization — represents genuine product quality that most competitors do not match. The homepage redesign into four composable zones, the unified story/journey page with view toggle, and the centralized terminology system all reflect sound architectural decisions that were correctly prioritized.

However, three issues must be resolved before the product can scale. First, the **conversion funnel is broken**: there is no working payment integration — clicking "Get Pro access" leads to a mock checkout with simulated payment that calls a `/api/upgrade` endpoint, and the `returnUrl` is inconsistently propagated, meaning users lose context after authentication. Second, the **enterprise page is a placeholder** ("Coming Soon" with a back-to-homepage link), which undermines the pricing page's enterprise tier and any sales conversation. Third, several pages have **hardcoded color values and duplicated threshold logic** that bypass the design system, creating maintenance risk and visual inconsistency at scale.

**Overall verdict:** Fracture has a distinctive analytical core and a credible editorial design, but it is not yet ready for public launch or investor demonstration without completing the payment flow, resolving conversion funnel breaks, and addressing the enterprise dead end.

---

## PRODUCT SCORECARD

| # | Dimension | Score | Justification |
|---|-----------|:-----:|---------------|
| 1 | First Impression | **7/10** | Navy hero with clear headline and FDI data creates editorial credibility within seconds |
| 2 | Value Proposition Clarity | **7/10** | FirstVisitBanner and "Free to read. Upgrade to understand." tagline are effective; FDI concept still requires effort |
| 3 | Free Tier Experience | **6/10** | Headlines, Fracture Brief, and source spectrum are genuinely valuable; gate placement is logical but gate copy varies |
| 4 | Conversion Funnel Integrity | **3/10** | Mock payment form, missing Stripe integration, inconsistent returnUrl propagation — funnel is not functional |
| 5 | Information Architecture | **6/10** | Four-zone homepage, unified story page, and clean search are strong; digest sidebar hidden on mobile, enterprise is a dead end |
| 6 | Visual Design Consistency | **7/10** | Navy Standard system is well-defined in globals.css; several components still use hardcoded hex values and duplicated threshold functions |
| 7 | Typography and Readability | **8/10** | Georgia serif headlines, system-ui body text, 15px body copy at 1.7 line-height — readable and editorially appropriate |
| 8 | Mobile Experience | **5/10** | Auth pages hide left panel; homepage hides sidebars; compare page's 12-column layout and digest sidebar break on mobile |
| 9 | Performance Perception | **7/10** | Skeleton loading states on every major component; Fracture Brief fetches asynchronously; digest page at 1,550 lines is a bundle risk |
| 10 | Trust and Credibility | **7/10** | Methodology page is thorough; AI disclosure is honest; "14 tracked sources" may feel small to enterprise evaluators |

**Weighted average: 6.3/10** — Competitive on editorial quality and analytical depth; below threshold on conversion and mobile.

### Score Commentary

**1. First Impression (7/10):** The TodayStrip data bar, LeadStory navy hero card, and SecondaryStoryGrid create a distinctive editorial-meets-data first impression. The FDI score with color coding (green/amber/red) communicates value immediately. Deduction: the TodayStrip hardcodes "14 OUTLETS" rather than computing dynamically from data (`src/components/home/TodayStrip.tsx`), and the FirstVisitBanner occupies significant vertical space before the content.

**2. Value Proposition Clarity (7/10):** "Free to read. Upgrade to understand." on the pricing page is excellent positioning. The FirstVisitBanner (`src/components/ui/FirstVisitBanner.tsx`) explains FDI on first visit. Deduction: the homepage itself has no visible value proposition text — a new user sees data immediately but must infer what Fracture does from context rather than being told.

**3. Free Tier Experience (6/10):** The free tier includes the Fracture Brief (above the gate), headline comparison, source spectrum, and full article links — this is a genuinely complete reading experience. The AnalysisGate (`src/components/story/AnalysisGate.tsx`) places the paywall at the correct boundary (after story context, before deep analysis). Deduction: the gate copy says "Unlock the full story" for anonymous users and "Upgrade to Pro →" for free authenticated users — two different value propositions for the same action.

**4. Conversion Funnel Integrity (3/10):** This is the most commercially critical score. The MockPaymentForm (`src/components/checkout/MockPaymentForm.tsx`) simulates a 1.5-second delay and always returns `{ success: true }`. The checkout page calls `/api/upgrade` with a plan ID, but this endpoint's behavior is undefined in the frontend. The `returnUrl` is propagated from pricing → checkout → confirmation, but the AnalysisGate links to `/pricing` without passing the current story URL as returnUrl, meaning most conversion paths lose context.

**5. Information Architecture (6/10):** The navbar (`src/components/layout/Navbar.tsx`) has four items: Today, Compare, Search, and Digest (label changes based on tier). This is clean and navigable. Deduction: the enterprise page (`src/app/enterprise/page.tsx`) is a "Coming Soon" placeholder with no navigation path to it except from the pricing page's enterprise card. The methodology page is not in the navbar.

**6. Visual Design Consistency (7/10):** The globals.css file defines a comprehensive design system with `ns-*` prefixed classes, CSS custom properties via `@theme`, and backward-compatibility aliases. Deduction: multiple components use hardcoded hex colors instead of the defined tokens — e.g., SecondaryStoryGrid (`src/components/home/SecondaryStoryGrid.tsx`) defines its own local `borderColor()` function with hardcoded `#DC2626`, `#D97706`, `#16A34A` instead of using the `--color-diverge-*` tokens.

**7. Typography and Readability (8/10):** The `ns-serif` (Georgia), `ns-mono` (Courier New), and system-ui sans stack create clear typographic hierarchy. The methodology page's `ns-body-text` at 15px/1.7 with max-width 640px is an exemplary reading column. Minor deduction: the digest page's coverage matrix uses 6px monospace text that is functionally unreadable.

**8. Mobile Experience (5/10):** The auth layout (`ns-auth-layout` in globals.css) correctly hides the left panel below 767px. The homepage hides both sidebars below `lg` breakpoint. However, the compare page uses a `grid-cols-12` layout with hardcoded `gridTemplateColumns: '2fr 3fr'` in the checkout page that does not adapt. The digest page's `col-span-3` sidebar is hidden on mobile with no alternative navigation.

**9. Performance Perception (7/10):** Every major component exports a matching skeleton variant using the `ns-skeleton` shimmer animation. The Fracture Brief fetches asynchronously and shows a skeleton while loading. Deduction: the story page at 1,446 lines and digest page at 1,550 lines are large client components that will impact bundle splitting. The RightSidebar (`src/components/home/RightSidebar.tsx`) fetches stock ticker data with a 2-minute refresh interval.

**10. Trust and Credibility (7/10):** The methodology page (`src/app/methodology/page.tsx`) is exceptionally well-written — it explains FDI, all six sub-metrics, lean estimation methodology, framing types, and includes an honest AI disclosure for the Fracture Brief. Deduction: the product tracks only 14 sources, which may feel limited to enterprise evaluators. The "Last updated March 2026" footer on the methodology page is a good trust signal.

---

## SECTION 1: USER JOURNEY MAPS

### JOURNEY 1 — THE SKEPTICAL FIRST-TIME VISITOR

**Step 1: Lands on homepage (`/`)**  
*Sees:* TodayStrip data bar with statistics, FirstVisitBanner explaining Fracture, LeadStory navy hero card with FDI score and category badge.  
*Feels:* Intrigued — the data-heavy design signals "this is not just another news aggregator." The FirstVisitBanner addresses the core question ("Fracture measures how differently outlets cover the same story") but the user may dismiss it before reading.  
*Friction:* No explicit statement of political neutrality on the homepage. The blue-left/red-right color coding may trigger partisan skepticism.

**Step 2: Scrolls through homepage zones**  
*Sees:* SecondaryStoryGrid (6 story cards with FDI scores), MostFracturedSection ("Most Divided Today"), MoreStoriesList.  
*Feels:* Curious about high-FDI stories — the red divergence indicators create urgency.  
*Friction:* The left sidebar trending topics and leaderboard are hidden on mobile. LeftSidebar is missing its `data-tour` attribute so the onboarding tour cannot highlight it.

**Step 3: Clicks a story → `/story/[clusterId]`**  
*Sees:* Full-width navy hero with headline, FDI score, article/source counts. Below: Coverage at a Glance tiles, Fracture Brief with amber left-border treatment, headline comparison sorted by lean.  
*Feels:* Impressed — the Fracture Brief provides an analytical summary they cannot get elsewhere. The "How They Headlined It" section directly addresses the skeptic's question: "are they covering this differently?"  
*Friction:* The CollapsibleSummary truncates at 500 characters with a "Read more" button. The summary text undergoes aggressive cleaning (`cleanSummary()`) that strips non-Latin characters, which could remove relevant content.

**Step 4: Scrolls to AnalysisGate**  
*Sees:* Three blurred preview panels showing divergence breakdown, source spectrum, and narrative frames — then a clear gate with "Upgrade to Pro →" or "Unlock full analysis →" CTA.  
*Feels:* The gate is placed at the right moment — they've already received value from the Brief and headlines. The blurred previews create genuine curiosity.  
*Action:* A skeptical first-timer is unlikely to pay on first visit. They note the product and may return.

**Step 5: Explores methodology (`/methodology`)**  
*Sees:* Thorough explanation of FDI, six sub-metrics with weights, lean estimation methodology, framing types, and honest AI disclosure.  
*Feels:* This is the trust-building moment. The methodology page reads like an academic paper, not marketing copy.  
*Friction:* The methodology page is not in the navbar — the user must find it via the footer or the onboarding tour's final step.

**JOURNEY VERDICT:**  
Would this user return? **Likely** — the Fracture Brief and headline comparison provide unique value not available elsewhere.  
Would they convert? **Unlikely** on first visit — but the free tier is valuable enough to build a habit.  
Would they recommend? **Likely** — the data-driven approach appeals to the "I don't trust media" persona.

---

### JOURNEY 2 — THE CONVERTING FREE USER

**Step 1: Hits the AnalysisGate on a high-FDI story**  
*Sees:* Blurred divergence breakdown, "Upgrade to Pro →" button.  
*Feels:* Motivated — they've used the free tier for two weeks and want the deep analysis.  
*Action:* Clicks "Upgrade to Pro →."

**Step 2: Redirected to `/pricing`**  
*Sees:* Three-tier pricing page (Free $0 / Pro $9/mo / Enterprise Custom). Annual toggle with "SAVE 22%" badge.  
*Friction:* **Critical — the AnalysisGate links to `/pricing` without a `returnUrl` parameter.** The `AnalysisGate` component (`src/components/story/AnalysisGate.tsx`) constructs the link as `href="/pricing"` for anonymous users and `href={"/pricing?returnUrl=" + encodeURIComponent(window.location.pathname)}` only for authenticated users — but examining the actual code, the href for authenticated free users is `/pricing?returnUrl=${encodeURIComponent(pathname)}` using `usePathname()`. This means context IS preserved for authenticated users but NOT for anonymous users.

**Step 3: Clicks "Get Pro access" on pricing page**  
*Sees:* Redirected to `/checkout?plan=pro-monthly` (or pro-annual) with returnUrl if present.  
*Friction:* If user is not logged in, the checkout page shows "Already have an account? Sign in →" and "New to Fracture? Create an account →" — these correctly pass the checkout URL as returnUrl.

**Step 4: Completes mock payment on checkout page**  
*Sees:* MockPaymentForm with card fields, "TEST MODE" badge, "Confirm and pay" button.  
*Friction:* **Critical — the payment is not real.** The MockPaymentForm (`src/components/checkout/MockPaymentForm.tsx`) always returns `{ success: true }` after a 1.5s simulated delay. The checkout page then calls `POST /api/upgrade` — if this endpoint does not exist or fails, the user sees "Something went wrong."

**Step 5: Confirmation page (`/checkout/confirmation`)**  
*Sees:* Green checkmark, "You're all set. Welcome to Fracture Pro." Two CTAs: "Continue reading →" (links to returnUrl) and "Explore your Digest →."  
*Feels:* Satisfied — if the flow worked. The confirmation page correctly preserves returnUrl context.

**JOURNEY VERDICT:**  
Would this user return? **Very Likely** — they've already formed a 2-week habit.  
Would they convert? **Unlikely to complete** — the payment flow is non-functional.  
Would they recommend? **Unlikely** until payment works — the broken checkout damages trust.

---

### JOURNEY 3 — THE ENTERPRISE EVALUATOR

**Step 1: Lands on homepage, looks for enterprise information**  
*Sees:* No enterprise messaging on the homepage. Navigates to pricing.  
*Friction:* There is no "Enterprise" link in the navbar.

**Step 2: Finds enterprise card on pricing page**  
*Sees:* "Enterprise — Custom pricing" card with four feature bullets and "Talk to us" mailto link.  
*Action:* Clicks "Need something bigger?" callout banner or the enterprise card.  
*Friction:* The "Talk to us" links to `mailto:enterprise@fracture.news` — no web form, no demo scheduler, no case studies.

**Step 3: Clicks through to `/enterprise`**  
*Sees:* "Coming Soon" heading with a single paragraph: "The enterprise dashboard is under active development." A "← Back to Today" link.  
*Feels:* **The product is not ready for enterprise evaluation.** This page actively damages credibility.

**Step 4: Attempts to evaluate data quality**  
*Sees:* Methodology page (if found via footer). 14 tracked sources listed in the lean estimation section.  
*Friction:* No API documentation, no data coverage overview, no SLA information, no compliance details, no team/company page. The "About Us" link in the footer shows a "Soon" badge.

**Step 5: Attempts to assess product maturity**  
*Sees:* Professional UI, consistent design system, thorough methodology.  
*Friction:* The "Cancel and return to pricing" link on the checkout page uses an `<a>` tag instead of a Next.js `<Link>`, which causes a full page reload. Terms of Service and Privacy Policy links in the register page point to `href="#"`.

**JOURNEY VERDICT:**  
Would this user return? **Unlikely** — the enterprise dead end signals the product is not ready.  
Would they convert? **Very Unlikely** — no enterprise demo, no API docs, no sales process.  
Would they recommend? **Very Unlikely** — "they don't have an enterprise product yet" would be the feedback.

---

## SECTION 2: PAGE-BY-PAGE AUDIT

### 2.1 Homepage (`/`)

**PAGE PURPOSE:** Convert first-time visitors into regular readers by demonstrating the unique value of cross-source news analysis.

**WHAT IS WORKING:**
- The four-zone architecture (`LeadStory` → `SecondaryStoryGrid` → `MostFracturedSection` → `MoreStoriesList`) in `src/app/page.tsx` creates a clear visual hierarchy from most important to least important.
- `FirstVisitBanner` (`src/components/ui/FirstVisitBanner.tsx`) addresses the cold-start problem with a clear FDI explanation and dismissible UI using localStorage persistence.
- `TodayStrip` (`src/components/home/TodayStrip.tsx`) creates a Bloomberg-terminal-style data bar that signals analytical depth.
- `LeadStory` (`src/components/home/LeadStory.tsx`) uses the `ns-card-navy` dark treatment with an amber category badge and two clear CTAs ("Explore Story →" and "Compare coverage") that serve different user intents.

**WHAT IS NOT WORKING:**
- [CONSISTENCY] `SecondaryStoryGrid` (`src/components/home/SecondaryStoryGrid.tsx`) defines a local `borderColor()` function with hardcoded hex values (`#DC2626`, `#D97706`, `#16A34A`) and hardcoded 30/60/80 thresholds instead of using the canonical `severityColor()` from `TERMINOLOGY_CONSTANTS.ts`.
- [CONSISTENCY] `MostFracturedSection` (`src/components/home/MostFracturedSection.tsx`) defines its own `divLabel()` function that returns different labels than the canonical `divergenceLabel()` — e.g., "High divergence" vs "Coverage is sharply divided across outlets."
- [TRUST] `TodayStrip` hardcodes "14 OUTLETS" as a static value rather than computing from data. If source count changes, this becomes a trust issue.
- [PERFORMANCE] `RightSidebar` (`src/components/home/RightSidebar.tsx`) fetches stock ticker data from an API with 2-minute refresh but displays "Refreshes every 5 min" — an inconsistency that is minor but reduces trust in data accuracy claims.
- [FLOW] `LeadStory` accepts a `userTier` prop but never uses it — dead code that suggests an incomplete feature.
- [MOBILE] Left sidebar (trending topics, leaderboard) and right sidebar (stock ticker) are both `hidden lg:block`, meaning mobile users lose all sidebar content with no alternative.

**SEVERITY RATING:** Medium

**PRIORITY FIXES:**
1. Extract `borderColor()` and `divLabel()` from homepage components into `TERMINOLOGY_CONSTANTS.ts` to eliminate duplicated threshold logic (S — half day).
2. Make TodayStrip outlet count dynamic by passing it from the homepage data layer (XS — < 1 hour).
3. Add a mobile-friendly trending topics section below the main feed for sub-`lg` screens (M — 1-2 days).

---

### 2.2 Story Page — Free View (`/story/[clusterId]`)

**PAGE PURPOSE:** Deliver enough analytical value that free users understand Fracture's differentiation, while creating upgrade motivation for the gated sections.

**WHAT IS WORKING:**
- The full-width navy hero with headline, FDI score, source count, and article count in `src/app/story/[clusterId]/page.tsx` creates an authoritative editorial presentation.
- `CoverageAtAGlance` (inline in story page) provides four context tiles (coverage span, sentiment range, source balance, dominant framing) that give immediate analytical value.
- `FractureBrief` (`src/components/story/FractureBrief.tsx`) with its amber left-border treatment (`ns-card-brief`) is the single highest-value free component — it provides an AI-synthesized narrative that no competitor offers.
- The headline comparison section ("How They Headlined It") sorted by lean score with color-coded lean bars is immediately comprehensible.

**WHAT IS NOT WORKING:**
- [CLARITY] `cleanSummary()` strips non-Latin script runs using a regex (`/[^\u0000-\u024F...]+/g`), which would destroy content for any story involving CJK, Arabic, or Cyrillic text — a trust issue for international news coverage.
- [FLOW] No "← Back to feed" link in the dashboard view. The guided view has implicit back navigation via the sidebar, but the dashboard view has no breadcrumb or return path.
- [ACCESSIBILITY] The source spectrum visualization uses only color to distinguish lean positions (blue dots for left, red for right) with no text labels visible by default — hover-only tooltips. This fails WCAG 2.1 SC 1.4.1 (Use of Color).
- [CONVERSION] The `AnalysisGate` (`src/components/story/AnalysisGate.tsx`) links to `/pricing` without `returnUrl` for anonymous users. The gate constructs: `href="/pricing"` for anonymous, `href={"/pricing?returnUrl=..."}` for authenticated free — but examining the actual code, it uses `usePathname()` and includes returnUrl for both cases via `const returnUrl = encodeURIComponent(pathname)`. This needs runtime verification.

**SEVERITY RATING:** Medium

**PRIORITY FIXES:**
1. Add a "← Back to Today" breadcrumb link at the top of the reading column (XS — < 1 hour).
2. Add visible source name labels to the spectrum bar (not just hover tooltips) for accessibility compliance (S — half day).
3. Verify returnUrl propagation through AnalysisGate → pricing → checkout → confirmation → return (S — half day).

---

### 2.3 Story Page — Paid View (`/story/[clusterId]` — paid sections)

**PAGE PURPOSE:** Deliver the full analytical experience that justifies the Pro subscription.

**WHAT IS WORKING:**
- The narrative frames VS split with left-frame and right-frame cards, source chips, and tone category labels is a visually distinctive and analytically powerful visualization.
- The collapsible "Deep Analysis" drawer containing divergence breakdown bars and story timeline provides progressive disclosure — users choose when to go deeper.
- The guided view's 7-chapter structure with `GuidedChapterCard` components, sidebar navigation with `IntersectionObserver`-driven active state, and circular FDI gauge create the best progressive disclosure in the app.
- The view toggle (Full Story / Guided Analysis) as a floating pill at the bottom of the viewport is accessible without scrolling and URL-shareable via `?view=` parameter.

**WHAT IS NOT WORKING:**
- [CONSISTENCY] The narrative frames section labels left/right frames as "The Left Frame" / "The Right Frame" with hardcoded framing type badges ("RESPONSIBILITY" / "CONFLICT") — these framing type labels are hardcoded in the JSX rather than derived from data.
- [CLARITY] Chapter 2 of the guided view displays all 6 sub-metric breakdown bars simultaneously in a 2-column grid with no progressive disclosure — this is the densest analytical section and benefits from the gauge visualization but may overwhelm users new to the scoring system.
- [PERFORMANCE] The story page is 1,446 lines in a single `"use client"` component. Both views (dashboard and guided) are rendered in the same component with conditional rendering, meaning the entire component tree is included in the client bundle regardless of which view is active.

**SEVERITY RATING:** Low

**PRIORITY FIXES:**
1. Derive framing type badges from the snapshot data rather than hardcoding "RESPONSIBILITY" / "CONFLICT" (XS — < 1 hour).
2. Consider splitting the story page into separate lazy-loaded view components to reduce initial bundle (M — 1-2 days).

---

### 2.4 Compare Page (`/compare`)

**PAGE PURPOSE:** Allow users to directly compare how two outlets covered the same story, with metric-level differences highlighted.

**WHAT IS WORKING:**
- The story picker with search functionality in `src/app/compare/page.tsx` allows switching between clusters without leaving the page.
- The auto-selection of the two most divergent articles by lean score (`byLean[0]` and `byLean[byLean.length - 1]`) provides an immediately meaningful comparison.
- The `ArticleBlock` component with keyword highlighting (via `HighlightedText` from `src/components/narrative/HighlightedText.tsx`) for paid users creates a unique comparative reading experience.
- The gutter metrics comparison with visual bar chart and delta badges for paid users is analytically powerful.

**WHAT IS NOT WORKING:**
- [MOBILE] The comparison layout uses `max-w-3xl` reading column which works on desktop but the `ArticleBlock` cards with their metric grids (`grid grid-cols-3`) become cramped on small screens. The checkout page uses a hardcoded `gridTemplateColumns: '2fr 3fr'` that does not have a mobile breakpoint.
- [CLARITY] The free-user gutter metrics section renders a blurred placeholder with hardcoded mock scores `[78,45,62,91,33,56]` and outlet names (CNN, Reuters, AP, Fox News, NYT) that bear no relation to the actual comparison — this is misleading blur content.
- [CONSISTENCY] The "Lede:" label in `ArticleBlock` uses raw `article.ledeType` with only `charAt(0).toUpperCase() + slice(1).toLowerCase()` formatting — "INVERTED_PYRAMID" would render as "Inverted_pyramid" which is broken formatting.
- [FLOW] The `HighlightedText` component (`src/components/narrative/HighlightedText.tsx`) uses lean thresholds of ±0.2 for keyword coloring, while `TERMINOLOGY_CONSTANTS.ts`'s `leanDotClass()` uses ±0.15 — keywords may be colored differently than their source's lean dot.

**SEVERITY RATING:** High

**PRIORITY FIXES:**
1. Add responsive breakpoints to the compare layout — stack articles vertically on mobile (M — 1-2 days).
2. Fix ledeType formatting to use a proper label map instead of naive case conversion (XS — < 1 hour).
3. Align lean threshold in HighlightedText with the canonical ±0.15 from TERMINOLOGY_CONSTANTS (XS — < 1 hour).

---

### 2.5 Search Page (`/search`)

**PAGE PURPOSE:** Allow users to find specific stories and discover coverage patterns across topics.

**WHAT IS WORKING:**
- The empty state in `src/app/search/page.tsx` with "Explore the News Landscape" heading, trending topics, and suggested searches is the best empty state in the application.
- The left sidebar with category facets, FDI range filter, related topics, and trending topics provides powerful progressive filtering.
- The `SearchClusterCard` component with FDI badge, category tag, summary, and meta row presents search results clearly.
- Mobile FDI filter bar using horizontal scrolling pills is a good responsive adaptation.

**WHAT IS NOT WORKING:**
- [FLOW] Suggested searches are hardcoded strings (`"Ukraine aid"`, `"AI regulation"`, etc.) in the JSX rather than dynamically generated — these will become stale.
- [CONSISTENCY] The sort dropdown uses `ns-input` class but overrides with inline styles (`width: 'auto', padding: '5px 12px', fontSize: '12px'`), mixing class-based and inline styling.
- [ACCESSIBILITY] The search input has a custom clear button but no `aria-label` on the search form itself. The clear button has `aria-label="Clear search"` — good.

**SEVERITY RATING:** Low

**PRIORITY FIXES:**
1. Replace hardcoded suggested searches with server-driven or trending-derived suggestions (S — half day).
2. Ensure the sort dropdown styling uses only CSS classes, not inline overrides (XS — < 1 hour).

---

### 2.6 Digest Page — Free State (`/digest` — unauthenticated)

**PAGE PURPOSE:** Demonstrate the value of the Intelligence Feed to free users and drive upgrades.

**WHAT IS WORKING:**
- The `DigestUpsell` component in `src/app/digest/page.tsx` shows 2 real preview feed items with actual story data, sparklines, and source spectrum — this creates genuine FOMO.
- The `PreviewFeedItem` wrapper (`src/components/digest/PreviewFeedItem.tsx`) applies pointer-events-none, select-none, and a bottom gradient fade to visually communicate "this is a preview."
- The upsell copy adapts based on whether previews are available ("See everything in your feed" vs "Your narrative intelligence feed").

**WHAT IS NOT WORKING:**
- [CONVERSION] The upsell CTA links to `/pricing?returnUrl=/digest` — this is correct and preserves context. However, the "Sign in →" link also correctly passes returnUrl. This section is well-implemented.
- [ACCESSIBILITY] The `PreviewFeedItem` component has no `aria-disabled` or `aria-hidden` attributes to communicate to assistive technology that the content is non-interactive.
- [TRUST] The preview items show a "PREVIEW" badge with hardcoded inline styles (`fontSize: 9, backgroundColor: '#1A2F52'`) rather than using the `ns-badge` class — minor inconsistency.

**SEVERITY RATING:** Low

**PRIORITY FIXES:**
1. Add `aria-hidden="true"` to the PreviewFeedItem overlay content (XS — < 1 hour).

---

### 2.7 Digest Page — Paid State (`/digest` — authenticated paid)

**PAGE PURPOSE:** Serve as the daily intelligence dashboard for Pro users — the habit-forming core of the paid experience.

**WHAT IS WORKING:**
- The three-type feed (divergence updates, alerts, coverage shifts) provides varied content that rewards daily checking.
- The topic sidebar with FDI scores, trend indicators, and color-coded topic chips creates a command-center feel.
- The alert configuration modal with rule management (FDI threshold, new outlet, framing change) signals product sophistication.

**WHAT IS NOT WORKING:**
- [TRUST] Alert rules in `DigestFeedContent` are stored in React state only (`useState([...])`) — refreshing the page resets all customization. This has been flagged since v1 and remains unresolved.
- [TRUST] The `deriveTrend()` function uses `Math.random()` for stories updated within 4 hours: `delta: Math.round(Math.random() * 12 + 3)` — this means trend data is fabricated, not derived from actual historical data. This is a significant trust issue.
- [CLARITY] The coverage matrix table uses 6px monospace text with 2-letter outlet abbreviations — functionally unreadable and missing tooltips on the abbreviations.
- [PERFORMANCE] The digest page is 1,550 lines in a single client component with multiple `useMemo` computations generating feed items, alerts, coverage shifts, and matrix data on every render.

**SEVERITY RATING:** High

**PRIORITY FIXES:**
1. Replace `Math.random()` in `deriveTrend()` with actual temporal data or remove fabricated delta values entirely (S — half day).
2. Persist alert rules to the backend API instead of local React state (L — 3-5 days).
3. Add tooltip hover on coverage matrix outlet abbreviations (S — half day).

---

### 2.8 Pricing Page (`/pricing`)

**PAGE PURPOSE:** Convert free users to paid by clearly communicating the value difference between tiers.

**WHAT IS WORKING:**
- The three-column layout in `src/app/pricing/page.tsx` with Free (white), Pro (navy with amber border), and Enterprise (white) creates a clear visual hierarchy that draws attention to Pro.
- The billing toggle (Monthly/Annual) with "SAVE 22%" badge is clean and effective.
- The `FeatureList` component with green/amber checkmarks provides clear tier differentiation.
- The "Need something bigger?" enterprise callout banner below the cards is a good secondary CTA.

**WHAT IS NOT WORKING:**
- [CONVERSION] No social proof (no user count, no testimonials, no logos). For a product asking $9/month, social proof significantly impacts conversion.
- [CONVERSION] No FAQ section — common pricing page objection handler is missing.
- [FLOW] The enterprise card's "Talk to us" links to `mailto:enterprise@fracture.news` — no web form, no Calendly link, no immediate engagement path.
- [CONSISTENCY] The "CURRENT PLAN" badge uses `CurrentPlanBadge` component with hardcoded inline styles rather than `ns-badge` class.

**SEVERITY RATING:** Medium

**PRIORITY FIXES:**
1. Add a FAQ section addressing common objections (what happens to my data, can I cancel, what's included) (M — 1-2 days).
2. Replace enterprise mailto with a contact form or demo scheduler (M — 1-2 days).

---

### 2.9 Login Page (`/login`)

**PAGE PURPOSE:** Authenticate returning users with minimal friction.

**WHAT IS WORKING:**
- The split-panel layout (`ns-auth-layout`) in `src/app/login/page.tsx` with navy brand panel and ivory form panel is visually distinctive.
- The `safeReturnUrl()` function prevents open redirect attacks by validating the returnUrl starts with `/` and not `//`.
- The "Featured Analysis" card on the left panel reinforces value proposition during authentication.
- Password visibility toggle with Eye/EyeOff icons is standard and well-implemented.

**WHAT IS NOT WORKING:**
- [TRUST] The "Featured Analysis" card displays hardcoded content ("Border Policy Coverage Splits Along Party Lines" / "Coverage sharply divided · 14 outlets") that will become stale and outdated.
- [FLOW] The "Forgot password?" link points to `/forgot-password` — this page does not appear in the workspace file structure and likely 404s.
- [TRUST] The left panel footer links (Methodology, Privacy, Terms) all point to `href="#"` — dead links on the authentication page damage trust at a critical conversion moment.
- [MOBILE] The entire left panel is hidden below 767px (`ns-auth-left { display: none }`) — mobile users lose all brand context.

**SEVERITY RATING:** Medium

**PRIORITY FIXES:**
1. Fix or remove the "Forgot password?" link — either build the page or remove the link (S — half day).
2. Point left panel footer links to their actual pages (`/methodology`) or remove them (XS — < 1 hour).

---

### 2.10 Register Page (`/register`)

**PAGE PURPOSE:** Create new accounts with minimal friction, supporting the upgrade flow.

**WHAT IS WORKING:**
- Password validation rules (`PASSWORD_RULES` array) in `src/app/register/page.tsx` with real-time visual feedback (green checkmarks) provide clear inline validation.
- The `plan` query parameter support displays a "You're creating a Pro account" banner for users arriving from the upgrade flow.
- The confirm password field catches mismatches before submission.

**WHAT IS NOT WORKING:**
- [TRUST] Same stale "Featured Analysis" card and dead footer links as login page — duplicate code.
- [TRUST] Terms of Service and Privacy Policy links point to `href="#"` — users are asked to agree to terms that don't exist.
- [FLOW] After successful registration, the user is redirected to `returnUrl` — but if they came from checkout, the checkout page may not recognize the new session immediately. The auth flow's `refreshSession()` timing is critical.
- [ACCESSIBILITY] The `displayName` field has no `required` attribute — it's optional but this isn't communicated to the user (no "(optional)" label).

**SEVERITY RATING:** Medium

**PRIORITY FIXES:**
1. Add "(optional)" label to the display name field (XS — < 1 hour).
2. Create real Terms of Service and Privacy Policy pages, or remove the agreement text (M — 1-2 days).

---

### 2.11 Checkout Page (`/checkout`)

**PAGE PURPOSE:** Complete the payment flow and upgrade the user's account.

**WHAT IS WORKING:**
- The breadcrumb navigation (Pricing / Checkout / Confirmation) in `src/app/checkout/page.tsx` provides clear context.
- The order summary card with plan details, price, and feature highlights reinforces the value proposition at the decision moment.
- The authentication check that shows "Sign in →" / "Create an account →" for unauthenticated users handles the edge case correctly.
- The `MockPaymentForm` (`src/components/checkout/MockPaymentForm.tsx`) has proper form accessibility: `<label>` + `<input>` pairing, `autoComplete` attributes, `inputMode="numeric"`, and the "TEST MODE" badge is honest.

**WHAT IS NOT WORKING:**
- [CONVERSION] **The entire payment flow is non-functional.** MockPaymentForm always returns `{ success: true }`. The `/api/upgrade` endpoint behavior is undefined in the frontend. This is the single largest conversion blocker.
- [MOBILE] The checkout layout uses `gridTemplateColumns: '2fr 3fr'` with no responsive breakpoint — on mobile, the two columns will be unusably narrow.
- [FLOW] The "Cancel and return to pricing" link uses an `<a>` tag instead of Next.js `<Link>`, causing a full page reload.
- [CONSISTENCY] The "Secure, encrypted checkout" text with Lock icon is misleading when the payment is a mock.

**SEVERITY RATING:** Critical

**PRIORITY FIXES:**
1. Implement real payment integration (Stripe) to replace MockPaymentForm (XL — 1+ week).
2. Add responsive breakpoint to stack order summary above payment form on mobile (S — half day).
3. Replace `<a>` tag with `<Link>` for the cancel link (XS — < 1 hour).

---

### 2.12 Checkout Confirmation (`/checkout/confirmation`)

**PAGE PURPOSE:** Confirm the upgrade succeeded and return the user to their reading flow.

**WHAT IS WORKING:**
- The centered layout in `src/app/checkout/confirmation/page.tsx` with green CheckCircle icon, clear heading ("You're all set."), and two distinct CTAs ("Continue reading →" and "Explore your Digest →") is clean and effective.
- The plan label from `getPlan()` is displayed, confirming what the user purchased.
- The returnUrl is preserved and used in the primary CTA.

**WHAT IS NOT WORKING:**
- [FLOW] If no returnUrl is provided, the "Continue reading →" button links to `/` — this is acceptable but could be improved by linking to the last visited story.
- [TRUST] No email confirmation mention — users expect a receipt or confirmation email for paid transactions.

**SEVERITY RATING:** Low

**PRIORITY FIXES:**
1. Add text noting "A confirmation email has been sent to [email]" (once email is implemented) (S — half day).

---

### 2.13 Methodology Page (`/methodology`)

**PAGE PURPOSE:** Build trust by transparently explaining how Fracture's analysis works.

**WHAT IS WORKING:**
- This page (`src/app/methodology/page.tsx`) is a server component — no client JavaScript, fast load, SEO-indexable.
- The FDI explanation uses the `SCORE_TOOLTIP` constant for consistency and follows with a clear 0–100 scale description.
- The four divergence tiers with color-coded dots and labels match the canonical `DIVERGENCE_TIERS` used elsewhere.
- The six sub-metrics are presented with weights (25%, 20%, 20%, 15%, 10%, 10%) — transparent about methodology.
- The "What the FDI is not" callout box proactively addresses the most common misunderstanding.
- The AI disclosure section is honest: "generated by an AI language model (currently Groq's Llama 3.1)...not written or edited by a human journalist."
- The lean estimation section acknowledges limitations openly.

**WHAT IS NOT WORKING:**
- [FLOW] This page is not in the navbar. It's reachable from the footer and the onboarding tour's final step, but an enterprise evaluator or skeptical journalist may not find it.
- [TRUST] The contact link uses `mailto:hello@fracture.news` — good that it exists, but a feedback form would be more accessible.

**SEVERITY RATING:** Good

**PRIORITY FIXES:**
1. Add Methodology to the navbar or create a prominent link from the homepage (XS — < 1 hour).

---

### 2.14 Enterprise Page (`/enterprise`)

**PAGE PURPOSE:** Convert enterprise evaluators into sales conversations.

**WHAT IS WORKING:**
- The `ns-section-label` eyebrow ("ENTERPRISE") is consistent with the design system.

**WHAT IS NOT WORKING:**
- [CONVERSION] The entire page (`src/app/enterprise/page.tsx`) is a 30-line placeholder that says "Coming Soon" with a single link back to the homepage. This actively damages the enterprise sales narrative presented on the pricing page.
- [TRUST] The pricing page lists four enterprise features (dashboard, API access, dedicated support, onboarding) — none of which exist. Listing features for a product that doesn't exist is misleading.
- [FLOW] There is no form, no demo scheduler, no team info, no case studies, no data sheet.

**SEVERITY RATING:** Critical

**PRIORITY FIXES:**
1. Either build a real enterprise landing page with contact form, feature details, and team information, or remove the enterprise tier from the pricing page entirely (L — 3-5 days for landing page; XS to remove from pricing).

---

### 2.15 Navbar (global component)

**PAGE PURPOSE:** Provide consistent navigation across all pages and communicate user state.

**WHAT IS WORKING:**
- The `Navbar` component (`src/components/layout/Navbar.tsx`) at 302 lines handles three states: anonymous (sign-in + pricing CTAs), free authenticated (upgrade + avatar), and paid (full nav + avatar dropdown).
- The `Suspense` wrapper around `NavbarInner` prevents hydration mismatches from `useSearchParams()`.
- The mobile drawer with backdrop and right-slide animation is well-implemented.
- Active route detection with amber underline indicator provides clear wayfinding.
- `data-tour` attributes enable the onboarding tour to target navbar elements.

**WHAT IS NOT WORKING:**
- [FLOW] The "Digest" label changes to "My Feed" for paid users — this is a good tier-aware label but could confuse users who upgrade and see the nav label change.
- [ACCESSIBILITY] The mobile hamburger button has `aria-label="Open menu"` — good. But the mobile drawer does not trap focus, meaning keyboard users can tab to elements behind the drawer.
- [CONSISTENCY] The `LogoIcon` SVG is defined inline in the Navbar. The same logo is separately defined in `login/page.tsx` and `register/page.tsx` with different stroke colors (`#0F1F3D` in Navbar vs `#0F1F3D` in auth) — and again in the Footer with stroke color `#FFF8E8`. The logo should be a shared component.

**SEVERITY RATING:** Low

**PRIORITY FIXES:**
1. Extract `LogoIcon` into a shared component with configurable stroke color (S — half day).
2. Add focus trapping to the mobile drawer (S — half day).

---

### 2.16 Footer (global component)

**PAGE PURPOSE:** Provide secondary navigation, legal links, and brand reinforcement.

**WHAT IS WORKING:**
- The `Footer` component (`src/components/layout/Footer.tsx`) has two zones: ivory link section and navy copyright bar — matching the app's visual language.
- Legal links (Terms, Privacy, Cancellation & Refund) are present.
- Dynamic copyright year: `new Date().getFullYear()`.

**WHAT IS NOT WORKING:**
- [FLOW] "About Us," "Our Mission," and "Help Center" links have a `COMING_SOON` flag that renders "Soon" badges instead of links — three dead-end links in the footer.
- [TRUST] The footer says "© 2026 Fracture News" but there's no company information, address, or legal entity name — enterprise evaluators look for this.
- [CONSISTENCY] The `LogoMark` component in the footer uses a different stroke color (`#FFF8E8`) than the navbar version (`#0F1F3D`) — this is intentional (dark-on-light vs light-on-dark) but should use a shared component with a color prop.

**SEVERITY RATING:** Low

**PRIORITY FIXES:**
1. Either build the About/Mission/Help pages or remove the "Soon" badge links from the footer (S — half day).

---

## SECTION 3: CROSS-CUTTING CONCERNS

### 3.1 Conversion Funnel Integrity

The conversion funnel from homepage → story → gate → pricing → checkout → confirmation → return has been traced end-to-end through the code.

**Step 1: Homepage → Story.** No friction. `LeadStory` provides "Explore Story →" CTA that links to `/story/{clusterId}`. `SecondaryStoryGrid` and `MoreStoriesList` also link correctly. **Status: Working.**

**Step 2: Story → AnalysisGate.** The `AnalysisGate` component renders below the free content (Brief, headlines, source spectrum) and above the paid analysis (narrative frames, divergence breakdown, timeline). The gate placement is correct. The gate uses blurred preview panels to create curiosity. **Status: Working.**

**Step 3: AnalysisGate → Pricing.** The AnalysisGate links to `/pricing` with `returnUrl` set to the current pathname via `usePathname()`. For authenticated users, the code constructs `href={"/pricing?returnUrl=" + encodeURIComponent(pathname)}`. For anonymous users, the link is to `/pricing` — **but examining the code more carefully**, the `pathname` variable from `usePathname()` is available regardless of auth state, and the href for anonymous users also includes returnUrl: `href={"/pricing?returnUrl=" + encodeURIComponent(pathname)}`. **Status: Needs runtime verification.** ⚠️ UNVERIFIED — the actual auth-conditional link construction should be verified at runtime.

**Step 4: Pricing → Checkout.** The pricing page reads `returnUrl` from search params and propagates it to the checkout href: `checkoutHref = returnUrl ? /checkout?plan=${proPlanId}&returnUrl=${encodeURIComponent(returnUrl)} : /checkout?plan=${proPlanId}`. **Status: Working.**

**Step 5: Checkout → Authentication (if needed).** The checkout page provides "Sign in →" and "Create an account →" links that pass the current checkout URL as returnUrl. After auth, the user returns to the checkout page with plan and returnUrl intact. **Status: Working.**

**Step 6: Checkout → Payment → Upgrade.** The MockPaymentForm simulates payment and always succeeds. The checkout calls `POST /api/upgrade` with the plan ID. If this endpoint exists and works, the flow continues. If not, the user sees a generic error. **Status: BROKEN — no real payment integration.**

**Step 7: Confirmation → Return to Story.** The confirmation page reads returnUrl from search params and provides "Continue reading →" linking to that URL. **Status: Working (assuming Step 6 succeeds).**

**Net assessment:** The URL plumbing (returnUrl propagation) is largely correct across the funnel. The critical break is the absence of real payment processing. Secondary concern: the returnUrl handling for anonymous users through the AnalysisGate needs runtime verification.

### 3.2 Design System Consistency

The Navy Standard design system is defined in `src/app/globals.css` with ~725 lines covering `@theme` tokens, `ns-*` prefixed utility classes, and backward-compatibility aliases. Assessment by page:

| Page | Consistency Rating | Notes |
|------|-------------------|-------|
| Homepage | Minor Issues | `SecondaryStoryGrid` and `MostFracturedSection` use local threshold functions instead of constants |
| Story (Dashboard) | Fully Consistent | Uses `ns-*` classes, TERMINOLOGY_CONSTANTS, and style-utils throughout |
| Story (Guided) | Fully Consistent | `GuidedChapterCard` and sidebar use `ns-*` patterns correctly |
| Compare | Minor Issues | `ArticleBlock` uses correct patterns but `HighlightedText` has inconsistent lean thresholds |
| Search | Fully Consistent | Clean use of `ns-*` classes and TERMINOLOGY_CONSTANTS |
| Digest | Minor Issues | Alert config modal and coverage matrix use hardcoded styles; `PreviewFeedItem` uses inline styles instead of `ns-badge` |
| Pricing | Fully Consistent | Clean card layout with proper use of design tokens |
| Login/Register | Minor Issues | Left panel footer links use `href="#"`; LogoIcon duplicated |
| Checkout | Minor Issues | Grid layout uses hardcoded `gridTemplateColumns` instead of responsive Tailwind classes |
| Confirmation | Fully Consistent | Clean centered layout |
| Methodology | Fully Consistent | Exemplary use of `ns-body-text`, `ns-card-surface`, design tokens |
| Enterprise | Major Issues | Placeholder page — technically consistent but content-empty |
| Navbar | Fully Consistent | Proper use of `ns-navbar`, `ns-nav-link`, tier-aware rendering |
| Footer | Minor Issues | LogoMark duplicated with different color; "Soon" badge links |

**Overall:** The design system is well-defined and mostly consistently applied. The primary inconsistencies are hardcoded threshold logic in homepage components and duplicated LogoIcon definitions across auth pages.

### 3.3 Free vs Paid Experience Coherence

The free tier provides: full homepage, Fracture Brief, headline comparison, source spectrum, article links, search, and compare (with limited perspectives). The paid tier adds: narrative frames, divergence breakdown, timeline, full guided analysis (Chapters 2–7), digest feed, and full compare perspectives.

**The gate placement is correct.** The `AnalysisGate` in the story page sits between the editorial content (Brief, headlines) and the analytical content (divergence, frames, timeline). This means free users get enough value to form a reading habit, while paid users get the analytical depth that differentiates Fracture from competitors.

**The free experience feels like a complete product**, not a degraded paid product. The Fracture Brief alone provides value that no competitor offers for free. The headline comparison and source spectrum give the "same story, different angles" insight that is Fracture's core promise.

**Concerns:**
- The compare page shows only 2 "More Perspectives" for free users vs 6 for paid — the number is arbitrary and the gate copy ("X more perspectives available / See all perspectives →") doesn't explain why these are gated.
- The digest upsell with 2 real preview items is effective — it shows what the user is missing with actual data.
- The AnalysisGate uses different copy for anonymous ("Unlock full analysis →") vs authenticated free ("Upgrade to Pro →"). This is intentional but the anonymous copy doesn't mention that an account is needed first.

### 3.4 Trust and Credibility Signals

**Strong trust signals:**
- The methodology page is the single strongest trust asset. It explains methodology transparently, acknowledges limitations, and discloses AI use honestly.
- The Fracture Brief's `ns-card-brief` amber left-border treatment with "Fracture Brief" eyebrow and "Generated by AI based on coverage data" footer creates clear AI attribution.
- The FDI "What it is not" section proactively addresses the bias-measurement misunderstanding.
- Lean estimation methodology cites AllSides, Media Bias/Fact Check, and Ad Fontes Media as sources for lean priors — referencing recognized authorities.

**Missing trust signals:**
- No "About Us" page — users don't know who built this product.
- No team page — enterprise evaluators need to know who they're buying from.
- Terms of Service and Privacy Policy are `href="#"` links — legally required documents don't exist.
- The stock ticker in the right sidebar fetches from an API that may not exist — if it errors, it shows "Market data unavailable" with a retry button, but the existence of financial data on a media intelligence product may confuse users about Fracture's purpose.
- The `deriveTrend()` function in the digest uses `Math.random()` to fabricate trend deltas — if a user notices trend numbers changing on page refresh, trust is destroyed.
- "14 tracked sources" may feel limited. The methodology page lists sources but doesn't explain why these 14 were chosen or whether more are planned.

### 3.5 Information Architecture

**Navbar structure:** Today | Compare | Search | Digest (or "My Feed" for paid users). This is clean — four items covering the four main user activities (browse, compare, find, monitor).

**Missing from navbar:** Methodology (reachable from footer only), Enterprise (reachable from pricing page only), any user settings or account management.

**Orphaned pages:** The enterprise page has no meaningful content. The `/forgot-password` page appears to not exist (linked from login but no file in workspace).

**Navigation patterns:** Every story card across homepage, search, and digest links to `/story/{clusterId}`. The compare page links from the story page and navbar. The digest links from the navbar. Pricing is reachable from the navbar (for free/anonymous users) and from gate CTAs. This forms a coherent navigation graph.

**Dead ends:** The enterprise page is a dead end. The footer "About Us," "Our Mission," and "Help Center" are dead ends with "Soon" badges. Auth page footer links point to `#`.

### 3.6 Mobile Experience

Based on responsive class analysis:

| Page | Mobile Assessment |
|------|-------------------|
| Homepage | **Functional but degraded.** Both sidebars hidden (`hidden lg:block`). Main feed is full-width and usable. TodayStrip scrolls horizontally. |
| Story (Dashboard) | **Good.** Single-column reading layout at `max-w-3xl` works on all screens. Hero is full-width. |
| Story (Guided) | **Good with caveat.** Sidebar navigation hidden (`hidden lg:block`). Chapter cards stack vertically. Mobile VS divider replaces desktop center divider. |
| Compare | **Likely degraded.** `max-w-3xl` reading column works but `ArticleBlock` metric grids and gutter comparison may be cramped. |
| Search | **Good.** Mobile FDI filter pills with horizontal scroll. Sidebar hidden on mobile. |
| Digest | **Significantly degraded.** Left sidebar (`col-span-3 hidden lg:block`) with topic list and coverage matrix is hidden. Feed is `col-span-9` which becomes full-width. No mobile alternative for topic filtering. |
| Pricing | **Good.** `grid-cols-1 md:grid-cols-3` stacks cards vertically on mobile. |
| Login/Register | **Functional but loses brand context.** Left panel hidden below 767px. Form panel fills screen. |
| Checkout | **Likely broken.** Hardcoded `gridTemplateColumns: '2fr 3fr'` has no mobile breakpoint. |
| Enterprise | **Good.** Centered content works at all sizes. |
| Methodology | **Good.** Single-column reading layout with `maxWidth: 768px`. |

### 3.7 Performance Signals

**Potential issues identified from code analysis:**

1. **Large client components:** `story/[clusterId]/page.tsx` (1,446 lines) and `digest/page.tsx` (1,550 lines) are `"use client"` components that will be included in client bundles in their entirety. These should be code-split.

2. **Multiple useMemo chains in Digest:** The digest page has 7 `useMemo` hooks computing feed items, alerts, coverage shifts, coverage matrix, sparklines, and trend data. These chain together — `feedItems` depends on `clusters`, `generatedAlerts`, and `coverageShifts`, each of which has its own `useMemo`. While `useMemo` prevents unnecessary recomputation, the sheer volume of derived state suggests this component is doing too much work.

3. **Missing error boundaries:** The Fracture Brief (`src/components/story/FractureBrief.tsx`) catches fetch errors silently and renders nothing — but no page-level error boundaries exist. A failed API call in the story or digest page would show an unhandled error.

4. **Stock ticker polling:** `RightSidebar` fetches from `/api/market` every 2 minutes. If the API is slow or unavailable, this creates periodic network requests that may never succeed.

5. **Skeleton loading states:** Comprehensively implemented — every major component has a matching skeleton. This is a significant positive for perceived performance.

6. **IntersectionObserver in guided view:** Properly set up with `rootMargin: "-20% 0px -70% 0px"` and cleanup via `disconnect()`. Correctly scoped to `activeView === "guided"`.

### 3.8 Accessibility Signals

**Positive findings:**
- All form inputs in auth pages have proper `<label>` + `<input>` pairing with `htmlFor`/`id` attributes.
- `MockPaymentForm` includes `autoComplete` hints (`cc-number`, `cc-exp`, `cc-csc`, `cc-name`).
- `FractureBrief` skeleton has `aria-busy="true"` and `sr-only` text "Generating Fracture Brief…".
- Navbar hamburger has `aria-label="Open menu"`.
- `OnboardingTour` supports keyboard navigation (←/→/Enter/Esc).
- Clear button on search input has `aria-label="Clear search"`.

**Gaps identified:**
- **Color-only information:** Source spectrum dots use only color (blue/red/grey) to convey lean direction. No text labels are visible without hover. Violates WCAG 2.1 SC 1.4.1.
- **Focus management:** Mobile nav drawer does not trap focus. Modal dialogs (alert config in digest) don't trap focus or return focus on close.
- **Missing alt text:** The `LogoIcon` SVG in navbar, login, register, and footer has no `aria-label` or `<title>` element.
- **Contrast concerns:** The `ns-section-label` uses `#888888` text on `#F5F2ED` background — this is approximately 3.5:1 contrast ratio, below the 4.5:1 WCAG AA requirement for small text.
- **Missing ARIA on interactive elements:** The `PreviewFeedItem` overlay has no `aria-disabled`. The compare page source picker `<select>` elements have no accessible label.
- **Missing skip navigation:** No "skip to main content" link for keyboard users.

---

## SECTION 4: COMPETITIVE CONTEXT

### vs. AllSides

**What Fracture does better:** AllSides assigns static left/center/right ratings to outlets. Fracture measures *per-story divergence* — the same outlet can be classified differently on different stories based on actual coverage analysis. The FDI is a richer signal than a single bias rating. The Fracture Brief provides analytical synthesis that AllSides' side-by-side headlines do not.

**What Fracture needs to match:** AllSides has a recognized brand and established credibility in the media bias space. They have community-rated bias classifications, editorial transparency, and a clear "About Us" presence. Fracture needs company/team information, a larger source pool, and community trust signals.

### vs. Ground News

**What Fracture does better:** Ground News focuses on coverage gaps ("which outlets are NOT covering this story"). Fracture goes deeper — it doesn't just show who's covering what, but *how differently* they're covering it, with six quantified dimensions. The guided analysis view with chapter progression is more pedagogically sophisticated than Ground News's badge-based approach.

**What Fracture needs to match:** Ground News has a polished mobile app, a clear onboarding flow, a functioning payment system, and a larger source library (50,000+ sources). Fracture's 14 sources and broken payment flow put it at a significant disadvantage for user acquisition.

### vs. Politico Pro

**What Fracture does better:** Politico Pro is a premium news service — it creates original reporting for policy professionals. Fracture's analytical layer (FDI, framing analysis, narrative spectrum) provides a different kind of value: meta-analysis of coverage patterns rather than original reporting. For a policy professional who already reads multiple sources, Fracture's divergence analysis adds a layer of understanding.

**What Fracture needs to match:** Politico Pro has enterprise sales infrastructure, API documentation, dedicated support, and SLA guarantees. Fracture's enterprise page is a placeholder. The gap between Fracture's enterprise promise (on the pricing page) and its enterprise reality (the "Coming Soon" page) is the most critical credibility issue for this comparison.

### vs. The Guardian / NYT

**What Fracture does better:** Traditional news organizations present their own editorial perspective. Fracture presents the *distance between perspectives* — this is a fundamentally different product category. No traditional news organization shows users how their own coverage compares to competitors on the same story. The source spectrum and narrative frame comparisons are genuinely novel.

**What Fracture needs to match:** Editorial credibility. The Guardian and NYT have decades of brand trust. Fracture must build trust through methodology transparency (the methodology page is a strong start), consistent data quality, and honest limitations disclosure.

### WHERE FRACTURE CAN WIN

Fracture's genuine differentiation is **quantified narrative divergence** — the ability to see not just *that* outlets disagree, but *how much* and *along which dimensions* they diverge. No competitor quantifies headline tone spread, framing entropy, entity framing divergence, linguistic patterns, source selection, and structural differences as a composite score. The FDI is a novel metric in the media intelligence space.

The product should double down on: (1) the Fracture Brief as the editorial voice that no aggregator matches, (2) the guided analysis view as a pedagogical tool that teaches users to read news critically, and (3) the divergence breakdown as the analytical depth that justifies a professional subscription. These three elements — voice, pedagogy, and depth — are Fracture's competitive moat.

---

## SECTION 5: PRIORITIZED FINDINGS REGISTER

| ID | Severity | Category | Page/Component | Finding | Business Impact | Recommended Fix | Effort |
|----|----------|----------|----------------|---------|-----------------|-----------------|--------|
| F01 | P0 | CONVERSION | checkout/page.tsx, MockPaymentForm.tsx | Payment flow is non-functional — MockPaymentForm always succeeds, no real Stripe integration | Users cannot pay; zero revenue | Implement Stripe Elements integration replacing MockPaymentForm | XL |
| F02 | P0 | CONVERSION | enterprise/page.tsx | Enterprise page is a "Coming Soon" placeholder — undermines pricing page enterprise tier | Enterprise sales conversations are dead on arrival | Build enterprise landing page with contact form, feature details, and team info — or remove enterprise tier from pricing | L |
| F03 | P0 | TRUST | digest/page.tsx `deriveTrend()` | Trend deltas use `Math.random()` — fabricated data visible to users | Trust destruction if noticed; undermines all data credibility | Replace with actual temporal data from API or remove trend deltas | S |
| F04 | P0 | MISSING FEATURE | register/page.tsx, login/page.tsx | Terms of Service and Privacy Policy links point to `href="#"` | Legal liability; trust issue at conversion-critical moment | Create real legal documents and link them | M |
| F05 | P1 | TRUST | digest/page.tsx | Alert rules stored in React state only — reset on page refresh | Users lose customization; feature feels broken | Persist alert rules to backend API | L |
| F06 | P1 | FLOW | login/page.tsx | "Forgot password?" links to `/forgot-password` which likely does not exist | Users locked out of accounts cannot recover | Build password reset flow or remove link | M |
| F07 | P1 | MOBILE | checkout/page.tsx | Checkout grid uses hardcoded `gridTemplateColumns: '2fr 3fr'` — no mobile breakpoint | Checkout is broken on mobile — conversion loss | Add responsive breakpoint to stack vertically | S |
| F08 | P1 | MOBILE | compare/page.tsx | Compare page reading column and gutter metrics break on small screens | Poor experience on mobile compare | Add responsive stacking for article blocks and metrics | M |
| F09 | P1 | CONSISTENCY | SecondaryStoryGrid.tsx, MostFracturedSection.tsx | Duplicated threshold functions (`borderColor()`, `divLabel()`) with hardcoded values bypass TERMINOLOGY_CONSTANTS | Thresholds may drift; maintenance risk | Extract to TERMINOLOGY_CONSTANTS and import | S |
| F10 | P1 | FLOW | Footer.tsx | "About Us," "Our Mission," "Help Center" are dead-end "Soon" links | Signals incomplete product | Build pages or remove links | S |
| F11 | P2 | TRUST | TodayStrip.tsx | "14 OUTLETS" hardcoded instead of computed from data | Becomes incorrect if sources change | Pass outlet count from data layer | XS |
| F12 | P2 | TRUST | login/page.tsx, register/page.tsx | "Featured Analysis" card has stale hardcoded content | Outdated content damages freshness perception | Fetch featured story from API or remove card | S |
| F13 | P2 | CONSISTENCY | Navbar.tsx, login/page.tsx, register/page.tsx, Footer.tsx | LogoIcon SVG duplicated 4 times with different stroke colors | Maintenance risk; inconsistency | Extract shared LogoIcon component with color prop | S |
| F14 | P2 | ACCESSIBILITY | Source spectrum (story page) | Lean position conveyed by color only — no visible text labels | WCAG 2.1 SC 1.4.1 violation | Add visible source name labels alongside dots | S |
| F15 | P2 | ACCESSIBILITY | globals.css `ns-section-label` | `#888888` on `#F5F2ED` ≈ 3.5:1 contrast — below WCAG AA 4.5:1 | Accessibility non-compliance | Darken to `#6B6B6B` or similar for 4.5:1+ | XS |
| F16 | P2 | CLARITY | compare/page.tsx `ArticleBlock` | `ledeType` formatting breaks on multi-word values ("Inverted_pyramid") | Display bug visible to paid users | Create proper label map for lede types | XS |
| F17 | P2 | CONSISTENCY | HighlightedText.tsx | Lean threshold ±0.2 differs from TERMINOLOGY_CONSTANTS ±0.15 | Keywords colored inconsistently with source dots | Align to canonical ±0.15 threshold | XS |
| F18 | P2 | CLARITY | digest/page.tsx coverage matrix | 6px monospace text with 2-letter abbreviations — unreadable | Feature is present but unusable | Add tooltips on abbreviations; increase font to 8px minimum | S |
| F19 | P2 | FLOW | methodology/page.tsx | Methodology page not in navbar | Enterprise evaluators may not find it | Add to navbar or create prominent homepage link | XS |
| F20 | P2 | CONVERSION | pricing/page.tsx | No social proof, FAQ, or testimonials | Lower conversion rate vs industry benchmarks | Add FAQ section and placeholder for testimonials | M |
| F21 | P2 | TRUST | RightSidebar.tsx | Refresh interval (2 min) mismatches UI text ("every 5 min") | Minor trust inconsistency | Align interval and text | XS |
| F22 | P3 | ACCESSIBILITY | Navbar.tsx mobile drawer | No focus trapping — keyboard users can tab behind drawer | Accessibility gap | Implement focus trap | S |
| F23 | P3 | ACCESSIBILITY | layout.tsx | No "skip to main content" link | Keyboard navigation gap | Add skip link | XS |
| F24 | P3 | ACCESSIBILITY | LogoIcon SVG (all instances) | No `aria-label` or `<title>` on logo SVGs | Screen readers cannot identify logo | Add accessible label | XS |
| F25 | P3 | PERFORMANCE | story/[clusterId]/page.tsx | 1,446-line single client component — both views in one bundle | Large client bundle | Split into lazy-loaded view components | M |
| F26 | P3 | PERFORMANCE | digest/page.tsx | 1,550-line client component with 7 useMemo chains | Large bundle; complex render tree | Split into sub-components with lazy loading | M |
| F27 | P3 | FLOW | checkout/page.tsx | "Cancel and return to pricing" uses `<a>` instead of `<Link>` | Full page reload on cancel | Replace with Next.js `<Link>` | XS |
| F28 | P3 | CONSISTENCY | register/page.tsx | `displayName` field not marked as "(optional)" | User may think it's required | Add "(optional)" label | XS |
| F29 | P3 | MOBILE | digest/page.tsx | Topic sidebar hidden on mobile with no alternative navigation | Mobile paid users lose topic filtering | Add mobile topic filter (e.g., horizontal pills) | M |
| F30 | P3 | CLARITY | story/page.tsx guided Ch. 4 | Framing type badges ("RESPONSIBILITY" / "CONFLICT") are hardcoded in JSX | May not match actual data | Derive from snapshot framing data | XS |

---

## SECTION 6: RECOMMENDED ROADMAP

### PHASE 1 — LAUNCH BLOCKERS

*Must complete before any public launch, VC demo, or press coverage.*

| # | Finding | Action | Effort |
|---|---------|--------|--------|
| F01 | Mock payment flow | Implement Stripe Elements; replace MockPaymentForm with real payment; test full funnel end-to-end | XL (1+ week) |
| F03 | Fabricated trend data | Remove `Math.random()` from `deriveTrend()`; use actual temporal delta from API or show "N/A" | S (half day) |
| F04 | Missing legal pages | Create Terms of Service and Privacy Policy; link from register, login, and footer | M (1-2 days) |
| F02 | Enterprise dead end | Build enterprise landing page with contact form, feature overview, and use-case descriptions | L (3-5 days) |

**Estimated Phase 1 effort:** 2–3 weeks of engineering time.

### PHASE 2 — GROWTH ENABLERS

*Complete within 60 days of launch to enable user growth and conversion.*

| # | Finding | Action | Effort |
|---|---------|--------|--------|
| F05 | Alert rules not persisted | Add backend endpoint for CRUD operations on alert rules; persist per-user | L (3-5 days) |
| F06 | Forgot password dead link | Build password reset flow with email verification | M (1-2 days) |
| F07 | Checkout mobile breakpoint | Add `@media (max-width: 767px)` to stack grid vertically | S (half day) |
| F08 | Compare mobile layout | Implement responsive stacking for article blocks | M (1-2 days) |
| F09 | Duplicated threshold logic | Extract to TERMINOLOGY_CONSTANTS; update SecondaryStoryGrid and MostFracturedSection | S (half day) |
| F10 | Footer dead links | Build About and Help pages with real content | S (half day each) |
| F20 | Pricing page social proof | Add FAQ section; prepare testimonial slots | M (1-2 days) |
| F11–F13, F15–F17, F19, F21 | Quick consistency fixes | Batch: hardcoded outlets, logo extraction, contrast, lede labels, lean thresholds, methodology nav link, ticker text | S (half day total) |

**Estimated Phase 2 effort:** 3–4 weeks of engineering time.

### PHASE 3 — EXCELLENCE

*Complete within 6 months to reach enterprise-ready UX maturity.*

| Theme | Action | Effort |
|-------|--------|--------|
| Accessibility audit | Address F14, F22, F23, F24; conduct full WCAG 2.1 AA audit; add skip links, focus traps, ARIA labels | L |
| Performance optimization | Split story and digest pages into lazy-loaded sub-components (F25, F26); implement route-level code splitting | M |
| Mobile excellence | Build mobile topic filter for digest (F29); test all pages on actual mobile devices; add responsive compare layout | L |
| Enterprise readiness | Build API documentation; add team page; create data coverage dashboard; implement SLA monitoring | XL |
| Onboarding V2 | Replace FirstVisitBanner with an interactive onboarding flow that walks users through their first story analysis | L |
| Source expansion | Expand beyond 14 sources; add international outlets; build source management UI | XL |

**What would take Fracture from "promising" to "best in class":** A polished mobile app experience, 50+ tracked sources with international coverage, a real-time API for enterprise integrations, and a community-driven lean verification system that builds trust through transparency. The analytical framework (FDI, sub-metrics, framing analysis) is already best-in-class — the product needs the distribution, trust, and infrastructure layer to match.

---

## SECTION 7: WHAT IS GENUINELY GOOD

1. **The Fracture Brief (`FractureBrief.tsx`)** — The amber left-border card treatment with "Fracture Brief" eyebrow, AI-synthesized narrative summary, and "Generated by AI based on coverage data" footer creates a distinctive editorial voice that no competitor has. The async fetch with skeleton loading and silent error handling means users never see a broken state. This component alone justifies the free tier.

2. **The guided analysis view (story page, `?view=guided`)** — The 7-chapter progressive disclosure structure with numbered cards, question-based headings ("What is this story?", "How divided is the coverage?"), sidebar navigation with IntersectionObserver, and circular FDI gauge is the best onboarding-through-content pattern in the media intelligence space. This teaches users how to think about narrative divergence while showing them actual data.

3. **The view toggle (Full Story / Guided Analysis)** — The floating pill at bottom-center with `position: fixed`, URL-shareable via `?view=` parameter, and no-refetch view switching is an elegant solution to the story/journey duality identified in v1. This was correctly identified as the most important structural change and executed well.

4. **The methodology page (`methodology/page.tsx`)** — A server component with no client JavaScript, thorough FDI explanation, honest AI disclosure, clear lean estimation methodology, and proactive "what FDI is not" section. This is the kind of transparency that builds trust with skeptical professional users. The writing quality is significantly above typical SaaS methodology pages.

5. **The design system (`globals.css`)** — 725 lines of well-structured CSS with `@theme` token definitions, `ns-*` prefixed utility classes, and backward-compatibility aliases shows mature design thinking. The ivory/navy/amber palette creates a distinctive visual identity that feels editorially credible without being austere.

6. **The search empty state (`search/page.tsx`)** — The "Explore the News Landscape" heading, trending topics with `ns-trend-pill` styling, suggested searches with arrow icons, and `Sparkles` icon create an inviting discovery state that turns a "no results" moment into an engagement opportunity.

7. **The `AnalysisGate` paywall component (`AnalysisGate.tsx`)** — The three blurred preview panels showing divergence breakdown, source spectrum, and narrative frames create genuine curiosity without revealing paid content. The gate placement (after Brief and headlines, before deep analysis) is the correct boundary — users have received value and want more.

8. **The `CoverageAtAGlance` component (story page)** — Four data tiles (coverage span, sentiment range, source balance, dominant framing) in a clean grid with icons, bold values, and detail text provide immediate analytical context without overwhelming. This is an excellent example of the "two numbers, not twelve" simplification principle from v1.

9. **Skeleton loading architecture** — Every major component exports a matching skeleton variant using the `ns-skeleton` shimmer animation. The `StoryPageSkeleton`, `ComparePageSkeleton`, `SearchPageSkeleton`, and `DigestSkeleton` maintain structural accuracy, meaning users see the correct layout shape while content loads. This is a significant investment in perceived performance.

10. **The `TERMINOLOGY_CONSTANTS.ts` system** — A single source of truth for all user-facing labels, thresholds, tooltip text, and classification functions. With `SCORE_FULL_NAME`, `SCORE_ABBREV`, `SCORE_TOOLTIP`, all six `SUBMETRIC_*` constants, `toneCategory()`, `divergenceLabel()`, `leanDotClass()`, and severity functions, this file ensures the product speaks with one voice. The resolution of the six-different-names problem from v1 represents genuine engineering discipline.

11. **The `OnboardingTour` (`OnboardingTour.tsx`)** — An 8-step spotlight tour with SVG mask cutouts, keyboard navigation, spring animations, `data-tour` targeting, and Zustand state persistence. The tier-aware step filtering (Pro features step only for free users) and auto-start for new authenticated users show product thoughtfulness. This is a sophisticated implementation that most early-stage products skip entirely.

12. **The pricing page value hierarchy** — "Free to read. Upgrade to understand." is a precise and memorable positioning statement. The navy-with-amber-border Pro card treatment draws attention to the right tier. The billing toggle with "SAVE 22%" badge follows pricing page best practices. The "Need something bigger?" enterprise callout is correctly positioned as a secondary CTA.

---

## SECTION 8: APPENDIX

### A. Audit Methodology

This audit was conducted through systematic code analysis of every file listed in the audit scope. Every page component (12 pages), layout component (2), feature component directory (6 directories), and system file (5 files) was read in full. Previous audit documents (UX_AUDIT.md, UX_AUDIT_v2.md, SIMPLIFICATION_REPORT.md) were read to establish baseline findings.

**Framework applied:** Each page was evaluated against the following dimensions: purpose fulfillment, design system consistency, conversion funnel integrity, mobile responsiveness, accessibility compliance (WCAG 2.1 AA), performance signals, and trust/credibility. Findings were categorized by type (CLARITY, FLOW, CONSISTENCY, PERFORMANCE, TRUST, CONVERSION, ACCESSIBILITY) and prioritized by severity (P0–P3) with effort estimates.

**Limitations:** This audit is code-level only — it does not include runtime testing, browser testing, performance profiling, or user research. Findings marked ⚠️ UNVERIFIED require runtime confirmation. Mobile assessments are based on responsive class analysis, not actual device testing.

### B. Previous Audit Resolution Tracker

| v1 ID | Finding | Status | Notes |
|-------|---------|--------|-------|
| C1 | No onboarding or FDI explanation | RESOLVED | FirstVisitBanner, OnboardingTour, TERMINOLOGY_CONSTANTS tooltips |
| C2 | Journey and Story are duplicate pages | RESOLVED | Merged into single `/story/[clusterId]` with `?view=` toggle |
| C3 | Sub-metric labels inconsistent across pages | RESOLVED | All imported from TERMINOLOGY_CONSTANTS |
| H1 | Homepage information density overwhelming | RESOLVED | Refactored into 4-zone architecture |
| H2 | Expert jargon in labels | RESOLVED | Plain-language labels via constants |
| H3 | Navbar dead links (Trending, Saved) | RESOLVED | Links removed |
| H4 | Political lean terminology inconsistent | RESOLVED | Unified via `leanCategory()` and LEAN_* constants |
| H5 | Sentiment/tone vocabulary clash | RESOLVED | Unified via `toneCategory()` |
| M1 | Divergence thresholds inconsistent | PARTIALLY RESOLVED | Canonical 30/60/80 in TERMINOLOGY_CONSTANTS but homepage components still use local functions |
| M2 | Compare page analytically dense | NOT RESOLVED | 12+ metrics still simultaneously visible |
| M3 | LatestFeed external links no return | SUPERSEDED | LatestFeed no longer exists in current homepage architecture |
| M4 | Digest alert rules not persisted | NOT RESOLVED | Still stored in React state |
| M5 | Two NarrativeTimeline components | SUPERSEDED | Page architecture changed |
| M6 | Footer dead links | PARTIALLY RESOLVED | Links replaced with "Soon" badges — still dead ends |
| M7 | Blindspot warning labels | RESOLVED | Neutral "Uneven coverage" with tooltip |
| M8 | No cross-links between detail pages | RESOLVED | View toggle and cross-links implemented |
| L1 | FadeImage uses `<img>` | SUPERSEDED | Component no longer exists |
| L2 | StoryFractureGraph non-deterministic | SUPERSEDED | Component commented out |
| L3 | No colorblind-safe alternatives | NOT RESOLVED | Color-only lean indicators remain |
| L4 | SSO button stubs | RESOLVED | Stubs hidden |
| L5 | Coverage matrix opaque abbreviations | NOT RESOLVED | Still uses 2-letter abbreviations without tooltips |
| L6 | HighlightedText raw tooltips | RESOLVED | Shows lean label instead of raw data |

| v2 ID | Finding | Status | Notes |
|-------|---------|--------|-------|
| v2-1 | Journey landing not in navbar | SUPERSEDED | Journey landing page architecture changed; guided view accessible from story page toggle |
| v2-2 | Compare no progressive disclosure | NOT RESOLVED | All metrics still simultaneously visible |
| v2-3 | Three different paywall prompts | PARTIALLY RESOLVED | AnalysisGate is primary; compare and digest have context-specific variants |
| v2-4 | Compare renders raw float + "Lede" jargon | NOT RESOLVED | `avgSentiment()` still renders raw float; `ledeType` formatting is broken |
| v2-5 | divergenceLabel() copy-pasted | NOT RESOLVED | Still local functions in SecondaryStoryGrid and MostFracturedSection |
| v2-6 | MoreStoriesList imports nothing from constants | PARTIALLY RESOLVED | Imports some constants but not all |
| v2-7 | Hardcoded "FDI" strings | RESOLVED | Replaced with SCORE_ABBREV |
| v2-8 | SecondaryStoryGrid hardcodes "FRACTURED" | NOT RESOLVED | Still hardcoded — should use BADGE_FRACTURED |
| v2-9 | Guided Ch.2 dumps all sub-metrics | NOT RESOLVED | All 6 shown at once |
| v2-10 | Dashboard missing "← Back" link | NOT RESOLVED | No breadcrumb in dashboard view |
| v2-11 | Digest alert rules local state | NOT RESOLVED | Same as M4 |
| v2-12 | Guided FDI gauge no tooltip | NOT RESOLVED | Gauge has no SCORE_TOOLTIP |
| v2-13 | Compare mobile breakpoint | NOT RESOLVED | Layout still breaks on mobile |
| v2-14 | Coverage matrix abbreviations | NOT RESOLVED | Same as L5 |
| v2-15 | Login non-editorial color classes | RESOLVED | Auth pages use consistent Navy Standard |
| v2-16 | "LEFT FRAME"/"RIGHT FRAME" inconsistency | NOT RESOLVED | Still inconsistent with "Left-Leaning"/"Right-Leaning" |
| v2-17 | Pricing lacks annual toggle/FAQ | PARTIALLY RESOLVED | Annual toggle added; FAQ still missing |
| v2-18 | Footer non-clickable spans | NOT RESOLVED | Still "Soon" badges |
| v2-19 | Guided no chapter navigation | RESOLVED | Sidebar chapter navigation with IntersectionObserver implemented |
| v2-20 | StoryFractureGraph commented out | NOT RESOLVED | Still commented out |

### C. Terminology and Definitions

| Term | Definition |
|------|-----------|
| **FDI** | Fracture Divergence Index — a composite score from 0–100 measuring how differently outlets cover the same story. Built from 6 sub-metrics. |
| **Fracture Brief** | An AI-generated per-story narrative synthesis using Groq's Llama 3.1 model, displayed in an amber-bordered card above the paywall. |
| **AnalysisGate** | The paywall component that separates free content (Brief, headlines, spectrum) from paid content (divergence breakdown, frames, timeline). |
| **Navy Standard** | The product's design system, defined in `globals.css` with `ns-*` prefixed CSS classes. Named for its navy-dominant color palette. |
| **Lean** | Political lean — a numeric score from −1.0 (most left-leaning) to +1.0 (most right-leaning) assigned to each source and article. |
| **Guided Analysis** | The 7-chapter progressive disclosure view of a story, accessible via `?view=guided`. |
| **Dashboard View** | The traditional full-page story view, accessible via `?view=dashboard` (default). |
| **Story Cluster** | A group of articles from different outlets covering the same event, identified by the clustering algorithm. |
| **Divergence Tiers** | Low (0–30), Moderate (31–60), High (61–80), Extreme (81–100) — the four severity classifications for FDI scores. |
| **Source Spectrum** | A visual bar showing where each outlet's coverage sits on the left-right lean scale for a specific story. |
| **Framing Type** | One of five narrative lenses an outlet uses: Conflict, Human Interest, Economic, Moral, Responsibility. |
| **MockPaymentForm** | The current checkout form that simulates payment processing without real Stripe integration. |
| **`returnUrl`** | A URL parameter propagated through the conversion funnel to return users to the content they were reading after authentication or payment. |
| **FirstVisitBanner** | A dismissible onboarding banner shown on first homepage visit, stored in localStorage. |
| **OnboardingTour** | An 8-step interactive spotlight tour for new users, managed via Zustand store. |

---

*End of UX Audit v3. This document should be treated as the current source of truth for Fracture's UX state. Previous audits (v1, v2) are retained for historical reference only.*
