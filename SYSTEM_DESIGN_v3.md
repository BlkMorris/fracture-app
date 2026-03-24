> ⚠️ Superseded by SYSTEM_DESIGN_v4.md — March 2026.

# FRACTURE — Technical System Design

**Version:** 3.0
**Date:** March 12, 2026
**Author:** CTO, Fracture Inc.

---

## Change Log

| Version | Date | Summary |
|---|---|---|
| **v1.0** | — | Initial architecture (Kafka, microservices topology, Auth0, TF-IDF clustering) |
| **v2.0** | March 10, 2026 | Kafka → BullMQ/Redis, NestJS monolith, custom JWT auth, Image Pipeline, frontend application, 14 RSS sources |
| **v3.0** | March 12, 2026 | UX simplification passes 1–4 (terminology, tooltips, dead links, cross-links, Journey/Story merge) · `TERMINOLOGY_CONSTANTS.ts` — single source of truth for all user-facing labels · Fracture Brief — AI-generated story synthesis via Groq API · Two-tier product model (Free / Paid) with `AnalysisGate` · `tierUtils.ts` — tier helpers and role mapping · Homepage redesigned as editorial front page (4-zone layout) · Navigation restructured to 4 items by reader intent · Pricing page at `/pricing` · Unified story page with Dashboard / Guided Analysis toggle |

---

## 1. Overview

Fracture is a real-time narrative intelligence platform that ingests news from curated sources across the political spectrum, clusters articles into unified story threads, and computes quantitative divergence metrics on how each outlet frames the same event.

**Product model (v3):** Fracture is a two-tier news platform:

- **Free tier** — a reading experience for casual readers who want multiple perspectives on the same story. Includes the homepage, story reading, the Fracture Brief (AI editorial summary), basic Compare, search, and qualitative divergence indicators.
- **Paid tier** — a full analytical suite for power users who monitor narrative divergence. Includes the complete FDI breakdown, all sub-metrics, keyword highlighting, full Compare with gutter analysis, Guided Analysis chapters, the Digest intelligence feed, and topic monitoring.

The **Fracture Brief** is the core differentiating feature for free-tier users — a 2–3 paragraph AI-synthesized editorial summary that distills how outlets are diverging on a story, generated via the Groq API.

The **unified story page** (`/story/[clusterId]`) serves two modes via a toggle: Dashboard (2-column analytical layout) and Guided Analysis (chapter-by-chapter scroll). Both views share the same data hooks and render the Fracture Brief above the toggle.

### Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | NestJS 11 (monolith), TypeORM, BullMQ, PostgreSQL 16, Redis 7, Elasticsearch 8.12 |
| **Frontend** | Next.js 16 (App Router), React 19, TailwindCSS v4, TanStack React Query v5, Zustand 5, Framer Motion 12, Recharts 3, Lucide React |
| **AI** | Groq API (llama-3.1-8b-instant) for Fracture Brief; OpenAI API for image pipeline (embeddings + DALL-E 3) |
| **Infrastructure** | Docker Compose (dev): PostgreSQL 16-alpine, Redis 7-alpine (256MB allkeys-lru), Elasticsearch 8.12.0 |

> Stack changes since v2: Added `recharts` (^3.8.0) to frontend dependencies for sparkline charts in the Digest page. Added `GROQ_API_KEY` to frontend environment. No changes to backend dependencies.

---

## 2. Architecture

> Carried forward from v2 — verified accurate as of v3. The Mermaid diagram, service topology, and data ingestion pipeline are unchanged.

### 2.1 High-Level System Diagram

The v2 architecture diagram remains accurate. The system consists of:

- **Content sources:** 14 RSS feeds + NewsAPI integration + Trend Signal feeds
- **Frontend:** Next.js 16 consumer web app (React 19 + TailwindCSS v4) with BFF API routes
- **Backend:** NestJS monolith with 7 feature modules, 3 BullMQ queues, cron schedulers
- **Data stores:** PostgreSQL 16, Redis 7 (BullMQ + rate limiting), Elasticsearch 8.12, local filesystem (images)

### 2.2 Service Topology

> Carried forward from v2 — verified accurate as of v3.

| Module | Responsibility | Status |
|---|---|---|
| **Articles Module** | Article + Source CRUD, cluster lookup | ✅ Implemented |
| **Ingestion Module** | Fetch from RSS/NewsAPI, dedup, enqueue processing | ✅ Implemented |
| **Narrative Module** | Sentiment, bias, framing, clustering, divergence, ranking, snapshots, trends, discovery search | ✅ Implemented |
| **Search Module** | Full-text and faceted search, autocomplete | ✅ Implemented |
| **Auth Module** | User registration, JWT auth, role-based access | ✅ Implemented |
| **Image Pipeline Module** | Article image sourcing, AI generation, relevance scoring, storage | ✅ Implemented |
| **Health Module** | Infrastructure health checks | ✅ Implemented |

All 7 modules confirmed in `backend/src/app.module.ts`. No new NestJS modules have been added since v2.

### 2.3 Next.js BFF Layer

**Existing BFF routes (from v2):**

| BFF Route | Backend Endpoint | Transform |
|---|---|---|
| `GET /api/homepage` | `GET /api/v1/narrative/homepage` | Enrich clusters with divergence + spectrum data |
| `GET /api/stories` | `GET /api/v1/narrative/stories` | Paginate + format |
| `GET /api/stories/[id]` | `GET /api/v1/narrative/clusters/[id]` | Full cluster detail with articles + narrative data |
| `GET /api/stories/[id]/articles` | `GET /api/v1/narrative/clusters/[id]/articles` | Cluster articles |
| `GET /api/stories/[id]/snapshot` | `GET /api/v1/narrative/clusters/[id]/snapshot` | Narrative snapshot |
| `GET /api/search` | `GET /api/v1/narrative/discover` | Discovery search results |
| `GET /api/search/trending-topics` | `GET /api/v1/narrative/trending-topics` | Trending topic keywords |
| `GET /api/stats` | `GET /api/v1/narrative/feed-stats` | Feed statistics |

**Auth BFF routes:**

| BFF Route | Backend Endpoint |
|---|---|
| `POST /api/auth/login` | `POST /api/v1/auth/login` |
| `POST /api/auth/register` | `POST /api/v1/auth/register` |
| `POST /api/auth/refresh` | `POST /api/v1/auth/refresh` |
| `POST /api/auth/logout` | `POST /api/v1/auth/logout` |
| `GET /api/auth/me` | `GET /api/v1/auth/profile` |
| `GET /api/auth/sso/callback` | ⚠️ UNVERIFIED — SSO callback route exists but backend SSO is not implemented |

**New in v3:**

| BFF Route | Purpose |
|---|---|
| `GET /api/brief/[clusterId]` | Fracture Brief generation — calls NestJS backend for cluster data, then Groq API for AI synthesis. ISR revalidate = 1800s. |

### 2.4 Environment Variables

**Backend** (`.env.example` — unchanged from v2):

| Variable | Purpose |
|---|---|
| `NODE_ENV`, `PORT` | App config (default: development, 4000) |
| `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME` | PostgreSQL connection |
| `REDIS_HOST`, `REDIS_PORT` | Redis connection |
| `ELASTICSEARCH_NODE` | Elasticsearch URL |
| `BULL_REDIS_HOST`, `BULL_REDIS_PORT` | BullMQ Redis connection |
| `JWT_SECRET`, `JWT_EXPIRATION`, `JWT_REFRESH_EXPIRATION` | JWT auth config |
| `THROTTLE_TTL`, `THROTTLE_LIMIT` | Rate limiting |
| `NEWSAPI_KEY` | NewsAPI ingestion |
| `RSS_FETCH_INTERVAL_MS`, `INGESTION_SCHEDULER_ENABLED` | Ingestion scheduler |
| `UNSPLASH_ACCESS_KEY`, `OPENVERSE_ENABLED` | Image retrieval |
| `OPENAI_API_KEY`, `OPENAI_IMAGE_MODEL`, `OPENAI_IMAGE_SIZE`, `OPENAI_EMBEDDING_MODEL` | Image pipeline AI |
| `IMAGE_STORAGE_DRIVER`, `IMAGE_LOCAL_DIR`, `IMAGE_PUBLIC_BASE_URL` | Image storage |
| `IMAGE_S3_*` | S3-compatible storage (production) |
| `IMAGE_SIMILARITY_THRESHOLD`, `IMAGE_BATCH_SIZE`, `IMAGE_SEARCH_CANDIDATES`, `IMAGE_PIPELINE_SCHEDULER_ENABLED` | Pipeline tuning |

**Frontend** (`.env.example`):

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_API_URL` | BFF base URL (default: `/api`) |
| `BACKEND_URL` | NestJS backend URL, server-side only (default: `http://localhost:4000/api/v1`) |
| `NEXT_PUBLIC_ENABLE_DEVTOOLS` | React Query devtools toggle |
| `GROQ_API_KEY` | **New in v3** — Groq API key for Fracture Brief generation |

> Note: `GEMINI_API_KEY` reference exists in `.env.example` as a comment ("replaced by Groq — kept for reference"). `ANTHROPIC_API_KEY` is not present in any env file.

### 2.5 Docker Compose

> Carried forward from v2 — verified accurate as of v3. Three services, unchanged.

| Container | Image | Port | Purpose |
|---|---|---|---|
| `fracture-postgres` | `postgres:16-alpine` | 5432 | Primary data store |
| `fracture-redis` | `redis:7-alpine` (256MB, allkeys-lru) | 6379 | BullMQ queues + rate limiting |
| `fracture-elasticsearch` | `elasticsearch:8.12.0` (512MB heap) | 9200 | Full-text search |

---

## 3. Frontend Structure

### 3.1 Routing

**Page routes** (`src/app/`):

| Route | File | Purpose |
|---|---|---|
| `/` | `page.tsx` | Homepage — editorial front page with 4-zone layout (Lead Story → Secondary Grid → Most Fractured → More Stories) |
| `/story/[clusterId]` | `story/[clusterId]/page.tsx` | Unified story page — `?view=dashboard` (default) or `?view=guided` |
| `/journey` | `journey/page.tsx` | Journey landing page — discovery surface listing all clusters, sorted by divergence. Links to `?view=guided` |
| `/journey/[clusterId]` | `journey/[clusterId]/page.tsx` | **Server-side redirect** to `/story/[clusterId]?view=guided` |
| `/compare` | `compare/page.tsx` | Side-by-side article comparison with newspaper-column layout and divergence gutter |
| `/search` | `search/page.tsx` | Discovery search — query input, trending topics, ranked results |
| `/digest` | `digest/page.tsx` | Intelligence feed — narrative monitoring with alert rules (paid only) |
| `/pricing` | `pricing/page.tsx` | Pricing page — Free ($0) and Pro ($9/month) plans, enterprise callout |
| `/login` | `login/page.tsx` | Login page (SSO button stubs hidden) |
| `/register` | `register/page.tsx` | Registration page |
| `/forgot-password` | `forgot-password/page.tsx` | Password reset page |
| `/unauthorized` | `unauthorized/page.tsx` | Unauthorized access page |
| `/mockups/*` | `mockups/` | Internal design mockups (not user-facing): compare-designs, enterprise-dashboard, story-page variants |

> Note: `/enterprise` is linked in the Navbar for enterprise/admin users via `isEnterpriseTier()` check, but **no `/enterprise/page.tsx` exists**. This is a dead link for enterprise users.

**API routes** (`src/app/api/`):

| Route | Method | Purpose |
|---|---|---|
| `/api/homepage` | GET | Homepage data |
| `/api/stories` | GET | Paginated story clusters |
| `/api/stories/[id]` | GET | Cluster detail |
| `/api/stories/[id]/articles` | GET | Cluster articles |
| `/api/stories/[id]/snapshot` | GET | Narrative snapshot |
| `/api/search` | GET | Discovery search |
| `/api/search/trending-topics` | GET | Trending topic keywords |
| `/api/stats` | GET | Feed statistics |
| `/api/brief/[clusterId]` | GET | **New in v3** — Fracture Brief generation |
| `/api/auth/login` | POST | Login |
| `/api/auth/register` | POST | Registration |
| `/api/auth/refresh` | POST | Token refresh |
| `/api/auth/logout` | POST | Logout |
| `/api/auth/me` | GET | Current user profile |
| `/api/auth/sso/callback` | GET | SSO callback (backend not implemented) |

### 3.2 Components

**Layout** (`src/components/layout/`):

| Component | Purpose |
|---|---|
| `Navbar` | Main navigation — 4 items (Today, Compare, Search, Digest/My Feed), search bar, auth menu, enterprise link for admin/enterprise users, upgrade CTA for free users |
| `Footer` | Site footer — Fracture branding, Methodology/About/API links (non-clickable `<span>` elements with TODOs) |
| `BreakingTicker` | Breaking news ticker bar |
| `TickerBar` | Ticker bar component (commented out in layout) |

**Home** (`src/components/home/`):

| Component | Purpose |
|---|---|
| `LeadStory` | Zone 1 — full-width hero story with FDI badge, summary, and article count |
| `SecondaryStoryGrid` | Zone 2 — grid of 6 secondary story cards |
| `MostFracturedSection` | Zone 3 — top 3 clusters by FDI not already shown |
| `MoreStoriesList` | Zone 4 — remaining clusters in a compact list |

**Story** (`src/components/story/`):

| Component | Purpose |
|---|---|
| `FractureBrief` | **New in v3** — AI-synthesized editorial summary, client component fetching `/api/brief/[clusterId]` on mount |
| `OutletArticleList` | **New in v3** — 3-column (Left/Center/Right) article listing, used in the reading zone before the analysis gate |
| `AnalysisGate` | **New in v3** — Feature gate wrapping analytical sections. Renders children for paid users; shows blurred teaser + upgrade prompt for free/unauthenticated users |
| `HeadlineComparison` | Side-by-side headline display |
| `NarrativeFrames` | How different frames cover the same story |
| `NarrativeTimeline` | Chronological article timeline (story-specific) |
| `GlobalNarrativeMap` | Global narrative map component |

**Narrative** (`src/components/narrative/`):

| Component | Purpose |
|---|---|
| `DivergenceMeter` | FDI gauge visualization (uses canonical 30/60/80 thresholds from constants) |
| `DivergenceBadge` | FDI badge with severity tier (Low/Moderate/High/Extreme) |
| `NarrativeSnapshotCard` | Left-frame / right-frame narrative snapshot card |
| `NarrativeDivergenceIndicator` | Per-metric divergence indicator |
| `StoryComparisonPanel` | Side-by-side story comparison panel |
| `CompareArticlePanel` | Individual article panel in comparison view |
| `HighlightedText` | Framing keyword highlighting with lean-aware tooltips |
| `NarrativeTimeline` | Chronological narrative timeline (narrative-specific) |
| `BiasMeter` | Bias meter component |
| `PerspectiveSwitcher` | Perspective switching component |

**Visualizations** (`src/components/visualizations/`):

| Component | Purpose |
|---|---|
| `BiasMap` | Lean × Sentiment scatter plot (renamed from "Bias Map" in v3 UX pass) |
| `NarrativeSpectrum` | Political lean spectrum visualization |
| `SourceSpectrum` | Horizontal source spectrum bar |
| `StoryFractureGraph` | Story fracture network graph (imported but **commented out** on Compare page) |

**Articles** (`src/components/articles/`):

| Component | Purpose |
|---|---|
| `ArticleCard` | Standard article card |
| `FracturedStoryCard` | Story card with FDI indicator (uses canonical thresholds) |
| `StoryClusterCard` | Story cluster card |

**Auth** (`src/components/auth/`):

| Component | Purpose |
|---|---|
| `ProtectedRoute` | Route protection wrapper |
| `RoleGate` | Role-based content gating |

**UI** (`src/components/ui/`):

| Component | Purpose |
|---|---|
| `Tooltip` | **New in v3** — Lightweight hover-tooltip with auto-positioning |
| `FirstVisitBanner` | **New in v3** — Dismissible onboarding banner (localStorage persistence) |
| `FadeIn` | Fade-in animation wrapper |
| `FadeImage` | Fade-in image wrapper |
| `CardHover` | Card hover animation |
| `StaggerChildren` | Staggered animation wrapper |
| `PageTransition` | Page transition animation |
| `Skeleton` | Skeleton loading components (including `StoryPageSkeleton`, `ClusterCardSkeleton`, `ComparePageSkeleton`) |
| `ArticlePlaceholder` | Article placeholder |
| `StoryTabs` | Story tab navigation |

### 3.3 Hooks

| Hook | File | Purpose |
|---|---|---|
| `useHomepage()` | `useStories.ts` | Fetch homepage data (30s staleTime) |
| `useStories(params?)` | `useStories.ts` | Paginated story cluster list |
| `useStory(clusterId)` | `useStories.ts` | Single cluster detail |
| `useSnapshot(clusterId)` | `useStories.ts` | Narrative snapshot (left-frame / right-frame) |
| `useClusterArticles(clusterId)` | `useStories.ts` | Articles for a specific cluster |
| `useStats()` | `useStories.ts` | Feed statistics (30s staleTime) |
| `useSearchDiscover(q, page, limit)` | `useStories.ts` | Discovery search (60s staleTime, 2-char minimum) |
| `useTrendingTopics(limit)` | `useStories.ts` | Trending topic keywords (5min staleTime) |
| `useAuth()` | `useAuth.ts` | Auth context consumer with role helpers (`hasRole`, `isAdmin`, `isEnterprise`, `isAnalyst`, `isPro`) |

### 3.4 State and Data Flow

**Server state:** TanStack React Query v5 manages all server state. Each hook wraps a `useQuery` call to the BFF API layer (`/api/*`). The BFF routes proxy and transform NestJS backend responses.

**Client state:** Zustand store (`feedStore.ts`) manages feed perspective/sort preferences. `AuthContext` (`auth-context.tsx`) manages authentication state with memory-only access tokens and HttpOnly cookie refresh tokens.

**Data flow:**

```
NestJS Backend (PostgreSQL/ES) → Next.js BFF API Routes → React Query Cache → React Components
                                                                              ↕
                                                                     Zustand (client state)
                                                                     AuthContext (auth state)
```

**Auth flow:** Access token stored in React state (memory only). Refresh token in HttpOnly cookie managed by BFF. On mount, `AuthProvider` attempts session restore via the refresh endpoint. Role enum: `FREE | PRO | ANALYST | ENTERPRISE | ADMIN`.

---

## 4. Terminology and Constants

### 4.1 TERMINOLOGY_CONSTANTS.ts

`src/lib/TERMINOLOGY_CONSTANTS.ts` is the **single source of truth** for all user-facing label strings. Every component that displays a score name, sub-metric label, section header, navigation label, lean description, sentiment label, severity tier, or cross-link CTA imports from this file.

**Purpose:** Renaming a concept requires changing exactly one file. Inconsistencies across pages are eliminated by design.

**Key exports:**

| Category | Constants | Example Values |
|---|---|---|
| **Main score** | `SCORE_FULL_NAME`, `SCORE_ABBREV`, `SCORE_TOOLTIP` | "Fracture Divergence Index", "FDI" |
| **Sub-metrics** | `SUBMETRIC_HEADLINE_TONE`, `SUBMETRIC_FRAMING`, `SUBMETRIC_ENTITY`, `SUBMETRIC_LINGUISTIC`, `SUBMETRIC_SOURCE_SELECTION`, `SUBMETRIC_STRUCTURAL` | "Headline Tone", "Framing Approach", "Entity Portrayal", "Language Similarity", "Source Selection", "Structural Difference" |
| **Sub-metric tooltips** | `SUBMETRIC_TOOLTIPS` | Record mapping each sub-metric key to a hover explanation |
| **Section headers** | `SECTION_SOURCE_SPECTRUM`, `SECTION_NARRATIVE_FRAMES`, `SECTION_ARTICLE_FEED`, `SECTION_DIVERGENCE`, etc. | "Source Spectrum", "Framing Comparison", "All Coverage" |
| **Navigation** | `NAV_HOME`, `NAV_COMPARE`, `NAV_SEARCH`, `NAV_DIGEST`, `NAV_ENTERPRISE`, `NAV_UPGRADE` | "Today", "Compare", "Search", "Digest", "Dashboard", "Get full access" |
| **Lean labels** | `LEAN_LEFT`, `LEAN_CENTER`, `LEAN_RIGHT`, `LEAN_FAR_LEFT`, `LEAN_FAR_RIGHT`, `LEAN_LEFT_SHORT`, `LEAN_RIGHT_SHORT`, `LEAN_LABEL` | "Left-Leaning", "Center", "Far Right", "Left", "Right", "Lean" |
| **Tone/sentiment** | `TONE_POSITIVE`, `TONE_NEUTRAL`, `TONE_NEGATIVE`, `SENTIMENT_HEADLINE`, `SENTIMENT_BODY`, `SENTIMENT_GAP`, `SENTIMENT_GAP_SHORT` | "Positive", "Neutral", "Negative", "Headline tone", "Article tone", "Tone gap" |
| **Severity tiers** | `SEVERITY_LOW`, `SEVERITY_MODERATE`, `SEVERITY_HIGH`, `SEVERITY_EXTREME` | "Low", "Moderate", "High", "Extreme" |
| **Divergence thresholds** | `DIVERGENCE_LOW_MAX`, `DIVERGENCE_MODERATE_MAX`, `DIVERGENCE_HIGH_MAX` | 30, 60, 80 |
| **Badges** | `BADGE_FRACTURED`, `BADGE_FRACTURED_TOOLTIP`, `BADGE_BREAKING`, `BADGE_ACTIVE`, `BADGE_ARCHIVED` | "Fractured", tooltip explaining FDI ≥ 60 |
| **Cross-link CTAs** | `CTA_VIEW_JOURNEY`, `CTA_VIEW_STORY`, `CTA_VIEW_COMPARE` | "Read the guided analysis →", "View the story dashboard →", "Compare articles side by side →" |
| **Journey** | `JOURNEY_TAGLINE` | "Follow a story chapter by chapter…" |

**Helper functions:**

| Function | Signature | Purpose |
|---|---|---|
| `leanCategory(lean)` | `number → string` | Numeric lean → "Far Left" / "Left-Leaning" / "Center" / "Right-Leaning" / "Far Right" (thresholds: ±0.6, ±0.2) |
| `toneCategory(sentiment)` | `number → string` | Numeric sentiment → "Positive" / "Neutral" / "Negative" (thresholds: ±0.2) |
| `severityTier(score)` | `number → string` | 0–100 score → "Low" / "Moderate" / "High" / "Extreme" (thresholds: 30/60/80) |
| `severityColor(score)` | `number → string` | Score → CSS variable |
| `severityTextClass(score)` | `number → string` | Score → Tailwind text class |
| `severityBgClass(score)` | `number → string` | Score → Tailwind bg class |

### 4.2 tierUtils.ts

`src/lib/tierUtils.ts` maps backend RBAC roles to the product tier model.

**Type:** `UserTier = 'free' | 'pro' | 'analyst' | 'enterprise' | 'admin' | null`

**Helpers:**

| Function | Purpose |
|---|---|
| `isPaidTier(tier)` | Returns `true` for `pro`, `analyst`, `enterprise`, `admin` |
| `isEnterpriseTier(tier)` | Returns `true` for `enterprise`, `admin` |
| `tierLabel(tier)` | Returns human-readable label: "Free", "Pro", "Analyst", "Enterprise", "Admin" |

---

## 5. Fracture Brief

The Fracture Brief is an AI-generated 2–3 paragraph editorial summary that synthesizes a story cluster into a concise, wire-service-style overview highlighting how coverage is diverging.

### 5.1 API Route

**File:** `src/app/api/brief/[clusterId]/route.ts`

| Aspect | Detail |
|---|---|
| **Method** | `GET` |
| **Input** | Cluster data fetched from NestJS backend via `fetchClusterDetail(clusterId)` |
| **AI provider** | Groq API (`https://api.groq.com/openai/v1/chat/completions`) |
| **Model** | `llama-3.1-8b-instant` |
| **Parameters** | `max_tokens: 600`, `temperature: 0.4` |
| **System prompt** | Wire-service editor voice: core facts → coverage divergence → what to watch next. Max 3 paragraphs. No self-reference, no invented facts. |
| **User prompt** | Constructed from cluster title, summary, article count, source count, FDI score, up to 12 headlines with lean/framing/sentiment, and up to 4 narrative frames |
| **Output** | `{ brief: string, clusterId: string }` on success |
| **Cache** | ISR `revalidate = 1800` (30 minutes) |
| **Graceful degradation** | Returns `{ brief: null, clusterId, error: string }` with status 200 on any failure (missing API key, Groq error, empty response, unexpected error). Returns 404 only if the story cluster itself is not found. |

### 5.2 Component

**File:** `src/components/story/FractureBrief.tsx`

- Client component (`"use client"`)
- Fetches `/api/brief/{clusterId}` on mount via `useEffect`
- **Loading state:** Skeleton shimmer card with `aria-busy="true"`
- **Error state:** Silent — renders `null` (no error UI shown to user)
- **Success state:** Styled card with accent left border, Sparkles icon, "FRACTURE BRIEF" eyebrow with tooltip, brief paragraphs in editorial serif, footer with article/source count and time ago
- **Props:** `clusterId`, `headline`, `articleCount?`, `sourceCount?`, `updatedAt?`
- Rendered above the view toggle on the unified story page in **both** Dashboard and Guided views

### 5.3 Environment

| Variable | Location | Required |
|---|---|---|
| `GROQ_API_KEY` | Frontend `.env.local` | Yes — Brief returns `null` gracefully if missing |

---

## 6. Product Tiers and Feature Gates

### 6.1 Two-Tier Model

| Tier | Roles | Experience |
|---|---|---|
| **Free** | `null` (unauthenticated), `'free'` | Reading experience — homepage, story reading, Fracture Brief, basic Compare (article selection), search, qualitative divergence indicators |
| **Paid** | `'pro'`, `'analyst'` | Full analysis — FDI breakdown, all sub-metrics, keyword highlighting, full Compare with gutter analysis, Guided Analysis chapters 2–7, Digest intelligence feed, topic monitoring |
| **Enterprise** | `'enterprise'`, `'admin'` | All Paid features + enterprise Dashboard link in Navbar, API access, team seats (planned) |

### 6.2 Role Mapping

```typescript
type UserTier = 'free' | 'pro' | 'analyst' | 'enterprise' | 'admin' | null;

// Backend UserRole enum matches:
enum UserRole { FREE = 'free', PRO = 'pro', ANALYST = 'analyst', ENTERPRISE = 'enterprise', ADMIN = 'admin' }
```

### 6.3 AnalysisGate Component

**File:** `src/components/story/AnalysisGate.tsx`

**Props:** `userTier: UserTier`, `isAuthenticated: boolean`, `children: ReactNode`

**Behavior:**
- **Paid users (`isPaidTier(userTier)`):** Renders children fully.
- **Free / unauthenticated:** Renders first child section with `filter: blur(4px)` behind a semi-transparent overlay with a Lock icon, plus an upgrade prompt card below.
  - Authenticated free user → "Upgrade to Pro →" button linking to `/pricing`
  - Unauthenticated → "Get full access →" button linking to `/pricing` + "Sign in" link to `/login`

**Usage on the unified story page:**
- **Dashboard view:** `AnalysisGate` wraps all sections after `OutletArticleList` (FDI meter, source spectrum, divergence breakdown, narrative frames, timeline, headline comparison)
- **Guided view:** `AnalysisGate` wraps chapters 2–7 (chapter 1 "What is this story?" is free)

### 6.4 Feature Availability by Tier

| Feature | Free | Paid | Enterprise |
|---|---|---|---|
| Homepage (4-zone layout) | ✓ | ✓ | ✓ |
| Story reading + summary | ✓ | ✓ | ✓ |
| Fracture Brief (AI summary) | ✓ | ✓ | ✓ |
| OutletArticleList (3-column reading) | ✓ | ✓ | ✓ |
| Basic Compare (article selection) | ✓ | ✓ | ✓ |
| Search | ✓ | ✓ | ✓ |
| Qualitative divergence indicators | ✓ | ✓ | ✓ |
| FDI score + full breakdown | Blurred | ✓ | ✓ |
| All 6 sub-metrics with bars | Blurred | ✓ | ✓ |
| Source Spectrum visualization | Blurred | ✓ | ✓ |
| Narrative Frames (sidebar) | Blurred | ✓ | ✓ |
| Timeline | Blurred | ✓ | ✓ |
| Headline Comparison (3-column) | Blurred | ✓ | ✓ |
| Keyword highlighting (Compare) | ✗ | ✓ | ✓ |
| Full Compare with gutter analysis | ✗ | ✓ | ✓ |
| Guided Analysis chapters 2–7 | Blurred | ✓ | ✓ |
| Digest intelligence feed | ✗ | ✓ | ✓ |
| Enterprise Dashboard link | ✗ | ✗ | ✓ |

### 6.5 Pricing Page

**Route:** `/pricing`

| Plan | Price | CTA |
|---|---|---|
| **Free** | $0 / forever | "Start reading" → `/` |
| **Pro** | $9 / month | "Get Pro access" → `/register?plan=pro` |
| **Enterprise** | Custom | "Talk to us →" → `mailto:enterprise@fracture.news` |

> ⚠️ The $9/month price and enterprise@fracture.news email are placeholders.

---

## 7. Unified Story Page

### 7.1 Merge Decision

The Story page (`/story/[clusterId]`) and Journey detail page (`/journey/[clusterId]`) previously fetched identical data via the same hooks (`useStory`, `useSnapshot`) and rendered the same cluster in two different layouts. They were merged into a single unified route in Pass 4 of the UX simplification.

### 7.2 View Modes

| Query Param | View | Layout |
|---|---|---|
| `?view=dashboard` (default) | Dashboard | 2-column analytical layout: story header → OutletArticleList → AnalysisGate → FDI meter + source spectrum + divergence breakdown + narrative frames + timeline + headline comparison |
| `?view=guided` | Guided Analysis | Chapter-by-chapter scroll: Chapter 1 (free: headline, brief, summary, stats) → AnalysisGate → Chapters 2–7 (FDI gauge, sub-metrics, source spectrum, narrative frames, headlines, timeline, articles) |

### 7.3 View Toggle

A toggle control ("Dashboard" | "Guided Analysis") appears at the top of both views, styled with `bg-ink text-cream` (active) / `bg-bone text-ink-muted` (inactive). A "Compare articles side by side →" tertiary link is right-aligned.

**Switching behavior:**
- Uses `router.replace()` — no history entry, no data refetch
- `window.scrollTo({ top: 0, behavior: 'smooth' })` — scroll to top

### 7.4 Data Fetching

Both views share the same data hooks, called once at the page level:
- `useStory(clusterId)` — cluster detail with articles, divergence index, narrative spectrum
- `useSnapshot(clusterId)` — left-frame / right-frame narrative snapshot
- `useAuth()` — user tier for `AnalysisGate`

Derived data (sorted articles, headlines by lean, spectrum sources, timeline) computed via `useMemo` and shared.

### 7.5 Redirect

`/journey/[clusterId]` is a server-side redirect (`redirect()` from `next/navigation`) to `/story/[clusterId]?view=guided`, preserving bookmarks and external links.

### 7.6 Fracture Brief Placement

The `FractureBrief` component renders above the view toggle in both views:
- **Dashboard:** Inside the first `FadeIn` block, after the eyebrow label, before the toggle
- **Guided:** In Chapter 1, after the hero headline, before the toggle

---

## 8. Backend Modules

> Carried forward from v2 — verified accurate as of v3. No new backend modules, endpoints, or services have been added since v2.

### 8.1 Module Summary

The 7 NestJS modules remain unchanged:

1. **Articles Module** — Article + Source CRUD, cluster lookup
2. **Ingestion Module** — RSS adapter, NewsAPI adapter, dedup, BullMQ producer, 10-minute cron scheduler
3. **Narrative Module** — 12 services (Sentiment, BiasScoringService, FramingDetector, Clustering, Divergence, TopicExtraction, TopicClassifier, StoryRanking, TrendSignal, Trending, Snapshot, SearchDiscovery), BullMQ narrative processor
4. **Search Module** — Elasticsearch full-text search, autocomplete, faceted filtering
5. **Auth Module** — JWT auth (bcrypt, Passport JWT strategy), RBAC guards, 5 roles
6. **Image Pipeline Module** — Image context extraction, Unsplash/Openverse retrieval, OpenAI embedding relevance scoring, DALL-E 3 generation, local/S3 storage
7. **Health Module** — PostgreSQL, Redis, Elasticsearch ping

### 8.2 Ingestion Pipeline

> Carried forward from v2 — verified accurate as of v3.

- 14 RSS sources seeded via `SourceSeederService` on every application boot
- 10-minute cron cycle fetches new articles from all active sources concurrently
- 3-stage dedup: URL canonicalization → exact headline match (24h window) → SimHash (Hamming ≤ 3)
- BullMQ queues: `ingestion` → `narrative` → `image-pipeline`

### 8.3 BullMQ Configuration

> Carried forward from v2 — verified accurate as of v3.

| Queue | Job Types | Retry Policy |
|---|---|---|
| `ingestion` | `process-articles` (batch) | 3 attempts, exponential backoff (2s base) |
| `narrative` | `analyse-article` (single) | 3 attempts, exponential backoff (2s base) |
| `image-pipeline` | `single`, `batch`, `cluster` | 2 attempts, exponential backoff (10s base) |

### 8.4 JWT Auth and RBAC

> Carried forward from v2 — verified accurate as of v3.

- Custom JWT with bcrypt password hashing (HS256, configurable secret)
- 15-minute access token, 7-day refresh token (configurable)
- Refresh token rotation with hashed storage on User entity
- 5 roles: `free`, `pro`, `analyst`, `enterprise`, `admin`
- Global JWT guard (`JwtAuthGuard`) on all routes; `@Public()` decorator to bypass
- Global throttler: 100 requests per 60-second window (flat, not per-tier)

### 8.5 Backend API Endpoints

> Carried forward from v2 — verified accurate as of v3. Full endpoint list in v2 Section 7.3.

---

## 9. Data Model

> Carried forward from v2 — verified accurate as of v3. Entity definitions in v2 Section 3.1 remain accurate.

Key entities:

| Entity | Table | Key Fields |
|---|---|---|
| **Article** | `articles` | UUID, sourceId, storyClusterId, politicalLeanScore, establishmentScore, framingType, headlineSentiment, bodySentiment, headlineBodySentimentGap, emotionalValence, certaintyLanguageScore, attributionDensity, passiveVoiceRatio, ledeType, simhash, imageUrl, 20+ annotation fields |
| **StoryCluster** | `story_clusters` | UUID, topic, summary, topicKeywords (jsonb), status (BREAKING/ACTIVE/ARCHIVED), articleCount, sourceCount, divergenceScore (cached FDI), velocityScore, isFractured (FDI ≥ 40 && sourceCount ≥ 2), topicCategory, imageUrl |
| **Source** | `sources` | UUID, name, slug, rssFeedUrl, tier, politicalLeanPrior, establishmentPrior, reliabilityScore, country, region |
| **TrendSignal** | `trend_signals` | UUID, keyword, source, trendScore, detectedAt |
| **User** | `users` | UUID, email, passwordHash, displayName, role (free/pro/analyst/enterprise/admin), isActive, refreshTokenHash |

**Frontend types** are defined in `src/types/index.ts` and `src/types/auth.ts`, providing typed interfaces for all BFF response shapes.

---

## 10. Infrastructure

> Carried forward from v2 — verified accurate as of v3. See v2 Sections 6.1–6.7 for full infrastructure strategy details (cloud architecture, container orchestration, CI/CD, observability, DR, security).

### Key updates since v2:

**Environment variables:**
- **Added:** `GROQ_API_KEY` (frontend `.env.local`) — required for Fracture Brief generation
- **Not present:** `ANTHROPIC_API_KEY` — never appeared in codebase env files
- **Commented out:** `GEMINI_API_KEY` — replaced by Groq, kept as comment in `.env.example`

**Docker Compose:** Unchanged — 3 services (PostgreSQL, Redis, Elasticsearch).

**Redis usage:** Confirmed: single Redis instance handles both BullMQ job queues (3 queues) and `@nestjs/throttler` rate limiting.

**Development tooling:**
- Backend: ESLint v9, Jest 30, TypeScript 5.7, Prettier
- Frontend: ESLint v9 (eslint-config-next), TypeScript 5, TailwindCSS v4

---

## 11. Known Technical Debt

### Carried Forward from v2 (Still Unresolved)

| Item | Detail |
|---|---|
| **Single Redis instance** | One Redis handles both BullMQ queues and rate limiting. Production should separate these for isolation. |
| **TypeORM `synchronize: true`** | Enabled in development mode. Production requires migration-based schema management. |
| **TimescaleDB references** | v2 mentions TimescaleDB for time-series narrative metrics — never implemented. Narrative shift stored on Article entity in PostgreSQL. Decision needed on whether to implement or drop from roadmap. |
| **SourceSeederService on every boot** | 14 sources upserted on every application start. Acceptable at current scale but should be a migration or seed script for production. |

### New Debt Introduced in v3

| Item | Detail |
|---|---|
| **Journey landing page orphaned** | `/journey` still exists as a separate discovery route but is no longer in the main Navbar (4-item nav: Today, Compare, Search, Digest). Journey cards link to `?view=guided`. Decision needed: keep as secondary discovery surface, redirect to `/`, or remove. |
| **`/enterprise` is a dead link** | Navbar renders an "Enterprise Dashboard" link for `enterprise`/`admin` users (via `isEnterpriseTier()` check), but no `/enterprise/page.tsx` exists. Clicking it returns a 404. |
| **Groq as AI provider** | `llama-3.1-8b-instant` is a capable, fast model but was not the originally intended provider. Migration path to a production-grade provider (Anthropic, OpenAI, or Groq production tier) should be planned before launch. |
| **Pricing page placeholder values** | `/pricing` contains placeholder pricing ($9/month) and a placeholder enterprise contact email (`enterprise@fracture.news`). These need real values before launch. |
| **Digest alert rules not persisted** | Alert rules on the Digest page are managed in local React state only (`useState`). No backend persistence — rules are lost on page refresh. (M4 from UX audit, out of scope.) |
| **LatestFeed external links no return path** | External article links in feed components have no return path. (M3 from UX audit, never addressed.) |
| **StoryFractureGraph commented out** | `StoryFractureGraph` is imported on the Compare page but its usage is wrapped in a comment block (`{/* ... */}`). The component exists and is functional but intentionally disabled. |
| **Footer dead links** | Methodology, About, and API footer links are non-clickable `<span>` elements with TODO comments. No corresponding pages exist. |
| **SSO callback route without backend** | `/api/auth/sso/callback` route file exists but backend SSO (OAuth/SAML) is not implemented. SSO button stubs on login page are hidden. |
| **Compare page density** | Compare page remains analytically dense with no progressive disclosure. (M2 from UX audit, deferred.) |
| **TickerBar commented out** | `TickerBar` component exists and is imported in layout but rendering is commented out: `{/* <TickerBar /> */}`. |

---

## 12. Appendices

### A. Narrative Intelligence Engine

> Carried forward from v2 — verified accurate as of v3. See v2 Sections 4.1–4.12 for complete documentation of:
> - Bias Scoring Model (5-component composite: source prior 40%, keyword lean 20%, entity sentiment 15%, framing lean 15%, source selection 10%)
> - Fracture Divergence Index formula (6 sub-metrics, weighted composite 0–100)
> - Headline Sentiment Differential (custom VADER-inspired lexicon)
> - Structural Framing Detection (7 implemented features, 2 planned)
> - Story Ranking Engine (hero selection with 6-factor scoring)
> - Trend Signal Ingestion (Google News, Reuters, AP — 15-minute cron)
> - Narrative Snapshots (left-frame / right-frame generation)

### B. Data Moat Strategy

> Carried forward from v2 — verified accurate as of v3. See v2 Section 3 for dataset construction, clustering evolution, defensibility analysis, and network effects documentation.

### C. Scalability Model

> Carried forward from v2 — verified accurate as of v3. See v2 Section 5 for traffic modeling, caching strategy, read/write optimization, database sharding strategy, and event queue throughput planning.

### D. Monetization Architecture

> Carried forward from v2 with v3 tier updates. See v2 Section 7 for subscription tier design, enterprise dashboards, API rate tiering, and multi-tenant architecture.
>
> **v3 update:** The two-tier model (Free/Paid) with `AnalysisGate` is now implemented in the frontend. Per-tier rate limiting is still not implemented in the backend (flat global limit). LaunchDarkly feature flagging is still not implemented.

### E. Five-Year Roadmap

> Carried forward from v2 — see v2 Section 9. No changes to roadmap targets.

### F. Risks and Mitigation

> Carried forward from v2 — see v2 Section 10. No changes to risk analysis.

### G. 14-Source Roster

> Carried forward from v2 — verified accurate as of v3.

| Source | Lean Prior | Establishment | Reliability | Country |
|---|---|---|---|---|
| BBC News | 0.0 | 0.6 | 0.85 | GB |
| CNN | -0.3 | 0.5 | 0.70 | US |
| Fox News | +0.6 | 0.4 | 0.55 | US |
| NPR | -0.1 | 0.6 | 0.85 | US |
| Associated Press | 0.0 | 0.7 | 0.90 | US |
| The Guardian | -0.4 | 0.5 | 0.80 | GB |
| Washington Post | -0.2 | 0.6 | 0.80 | US |
| Reuters | 0.0 | 0.7 | 0.92 | GB |
| Politico | -0.2 | 0.6 | 0.78 | US |
| Axios | -0.1 | 0.5 | 0.80 | US |
| The Hill | +0.1 | 0.5 | 0.75 | US |
| HuffPost | -0.6 | 0.3 | 0.60 | US |
| National Review | +0.7 | 0.5 | 0.65 | US |
| The Federalist | +0.8 | 0.3 | 0.55 | US |
