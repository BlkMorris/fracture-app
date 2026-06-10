> ⚠️ Superseded by SYSTEM_DESIGN_v5.md — April 2026.

# FRACTURE — Technical System Design v4

**Version:** 4.0
**Date:** March 23, 2026
**Status:** Superseded by SYSTEM_DESIGN_v5.md

---

## 0. Executive Summary

Fracture is a real-time narrative intelligence platform that ingests news from 14 curated outlets across the political spectrum, clusters articles into unified story threads, and computes a proprietary Fracture Divergence Index (FDI) — a composite 0–100 score measuring how differently outlets frame the same event across six dimensions: headline tone, framing approach, entity portrayal, linguistic similarity, source selection, and structural difference. The product serves two tiers: a free editorial reading experience anchored by the AI-generated Fracture Brief (a wire-service-style story synthesis powered by Groq's Llama 3.1), and a paid analytical suite delivering full FDI breakdowns, narrative frames, guided analysis chapters, and an intelligence digest. The frontend is a Next.js 16 / React 19 application with a BFF API layer that transforms NestJS backend responses; the backend is a NestJS 11 monolith orchestrating PostgreSQL 16, Redis 7 (BullMQ queues + rate limiting), and Elasticsearch 8.12 for full-text search.

Fracture's architecture is distinctive for three reasons: (1) the BFF pattern cleanly decouples frontend type contracts from backend internals, (2) the `TERMINOLOGY_CONSTANTS.ts` single-source-of-truth system ensures every user-facing label, threshold, and color mapping is defined exactly once, and (3) the Navy Standard design system (`ns-*` CSS classes with `@theme` tokens) provides visual cohesion without a heavy component library. The platform is at **Early Product** maturity — the analytical core (FDI computation, clustering, Fracture Brief, guided analysis) is genuinely differentiated and functional, but production readiness is blocked by the absence of real payment processing (MockPaymentForm), client-side-only tier gate enforcement, TypeORM `synchronize: true` in the database layer, and no error monitoring or automated tests on critical paths.

---

## 1. System Topology

### 1.1 Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────────┐
│                            CLIENT (Browser)                              │
│  React 19 · TanStack Query v5 · Zustand 5 · Framer Motion 12           │
└────────────────────────────────┬─────────────────────────────────────────┘
                                 │ HTTPS
                                 ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                    NEXT.JS 16 (App Router + BFF)                         │
│                                                                          │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐  ┌──────────────┐  │
│  │ SSR / ISR   │  │ BFF API      │  │ Auth BFF    │  │ External     │  │
│  │ Pages       │  │ /api/*       │  │ /api/auth/* │  │ API Proxies  │  │
│  │ (story,     │  │ (homepage,   │  │ (login,     │  │ (stocks,     │  │
│  │  briefing,  │  │  stories,    │  │  register,  │  │  polymarket, │  │
│  │  method.)   │  │  search,     │  │  refresh,   │  │  kalshi,     │  │
│  │             │  │  stats,      │  │  logout,    │  │  brief/groq) │  │
│  │             │  │  brief)      │  │  me, sso)   │  │              │  │
│  └─────────────┘  └──────┬───────┘  └──────┬──────┘  └──────┬───────┘  │
└──────────────────────────┼─────────────────┼─────────────────┼──────────┘
                           │ HTTP            │ HTTP            │ HTTPS
                           ▼                 ▼                 ▼
┌──────────────────────────────────────┐          ┌───────────────────────┐
│        NESTJS 11 API (Monolith)      │          │   EXTERNAL SERVICES   │
│        /api/v1/* · Port 4000         │          │                       │
│                                      │          │  Groq API (Brief)     │
│  ┌────────────┐  ┌────────────────┐  │          │  Yahoo Finance        │
│  │ Articles   │  │ Narrative      │  │          │  Polymarket API       │
│  │ Module     │  │ Module (14 svc)│  │          │  Kalshi API           │
│  ├────────────┤  ├────────────────┤  │          │  Unsplash / Openverse │
│  │ Ingestion  │  │ Search Module  │  │          │  OpenAI (images)      │
│  │ Module     │  │ (Elasticsearch)│  │          │  NewsAPI              │
│  ├────────────┤  ├────────────────┤  │          │  14× RSS Feeds        │
│  │ Auth       │  │ Image Pipeline │  │          └───────────────────────┘
│  │ Module     │  │ Module (7 svc) │  │
│  ├────────────┤  ├────────────────┤  │
│  │ Health     │  │ BullMQ Queues  │  │
│  │ Module     │  │ (3 queues)     │  │
│  └────────────┘  └────────┬───────┘  │
└───────────┬───────────────┼──────────┘
            │               │
    ┌───────┼───────┬───────┼───────┐
    ▼       ▼       ▼       ▼       ▼
┌───────┐ ┌─────┐ ┌────────────────┐
│ PG 16 │ │Redis│ │ Elasticsearch  │
│       │ │  7  │ │    8.12        │
└───────┘ └─────┘ └────────────────┘
```

### 1.2 Technology Stack

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| **Frontend Framework** | Next.js (App Router) | 16.1.6 | SSR, ISR, BFF API routes, static rendering |
| **UI Library** | React | 19.2.3 | Component rendering |
| **Styling** | TailwindCSS | 4.x | Utility-first CSS with `@theme` tokens |
| **Server State** | TanStack React Query | 5.90.21 | Caching, deduplication, background refetch |
| **Client State** | Zustand | 5.0.11 | Onboarding tour, feed preferences |
| **Animation** | Framer Motion | 12.35.0 | Page transitions, micro-interactions |
| **Charts** | Recharts | 3.8.0 | Sparklines in Digest page |
| **Icons** | Lucide React | 0.576.0 | Consistent icon set |
| **Stock Data** | yahoo-finance2 | 3.13.2 | Server-side stock quotes |
| **Backend Framework** | NestJS | 11.0.1 | Modular monolith, DI, decorators |
| **ORM** | TypeORM | 0.3.28 | PostgreSQL entity management |
| **Job Queues** | BullMQ | 5.70.1 | Async processing pipelines |
| **Auth** | Passport + JWT | 0.7.0 / 11.0.2 | JWT strategy, guard-based auth |
| **Password Hashing** | bcrypt | 6.0.0 | 12-round password + refresh token hashing |
| **Rate Limiting** | @nestjs/throttler | 6.5.0 | Global request throttling |
| **RSS Parsing** | rss-parser | 3.13.0 | Feed ingestion |
| **HTTP Client** | Axios | 1.13.6 | External API calls |
| **Validation** | class-validator / class-transformer | 0.15.1 / 0.5.1 | DTO validation |
| **Security Headers** | Helmet | 8.1.0 | HTTP security headers |
| **Database** | PostgreSQL | 16-alpine | Primary data store |
| **Cache / Queue** | Redis | 7-alpine | BullMQ queues + rate limiting (256 MB, allkeys-lru) |
| **Search Engine** | Elasticsearch | 8.12.0 | Full-text search, faceted filtering (512 MB heap) |
| **AI (Brief)** | Groq API | — | Llama 3.1 8B Instant for Fracture Brief |
| **AI (Images)** | OpenAI API | — | Embeddings for relevance scoring, DALL-E 3 generation |
| **Container Orchestration** | Docker Compose | 3.8 | Development environment (3 services) |

---

## 2. Frontend Architecture

### 2.1 Route Map

| Route | File | Component Type | Rendering | Auth Required | ISR Interval | Notes |
|---|---|---|---|---|---|---|
| `/` | `page.tsx` | Client | CSR | No | — | 4-zone editorial homepage (Lead, Secondary Grid, Most Fractured, More Stories) |
| `/story/[clusterId]` | `story/[clusterId]/page.tsx` | Client | CSR | No (gated) | — | Unified story page; `?view=dashboard` (default) or `?view=guided`; 1,493 lines |
| `/briefing` | `briefing/page.tsx` | Server (async) | ISR | No | 1800s (30 min) | AI briefing page; server-rendered with `revalidate = 1800` |
| `/compare` | `compare/page.tsx` | Client | CSR | No (gated) | — | Side-by-side article comparison; 1,059 lines |
| `/search` | `search/page.tsx` | Client | CSR | No | — | Discovery search with trending topics |
| `/digest` | `digest/page.tsx` | Client | CSR | Tier-gated | — | Intelligence feed; free users see upsell; 1,602 lines |
| `/pricing` | `pricing/page.tsx` | Client | CSR | No | — | Free / Pro ($9/mo) / Enterprise tier cards |
| `/checkout` | `checkout/page.tsx` | Client | CSR | Recommended | — | MockPaymentForm; non-functional payment |
| `/checkout/confirmation` | `checkout/confirmation/page.tsx` | Client | CSR | Yes | — | Post-payment confirmation with returnUrl |
| `/login` | `login/page.tsx` | Client | CSR | No | — | Split-panel auth layout with `safeReturnUrl()` |
| `/register` | `register/page.tsx` | Client | CSR | No | — | Registration with real-time password validation |
| `/forgot-password` | `forgot-password/page.tsx` | Client | CSR | No | — | Password reset request form |
| `/forgot-password/sent` | `forgot-password/sent/page.tsx` | Client | CSR | No | — | Reset email confirmation |
| `/reset-password` | `reset-password/page.tsx` | Client | CSR | No | — | Password reset with token |
| `/account` | `account/page.tsx` | Client | CSR | Yes | — | Account management; 1,089 lines |
| `/methodology` | `methodology/page.tsx` | Server | Static | No | — | FDI methodology, AI disclosure; SEO-indexable |
| `/enterprise` | `enterprise/page.tsx` | Client | CSR | No | — | "Coming Soon" placeholder |
| `/journey/[clusterId]` | `journey/[clusterId]/page.tsx` | Server | Redirect | No | — | Server-side redirect → `/story/[clusterId]?view=guided` |
| `/unauthorized` | `unauthorized/page.tsx` | Client | CSR | No | — | Unauthorized access message |
| `/mockups/*` | `mockups/*/page.tsx` | Client | CSR | No | — | Internal design mockups (not user-facing) |

### 2.2 State Management

**Server State — TanStack React Query v5** (`src/lib/providers.tsx`):

Default configuration: `staleTime: 60_000` (60s), `refetchOnWindowFocus: false`, `retry: 1`. All server state flows through the BFF API layer via hooks in `src/hooks/useStories.ts`:

| Hook | Query Key | Stale Time | Data Source |
|---|---|---|---|
| `useHomepage()` | `["homepage"]` | 30s | `GET /api/homepage` |
| `useStories(params)` | `["stories", ...]` | 60s (default) | `GET /api/stories` |
| `useStory(id)` | `["story", id]` | 60s (default) | `GET /api/stories/{id}` |
| `useSnapshot(id)` | `["snapshot", id]` | 60s (default) | `GET /api/stories/{id}/snapshot` |
| `useClusterArticles(id)` | `["clusterArticles", id]` | 60s (default) | `GET /api/stories/{id}/articles` |
| `useStats()` | `["stats"]` | 30s | `GET /api/stats` |
| `useSearchDiscover(q)` | `["search", q, ...]` | 60s | `GET /api/search` |
| `useTrendingTopics()` | `["trendingTopics", ...]` | 5 min | `GET /api/search/trending-topics` |

**Client State — Zustand** (`src/stores/onboardingStore.ts`):

Single store managing the 8-step onboarding tour: `hasCompleted`, `currentStep`, `isActive`, `isNewUser`. Persists completion status to localStorage per user ID. Also sets `fracture_first_visit_dismissed` on completion.

**Auth State — React Context** (`src/lib/auth-context.tsx`):

Dedicated `AuthContext` managing: `user`, `isAuthenticated`, `isLoading`, `login()`, `register()`, `logout()`, `refreshSession()`, `loginWithSSO()` (stub). Access tokens stored in memory only (`src/lib/auth-tokens.ts`) — never persisted. Refresh tokens live in an HttpOnly cookie managed by the BFF layer. On mount, `AuthProvider` attempts silent session restore via `POST /api/auth/refresh`.

**Auth Token Management** (`src/lib/auth-tokens.ts`):

Module-scope variable for access token. `refreshAccessToken()` deduplicates concurrent callers via a shared promise. On 401, triggers logout callback to cascade auth invalidation.

**URL State:** Story page view mode via `?view=dashboard|guided` (uses `router.replace()` — no history entry). Search query via `?q=`. Checkout plan via `?plan=`. Return URL via `?returnUrl=` (validated by `safeReturnUrl()` against open-redirect attacks).

**Data Flow:**

```
NestJS Backend (PG / ES / Redis) → Next.js BFF API Routes → TanStack Query Cache → Components
                                                                                    ↕
                                                                           Zustand (onboarding)
                                                                           AuthContext (auth)
                                                                           URL params (view, query)
```

### 2.3 Design System — Navy Standard

The Navy Standard design system is defined in `src/app/globals.css` (733 lines) and provides visual cohesion without a component library dependency.

**@theme Token Block** — defines all design tokens as CSS custom properties available to Tailwind:

| Category | Tokens | Examples |
|---|---|---|
| **Core Palette** | `--color-navy`, `--color-navy-mid`, `--color-navy-light`, `--color-amber`, `--color-page`, `--color-white` | `#0F1F3D`, `#1A2F52`, `#E8A838`, `#F5F2ED` |
| **Political Lean** | `--color-lean-left`, `--color-lean-right`, `--color-lean-center` + light variants | `#2B5FC4`, `#C0392B`, `#888888` |
| **Divergence** | `--color-diverge-low`, `--color-diverge-mod`, `--color-diverge-high`, `--color-diverge-ext` | `#16A34A`, `#D97706`, `#DC2626`, `#991B1B` |
| **Typography** | `--font-family-sans`, `--font-family-serif`, `--font-family-mono` | Inter, Georgia, Courier New |
| **Spacing** | `--navbar-height`, `--strip-height`, `--max-width`, `--radius-sm`, `--radius-md` | `56px`, `28px`, `1280px`, `2px`, `4px` |

**ns-* Class System** — 40+ namespaced utility classes:

- **Layout:** `ns-container` (max-width 1440px, responsive padding)
- **Cards:** `ns-card`, `ns-card-bordered`, `ns-card-surface`, `ns-card-navy`, `ns-card-brief` (amber left-border)
- **Buttons:** `ns-btn`, `ns-btn-amber`, `ns-btn-navy`, `ns-btn-outline-light`, `ns-btn-outline-dark`, size variants (`ns-btn-sm`, `ns-btn-lg`, `ns-btn-full`)
- **Inputs:** `ns-input` with focus ring in `--color-left`
- **Badges:** `ns-badge`, `ns-badge-breaking`, `ns-badge-fractured`, `ns-badge-category`
- **Divergence:** `ns-div-dot-{low,moderate,high,extreme}`, `ns-div-text-{low,moderate,high,extreme}`
- **Lean:** `ns-lean-{left,right,center}`, `ns-lean-dot-{left,right,center}`
- **Navigation:** `ns-navbar`, `ns-navbar-inner`, `ns-nav-link`
- **Data:** `ns-today-strip`, `ns-today-item`, `ns-feed-row`, `ns-trend-pill`
- **Loading:** `ns-skeleton` with `ns-shimmer` keyframe animation
- **Auth:** `ns-auth-layout`, `ns-auth-left`, `ns-auth-right`, `ns-auth-form`
- **Gates:** `ns-gate`, `ns-gate-blur`, `ns-gate-panel`

**Backward-Compatibility Aliases:** The bottom ~250 lines of `globals.css` provide un-prefixed aliases (`.card`, `.btn`, `.badge`, `.skeleton`, etc.) so that page files not yet migrated to `ns-*` classes continue rendering correctly. New code should use `ns-*` exclusively.

**Deviations from System:**
- `SecondaryStoryGrid` defines local `borderColor()` with hardcoded hex values instead of `--color-diverge-*` tokens
- `MostFracturedSection` defines local `divLabel()` returning different copy than canonical `divergenceLabel()`
- `HighlightedText` uses ±0.2 lean thresholds vs. canonical ±0.15 from `TERMINOLOGY_CONSTANTS.ts`
- `PreviewFeedItem` (Digest) uses inline styles instead of `ns-badge`
- `LogoIcon` SVG duplicated in 4 files (Navbar, Login, Register, Footer) with different stroke colors

### 2.4 BFF API Routes

All routes in `src/app/api/` — the Backend-for-Frontend layer.

**Shared Infrastructure** (`src/app/api/_lib/backend.ts`):

Central `backendFetch<T>()` helper prefixing `BACKEND_URL` (default: `http://localhost:4000/api/v1`). Custom `BackendError` class propagates status codes. Transform functions (`transformArticle()`, `transformSource()`, `transformClusterDetail()`, `transformDivergenceIndex()`, `transformStorySummary()`, `transformHomepageCluster()`) convert backend response shapes to frontend type contracts — cleanly decoupling the two systems.

**Auth Helpers** (`src/app/api/auth/_helpers.ts`):

`setRefreshCookie()` / `clearRefreshCookie()` manage the HttpOnly `fracture_rt` cookie (7-day maxAge, `sameSite: lax`, `path: /api/auth`, `secure` in production). `authBackendPost()` / `authBackendGet()` wrap NestJS auth endpoint calls.

| Route | Method | Purpose | External Service | Cache | Error Handling |
|---|---|---|---|---|---|
| `/api/homepage` | GET | Ranked homepage: hero + trending + fractured + latest | NestJS | None (client-side via React Query 30s staleTime) | `BackendError` → 502; generic → 500 |
| `/api/stories` | GET | Paginated story clusters; enriches first 10 with full detail | NestJS | None | `BackendError` → 502; generic → 500 |
| `/api/stories/[id]` | GET | Single cluster detail with articles + narrative data | NestJS | None | 404 on missing; `BackendError` → 502 |
| `/api/stories/[id]/articles` | GET | Articles for a cluster | NestJS | None | 404 if empty; `BackendError` → 502 |
| `/api/search` | GET | Discovery search (q, page, limit; min 2 chars) | NestJS → ES | None | `BackendError` → 502 |
| `/api/search/trending-topics` | GET | Trending topic keywords | NestJS | None | Empty array on error |
| `/api/stats` | GET | activeStories, avgDivergence, sourcesTracked | NestJS | None | `BackendError` → 502 |
| `/api/brief/[clusterId]` | GET | Fracture Brief: fetches cluster → builds prompt → calls Groq → returns brief | NestJS + Groq API | **ISR 1800s** (30 min) | Graceful: returns `{ brief: null, error }` with 200 on any failure; 404 only if cluster missing |
| `/api/stocks` | GET | Stock quotes (symbols param, max 20) | Yahoo Finance | **ISR 300s** (5 min) | Per-symbol error tolerance; returns available |
| `/api/markets/polymarket` | GET | Top 5 prediction markets by 24h volume | Polymarket API | **ISR 300s** (5 min) | Returns `{ markets: [] }` on error |
| `/api/markets/kalshi` | GET | Top 5 prediction events by 24h volume | Kalshi Events API | **ISR 300s** (5 min) | Returns `{ markets: [] }` on error |
| `/api/upgrade` | POST | Mock role upgrade (plan → role mapping) | None (stubbed) | None | Auth check; validates plan ID; returns `{ success, role }` |
| `/api/auth/login` | POST | Proxy login → NestJS; set refresh cookie | NestJS | None | Forwards backend status |
| `/api/auth/register` | POST | Proxy register → NestJS; set refresh cookie | NestJS | None | Forwards backend status |
| `/api/auth/refresh` | POST | Read HttpOnly cookie → NestJS refresh → rotate cookie | NestJS | None | Clears cookie on failure |
| `/api/auth/logout` | POST | Best-effort backend logout; clear cookie | NestJS | None | Always clears cookie (204) |
| `/api/auth/me` | GET | Proxy profile request with Bearer token | NestJS | None | Forwards backend status |
| `/api/auth/sso/callback` | GET | **Stub** — redirects to `/login?error=sso_not_available` | None | None | SSO not implemented |

---

## 3. Backend Architecture

### 3.1 NestJS Module Structure

Seven feature modules registered in `app.module.ts`, plus global infrastructure:

**Infrastructure Layer:**
- `ConfigModule` — 7 config namespaces: `app`, `database`, `redis`, `bullmq`, `elasticsearch`, `ingestion`, `imagePipeline`
- `TypeOrmModule` — `autoLoadEntities: true`, `synchronize: true` in development (**⚠️ never safe for production**)
- `ElasticsearchModule` — single-node cluster for full-text search
- `BullModule` — Redis-backed job queues (3 queues: `ingestion`, `narrative`, `image-pipeline`)
- `ThrottlerModule` — configurable TTL/limit (default: 100 requests / 60 seconds, flat — not per-tier)
- `ScheduleModule` — cron-based task scheduling

**Global Guards:** `JwtAuthGuard` (all routes require JWT unless `@Public()` decorator), `ThrottlerGuard`
**Global Filter:** `HttpExceptionFilter`
**Global Interceptors:** `TransformInterceptor`, `TimeoutInterceptor`

| Module | Key Services | Responsibility |
|---|---|---|
| **Articles** | `ArticlesService` | Article + Source CRUD, paginated listing with filters, cluster lookup |
| **Ingestion** | `IngestionService`, `IngestionScheduler`, RSS/NewsAPI/PaidSource adapters | 10-minute cron fetch → 3-stage dedup → BullMQ enqueue |
| **Narrative** | 14 services (see §3.2) + `NarrativeProcessor` | Sentiment, bias, framing, clustering, FDI, ranking, snapshots, discovery |
| **Search** | `SearchService` | Elasticsearch full-text search, autocomplete, faceted filtering, admin re-index |
| **Auth** | `AuthService`, `JwtStrategy`, `JwtAuthGuard` | JWT auth, bcrypt hashing, refresh token rotation, 5 RBAC roles |
| **Image Pipeline** | 7 services (see §3.6) + `ImagePipelineProcessor` | Image retrieval, AI generation, relevance scoring, storage |
| **Health** | `HealthService` | PostgreSQL, Redis, Elasticsearch ping checks |

**Bootstrap** (`main.ts`):
- Helmet security headers
- CORS: production locked to `https://fracture.app`; dev allows `localhost:3000,3002` and `127.0.0.1:3000`
- Global prefix `/api/v1` (excludes `/health`)
- Static file serving for local uploads at `/uploads/article-images`
- `ValidationPipe`: whitelist, forbidNonWhitelisted, transform, implicit conversion

### 3.2 RSS Ingestion and FDI Computation Pipeline

**Source Seeding** (`source-seeder.service.ts`):

`SourceSeederService` runs on every application boot (`@OnApplicationBootstrap`). Upserts 14 hardcoded sources by slug — inserts new, updates `rssFeedUrl`/`url`/`country`/`region` on existing. Sets `isActive: true` and `lastFetchedAt: null` for new sources.

**Ingestion Flow:**

1. **Cron trigger** — `IngestionScheduler` fires every 10 minutes (`@Cron('0 */10 * * * *')`), configurable via `ingestion.schedulerEnabled`
2. **Source iteration** — `IngestionService.fetchAndEnqueueAll()` iterates active sources; uses RSS adapter if `rssFeedUrl` present, falls back to NewsAPI adapter
3. **Deduplication** — 3-stage pipeline: URL canonicalization → exact headline match (24h window) → SimHash (Hamming distance ≤ 3)
4. **Enqueue** — surviving articles enqueued to BullMQ `ingestion` queue as `process-articles` batch jobs (3 attempts, exponential backoff from 2s, `removeOnComplete: 100`, `removeOnFail: 500`)
5. **Narrative processing** — `narrative` queue receives `analyse-article` jobs; the NarrativeProcessor runs: sentiment analysis, bias scoring, framing detection, clustering, divergence computation, topic extraction/classification
6. **Image pipeline** — `image-pipeline` queue handles image sourcing: context extraction → Unsplash/Openverse retrieval → OpenAI embedding relevance scoring → DALL-E 3 generation fallback → local/S3 storage

**FDI Computation** (⚠️ INFERRED from BFF transform layer and v3 docs):

The Fracture Divergence Index is a weighted composite of six sub-metrics:

| Sub-Metric | Key | Weight | Measures |
|---|---|---|---|
| Headline Tone | `headlineSentimentSpread` | 25% | Spread of headline sentiment across outlets |
| Framing Approach | `framingTypeEntropy` | 20% | Shannon entropy of framing type distribution |
| Entity Portrayal | `entityFramingDivergence` (mapped from `biasSpread`) | 20% | How differently outlets portray key entities |
| Language Similarity | `linguisticEmbeddingSpread` | 15% | Embedding-space distance of article language |
| Source Selection | `sourceSelectionVariance` | 10% | Variance in cited sources across outlets |
| Structural Difference | `structuralDivergence` | 10% | Length, quote usage, organization differences |

Result: `fdi` score 0–100 per cluster, stored on `StoryCluster.divergenceScore`. Severity tiers: Low (0–29), Moderate (30–59), High (60–79), Extreme (80–100). `isFractured` flag set when FDI ≥ 40 AND sourceCount ≥ 2.

### 3.3 PostgreSQL Schema — Core Entities

| Entity | Table | Key Fields |
|---|---|---|
| **Source** | `sources` | `id` (UUID), `name`, `slug` (unique), `rssFeedUrl`, `tier` (TIER_1_BREAKING / TIER_1_STANDARD / TIER_2 / TIER_3), `politicalLeanPrior` (−1.0 to +1.0), `establishmentPrior`, `reliabilityScore`, `country`, `region`, `isActive`, `lastFetchedAt` |
| **Article** | `articles` | `id` (UUID), `sourceId` (FK), `storyClusterId` (FK), `title`, `summary`, `content`, `url` (unique), `author`, `imageUrl`, `publishedAt`, `ingestedAt`, `politicalLeanScore`, `establishmentScore`, `headlineSentiment`, `bodySentiment`, `headlineBodySentimentGap`, `emotionalValence`, `framingType`, `framingConfidence`, `ledeType`, `sourceCount`, `namedSourceRatio`, `quoteToNarrativeRatio`, `clusterCentroidDistance`, `divergenceFromMedian`, `firstInCluster`, `simhash`, `paragraphCount`, 20+ annotation fields |
| **StoryCluster** | `story_clusters` | `id` (UUID), `topic`, `summary`, `topicKeywords` (jsonb), `status` (BREAKING / ACTIVE / ARCHIVED), `articleCount`, `sourceCount`, `divergenceScore` (cached FDI), `velocityScore`, `isFractured`, `topicCategory`, `imageUrl` |
| **TrendSignal** | `trend_signals` | `id` (UUID), `keyword`, `source`, `trendScore`, `detectedAt` |
| **User** | `users` | `id` (UUID), `email` (unique), `passwordHash`, `displayName`, `role` (free / pro / analyst / enterprise / admin), `isActive`, `refreshTokenHash`, `createdAt` |

### 3.4 Redis Usage

Single Redis instance (redis:7-alpine, 256 MB, `allkeys-lru`) serves dual purposes:

1. **BullMQ Job Queues** — 3 queues with distinct retry policies:

| Queue | Job Types | Retry | Backoff |
|---|---|---|---|
| `ingestion` | `process-articles` (batch) | 3 attempts | Exponential, 2s base |
| `narrative` | `analyse-article` (single) | 3 attempts | Exponential, 2s base |
| `image-pipeline` | `single`, `batch`, `cluster` | 2 attempts | Exponential, 10s base |

2. **Rate Limiting** — `@nestjs/throttler` uses Redis for distributed throttle counters (100 req / 60s window, global — not per-tier)

**⚠️ Risk:** A single Redis instance with `allkeys-lru` means BullMQ job data can be evicted under memory pressure, causing silent job loss. Production requires separate Redis instances for queues (persistence-enabled) and cache (LRU).

### 3.5 Elasticsearch

- Single-node cluster (`discovery.type=single-node`, xpack security disabled, 512 MB heap)
- **Index:** Articles indexed with full-text fields (title, summary, content), facets (sourceId, storyClusterId, framingType, bias range, date range), and metadata
- **Autocomplete:** Headline prefix matching (minimum 2 characters)
- **Discovery search:** Unified search across clusters + articles via `NarrativeController.discover()`, returning `SearchDiscoveryResponse` with clusters, articles, related topics, and totals
- **Admin re-index:** `POST /search/reindex` batch-indexes all articles in groups of 100

### 3.6 AI Integrations

**Groq API — Fracture Brief:**
- Model: `llama-3.1-8b-instant`
- Parameters: `max_tokens: 600`, `temperature: 0.4`
- System prompt: Wire-service editor voice — core facts, coverage divergence, what to watch. Max 3 paragraphs.
- User prompt: Constructed from cluster title, summary, article/source counts, FDI score, up to 12 headlines (with lean, framing, sentiment), and up to 4 narrative frames
- Called from BFF route `GET /api/brief/[clusterId]` — ISR cached 30 minutes
- Graceful degradation: returns `{ brief: null, error }` with 200 on any failure

**OpenAI — Image Pipeline:**
- **Embeddings:** Used by `ImageRelevanceService` to score candidate images against article context via cosine similarity
- **DALL-E 3:** Fallback image generation when retrieval yields no suitable match (model/size configurable via env vars)
- **Image retrieval:** Primary sourcing from Unsplash and Openverse APIs before AI generation

**Bias Scoring Model** (⚠️ INFERRED from v3 docs):
5-component composite: source prior (40%), keyword lean (20%), entity sentiment (15%), framing lean (15%), source selection (10%)

---

## 4. Key Data Flows

### 4.1 Story Lifecycle

```
1. RSS POLL (10-min cron)
   IngestionScheduler → IngestionService.fetchAndEnqueueAll()
   → RSS adapter fetches each of 14 sources concurrently
   → 3-stage dedup: URL canonical → headline match (24h) → SimHash (≤3)

2. INGEST
   → Surviving articles enqueued to BullMQ `ingestion` queue
   → Batch processor persists to PostgreSQL `articles` table

3. NARRATIVE ANALYSIS
   → `narrative` queue: per-article analysis
   → SentimentService: headline + body sentiment (VADER-inspired)
   → BiasScoringService: 5-component composite lean score
   → FramingDetector: classify into CONFLICT/HUMAN_INTEREST/ECONOMIC/MORAL/RESPONSIBILITY
   → ClusteringService: assign to existing or new StoryCluster

4. FDI COMPUTATION
   → DivergenceService: compute 6 sub-metrics across cluster articles
   → Weighted composite → `divergenceScore` on StoryCluster
   → Set `isFractured = true` if FDI ≥ 40 && sourceCount ≥ 2
   → TopicExtraction + TopicClassifier: extract keywords, assign category

5. IMAGE PIPELINE
   → `image-pipeline` queue: ImageContextService → ImageRetrievalService
   → Unsplash/Openverse candidates → ImageRelevanceService (OpenAI embeddings)
   → Fallback: ImageGenerationService (DALL-E 3) → ImageStorageService

6. BRIEF (on demand)
   → User hits `/story/[clusterId]` → FractureBrief component fetches
   → BFF `GET /api/brief/{clusterId}` → fetchClusterDetail() from NestJS
   → Build prompt (title, headlines, frames, FDI) → Groq API → llama-3.1-8b-instant
   → ISR-cached 30 minutes

7. FRONTEND RENDER
   → BFF transforms backend response → TanStack Query caches
   → React components render with Navy Standard design system
```

### 4.2 Auth Flow

```
1. REGISTER
   → Client submits email + password to BFF `POST /api/auth/register`
   → BFF proxies to NestJS `POST /api/v1/auth/register`
   → NestJS: lowercase email, check conflicts, bcrypt hash (12 rounds)
   → Create user with role = 'free', generate JWT pair
   → BFF: strip refreshToken from body, set HttpOnly cookie (`fracture_rt`)
   → Return { accessToken, expiresIn, user } to client
   → Client stores accessToken in memory (auth-tokens.ts module scope)

2. LOGIN
   → Same flow via `POST /api/auth/login`
   → NestJS validates email + password, checks isActive

3. SESSION RESTORE (on mount)
   → AuthProvider attempts `POST /api/auth/refresh`
   → BFF reads HttpOnly cookie → sends refreshToken to NestJS
   → NestJS: verify JWT, verify bcrypt hash of stored refresh token
   → Rotation detection: if hash mismatch → revoke all tokens, log warning
   → Issue new JWT pair, store new refresh token hash
   → BFF: rotate cookie, return new accessToken + user

4. TIER ASSIGNMENT
   → User.role stored in JWT payload (sub, email, role)
   → Frontend reads role from AuthContext → tierUtils maps to product tier
   → isPaidTier() / isEnterpriseTier() drive UI gating
   → AnalysisGate wraps paid content with blur + upgrade prompt

5. LOGOUT
   → BFF `POST /api/auth/logout` → NestJS nullifies refreshTokenHash
   → BFF clears HttpOnly cookie → client clears memory token
   → Redirect to homepage
```

### 4.3 Conversion Funnel

```
1. STORY → GATE
   → User reads free content (Brief, headlines, source spectrum)
   → Scrolls to AnalysisGate → sees blurred preview panels
   → AnalysisGate constructs href with returnUrl via usePathname()

2. GATE → PRICING (/pricing)
   → Pricing page reads returnUrl from search params
   → Three-tier display: Free ($0), Pro ($9/mo or $7/mo annual), Enterprise
   → "Get Pro access" propagates returnUrl to checkout href

3. PRICING → CHECKOUT (/checkout?plan=pro-monthly&returnUrl=...)
   → If not authenticated: shows "Sign in →" / "Create an account →"
     → Auth pages pass checkout URL as returnUrl → return after auth
   → MockPaymentForm renders (card fields, "TEST MODE" badge)
   → ⛔ BROKEN: MockPaymentForm always returns { success: true } after 1.5s
   → Calls POST /api/upgrade with plan ID → stub returns { success: true, role }

4. CHECKOUT → CONFIRMATION (/checkout/confirmation)
   → Green checkmark, "You're all set"
   → "Continue reading →" links to preserved returnUrl
   → "Explore your Digest →" links to /digest

BROKEN STEPS:
- Step 3: No real payment processing (Stripe not integrated)
- Step 3: POST /api/upgrade is a mock — does not persist role change
- Step 3: Backend JWT will not reflect upgraded role until real backend endpoint exists
- For anonymous users: AnalysisGate returnUrl propagation needs runtime verification
```

### 4.4 Real-Time Data

| Data Feed | Source | Refresh Mechanism | Interval | Implementation |
|---|---|---|---|---|
| **Stock Ticker** | Yahoo Finance via `yahoo-finance2` | BFF route `GET /api/stocks` with ISR; client-side refetch in RightSidebar | ISR 5 min; client poll 2 min | `src/app/api/stocks/route.ts` → `RightSidebar` |
| **Prediction Markets (Polymarket)** | Polymarket Gamma API | BFF route with ISR | ISR 5 min | `src/app/api/markets/polymarket/route.ts` |
| **Prediction Markets (Kalshi)** | Kalshi Elections API | BFF route with ISR | ISR 5 min | `src/app/api/markets/kalshi/route.ts` |
| **Fracture Brief** | Groq API (on-demand) | BFF route with ISR | ISR 30 min | `src/app/api/brief/[clusterId]/route.ts` |
| **News Feed** | NestJS backend (PostgreSQL) | TanStack Query staleTime | 30s (homepage), 60s (stories) | Hooks in `src/hooks/useStories.ts` |
| **RSS Ingestion** | 14 RSS feeds | NestJS cron scheduler | 10 min | `backend/src/ingestion/ingestion.scheduler.ts` |

---

## 5. Security

### 5.1 Authentication and Authorization

**JWT Architecture:**
- Access tokens: 15-minute expiry (configurable via `JWT_EXPIRATION`), HS256 signing
- Refresh tokens: 7-day expiry (configurable via `JWT_REFRESH_EXPIRATION`), bcrypt-hashed storage on User entity
- Refresh token rotation with tamper detection — hash mismatch triggers full revocation and warning log
- Global `JwtAuthGuard` on all backend routes; `@Public()` decorator bypasses for public endpoints

**RBAC System:**
- 5 roles: `free`, `pro`, `analyst`, `enterprise`, `admin` (ascending privilege)
- `@Roles()` decorator on controller methods; `RolesGuard` validates
- Frontend `useAuth()` hook provides `hasRole(minRole)`, `isPro`, `isAnalyst`, `isEnterprise`, `isAdmin`

**⚠️ CRITICAL — Tier Gate Enforcement:**

**The tier gates are enforced client-side only.** The `AnalysisGate` component (`src/components/story/AnalysisGate.tsx`) checks `isPaidTier(userTier)` in React and either renders children or shows a blur + upgrade prompt. However, the backend NestJS API returns full cluster detail (including all divergence sub-metrics, narrative frames, headline comparison, and timeline data) from `GET /api/v1/narrative/cluster/{id}` to **any caller** — the endpoint is decorated `@Public()`. A user could bypass all frontend gates by calling the BFF or backend API directly and receiving the complete analytical payload.

**This means:** A technically savvy free-tier user can access all "paid" analytical data by calling `GET /api/stories/{id}` directly. The backend does not distinguish between tier-gated and public data in its responses. **This must be fixed before launch** by adding server-side role checks to narrative endpoints that return paid-tier data, or by splitting responses into free/paid segments based on the caller's role.

### 5.2 Secrets Management

| Secret | Location | Exposure Risk |
|---|---|---|
| `JWT_SECRET` | Backend `.env` | Server-only — correct |
| `DB_PASSWORD` | Backend `.env` | Server-only — correct |
| `GROQ_API_KEY` | Frontend `.env.local` | Server-only (BFF route) — correct; not prefixed with `NEXT_PUBLIC_` |
| `OPENAI_API_KEY` | Backend `.env` | Server-only — correct |
| `UNSPLASH_ACCESS_KEY` | Backend `.env` | Server-only — correct |
| `NEWSAPI_KEY` | Backend `.env` | Server-only — correct |
| `BACKEND_URL` | Frontend `.env.local` | Server-only (no `NEXT_PUBLIC_` prefix) — correct |

No secrets are exposed to the browser. The BFF pattern ensures that `GROQ_API_KEY` and `BACKEND_URL` remain server-side only.

### 5.3 Input Validation

**Backend:** `ValidationPipe` with `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true` applied globally. DTOs use `class-validator` decorators. Unknown properties are stripped.

**Frontend:** `safeReturnUrl()` function prevents open-redirect attacks — validates URL starts with `/` and not `//`. Implemented in `login/page.tsx`, `register/page.tsx`, `checkout/page.tsx`, and `checkout/confirmation/page.tsx`. ⚠️ Duplicated across 4 files — should be extracted to a shared utility.

**Rate Limiting:** Global `@nestjs/throttler` with configurable TTL/limit (default 100 req / 60s). Flat rate — not per-tier. Rate limit headers exposed via CORS.

---

## 6. Performance and Scalability

### 6.1 Bundle Concerns

| Component | Lines | Issue | Mitigation Opportunity |
|---|---|---|---|
| `digest/page.tsx` | 1,602 | Single `"use client"` component with 7 `useMemo` chains | Split into lazy-loaded sub-components (feed, sidebar, matrix) |
| `story/[clusterId]/page.tsx` | 1,493 | Both Dashboard + Guided views in one client bundle | Split views into `dynamic(() => import(...))` components |
| `account/page.tsx` | 1,089 | Full account management in one client component | Extract settings sections into sub-components |
| `compare/page.tsx` | 1,059 | Comparison logic + rendering in one file | Extract ArticleBlock and gutter metrics |

**Third-party weight:** `recharts` (3.8.0) imported only on Digest page — candidate for dynamic import. `framer-motion` (12.35.0) used widely but tree-shakes well. `yahoo-finance2` (3.13.2) is server-only (BFF route) — no client bundle impact.

### 6.2 Caching Effectiveness

| Layer | Strategy | Interval | Coverage |
|---|---|---|---|
| **Next.js ISR** | Route-level `revalidate` | 5 min (stocks, markets), 30 min (brief, briefing page) | External data + AI content |
| **TanStack Query** | `staleTime` per hook | 30s (homepage, stats), 60s (stories, search), 5 min (trending) | All server state |
| **Redis** | BullMQ job data + throttle counters | LRU eviction at 256 MB | Queue reliability + rate limiting |
| **Browser** | React Query in-memory cache | Session lifetime | Prevents redundant fetches |

**Gap:** No server-side caching for the most expensive operation — the NestJS homepage endpoint (`GET /api/v1/narrative/homepage`) computes hero selection, fractured story, trending sort, and source-balanced latest on every request. A 30-second Redis cache here would significantly reduce PostgreSQL load.

### 6.3 Current Bottlenecks

1. **Single Redis instance** — BullMQ queues (requiring persistence) and rate-limit counters (ephemeral) share one `allkeys-lru` Redis. Under memory pressure, job data can be evicted.

2. **TypeORM `synchronize: true`** — Auto-syncs schema on every boot. Can drop columns/tables if entities change unexpectedly. Must be replaced with migration-based schema management before production.

3. **NestJS monolith** — All 14 narrative services run in-process. CPU-intensive operations (embedding computation, clustering) compete with request handling on the same Node.js event loop.

4. **`SourceSeederService` on every boot** — 14 source upserts on every application start. Acceptable at current scale but should be a one-time migration or seed script.

5. **Homepage N+1** — The stories BFF route enriches the first 10 clusters by calling `fetchClusterDetail()` for each — 10 sequential requests to the backend per stories page load.

6. **Digest `deriveTrend()` uses `Math.random()`** — Fabricated trend data. Not a performance bottleneck but a trust-destroying data integrity issue.

### 6.4 Scaling Path — What Breaks at 10× Load

| Current Scale | 10× Issue | Mitigation |
|---|---|---|
| 14 RSS sources, 10-min cycle | 140 sources → BullMQ `ingestion` queue overwhelmed | Partition by priority tier; dedicated ingestion Redis |
| Single PostgreSQL | Read-heavy narrative queries contend with writes | Read replicas for narrative/search endpoints |
| Single Redis (256 MB) | Queue data evicted under 10× job volume | Separate Redis: queues (persistence) vs. cache (LRU) |
| NestJS monolith | CPU-bound analysis blocks HTTP handlers | Extract narrative processing to worker service |
| Elasticsearch single-node | Index size grows; query latency increases | Multi-node cluster with replicas |
| `synchronize: true` | Not directly a scale issue but any entity change can corrupt data | Migrations + blue-green deploy |
| No CDN | Static assets served from Next.js process | CloudFront/Vercel Edge for static + ISR |

---

## 7. What Is Working Well

1. **`TERMINOLOGY_CONSTANTS.ts` — Single Source of Truth** (`src/lib/TERMINOLOGY_CONSTANTS.ts`, 302 lines). Every user-facing label (score names, sub-metric labels, section headers, navigation text, lean categories, tone categories, severity tiers, divergence thresholds, cross-link CTAs) is defined in one file. Helper functions (`severityTier()`, `leanCategory()`, `toneCategory()`, `divergenceLabel()`, `severityColor()`) ensure threshold logic is never duplicated. This resolved the v1 problem of six different names for the same metric across pages. The decision to centralize all vocabulary — not just constants — into one file demonstrates engineering discipline that will pay dividends as the product scales.

2. **BFF API Route Pattern** (`src/app/api/_lib/backend.ts` + 20 route files). The backend-for-frontend layer cleanly separates concerns: the NestJS backend speaks its own internal shapes (`BackendClusterDetail`, `BackendArticle`), while the frontend operates on its own type contracts (`StoryCluster`, `Article`, `DivergenceIndex`). Transform functions (`transformArticle()`, `transformClusterDetail()`, `transformDivergenceIndex()`) in `backend.ts` handle the translation. This means either side can evolve independently. The `BackendError` class propagates status codes correctly, and external API proxies (stocks, markets) avoid CORS issues elegantly.

3. **ISR for AI Content** (`src/app/api/brief/[clusterId]/route.ts`, `revalidate = 1800`). The Fracture Brief uses Groq API inference on demand, then ISR-caches the result for 30 minutes. This means the first visitor to a story within a 30-minute window triggers AI generation; subsequent visitors get instant static responses. The graceful degradation — returning `{ brief: null, error }` with HTTP 200 on any failure — means the UI never shows an error state; the Brief component silently renders nothing. Same pattern applied to stock quotes and prediction markets at 5-minute intervals.

4. **`ArticleDrawerContext`** (`src/contexts/ArticleDrawerContext.tsx`). A clean React Context that manages a slide-out article preview drawer available globally. The `openDrawer()` function accepts an article plus contextual data (other articles, story headline, category), and the `ArticlePreviewDrawer` is rendered once at the provider level — not per-component. This avoids the common antipattern of mounting modal/drawer instances inside every card component.

5. **Navy Standard `@theme` Approach** (`src/app/globals.css`, `@theme` block). The Tailwind v4 `@theme` block defines all color tokens, typography stacks, and spacing values as CSS custom properties that Tailwind consumes. This means `bg-navy`, `text-amber`, `text-diverge-high` all resolve to documented hex values. Combined with the `ns-*` class naming convention, this creates a lightweight design system that doesn't require a component library — 733 lines of CSS replaces what would otherwise be a Chakra/Radix dependency.

6. **`safeReturnUrl()` Open-Redirect Prevention** (`login/page.tsx`, `register/page.tsx`, `checkout/page.tsx`, `checkout/confirmation/page.tsx`). Every page that reads a `returnUrl` parameter validates it starts with `/` and does not start with `//`. This prevents attackers from crafting URLs like `?returnUrl=//evil.com` that would redirect users off-site after login. Simple but critical security hygiene.

7. **Skeleton Loading Architecture** (`ns-skeleton` class in `globals.css` + per-component skeleton variants). Every major view exports a matching skeleton that preserves the structural layout during loading. `StoryPageSkeleton`, `ComparePageSkeleton`, `SearchPageSkeleton`, and `DigestSkeleton` all use the `ns-shimmer` keyframe animation. The `FractureBrief` skeleton includes `aria-busy="true"` and screen-reader text "Generating Fracture Brief…" — a detail most teams skip.

8. **Unified Story/Journey Page** (`src/app/story/[clusterId]/page.tsx` with `?view=dashboard|guided`). Instead of maintaining two separate pages that fetch identical data, a single route serves both analytical views via a URL-shareable toggle. View switching uses `router.replace()` (no history entry, no data refetch, smooth scroll to top). The legacy `/journey/[clusterId]` route performs a server-side redirect to preserve bookmarks.

9. **Tier-Aware Rendering Pattern** (`src/lib/tierUtils.ts` + `AnalysisGate` + `useAuth()`). The product tier model is cleanly derived from backend RBAC roles: `isPaidTier()` and `isEnterpriseTier()` are the only two checks needed. The `AnalysisGate` component wraps paid content with a blur overlay and contextual upgrade prompts (different copy for anonymous vs. authenticated free users). The `useAuth()` hook provides `hasRole()` with a role hierarchy for fine-grained checks.

10. **Framing Keyword Lexicon** (`src/lib/framing.ts`). A curated lexicon of 38 politically-loaded terms (e.g., "undocumented immigrants" at lean −0.3, "illegal aliens" at lean +0.6, "government overreach" at lean +0.6) with per-term lean scores. The `highlightFramingKeywords()` function scans article text and returns match spans with lean metadata — enabling the Compare page's keyword highlighting feature that visually reveals framing choices. Longest-match-first regex prevents partial matches.

11. **Refresh Token Rotation with Tamper Detection** (`backend/src/auth/auth.service.ts`). On every refresh, the backend bcrypt-compares the presented token against the stored hash. If the hash doesn't match (indicating a stolen token being replayed after rotation), the system revokes all tokens for that user and logs a security warning. This is a meaningful security feature beyond simple token refresh.

---

## 8. What Needs Improvement

### CRITICAL

**C1 — No Real Payment Processing**
`src/components/checkout/MockPaymentForm.tsx` simulates a 1.5-second delay and always returns `{ success: true }`. The `POST /api/upgrade` endpoint (`src/app/api/upgrade/route.ts`) is a stub that returns `{ success: true, role }` without persisting any change. The backend has no role-update endpoint. **Revenue is impossible in the current state.** Stripe Elements integration is required, plus a `PATCH /api/v1/auth/role` backend endpoint, plus a Stripe webhook handler for payment confirmation.

**C2 — Client-Side-Only Tier Gate Enforcement**
`AnalysisGate` (`src/components/story/AnalysisGate.tsx`) checks `isPaidTier()` in React. But `GET /api/v1/narrative/cluster/{id}` is `@Public()` and returns all data — FDI sub-metrics, narrative frames, headline comparison, timeline — regardless of caller authentication. Any user can `curl` the BFF or backend directly and receive the full paid-tier payload. The backend must split responses into free and paid segments based on JWT role, or add `@Roles()` guards to analytical data endpoints.

**C3 — TypeORM `synchronize: true`**
`app.module.ts` enables `synchronize: true` for development. This auto-syncs entity definitions to the database schema on every boot. If an entity property is renamed or removed, TypeORM can drop columns containing production data. Must be replaced with TypeORM migrations (`migration:generate`, `migration:run`) before any production deployment.

**C4 — No Automated Tests on Critical Paths**
Backend has Jest infrastructure (`jest` in package.json, `test/jest-e2e.json`) but only a boilerplate `app.controller.spec.ts`. No tests exist for: auth flow, FDI computation, ingestion pipeline, narrative processing, or any BFF route. Frontend has no test runner configured. The payment flow, auth flow, and FDI computation are critical paths with zero test coverage.

**C5 — No Error Monitoring**
No Sentry, Datadog, LogRocket, or equivalent is integrated. Frontend errors fail silently (e.g., `FractureBrief` renders `null` on error with no reporting). Backend errors are logged to stdout only. Production requires structured error capture with alerting.

### HIGH

**H1 — Large Client Components Need Code Splitting**
`digest/page.tsx` (1,602 lines), `story/[clusterId]/page.tsx` (1,493 lines), `account/page.tsx` (1,089 lines), and `compare/page.tsx` (1,059 lines) are all single `"use client"` components. The story page includes both Dashboard and Guided views in one bundle. These should use `dynamic(() => import(...))` or React.lazy for view-specific code.

**H2 — `LogoIcon` Duplicated in 4 Files**
The Fracture logo SVG is independently defined in `Navbar.tsx`, `login/page.tsx`, `register/page.tsx`, and `Footer.tsx` with different stroke colors (`#0F1F3D` in Navbar, `#FFF8E8` in Footer). Should be a shared component with a `color` prop.

**H3 — `divergenceLabel()` Duplicated in Components**
`SecondaryStoryGrid.tsx` and `MostFracturedSection.tsx` define local threshold functions (`borderColor()`, `divLabel()`) with hardcoded hex values and thresholds that may drift from canonical values in `TERMINOLOGY_CONSTANTS.ts`. The canonical `divergenceLabel()` and `severityColor()` functions exist but are not used by these components.

**H4 — Single Redis for Queue + Cache**
One Redis instance (256 MB, `allkeys-lru`) handles BullMQ job queues, rate-limit counters, and any application caching. Under memory pressure, LRU can evict pending job data. Production requires at minimum two Redis instances: one with RDB/AOF persistence for queues, one with LRU for caching.

**H5 — `SourceSeederService` on Every Boot**
14 sources are upserted from hardcoded data on every application start. At current scale this is harmless (~50ms), but it conflates application code with seed data and could conflict with admin-managed source changes. Should be a database migration or one-time seed script.

**H6 — Digest `deriveTrend()` Uses `Math.random()`**
The `deriveTrend()` function in `digest/page.tsx` generates fabricated trend deltas using `Math.random()` for stories updated within 4 hours. If a user refreshes the page and sees different trend numbers, trust in all data is destroyed. Must use actual temporal data from the backend or display "N/A."

**H7 — Homepage N+1 Query Pattern**
`GET /api/stories` enriches the first 10 clusters by calling `fetchClusterDetail()` for each — 10 sequential HTTP requests to the backend per page load. A batch endpoint or pre-aggregated response would eliminate this.

### MEDIUM

**M1 — No CI/CD Pipeline**
No GitHub Actions, CircleCI, or equivalent configured. Deployment process is undocumented. Backend and frontend have `build` scripts but no automated build/test/deploy workflow.

**M2 — Missing Database Migration Strategy**
TypeORM migration infrastructure is not configured. No `migrations/` directory, no `typeorm-cli` config, no migration scripts. Schema changes currently require `synchronize: true` or manual SQL.

**M3 — No Staging Environment Documented**
`docker-compose.yml` defines a development environment only. No staging compose, no cloud infrastructure config, no deployment documentation beyond `STARTUP.md`.

**M4 — Terms of Service / Privacy Policy at `href="#"`**
Register page and auth page footer links for Terms and Privacy point to `href="#"`. Users are asked to agree to non-existent legal documents. Legally required before any public launch.

**M5 — Missing Focus Trap in Modals**
Mobile nav drawer, digest alert configuration modal, and article preview drawer do not trap keyboard focus. Users can tab to elements behind overlays. Violates WCAG 2.1 SC 2.4.3.

**M6 — `safeReturnUrl()` Duplicated Across 4 Files**
Identical open-redirect prevention logic is copy-pasted in `login/page.tsx`, `register/page.tsx`, `checkout/page.tsx`, and `checkout/confirmation/page.tsx`. Should be a shared utility in `src/lib/`.

**M7 — `cleanSummary()` Strips Non-Latin Characters**
The story page's `cleanSummary()` regex strips non-Latin script runs, destroying content for stories involving CJK, Arabic, or Cyrillic text. Inappropriate for an international news platform.

---

## 9. Future Features Roadmap

### HORIZON 1 — Complete the Core (0–60 Days)

| Feature | Why It Matters | Technical Requirements | Complexity | Dependencies |
|---|---|---|---|---|
| **Stripe Integration** | Revenue is blocked; MockPaymentForm must be replaced | Stripe Elements frontend, `PATCH /api/v1/auth/role` backend endpoint, Stripe webhook handler (`POST /api/webhooks/stripe`), plan-to-role mapping, subscription management | XL | Backend role-update endpoint |
| **Backend Tier Enforcement** | Any user can bypass frontend gates via direct API calls | Split narrative responses by caller role; add `@Roles()` to analytical endpoints; return free-tier subset for unauthenticated/free callers | L | JWT middleware reading role |
| **Password Reset Email Delivery** | `/forgot-password` and `/reset-password` pages exist but need email infrastructure | Email service (SendGrid/Resend), reset token generation + storage, token validation endpoint, email template | M | Email provider account |
| **Error Monitoring (Sentry)** | Silent failures in production are undetectable | Sentry SDK in frontend + backend, source maps upload, error boundary components, alert rules | M | Sentry account |
| **Terms of Service / Privacy Policy** | Legal requirement; currently `href="#"` | Legal document creation, new static pages at `/terms` and `/privacy`, link updates in register + footer | S | Legal review |
| **Email Infrastructure** | Required for password reset, payment receipts, digest notifications | SMTP/API service (SendGrid/Resend), email templates, unsubscribe handling, bounce management | M | Provider account + DNS setup |

### HORIZON 2 — Scale the Product (60–180 Days)

| Feature | Why It Matters | Technical Requirements | Complexity | Dependencies |
|---|---|---|---|---|
| **Real Divergence Timeline Data** | `deriveTrend()` uses `Math.random()`; need actual temporal FDI series | TimescaleDB or PostgreSQL time-series extension, FDI snapshots on each analysis run, API endpoint for historical series, Recharts time-series chart | L | Database migration strategy |
| **Saved Stories & Reading History** | No user engagement features exist; builds retention | `saved_stories` + `reading_history` tables, API endpoints, UI components, sync with auth context | M | Auth system |
| **Share Cards with Dynamic OG Images** | Stories have no social sharing; limits organic growth | `next/og` or Satori for dynamic OG image generation, Open Graph meta tags per story, share button component, Twitter/Facebook preview testing | M | ISR route for OG images |
| **Source Expansion (14 → 50+)** | 14 sources limits analytical depth and credibility | Admin source management UI, RSS discovery tool, automated lean estimation for new sources, tier classification, scaling ingestion pipeline | L | Ingestion pipeline scaling |
| **Real-Time Story Alerts (WebSocket/SSE)** | Breaking stories reach users with latency of TanStack Query staleTime | NestJS `@WebSocketGateway` or SSE endpoint, BullMQ event listeners, client-side connection manager, notification UI | L | Redis Pub/Sub or dedicated message broker |
| **Personalized Digest Algorithm** | Current digest is the same for all paid users | User preference model, reading history signals, collaborative filtering, personalized ranking API, A/B testing infrastructure | XL | Saved stories + reading history |
| **PWA with Push Notifications** | Mobile experience limited to responsive web; no re-engagement channel | `next-pwa` setup, service worker, push notification API, subscription management backend, notification templates | M | Email/notification infrastructure |

### HORIZON 3 — Enterprise Platform (6–12 Months)

| Feature | Why It Matters | Technical Requirements | Complexity | Dependencies |
|---|---|---|---|---|
| **Public Fracture API with Key Management** | Enterprise revenue; data-as-a-service model | API key generation + management, per-key rate limiting, usage metering + billing, OpenAPI documentation, developer portal | XL | Stripe subscription tiers |
| **Enterprise Multi-User Dashboard** | Current `/enterprise` is a "Coming Soon" placeholder | Team model (organizations, members, roles), admin panel, shared workspace, usage analytics, SAML/SSO integration | XL | Auth system overhaul |
| **Custom Source Lists Per Organization** | Enterprise clients need domain-specific source coverage | Per-org source configuration, private RSS feeds, custom lean priors, isolated ingestion pipelines, billing per-source | L | Multi-tenant architecture |
| **Historical Archive Search** | No time-series querying; all data is present-tense | Elasticsearch index lifecycle management, date-range faceted search, historical FDI charts, data retention policy | L | Elasticsearch scaling |
| **Bias Detection Model Trained on Fracture Corpus** | Replace heuristic bias scoring with ML model | Training pipeline (PyTorch/HuggingFace), labeled training data from Fracture corpus, model serving infrastructure (TorchServe/SageMaker), A/B test against heuristic | XL | Data labeling pipeline |
| **Multimedia / Broadcast Transcript Analysis** | Text-only analysis misses TV/radio/podcast framing | Transcription service (Whisper/AssemblyAI), multimedia ingestion adapters, cross-modal clustering, video thumbnail extraction | XL | Ingestion pipeline overhaul |

---

## 10. Production Readiness Checklist

### SECURITY

| Item | Status | Evidence |
|---|---|---|
| Backend tier enforcement on API responses | ❌ NOT DONE | Narrative endpoints are `@Public()`; full data returned regardless of role |
| All secrets in environment variables (not code) | ✅ DONE | All secrets via `.env`; no `NEXT_PUBLIC_` prefix on sensitive keys |
| TypeORM `synchronize` off in production | ❌ NOT DONE | `synchronize: true` in `app.module.ts` for dev; no production config guard |
| Rate limiting configured | ⚠️ PARTIAL | Global 100 req/60s via `@nestjs/throttler`; flat — not per-tier or per-endpoint |
| CORS configuration | ⚠️ PARTIAL | Production locked to `https://fracture.app`; dev allows localhost variants; credentials enabled |
| Security headers | ✅ DONE | Helmet enabled in `main.ts` |
| Refresh token rotation | ✅ DONE | bcrypt-hashed storage; rotation detection with revocation |
| Open-redirect prevention | ✅ DONE | `safeReturnUrl()` on all returnUrl consumers |

### FUNCTIONALITY

| Item | Status | Evidence |
|---|---|---|
| Payment processing working | ❌ NOT DONE | MockPaymentForm with simulated success; no Stripe integration |
| Password reset email delivery | ❌ NOT DONE | Pages exist (`/forgot-password`, `/reset-password`); no email infrastructure |
| All RSS sources ingesting | ✅ DONE | 14 sources seeded on boot; 10-min cron scheduler |
| FDI pipeline stable | ✅ DONE | 14 narrative services processing; divergenceScore persisted on clusters |
| User registration/login | ✅ DONE | Full JWT flow with BFF pattern; HttpOnly refresh cookies |
| Search functional | ✅ DONE | Elasticsearch discovery search with facets, autocomplete, trending topics |

### RELIABILITY

| Item | Status | Evidence |
|---|---|---|
| Error monitoring | ❌ NOT DONE | No Sentry, Datadog, or equivalent |
| Uptime monitoring | ❌ NOT DONE | Health endpoint exists (`GET /health`) but no external monitor |
| Database backups | ❌ NOT DONE | Docker volume only; no backup strategy |
| Redis persistence | ❌ NOT DONE | `allkeys-lru` eviction; no RDB/AOF configured |
| Health checks | ✅ DONE | `HealthService` pings PostgreSQL, Redis, Elasticsearch |
| Graceful degradation | ⚠️ PARTIAL | Fracture Brief degrades gracefully; stock/market routes return empty on error; no page-level error boundaries |

### LEGAL

| Item | Status | Evidence |
|---|---|---|
| Terms of Service | ❌ NOT DONE | Links point to `href="#"` |
| Privacy Policy | ❌ NOT DONE | Links point to `href="#"` |
| GDPR data deletion capability | ❌ NOT DONE | No user data export or deletion endpoint |
| AI content disclosure | ✅ DONE | Fracture Brief footer: "Generated by AI based on coverage data"; methodology page AI disclosure |

### PERFORMANCE

| Item | Status | Evidence |
|---|---|---|
| Large components code-split | ❌ NOT DONE | 4 components over 1,000 lines; no dynamic imports |
| Core Web Vitals passing | ⚠️ PARTIAL | Skeleton loading states help LCP; large client bundles may impact TBT; no CWV measurement in place |
| Database indexes on hot paths | ⚠️ PARTIAL | TypeORM auto-generates indexes for unique/primary columns; no custom indexes verified for narrative queries |
| CDN for static assets | ❌ NOT DONE | No CDN configured; Next.js serves all assets |

---

## 11. Glossary

| Term | Definition |
|---|---|
| **FDI** | Fracture Divergence Index — a composite score from 0–100 measuring how differently outlets cover the same story, computed from six weighted sub-metrics: headline tone (25%), framing approach (20%), entity portrayal (20%), linguistic similarity (15%), source selection (10%), structural difference (10%). Canonical thresholds: Low 0–29, Moderate 30–59, High 60–79, Extreme 80–100. |
| **Story Cluster** | A group of articles from different outlets covering the same event, identified by the clustering algorithm in `ClusteringService`. Represented by the `StoryCluster` entity with `divergenceScore`, `topicKeywords`, `isFractured`, and `velocityScore`. |
| **Source Spectrum** | A horizontal visualization showing where each outlet's coverage sits on the left–right political lean scale (−1.0 to +1.0) for a specific story. Defined in `NarrativeSpectrumData` with `averageLean`, `spread`, and per-source entries. |
| **Narrative Frames** | The different editorial lenses outlets use to cover a story: CONFLICT, HUMAN_INTEREST, ECONOMIC, MORAL, RESPONSIBILITY. Detected by `FramingDetectorService` and displayed as grouped frame cards with source attribution. |
| **Lean** | Political lean — a numeric score from −1.0 (most left-leaning) to +1.0 (most right-leaning). Sources have a static `politicalLeanPrior`; articles receive a computed `politicalLeanScore` from the 5-component bias scoring model. Canonical category thresholds: ≤−0.6 Far Left, ≤−0.2 Left-Leaning, ≤0.2 Center, ≤0.6 Right-Leaning, >0.6 Far Right. |
| **Fracture Brief** | An AI-generated 2–3 paragraph editorial summary per story cluster, produced by Groq's Llama 3.1 8B model. Displayed in an amber-bordered card (`ns-card-brief`) above the analysis gate. ISR-cached for 30 minutes. The core free-tier differentiating feature. |
| **AnalysisGate** | The paywall component (`src/components/story/AnalysisGate.tsx`) separating free content (Brief, headlines, source spectrum) from paid content (FDI breakdown, narrative frames, timeline). Renders blurred preview panels with upgrade prompts for free/unauthenticated users. |
| **Navy Standard** | Fracture's design system, defined in `src/app/globals.css` with `@theme` token definitions and `ns-*` prefixed CSS classes. Named for its navy-dominant color palette (`#0F1F3D`). Provides cards, buttons, badges, inputs, typography, layout, and loading patterns without a component library dependency. |
| **BFF** | Backend-for-Frontend — the Next.js API route layer (`src/app/api/`) that proxies and transforms NestJS backend responses into frontend type contracts. Handles auth cookie management, external API proxying (stocks, markets, Groq), and response shape normalization. |
| **TodayStrip** | The Bloomberg-terminal-style data bar at the top of the homepage (`ns-today-strip`) displaying active story count, average FDI, outlet count, and breaking story indicator. |
| **ISR** | Incremental Static Regeneration — Next.js feature that serves statically generated pages and regenerates them in the background after a configurable interval. Used for Fracture Brief (30 min), stock quotes (5 min), and prediction markets (5 min). |
| **ns-* Classes** | The namespaced CSS class convention used in Navy Standard (e.g., `ns-card`, `ns-btn-amber`, `ns-div-dot-high`). All new code should use `ns-*` classes; un-prefixed backward-compatibility aliases exist for legacy code. |

---

*End of SYSTEM_DESIGN_v4.md. This document supersedes all previous versions. Source of truth for the Fracture architecture as of March 23, 2026.*
