# FRACTURE — Technical System Design v5

> ⚠️ Superseded by `SYSTEM_DESIGN_v6.md` — May 7, 2026.

**Version:** 5.0
**Date:** April 2026
**Status:** Superseded by SYSTEM_DESIGN_v6.md

---

## 0. Executive Summary

Fracture is a real-time narrative intelligence platform that ingests news from 14 curated outlets across the political spectrum, clusters articles into unified story threads, and computes a proprietary Fracture Divergence Index (FDI) — a composite 0–100 score measuring how differently outlets frame the same event across six dimensions: headline tone, framing approach, entity portrayal, linguistic similarity, source selection, and structural difference. The frontend is a Next.js 16 / React 19 application with a Backend-for-Frontend (BFF) API layer that transforms NestJS backend responses into typed frontend contracts; the backend is a NestJS 11 monolith orchestrating PostgreSQL 16, Redis 7 (BullMQ queues + rate limiting), and Elasticsearch 8.12 for full-text search. Since v4, the frontend has undergone a significant design system migration from "Navy Standard" (editorial serif) to "MaxQ" (dark flight-deck monospace-first) and a structural simplification that reduced the page count from 20+ routes to 7 core pages and 13 API routes.

The architecture is distinctive for three reasons: (1) the BFF pattern in `src/app/api/_lib/backend.ts` cleanly decouples frontend type contracts from backend internals via transform functions, (2) `TERMINOLOGY_CONSTANTS.ts` serves as a single source of truth for all divergence thresholds, severity tiers, lean categories, and user-facing labels, and (3) the MaxQ design system — defined entirely via `@theme` tokens and `ns-*` CSS classes in `globals.css` — provides visual cohesion without a component library dependency. The platform is at **Early Product** maturity. The analytical core (FDI computation, clustering, Fracture Brief, story detail pages) is genuinely differentiated and functional. Production readiness is blocked by: no real payment processing, client-side-only tier gate enforcement, TypeORM `synchronize: true`, and no error monitoring or automated tests.

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
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐                   │
│  │ SSR / ISR   │  │ BFF API      │  │ Auth BFF     │                   │
│  │ Pages       │  │ /api/*       │  │ /api/auth/*  │                   │
│  │ (briefing   │  │ (homepage,   │  │ (login,      │                   │
│  │  ISR 30min) │  │  stories,    │  │  register,   │                   │
│  │             │  │  search,     │  │  refresh,    │                   │
│  │             │  │  stats)      │  │  logout, me) │                   │
│  └─────────────┘  └──────┬───────┘  └──────┬───────┘                   │
└──────────────────────────┼─────────────────┼────────────────────────────┘
                           │ HTTP            │ HTTP
                           ▼                 ▼
┌──────────────────────────────────────┐
│        NESTJS 11 API (Monolith)      │
│        /api/v1/* · Port 4000         │
│                                      │
│  ┌────────────┐  ┌────────────────┐  │
│  │ Articles   │  │ Narrative      │  │
│  │ Module     │  │ Module (14 svc)│  │
│  ├────────────┤  ├────────────────┤  │
│  │ Ingestion  │  │ Search Module  │  │
│  │ Module     │  │ (Elasticsearch)│  │
│  ├────────────┤  ├────────────────┤  │
│  │ Auth       │  │ Image Pipeline │  │
│  │ Module     │  │ Module (8 svc) │  │
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
| **Frontend Framework** | Next.js (App Router) | 16.2.1 | SSR, ISR, BFF API routes, Turbopack dev server |
| **UI Library** | React | 19.2.4 | Component rendering |
| **Styling** | TailwindCSS | 4.x | Utility-first CSS with `@theme` tokens |
| **Server State** | TanStack React Query | 5.95.2 | Caching, deduplication, background refetch |
| **Client State** | Zustand | 5.0.12 | Feed preferences (declared dep, minimal usage) |
| **Animation** | Framer Motion | 12.38.0 | Page transitions (declared dep, not currently imported) |
| **Icons** | Lucide React | 1.7.0 | Consistent icon set |
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

The frontend was simplified significantly between v4 and v5. Pages dropped: `/compare`, `/digest`, `/checkout`, `/checkout/confirmation`, `/account`, `/forgot-password`, `/forgot-password/sent`, `/reset-password`, `/methodology`, `/enterprise`, `/unauthorized`, `/journey/[clusterId]`, and all `/mockups/*`. The current route map covers 7 pages:

| Route | File | Component Type | Rendering | Auth Required | ISR Interval | Notes |
|---|---|---|---|---|---|---|
| `/` | `page.tsx` | Client | CSR | No | — | MaxQ flight-deck homepage; data via `useHomepage()`, `useStats()`, `useTrendingTopics()` (405 lines) |
| `/story/[clusterId]` | `story/[clusterId]/page.tsx` | Client | CSR | No | — | Story detail with articles, timeline, FDI breakdown (493 lines) |
| `/briefing` | `briefing/page.tsx` | Server (async) | ISR | No | 1800s | AI briefing page; fetches backend directly, `revalidate = 1800` (95 lines) |
| `/search` | `search/page.tsx` | Client | CSR | No | — | Discovery search with trending topics (103 lines) |
| `/pricing` | `pricing/page.tsx` | Client | CSR | No | — | Free / Pro ($49/mo) / Enterprise tier cards (118 lines) |
| `/login` | `login/page.tsx` | Client | CSR | No | — | Split-panel auth layout |
| `/register` | `register/page.tsx` | Client | CSR | No | — | Registration with password validation |

### 2.2 State Management

**Server State — TanStack React Query v5** (`src/lib/providers.tsx`):

Default config: `staleTime: 60_000` (60s), `refetchOnWindowFocus: false`, `retry: 1`. All server state flows through BFF API routes via hooks in `src/hooks/useStories.ts`:

| Hook | Query Key | Stale Time | Data Source |
|---|---|---|---|
| `useHomepage()` | `["homepage"]` | 30s | `GET /api/homepage` |
| `useStories(params)` | `["stories", params]` | 60s (default) | `GET /api/stories` |
| `useStory(id)` | `["story", id]` | 60s (default) | `GET /api/stories/{id}` |
| `useStats()` | `["stats"]` | 30s | `GET /api/stats` |
| `useSearchDiscover(q)` | `["search", q, page, limit]` | 60s | `GET /api/search` (min 2 chars) |
| `useTrendingTopics()` | `["trendingTopics"]` | 5 min | `GET /api/search/trending-topics` |

**Auth State — React Context** (`src/lib/auth-context.tsx`):

`AuthProvider` manages `user`, `isAuthenticated`, `isLoading`, `login()`, `register()`, `logout()`, `refreshSession()`. Access tokens stored in memory only via `src/lib/auth-tokens.ts` (module-scope variable — never persisted). Refresh tokens live in HttpOnly cookie managed by BFF. On mount, `AuthProvider` attempts silent session restore via `POST /api/auth/refresh`. The `refreshAccessToken()` function in `auth-tokens.ts` deduplicates concurrent refresh callers via a shared promise — preventing race conditions when multiple components trigger 401 recovery simultaneously.

**URL State:** Search query via `?q=` on search page; no other URL state patterns currently in use.

### 2.3 Design System — MaxQ

The design system was migrated from "Navy Standard" (editorial serif, warm ivory backgrounds) to "MaxQ" (dark flight-deck, monospace-first typography) between v4 and v5. Defined in `src/app/globals.css` (410 lines).

**@theme Token Block** — defines all design tokens as CSS custom properties:

| Category | Tokens | Examples |
|---|---|---|
| **Core Palette** | `--color-bg`, `--color-surface`, `--color-surface-alt`, `--color-card`, `--color-border`, `--color-border-hover`, `--color-accent` | `#0a0e17`, `#0d1219`, `#111820`, `#38bdf8` |
| **Semantic Colors** | `--color-green`, `--color-amber`, `--color-red` + dim variants | `#22c55e`, `#f59e0b`, `#ef4444` |
| **Political Lean** | `--color-left`, `--color-right`, `--color-center` | `#3b82f6`, `#ef4444`, `#6a7a94` |
| **Divergence** | `--color-diverge-low`, `--color-diverge-mod`, `--color-diverge-high`, `--color-diverge-ext` | `#22c55e`, `#f59e0b`, `#ef4444`, `#dc2626` |
| **Typography** | `--font-family-mono`, `--font-family-sans` | SF Mono stack, Inter stack |
| **Spacing** | `--navbar-height`, `--max-width`, `--radius-sm`, `--radius-md` | `54px`, `1200px`, `3px`, `3px` |

**ns-\* Class System** — 35+ namespaced utility classes:

- **Layout:** `ns-container` (max-width 1200px, 24px padding)
- **Cards:** `ns-card` (dark surface), `ns-card-bordered` (border + hover effect)
- **Buttons:** `ns-btn`, `ns-btn-primary` (accent bg), `ns-btn-outline` (accent border), `ns-btn-outline-dark` (muted border), size variants (`ns-btn-sm`, `ns-btn-lg`, `ns-btn-full`)
- **Inputs:** `ns-input` (dark surface, accent focus ring)
- **Badges:** `ns-badge`, `ns-badge-breaking` (red), `ns-badge-fractured` (red), `ns-badge-category` (accent monospace)
- **Divergence:** `ns-div-dot-{low,moderate,high,extreme}`, `ns-div-text-{low,moderate,high,extreme}`
- **Lean:** `ns-lean-{left,right,center}`, `ns-lean-dot-{left,right,center}`
- **Navigation:** `ns-navbar` (54px, sticky, dark surface), `ns-navbar-inner`, `ns-nav-link` (monospace, accent active)
- **Data:** `ns-feed-row`, `ns-trend-pill` (monospace, 3px radius)
- **Loading:** `ns-skeleton` with `ns-shimmer` keyframe animation
- **Auth:** `ns-auth-layout` (45/55 split grid), `ns-auth-left`, `ns-auth-right`, `ns-auth-form`
- **Score:** `ns-score-bar-track` (4px), `ns-score-bar-fill`
- **Footer:** `ns-footer` (dark surface with border-top)

**Backward-Compatibility Aliases:** `:root` block re-declares tokens as un-prefixed CSS variables (`--bg`, `--surface`, `--accent`, etc.) for components using the `C = { ... }` inline constant pattern.

**Deviation Pattern — Inline `C` Constants:** Most page components (`page.tsx`, `StoryCard.tsx`, `Navbar.tsx`, `Footer.tsx`) define a local `const C = { bg: '#0a0e17', ... }` object with hardcoded hex colors rather than referencing `@theme` tokens. While the values match, this creates a maintenance risk — if the palette changes, every `C` declaration must be updated manually.

### 2.4 BFF API Routes

All routes in `src/app/api/` — the Backend-for-Frontend layer.

**Shared Infrastructure** (`src/app/api/_lib/backend.ts`, 151 lines):

Central `backendFetch<T>()` helper prefixing `BACKEND_URL` (default: `http://localhost:4000/api/v1`). Custom `BackendError` class propagates status codes. Seven transform functions (`transformSource()`, `transformArticle()`, `transformCluster()`, `transformDivergenceIndex()`, `transformHomepageResponse()`, `transformStoryDetail()`, `transformStats()`) convert backend shapes to frontend type contracts in `src/types/index.ts`.

**Auth Helpers** (`src/app/api/auth/_helpers.ts`, 71 lines):

`setRefreshCookie()` / `clearRefreshCookie()` manage HttpOnly `fracture_rt` cookie (7-day maxAge, `sameSite: lax`, `path: /api/auth`, `secure` in production). `authBackendPost()` / `authBackendGet()` wrap NestJS auth calls. `authResponse()` sets cookie on response. `clearAndReturn()` clears cookie on logout/failure.

| Route | Method | Purpose | External Service | Cache | Error Handling |
|---|---|---|---|---|---|
| `/api/homepage` | GET | Homepage: hero + trending + fractured + latest | NestJS | React Query 30s staleTime | `BackendError` → 502; generic → 500 |
| `/api/stories` | GET | Paginated story clusters (page, limit, search) | NestJS | React Query 60s staleTime | `BackendError` → 502; generic → 500 |
| `/api/stories/[id]` | GET | Full cluster detail with articles + narrative data | NestJS | React Query 60s staleTime | 404 on missing; `BackendError` → 502 |
| `/api/search` | GET | Discovery search (q, page, limit; min 2 chars) | NestJS → ES | React Query 60s staleTime | `BackendError` → 502 |
| `/api/search/trending-topics` | GET | Trending topic keywords | NestJS | React Query 5 min staleTime | Empty array on error |
| `/api/stats` | GET | activeStories, avgDivergence, sourcesTracked | NestJS | React Query 30s staleTime | `BackendError` → 502 |
| `/api/auth/login` | POST | Proxy login → NestJS; set refresh cookie | NestJS | None | Forward backend status |
| `/api/auth/register` | POST | Proxy register → NestJS; set refresh cookie | NestJS | None | Forward backend status |
| `/api/auth/refresh` | POST | Read HttpOnly cookie → NestJS refresh → rotate cookie | NestJS | None | Clear cookie on failure (401) |
| `/api/auth/logout` | POST | Best-effort backend logout; clear cookie | NestJS | None | Always clears cookie (204) |
| `/api/auth/me` | GET | Proxy profile request with Bearer token | NestJS | None | Forward backend status |

**Removed since v4:** `/api/brief/[clusterId]` (Groq integration), `/api/stocks` (Yahoo Finance), `/api/markets/polymarket`, `/api/markets/kalshi`, `/api/upgrade` (mock payment), `/api/auth/sso/callback`.

---

## 3. Backend Architecture

### 3.1 NestJS Module Structure

Seven feature modules registered in `app.module.ts` (139 lines), plus global infrastructure:

**Infrastructure Layer:**
- `ConfigModule` — 7 config namespaces: `app`, `database`, `redis`, `elasticsearch`, `bullmq`, `ingestion`, `imagePipeline`
- `TypeOrmModule` — `autoLoadEntities: true`, `synchronize: true` when `NODE_ENV === 'development'` (**⚠️ never safe for production**)
- `ElasticsearchModule` — single-node cluster
- `BullModule` — Redis-backed job queues (3 queues)
- `ThrottlerModule` — configurable TTL/limit (default 100 req / 60s, flat — not per-tier)
- `ScheduleModule` — cron-based task scheduling

**Global Guards:** `JwtAuthGuard` (all routes require JWT unless `@Public()`), `ThrottlerGuard`
**Global Filter:** `HttpExceptionFilter`
**Global Interceptors:** `LoggingInterceptor`, `TimeoutInterceptor`

| Module | Key Services | Responsibility |
|---|---|---|
| **Articles** | `ArticlesService`, `SourceSeederService` | Article + Source CRUD, 14-source seeding on boot |
| **Ingestion** | `IngestionService`, `IngestionScheduler`, RSS/NewsAPI adapters | 10-min cron → 3-stage dedup → BullMQ enqueue |
| **Narrative** | 14 services + `NarrativeProcessor` | Sentiment, bias, framing, clustering, FDI, ranking, snapshots, discovery, homepage, stats, trends, OG image generation |
| **Search** | `SearchService` | Elasticsearch full-text, autocomplete, faceted filtering, admin re-index |
| **Auth** | `AuthService`, `JwtStrategy`, `JwtAuthGuard` | JWT auth, bcrypt hashing, refresh token rotation with tamper detection, 5 RBAC roles |
| **Image Pipeline** | 8 services + `ImagePipelineProcessor` | Image retrieval, AI generation, relevance scoring, storage |
| **Health** | `HealthService` | PostgreSQL, Redis, Elasticsearch ping checks (entirely `@Public()`) |

### 3.2 RSS Ingestion and FDI Computation Pipeline

**Source Seeding** (`source-seeder.service.ts`): `SourceSeederService` runs on `@OnApplicationBootstrap`. Upserts 14 hardcoded sources by slug with lean priors, tiers, and metadata.

**Ingestion Flow:**
1. `IngestionScheduler` fires every 10 minutes (`@Cron('0 */10 * * * *')`), toggle via `ingestion.schedulerEnabled`
2. `IngestionService.fetchAndEnqueueAll()` iterates active sources; RSS adapter if `rssFeedUrl` present, NewsAPI fallback
3. 3-stage dedup: URL canonicalization → exact headline match (24h) → SimHash (Hamming ≤ 3)
4. Surviving articles → BullMQ `ingestion` queue (3 attempts, exponential backoff)
5. `narrative` queue: per-article analysis (sentiment, bias, framing, clustering, FDI)
6. `image-pipeline` queue: context extraction → Unsplash/Openverse → OpenAI embedding scoring → DALL-E 3 fallback

**FDI Computation** (⚠️ INFERRED from BFF transform layer + v3/v4 docs):

| Sub-Metric | Key | Weight | Measures |
|---|---|---|---|
| Headline Tone | `headlineSentimentSpread` | 25% | Spread of headline sentiment across outlets |
| Framing Approach | `framingTypeEntropy` | 20% | Shannon entropy of framing type distribution |
| Entity Portrayal | `entityFramingDivergence` | 20% | How differently outlets portray key entities |
| Language Similarity | `linguisticEmbeddingSpread` | 15% | Embedding-space distance of article language |
| Source Selection | `sourceSelectionVariance` | 10% | Variance in cited sources across outlets |
| Structural Difference | `structuralDivergence` | 10% | Length, quote usage, organization differences |

Result: 0–100 per cluster on `StoryCluster.divergenceScore`. `isFractured = true` when FDI ≥ 40 AND sourceCount ≥ 2.

### 3.3 PostgreSQL Schema — Core Entities

| Entity | Table | Key Fields |
|---|---|---|
| **Source** | `sources` | UUID, `name`, `slug` (unique), `rssFeedUrl`, `tier` (4 tiers), `politicalLeanPrior` (−1.0 to +1.0), `reliabilityScore`, `country`, `region`, `isActive` |
| **Article** | `articles` | UUID, `sourceId` (FK), `storyClusterId` (FK), `title`, `summary`, `content`, `url` (unique), `publishedAt`, `politicalLeanScore`, `headlineSentiment`, `bodySentiment`, `framingType`, `simhash`, 20+ annotation fields |
| **StoryCluster** | `story_clusters` | UUID, `topic`, `summary`, `topicKeywords` (jsonb), `status` (BREAKING/ACTIVE/ARCHIVED), `articleCount`, `sourceCount`, `divergenceScore`, `velocityScore`, `isFractured`, `topicCategory`, `imageUrl` |
| **TrendSignal** | `trend_signals` | UUID, `keyword`, `source`, `trendScore`, `detectedAt` |
| **User** | `users` | UUID, `email` (unique), `passwordHash`, `displayName`, `role` (5 roles), `isActive`, `refreshTokenHash` |

### 3.4 Redis Usage

Single Redis instance (redis:7-alpine, 256 MB, `allkeys-lru`) serves dual purposes:

| Purpose | Implementation |
|---|---|
| **BullMQ Job Queues** | 3 queues: `ingestion` (batch, 3 retries), `narrative` (single, 3 retries), `image-pipeline` (single/batch/cluster, 2 retries) |
| **Rate Limiting** | `@nestjs/throttler` counters (100 req / 60s, global) |

**⚠️ Risk:** `allkeys-lru` means BullMQ job data can be evicted under memory pressure, causing silent job loss.

### 3.5 Elasticsearch

Single-node cluster (`discovery.type=single-node`, xpack security disabled, 512 MB heap). Articles indexed with full-text fields, facets, and metadata. Discovery search via `NarrativeController.discover()`. Admin re-index via `POST /search/reindex`.

### 3.6 AI Integrations

**Groq API — Fracture Brief** (⚠️ INFERRED — BFF route removed in v5 frontend, but backend likely retains capability):
- Model: `llama-3.1-8b-instant`, `max_tokens: 600`, `temperature: 0.4`
- System prompt: Wire-service editor voice — core facts, coverage divergence, what to watch

**OpenAI — Image Pipeline:**
- Embeddings for candidate image relevance scoring via cosine similarity
- DALL-E 3 fallback generation when retrieval yields no match
- Primary sourcing from Unsplash and Openverse APIs

---

## 4. Key Data Flows

### 4.1 Story Lifecycle

```
1. RSS POLL (10-min cron)
   IngestionScheduler → IngestionService.fetchAndEnqueueAll()
   → RSS adapter fetches 14 sources concurrently
   → 3-stage dedup: URL canonical → headline match (24h) → SimHash (≤3)

2. INGEST
   → Surviving articles → BullMQ `ingestion` queue
   → Batch processor persists to PostgreSQL `articles` table

3. NARRATIVE ANALYSIS
   → `narrative` queue: per-article processing
   → Sentiment, bias scoring, framing detection, clustering
   → Assign to existing or new StoryCluster

4. FDI COMPUTATION
   → 6 sub-metrics across cluster articles → weighted composite
   → `divergenceScore` persisted on StoryCluster
   → `isFractured` flag set when FDI ≥ 40 && sourceCount ≥ 2

5. IMAGE PIPELINE
   → `image-pipeline` queue: context extraction
   → Unsplash/Openverse retrieval → OpenAI embedding relevance scoring
   → DALL-E 3 fallback → local/S3 storage

6. FRONTEND RENDER
   → BFF transforms backend response → TanStack Query caches
   → React components render with MaxQ design system
```

### 4.2 Auth Flow

```
1. REGISTER
   → Client POST /api/auth/register (BFF)
   → BFF proxies to NestJS POST /api/v1/auth/register
   → NestJS: lowercase email, conflict check, bcrypt hash (12 rounds)
   → Create user with role='free', generate JWT pair
   → BFF: strip refreshToken, set HttpOnly cookie (fracture_rt, 7d)
   → Return { accessToken, expiresIn, user }
   → Client stores accessToken in memory (auth-tokens.ts)

2. LOGIN — Same flow via POST /api/auth/login

3. SESSION RESTORE (on mount)
   → AuthProvider calls POST /api/auth/refresh
   → BFF reads HttpOnly cookie → sends refreshToken to NestJS
   → NestJS: verify JWT, bcrypt-compare against stored hash
   → Hash mismatch = token replay → revoke all tokens, throw 401
   → Success: rotate tokens, BFF rotates cookie

4. TIER ASSIGNMENT
   → role in JWT payload → frontend AuthContext
   → isPaidTier() / isEnterpriseTier() drive UI rendering
   → tierLabel() provides display strings
```

### 4.3 Conversion Funnel

```
1. STORY → PRICING
   → User reads free content on homepage or story page
   → Pricing page shows Free ($0), Pro ($49/mo), Enterprise (custom)
   → Pro CTA → /checkout?plan=pro-monthly
   → Enterprise CTA → /enterprise

2. ⛔ BROKEN STEPS:
   → No /checkout page exists (removed in simplification)
   → No /enterprise page exists (removed in simplification)
   → No payment processing (MockPaymentForm removed)
   → No backend endpoint to upgrade user role
   → Pricing page links are dead ends
```

### 4.4 Real-Time Data

| Data Feed | Source | Refresh | Implementation |
|---|---|---|---|
| **Fracture Briefing** | NestJS backend (server-side) | ISR 1800s (30 min) | `src/app/briefing/page.tsx` fetches directly from backend |
| **Homepage Feed** | NestJS → PostgreSQL | TanStack Query 30s staleTime | `useHomepage()` → `GET /api/homepage` |
| **Story Detail** | NestJS → PostgreSQL | TanStack Query 60s staleTime | `useStory()` → `GET /api/stories/{id}` |
| **RSS Ingestion** | 14 RSS feeds | NestJS cron 10 min | `backend/src/ingestion/ingestion.scheduler.ts` |

**Removed since v4:** Stock ticker (Yahoo Finance), prediction markets (Polymarket/Kalshi), per-story Fracture Brief (Groq BFF route).

---

## 5. Security

### 5.1 Authentication and Authorization

**JWT Architecture:**
- Access tokens: 15-minute expiry, HS256 signing
- Refresh tokens: 7-day expiry, bcrypt-hashed storage on User entity
- Refresh token rotation with tamper detection — hash mismatch triggers full revocation
- Global `JwtAuthGuard` on all backend routes; `@Public()` decorator bypasses

**RBAC System:**
- 5 roles: `free`, `pro`, `analyst`, `enterprise`, `admin` (ascending privilege)
- `@Roles()` decorator on controller methods; `RolesGuard` validates
- Frontend `isPaidTier()`, `isEnterpriseTier()`, `tierLabel()` in `src/lib/tierUtils.ts`

**⚠️ CRITICAL — Tier Gate Enforcement:**

The narrative API endpoints (`GET /api/v1/narrative/cluster/{id}`, `homepage`, `stats`, `stories`, `discover`, `trending`, `trending-topics`) are all decorated `@Public()`. The backend returns full cluster detail — including all divergence sub-metrics, narrative frames, headline comparison, and timeline data — to **any caller regardless of authentication or role**. A user can bypass all frontend tier gates by calling the BFF or NestJS API directly. **The backend does not enforce tier-based data segmentation.**

### 5.2 Secrets Management

| Secret | Location | Risk |
|---|---|---|
| `JWT_SECRET` | Backend `.env` | Server-only ✅ |
| `DB_PASSWORD` | Backend `.env` | Server-only ✅ |
| `OPENAI_API_KEY` | Backend `.env` | Server-only ✅ |
| `UNSPLASH_ACCESS_KEY` | Backend `.env` | Server-only ✅ |
| `NEWSAPI_KEY` | Backend `.env` | Server-only ✅ |
| `BACKEND_URL` | Frontend `.env.local` | Server-only (no `NEXT_PUBLIC_` prefix) ✅ |

No secrets are exposed to the browser. The BFF pattern ensures `BACKEND_URL` stays server-side.

### 5.3 Input Validation

**Backend:** `ValidationPipe` globally applied — `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`. DTOs use `class-validator` decorators.

**Frontend:** No `safeReturnUrl()` function found in current codebase (the pages that previously used it — checkout, confirmation — have been removed). The login and register pages should be verified for open-redirect prevention.

**Rate Limiting:** Global `@nestjs/throttler` — 100 req / 60s, flat (not per-tier or per-endpoint).

---

## 6. Performance and Scalability

### 6.1 Bundle Concerns

The v5 simplification significantly reduced bundle risk. No page exceeds 500 lines:

| Component | Lines | Status |
|---|---|---|
| `story/[clusterId]/page.tsx` | 493 | Largest page — single client component; candidate for splitting |
| `page.tsx` (homepage) | 405 | Acceptable — single view, no conditional paths |
| `Navbar.tsx` | 455 | Includes UserAvatar, mobile drawer, all auth states |
| All other pages | < 150 each | No concern |

v4's 1,000+ line components (`digest`: 1,602, `story`: 1,493, `account`: 1,089, `compare`: 1,059) have been removed or rewritten. **This is a major improvement.**

**Third-party weight:** `framer-motion` (12.38.0) is declared as a dependency but not currently imported by any page or component — candidate for removal. `zustand` (5.0.12) is in dependencies but only used minimally. `yahoo-finance2` was removed (no longer in package.json).

### 6.2 Caching Effectiveness

| Layer | Strategy | Interval | Coverage |
|---|---|---|---|
| **Next.js ISR** | Route-level `revalidate` | 30 min (briefing page only) | Server-rendered AI content |
| **TanStack Query** | `staleTime` per hook | 30s (homepage, stats), 60s (stories, search), 5 min (trending) | All server state |
| **Redis** | BullMQ job data + throttle counters | LRU eviction at 256 MB | Queue reliability + rate limiting |

**Gap:** No server-side caching for the NestJS homepage endpoint. A Redis cache here would reduce PostgreSQL load for the highest-traffic route.

### 6.3 Current Bottlenecks

1. **Single Redis instance** — BullMQ queues (persistence-required) and rate-limit counters (ephemeral) share one `allkeys-lru` Redis
2. **TypeORM `synchronize: true`** — Auto-syncs schema in development; dangerous if entity definitions change
3. **NestJS monolith** — CPU-intensive narrative analysis competes with HTTP request handling on the same event loop
4. **`SourceSeederService` on every boot** — 14 upserts on every start; should be a migration
5. **Turbopack dev server memory** — Known OOM issue; mitigated with `NODE_OPTIONS='--max-old-space-size=4096'` in package.json `dev` script

### 6.4 Scaling Path — What Breaks at 10× Load

| Current | 10× Issue | Mitigation |
|---|---|---|
| 14 RSS sources | 140 sources → ingestion queue overwhelmed | Priority partitioning; dedicated Redis |
| Single PostgreSQL | Read-heavy narrative queries contend with writes | Read replicas |
| Single Redis (256 MB) | Queue data evicted under load | Separate Redis for queues vs. cache |
| NestJS monolith | CPU-bound analysis blocks HTTP | Extract worker service |
| Elasticsearch single-node | Index growth; query latency | Multi-node cluster |

---

## 7. What Is Working Well

1. **`TERMINOLOGY_CONSTANTS.ts` — Single Source of Truth** (`src/lib/TERMINOLOGY_CONSTANTS.ts`, 168 lines). Every divergence threshold (Low ≤29, Moderate ≤59, High ≤79, Extreme 80–100), severity tier, lean category, FDI label, color mapping, and divergence dot/text class is defined once. Helper functions (`severityTier()`, `divergenceLabel()`, `getDivergenceColor()`, `divDotClass()`, `divTextClass()`, `leanCategory()`, `leanColor()`, `categoryLabel()`) ensure threshold logic is never duplicated. The `LABELS` object provides all score names, sub-metric labels, status strings, category mappings, and nav items as a typed const.

2. **BFF API Route Pattern** (`src/app/api/_lib/backend.ts`, 151 lines). Seven transform functions cleanly decouple backend response shapes from frontend type contracts. `transformCluster()` handles nullable fields with `??` defaults; `transformDivergenceIndex()` maps the backend's `biasSpread` to the frontend's `entityFramingDivergence`. The `BackendError` class propagates HTTP status codes correctly. This means either system can evolve independently — the transform layer absorbs breaking changes.

3. **Auth Token Architecture** (`src/lib/auth-tokens.ts` + `src/app/api/auth/_helpers.ts`). Access tokens stored in memory only (module-scope variable) — never localStorage, never cookies accessible to JS. Refresh tokens in HttpOnly cookies with `sameSite: lax`, `path: /api/auth`, `secure` in production. The `refreshAccessToken()` function deduplicates concurrent callers via a shared promise — a subtle but critical detail that prevents multiple 401 responses from triggering parallel refresh races.

4. **Refresh Token Rotation with Tamper Detection** (backend `AuthService`). On every refresh, the backend bcrypt-compares the presented token against stored hash. Hash mismatch (stolen token replayed after rotation) → revoke all tokens for user + warning log. This detects and mitigates token theft.

5. **ISR for AI Content** (`src/app/briefing/page.tsx`, `revalidate = 1800`). The briefing page is server-rendered with 30-minute ISR. First visitor triggers server-side fetch; subsequent visitors get instant static HTML until revalidation. This is the correct pattern for AI-generated content that doesn't need real-time freshness.

6. **Simplified Component Architecture** (`src/components/ui.tsx`, 135 lines). Shared UI primitives — `CategoryBadge`, `DivergenceBadge`, `StatusBadge`, `SourcePill`, `SkeletonCard`, `SkeletonLine`, `formatTimeAgo` — all import from `TERMINOLOGY_CONSTANTS.ts` and use `ns-*` CSS classes. This ensures every badge and indicator across every page renders identically.

7. **MaxQ Design System via CSS-Only `@theme`** (`src/app/globals.css`). 410 lines of CSS provides cards, buttons, badges, inputs, navigation, loading states, score bars, and auth layouts — replacing what would typically require a component library. The `ns-*` naming convention prevents collision with Tailwind utilities. The `@theme` block makes all tokens available to Tailwind's `bg-`, `text-`, `border-` utilities automatically.

8. **`AppChrome` Layout Pattern** (`src/components/AppChrome.tsx`). Clean conditional layout: auth routes (`/login`, `/register`) render without Navbar/Footer; all other routes get the full chrome. This avoids the antipattern of every page importing layout components individually.

9. **Graceful Backend Error Handling in BFF Routes**. Every API route wraps backend calls in try/catch with `BackendError` → 502 mapping. The trending-topics route returns `[]` on any error — never throws. The briefing page's `fetchBriefing()` returns `null` on failure. This means the frontend never shows raw 500 errors to users.

10. **Structural Simplification from v4 → v5**. The page count dropped from 20+ to 7 pages. Component count dropped from 40+ to 12. Lines of CSS dropped from 733 to 410. The story page dropped from 1,493 to 493 lines. This is a significant reduction in surface area for bugs and maintenance burden — a correct prioritization of depth over breadth.

---

## 8. What Needs Improvement

### CRITICAL

**C1 — No Real Payment Processing.** The pricing page (`src/app/pricing/page.tsx`) links Pro to `/checkout?plan=pro-monthly` and Enterprise to `/enterprise` — neither route exists. The `MockPaymentForm`, `/api/upgrade` endpoint, and checkout pages from v4 were removed in the simplification. Revenue is impossible. Requires: Stripe Elements frontend, `PATCH /api/v1/auth/role` backend endpoint, Stripe webhook handler, `/checkout` page rebuild.

**C2 — Client-Side-Only Tier Gate Enforcement.** All narrative endpoints are `@Public()`. `GET /api/v1/narrative/cluster/{id}` returns full FDI sub-metrics, narrative frames, headline comparison, and timeline to any caller. The `isPaidTier()` checks in `tierUtils.ts` are frontend-only. A `curl` call bypasses all gates. Backend must split responses by caller role or add `@Roles()` guards.

**C3 — TypeORM `synchronize: true`.** `app.module.ts` line 62: `synchronize: config.get<string>('app.nodeEnv') === 'development'`. In development mode, TypeORM auto-syncs entity definitions to schema on every boot. Renamed/removed entity properties can drop columns with production data. Must switch to migration-based schema management.

**C4 — No Automated Tests.** Backend has Jest infrastructure but only boilerplate `app.controller.spec.ts`. No tests for: auth flow, FDI computation, ingestion pipeline, any BFF route. Frontend has no test runner. Zero coverage on critical paths.

**C5 — No Error Monitoring.** No Sentry, Datadog, or equivalent. Frontend errors fail silently. Backend logs to stdout only. The briefing page's `fetchBriefing()` catches errors and returns null — with no reporting.

### HIGH

**H1 — Pricing Page Dead Links.** Pro plan links to `/checkout?plan=pro-monthly` (404). Enterprise links to `/enterprise` (404). These are user-facing broken links on a monetization-critical page.

**H2 — Inline `C` Constants Bypass Design System.** Every page defines `const C = { bg: '#0a0e17', surface: '#0d1219', ... }` with hardcoded hex values instead of referencing `@theme` tokens. Files: `page.tsx`, `search/page.tsx`, `story/[clusterId]/page.tsx`, `pricing/page.tsx`, `briefing/page.tsx`, `StoryCard.tsx`, `Footer.tsx`. If the palette changes, 7+ files need manual updates.

**H3 — Homepage Defines Local Divergence Helpers.** `page.tsx` defines `fdiColor()`, `fdiBg()`, `getDivergenceLevel()` with hardcoded thresholds instead of using `getDivergenceColor()` and `severityTier()` from `TERMINOLOGY_CONSTANTS.ts`. Same pattern in `StoryCard.tsx`. Thresholds can drift.

**H4 — Single Redis for Queue + Cache.** One Redis instance (256 MB, `allkeys-lru`) handles BullMQ job queues and rate limiting. LRU can evict pending job data under memory pressure. Production needs separate instances.

**H5 — `SourceSeederService` on Every Boot.** 14 sources upserted from hardcoded data on every application start. Conflates application code with seed data. Should be a migration or seed script.

**H6 — `framer-motion` Unused Dependency.** Declared in `package.json` (`^12.38.0`) but not imported by any component. Adds to `node_modules` size and install time. Should be removed if unused.

### MEDIUM

**M1 — No CI/CD Pipeline.** No GitHub Actions, no automated build/test/deploy. Both packages have `build` scripts but deployment is manual.

**M2 — Missing Database Migration Strategy.** No TypeORM migrations configured, no `migrations/` directory, no `typeorm-cli` config.

**M3 — Terms of Service / Privacy Policy Placeholders.** Footer (`Footer.tsx`) links to `/privacy` and `/terms` — neither page exists. Legal requirement before public launch.

**M4 — CORS Allows `localhost:3000` and `localhost:3002` in Dev.** Backend `main.ts` allows `localhost:3000`, `127.0.0.1:3000`, `localhost:3002` but not `localhost:3001` — the port used by the VSCode task and `dev` script. This may cause auth cookie issues in development.

**M5 — No `safeReturnUrl()` in Current Pages.** The login and register pages should validate `returnUrl` query params to prevent open-redirect attacks. The previous implementation was removed with the pages that used it.

**M6 — Briefing Page Fetches Backend Directly.** `briefing/page.tsx` calls `process.env.BACKEND_URL` directly instead of using the BFF `backendFetch()` helper, bypassing the transform layer and error handling infrastructure.

---

## 9. Future Features Roadmap

### HORIZON 1 — Complete the Core (0–60 Days)

| Feature | Why It Matters | Requirements | Complexity | Dependencies |
|---|---|---|---|---|
| **Stripe Integration** | Revenue blocked; pricing links are dead | Stripe Elements, `/checkout` page, `PATCH /api/v1/auth/role` backend, webhook handler, plan-to-role mapping | XL | Backend role-update endpoint |
| **Backend Tier Enforcement** | All paid data accessible via direct API calls | Split narrative responses by JWT role; add `@Roles()` to analytical endpoints; return free-tier subset for free callers | L | JWT middleware reading role |
| **Error Monitoring (Sentry)** | Silent failures undetectable in production | Sentry SDK in frontend + backend, source maps, error boundaries, alert rules | M | Sentry account |
| **Terms / Privacy Pages** | Legal requirement; footer links are dead | Static pages at `/terms` and `/privacy`, content creation | S | Legal review |
| **Database Migration Strategy** | `synchronize: true` is a data loss risk | TypeORM migration setup, initial baseline migration, CI migration step | M | — |
| **Fix CORS for Dev Port** | Dev auth cookies may fail on port 3001 | Add `localhost:3001` to CORS origin list in `main.ts` | XS | — |

### HORIZON 2 — Scale the Product (60–180 Days)

| Feature | Why It Matters | Requirements | Complexity | Dependencies |
|---|---|---|---|---|
| **Per-Story Fracture Brief** | Removed in simplification; core differentiating feature | Restore Groq BFF route, `FractureBrief` component, ISR caching | M | `GROQ_API_KEY` |
| **Real Divergence Timeline** | No temporal FDI data; limits analytical depth | Time-series FDI snapshots, API endpoint, chart component | L | Migration strategy |
| **Saved Stories & Reading History** | No engagement features; critical for retention | `saved_stories` + `reading_history` tables, API, UI components | M | Auth system |
| **Source Expansion (14 → 50+)** | 14 sources limits credibility | Admin source management, RSS discovery, lean estimation for new sources | L | Ingestion scaling |
| **Share Cards with OG Images** | No social sharing; limits growth | `next/og` for dynamic OG images, meta tags per story, share buttons | M | ISR route |
| **Real-Time Alerts (WebSocket/SSE)** | Breaking stories arrive with TanStack Query latency | NestJS `@WebSocketGateway`, BullMQ event listeners, notification UI | L | Redis Pub/Sub |
| **Password Reset Flow** | No recovery path for forgotten passwords | Email service (SendGrid/Resend), reset token generation, `/forgot-password` page | M | Email provider |

### HORIZON 3 — Enterprise Platform (6–12 Months)

| Feature | Why It Matters | Requirements | Complexity | Dependencies |
|---|---|---|---|---|
| **Public Fracture API** | Enterprise revenue; data-as-a-service | API key management, per-key rate limiting, usage metering, OpenAPI docs, developer portal | XL | Stripe tiers |
| **Enterprise Dashboard** | `/enterprise` link is dead; no multi-user features | Team model (orgs, members, roles), admin panel, shared workspace, SAML/SSO | XL | Auth overhaul |
| **Custom Source Lists** | Enterprise clients need domain-specific sources | Per-org source config, private RSS, custom lean priors, isolated pipelines | L | Multi-tenant arch |
| **Historical Archive Search** | All data is present-tense; no time-series querying | ES index lifecycle, date-range search, historical FDI charts, retention policy | L | ES scaling |
| **Bias Detection ML Model** | Replace heuristic scoring with learned model | Training pipeline, labeled corpus, model serving, A/B testing | XL | Data labeling |
| **Multimedia Analysis** | Text-only misses broadcast framing | Transcription (Whisper), multimedia ingestion, cross-modal clustering | XL | Ingestion overhaul |

---

## 10. Production Readiness Checklist

### SECURITY

| Item | Status | Evidence |
|---|---|---|
| Backend tier enforcement | ❌ NOT DONE | Narrative endpoints are `@Public()`; full data returned regardless of role |
| Secrets in env vars | ✅ DONE | All secrets via `.env`; no `NEXT_PUBLIC_` on sensitive keys |
| TypeORM `synchronize` off | ❌ NOT DONE | Enabled when `NODE_ENV === 'development'`; no production guard |
| Rate limiting | ⚠️ PARTIAL | Global 100 req/60s; flat — not per-tier |
| CORS configuration | ⚠️ PARTIAL | Production locked to `fracture.app`; dev missing port 3001 |
| Security headers | ✅ DONE | Helmet in `main.ts` |
| Refresh token rotation | ✅ DONE | bcrypt hashed; tamper detection with revocation |
| Open-redirect prevention | ⚠️ PARTIAL | `safeReturnUrl()` removed with checkout pages; login/register unverified |

### FUNCTIONALITY

| Item | Status | Evidence |
|---|---|---|
| Payment processing | ❌ NOT DONE | No checkout page, no Stripe, pricing links are 404s |
| Password reset email | ❌ NOT DONE | No forgot-password page exists; no email infrastructure |
| RSS sources ingesting | ✅ DONE | 14 sources seeded; 10-min cron |
| FDI pipeline stable | ✅ DONE | 14 narrative services; `divergenceScore` persisted |
| User registration/login | ✅ DONE | Full JWT + BFF + HttpOnly cookie flow |
| Search functional | ✅ DONE | Elasticsearch discovery with trending topics |

### RELIABILITY

| Item | Status | Evidence |
|---|---|---|
| Error monitoring | ❌ NOT DONE | No Sentry or equivalent |
| Uptime monitoring | ❌ NOT DONE | Health endpoint exists; no external monitor |
| Database backups | ❌ NOT DONE | Docker volume only |
| Redis persistence | ❌ NOT DONE | `allkeys-lru`; no RDB/AOF |
| Health checks | ✅ DONE | `HealthService` pings PG, Redis, ES |
| Graceful degradation | ⚠️ PARTIAL | BFF routes handle errors; no page-level error boundaries |

### LEGAL

| Item | Status | Evidence |
|---|---|---|
| Terms of Service | ❌ NOT DONE | Footer links to `/terms` (404) |
| Privacy Policy | ❌ NOT DONE | Footer links to `/privacy` (404) |
| GDPR data deletion | ❌ NOT DONE | No user data export/deletion endpoint |
| AI content disclosure | ⚠️ PARTIAL | Briefing page notes "Powered by Llama 3.1"; no per-content disclosure |

### PERFORMANCE

| Item | Status | Evidence |
|---|---|---|
| Large components code-split | ✅ DONE | All pages < 500 lines (major improvement from v4) |
| Core Web Vitals | ⚠️ PARTIAL | Skeleton states help LCP; no CWV measurement |
| Database indexes | ⚠️ PARTIAL | TypeORM auto-generates for unique/primary; no custom narrative query indexes |
| CDN for static assets | ❌ NOT DONE | No CDN; Next.js serves all assets |

---

## 11. Glossary

| Term | Definition |
|---|---|
| **FDI** | Fracture Divergence Index — composite 0–100 score from six weighted sub-metrics: headline tone (25%), framing approach (20%), entity portrayal (20%), linguistic similarity (15%), source selection (10%), structural difference (10%). Thresholds: Low 0–29, Moderate 30–59, High 60–79, Extreme 80–100. |
| **Story Cluster** | Group of articles from different outlets covering the same event, identified by `ClusteringService`. Entity: `StoryCluster` with `divergenceScore`, `topicKeywords`, `isFractured`, `velocityScore`. |
| **Source Spectrum** | Visualization showing where each outlet's coverage sits on the left–right lean scale (−1.0 to +1.0) for a specific story. |
| **Narrative Frames** | Editorial lenses outlets use: CONFLICT, HUMAN_INTEREST, ECONOMIC, MORAL, RESPONSIBILITY. Detected by `FramingDetectorService`. |
| **Lean** | Political lean — numeric −1.0 (left) to +1.0 (right). Sources have `politicalLeanPrior`; articles get computed `politicalLeanScore`. Thresholds: ≤−0.6 Far Left, ≤−0.2 Left-Leaning, ≤0.2 Center, ≤0.6 Right-Leaning, >0.6 Far Right. |
| **Fracture Brief** | AI-generated editorial summary per story cluster via Groq Llama 3.1 8B. Currently server-rendered on the `/briefing` page with 30-minute ISR. |
| **AnalysisGate** | Paywall component (removed in v5 simplification) that separated free from paid content via blur overlay + upgrade prompt. Concept still relevant for Horizon 1 restoration. |
| **MaxQ** | Fracture's current design system — dark flight-deck theme with monospace-first typography. Defined in `globals.css` via `@theme` tokens and `ns-*` CSS classes. Named for the moment of maximum dynamic pressure. |
| **BFF** | Backend-for-Frontend — the Next.js API route layer (`src/app/api/`) that proxies NestJS responses, manages auth cookies, and normalizes response shapes via transform functions in `backend.ts`. |
| **TodayStrip** | ⚠️ Removed in v5 — was a Bloomberg-style data bar. Concept may return. |
| **ISR** | Incremental Static Regeneration — Next.js serves static pages and regenerates in the background. Used for briefing page (30 min). |
| **ns-\* Classes** | Namespaced CSS class convention in MaxQ (e.g., `ns-card`, `ns-btn-primary`, `ns-div-dot-high`). Defined in `globals.css`. |

---

*End of SYSTEM_DESIGN_v5.md. This document supersedes all previous versions. Source of truth for the Fracture architecture as of April 2026.*
