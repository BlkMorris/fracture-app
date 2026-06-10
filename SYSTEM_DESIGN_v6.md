# FRACTURE — Comprehensive System Design & Product Audit v6

**Version:** 6.0  
**Date:** May 7, 2026  
**Status:** Current implemented-state review; supersedes `SYSTEM_DESIGN_v5.md` as the recommended baseline.

---

## 0. Executive Summary

Fracture is a real-time narrative intelligence application for discovering how different news outlets frame the same story. The core product object is a **Story Cluster**: a set of articles about the same event, enriched with source metadata, political-lean estimates, framing signals, sentiment scores, and a composite **Fracture Divergence Index (FDI)**. The current implementation is an early-product architecture made of a Next.js frontend/BFF and a NestJS backend monolith, backed by PostgreSQL, Redis/BullMQ, and Elasticsearch.

The app has a strong conceptual center: it does not merely aggregate headlines; it models **coverage divergence** as a domain metric. The backend contains meaningful pipeline boundaries for ingestion, narrative analysis, clustering, search indexing, and image enrichment. The frontend has a focused page set and a distinctive MaxQ-style visual language: dark editorial flight deck, red signal accent, condensed display typography, FDI badges, source-spectrum visualizations, and story-first navigation.

The biggest current gap is not conceptual; it is **contract drift and product surface mismatch**. Several older docs describe removed pages and removed paid-tier flows. The current frontend pricing page links to routes that do not exist (`/checkout`, `/enterprise`), authenticated navigation links to absent routes (`/account`, `/dashboard`), and footer/register legal links point to absent pages (`/privacy`, `/terms`). The recently fixed `/story/undefined` bug came from a backend/frontend response-shape mismatch; a similar risk remains in the server-rendered briefing page because it fetches the backend homepage directly rather than using the BFF transforms.

Overall maturity: **Early Product / Pre-Launch**. The analytical foundation is promising, the simplified UI is easier to reason about than prior versions, and the BFF pattern is the right architectural choice. Before a serious public launch, Fracture needs route/link hygiene, stable API contracts, migration strategy, production auth/payment decisions, observability, and test coverage around the ingestion-to-story pipeline and BFF transforms.

---

## 1. System at a Glance

### 1.1 Runtime Topology

```text
Browser
  │
  │ React 19 + Next.js App Router pages
  ▼
Next.js 16 frontend + BFF API routes
  │
  │ server-side fetch via BACKEND_URL
  ▼
NestJS 11 API monolith (/api/v1/*, port 4000)
  │
  ├── PostgreSQL 16: durable domain state
  ├── Redis 7: BullMQ queues + throttling infrastructure
  └── Elasticsearch 8.12: article search and autocomplete

Async flows:
RSS/News source fetch → ingestion queue → narrative queue → image-pipeline queue
```

### 1.2 Main Technologies

| Layer | Current Choice | Role |
|---|---|---|
| Frontend framework | Next.js 16.2.1 | App Router pages, BFF API routes, server-rendered briefing |
| UI runtime | React 19.2.4 | Client components and interaction |
| Server state | TanStack React Query 5.95.2 | Homepage, story, stats, search, trending-topic cache |
| Styling | TailwindCSS 4 + CSS variables | MaxQ design tokens and `ns-*` class system |
| Animation/icons | Framer Motion, Lucide React | Page/card motion and iconography |
| Backend framework | NestJS 11 | Modular monolith, DI, controllers, guards, interceptors |
| Persistence | PostgreSQL + TypeORM | Articles, sources, clusters, users, trend signals |
| Queueing | BullMQ + Redis | Ingestion, narrative analysis, image enrichment jobs |
| Search | Elasticsearch | Article full-text search, faceted filtering, autocomplete |
| Auth | JWT + bcrypt + Passport | Access/refresh tokens, role hierarchy, global auth guard |
| Local infra | Docker Compose | Postgres, Redis, Elasticsearch |

---

## 2. Repository Structure

```text
fracture-app/
  backend/              NestJS API, workers, domain services, entities
  frontend/             Next.js app, BFF routes, UI components, hooks
  docker-compose.yml    Local Postgres/Redis/Elasticsearch
  STARTUP.md            Local setup and operational guide
  SYSTEM_DESIGN_*.md    Historical design documents
  UX_AUDIT_*.md         Historical UX audits
```

### 2.1 Backend High-Level Structure

```text
backend/src/
  app.module.ts
  main.ts
  articles/             Article/source/cluster entities and article API
  auth/                 User entity, JWT auth, refresh-token flow
  common/               Decorators, filters, guards, interceptors, enums
  config/               App/database/Redis/Elasticsearch/BullMQ/pipeline config
  health/               Health endpoint
  image-pipeline/       Image retrieval, scoring, storage, generation, scheduler
  ingestion/            RSS/NewsAPI adapters, schedulers, ingestion workers
  narrative/            FDI, clustering, ranking, discovery, snapshots, workers
  search/               Elasticsearch indexing/search service
```

### 2.2 Frontend High-Level Structure

```text
frontend/src/
  app/                  Next.js pages, layouts, BFF API routes, global CSS
  components/           Shared UI, homepage, story, search, auth components
  hooks/                React Query data hooks
  lib/                  Providers, auth context, tier utilities
  types/                Frontend type contracts
```

---

## 3. Backend Architecture

### 3.1 NestJS Application Shell

The backend is a modular monolith. `AppModule` wires global infrastructure:

- `ConfigModule` with app, database, Redis, Elasticsearch, BullMQ, ingestion, and image-pipeline namespaces.
- `TypeOrmModule` with `autoLoadEntities: true` and `synchronize` enabled only in development.
- `ElasticsearchModule` for search indexing/querying.
- `BullModule` backed by Redis.
- `ThrottlerModule` for global request throttling.
- `ScheduleModule` for cron jobs.
- Global `JwtAuthGuard`, with `@Public()` used for public endpoints.
- Global `ThrottlerGuard`, `HttpExceptionFilter`, `LoggingInterceptor`, and `TimeoutInterceptor`.

`main.ts` adds Helmet, CORS, `/api/v1` prefixing, local static serving for generated/uploaded article images, and a strict `ValidationPipe` with whitelisting and non-whitelisted property rejection.

### 3.2 Feature Modules

| Module | Responsibility | Notes |
|---|---|---|
| `ArticlesModule` | CRUD/access for articles and source seeding | Also owns core news entities. |
| `AuthModule` | Register/login/refresh/profile/logout | Uses bcrypt and JWT; refresh token hash stored on user. |
| `HealthModule` | Basic service health | Root health endpoint excluded from `/api/v1`. |
| `IngestionModule` | Source fetch, parsing, deduplication, image validation | Enqueues narrative and image jobs after persistence. |
| `NarrativeModule` | Sentiment, framing, bias scoring, clustering, FDI, ranking, discovery | Core differentiating domain module. |
| `SearchModule` | Elasticsearch index lifecycle and queries | Indexes articles, supports full-text/faceted search. |
| `ImagePipelineModule` | Image context/retrieval/relevance/generation/storage | Can process single article or batch jobs. |

### 3.3 Backend API Surface

Public narrative endpoints include:

| Endpoint | Purpose |
|---|---|
| `GET /api/v1/narrative/homepage` | Ranked homepage data: hero, trending, fractured, latest articles. |
| `GET /api/v1/narrative/stories` | Paginated recent clusters, with pseudo-story fallback from recent articles. |
| `GET /api/v1/narrative/cluster/:id` | Story detail with articles, divergence, headlines, timeline/frames where available. |
| `GET /api/v1/narrative/discover` | Discovery/search-style narrative results. |
| `GET /api/v1/narrative/trending-topics` | Trending topic labels/keywords. |
| `GET /api/v1/narrative/stats` | Platform summary stats. |
| `GET /api/v1/narrative/cluster/:id/snapshot(.svg/.png)` | Shareable story snapshot data/images. |

Operational endpoints include:

| Endpoint | Purpose |
|---|---|
| `POST /api/v1/ingestion/run` | Manual ingestion cycle. |
| `POST /api/v1/ingestion/fetch-all` | Fetch all active sources. |
| `POST /api/v1/ingestion/fetch/:slug` | Fetch one source. |
| `GET /api/v1/ingestion/queue-stats` | Ingestion queue counts. |
| `POST /api/v1/narrative/analyse/:id` | Queue one article for narrative analysis. |
| `POST /api/v1/narrative/analyse-all` | Queue articles needing analysis. |
| `GET /api/v1/narrative/queue-stats` | Narrative queue counts. |
| `POST /api/v1/image-pipeline/run` | Run image pipeline batch. |
| `POST /api/v1/image-pipeline/enqueue` | Enqueue image batch job. |
| `POST /api/v1/image-pipeline/enqueue/:articleId` | Enqueue image job for one article. |
| `GET /api/v1/image-pipeline/stats` | Image pipeline stats. |
| `GET /api/v1/image-pipeline/queue-status` | Image queue counts. |

Auth endpoints:

| Endpoint | Purpose |
|---|---|
| `POST /api/v1/auth/register` | Create free user and return tokens. |
| `POST /api/v1/auth/login` | Login and return tokens. |
| `POST /api/v1/auth/refresh` | Rotate/reissue tokens from refresh token. |
| `GET /api/v1/auth/profile` | Current authenticated user. |
| `POST /api/v1/auth/logout` | Revoke stored refresh token hash. |

### 3.4 Async Pipeline

The ingestion/narrative/image flow is the most important backend architecture.

```text
IngestionScheduler / manual trigger
  ↓
IngestionService fetches sources through adapters
  ↓
ingestion queue: IngestionProcessor
  ├── validates publishedAt and recency
  ├── canonicalizes URL and deduplicates
  ├── resolves Source
  ├── validates/upgrades source image
  ├── saves Article
  ├── bulk-indexes saved articles in Elasticsearch
  ├── enqueues narrative analysis
  └── enqueues image fallback job when needed

narrative queue: NarrativeProcessor
  ├── headline/body sentiment
  ├── framing + structural features
  ├── political lean / establishment score
  ├── story cluster assignment
  ├── cluster aggregate updates
  ├── article divergence from cluster median
  └── cluster FDI recomputation

image-pipeline queue: ImagePipelineProcessor
  ├── single-article mode or batch mode
  ├── build image context
  ├── retrieve candidates
  ├── score relevance
  ├── generate fallback image where configured
  └── store/reuse cluster image
```

This separation is good. It keeps source fetching, analytical scoring, and media enrichment independently retryable and observable through queue counters.

---

## 4. Domain Model

### 4.1 Core Entities

| Entity | Role | Important Fields |
|---|---|---|
| `Source` | A news outlet/feed with editorial priors | `slug`, `rssFeedUrl`, `tier`, `politicalLeanPrior`, `establishmentPrior`, `reliabilityScore`, `isActive`, `fetchIntervalSeconds` |
| `Article` | A single ingested story item | `title`, `url`, `summary`, `content`, `sourceId`, `storyClusterId`, lean scores, framing, sentiment, structural features, `simhash` |
| `StoryCluster` | Real-world event/topic grouping | `topic`, `summary`, `topicKeywords`, `status`, `articleCount`, `sourceCount`, `divergenceScore`, `velocityScore`, `isFractured`, `topicCategory`, `imageUrl` |
| `TrendSignal` | Trending/velocity signal store | Used by narrative trend services. |
| `User` | Authenticated user | `email`, `passwordHash`, `role`, `refreshTokenHash`, `isActive` |

### 4.2 Story Cluster Lifecycle

`StoryCluster` has an explicit lifecycle:

- `BREAKING`: recently created, high velocity or early coverage.
- `ACTIVE`: still receiving recent articles.
- `ARCHIVED`: stale/historical cluster.

Clusters are built from topic/keyword similarity, headline similarity, and time-window constraints. The cluster stores denormalized article/source counts and newest/oldest article timestamps so homepage and story list reads can be efficient.

### 4.3 Fracture Divergence Index

FDI is the core domain metric. The current `DivergenceService` computes:

| Component | Weight | Current Approximation |
|---|---:|---|
| Headline sentiment spread | 25% | Standard deviation of headline sentiment. |
| Framing type entropy | 20% | Shannon entropy across framing classifications. |
| Entity/bias framing divergence | 20% | Political lean score spread. |
| Linguistic spread | 15% | Body sentiment variance as MVP proxy. |
| Source selection variance | 10% | Attribution-density variance as proxy. |
| Structural divergence | 10% | Quote/narrative ratio + passive-voice variance. |

The service returns sub-metrics on a 0–100 scale and persists the composite `divergenceScore` on clusters. A cluster is marked fractured when `fdi >= 40` and source coverage is sufficient.

### 4.4 Domain Strengths

- The app models **story-level divergence**, not just source-level bias.
- Source priors, article-level signals, and cluster-level aggregates are distinct concepts.
- The queue pipeline follows the domain sequence: ingest → score article → cluster → score cluster → enrich media.
- FDI is explainable enough to visualize in UI and decompose into sub-metrics.
- The pseudo-story fallback in `/narrative/stories` supports empty/early data states.

### 4.5 Domain Weaknesses / Open Questions

- Several FDI components are acknowledged MVP proxies, especially linguistic spread and entity framing divergence.
- Source coverage breadth is not visible in current code review beyond seeded sources and docs that mention 14 outlets; product claims should be generated from data where possible.
- Cluster matching quality is hard to validate without tests, fixtures, and evaluation metrics.
- Role/tier concepts exist in auth and UI, but backend narrative data is public; there is no enforced product entitlement boundary around analytical features in the current frontend surface.
- There is no migration framework visible; production schema changes need a plan before launch.

---

## 5. Frontend Architecture

### 5.1 Current Route Map

| Route | Implementation | Rendering | Purpose |
|---|---|---|---|
| `/` | `frontend/src/app/page.tsx` | Client | Homepage/feed with hero, trending grid, breaking feed, fractured row, latest stories, topics, CTA. |
| `/story/[clusterId]` | `frontend/src/app/story/[clusterId]/page.tsx` | Client | Story detail with header, summary, source spectrum, article coverage, FDI breakdown, interpretation. |
| `/search` | `frontend/src/app/search/page.tsx` | Client | Search/discovery experience. |
| `/briefing` | `frontend/src/app/briefing/page.tsx` | Server + ISR | 30-minute AI-style briefing based on homepage backend data. |
| `/pricing` | `frontend/src/app/pricing/page.tsx` | Client | Free/Professional/Enterprise pricing cards. |
| `/login` | `frontend/src/app/login/page.tsx` | Client | Login form with auth shell. |
| `/register` | `frontend/src/app/register/page.tsx` | Client | Registration form with password checklist. |

`AppChrome` wraps non-auth routes with `Navbar` and `Footer`. Login/register intentionally render without global chrome.

### 5.2 BFF API Layer

The BFF routes in `frontend/src/app/api` are an important architectural seam. They hide backend URL details from the browser and transform backend shapes into frontend contracts.

| BFF Route | Backend Route | Notes |
|---|---|---|
| `/api/homepage` | `/narrative/homepage` | Uses `transformHomepageResponse`; recently fixed to handle nested hero/fractured objects and `storyClusterId`. |
| `/api/stories` | `/narrative/stories` | Uses `raw.data ?? raw.stories` and transforms clusters. |
| `/api/stories/[id]` | `/narrative/cluster/:id` | Transforms story detail and maps backend 404 to frontend 404. |
| `/api/search` | `/narrative/discover` | Pass-through response; minimum query length handled client/BFF side. |
| `/api/search/trending-topics` | `/narrative/trending-topics` | Topic list. |
| `/api/stats` | `/narrative/stats` | Platform stat transform. |
| `/api/auth/*` | `/auth/*` | Login/register/refresh/logout/me via cookie-backed refresh flow. |

The BFF pattern is one of the best architectural decisions in the project. It creates one place to manage contract drift, as shown by the `/story/undefined` fix. The remaining risk is bypassing the BFF in server components like the briefing page.

### 5.3 Data Fetching and State

React Query hooks in `frontend/src/hooks/useStories.ts` centralize server state:

- `useHomepage()` → `/api/homepage`, 30s stale time.
- `useStories()` → `/api/stories`.
- `useStory(id)` → `/api/stories/:id`.
- `useStats()` → `/api/stats`, 30s stale time.
- `useSearchDiscover()` → `/api/search`, enabled at 2+ chars.
- `useTrendingTopics()` → `/api/search/trending-topics`, 5-minute stale time.

Auth state is a React context. Access tokens live in memory, refresh tokens are in an HttpOnly BFF cookie, and silent session restore happens on mount. This is a solid browser-auth posture for an early app.

### 5.4 UI Composition

Primary UI components:

| Component | Role |
|---|---|
| `Navbar` | Top navigation, auth actions, mobile drawer, tier display. |
| `Footer` | Legal/platform/community links. |
| `DataStrip` | Top-of-page stats/signal strip. |
| `HeroStory` | Homepage lead story card. |
| `StoryCard` | Secondary story cards and compact search cards. |
| `BreakingFeed` | Latest article/sidebar feed. |
| `FracturedRow` | Horizontally scrollable most-fractured story cards. |
| `StoryListRow` | Latest story list rows. |
| `StoryHeader` | Story-detail headline/meta presentation. |
| `SourceSpectrum` | Lean/source distribution visualization. |
| `ArticleCoverageCard` | Article cards sorted by lean. |
| `FDIBreakdown` | Sidebar FDI sub-metric visualization. |
| `StoryInterpretation` | Plain-English score interpretation. |
| `SearchHeader`, `SearchResults`, `TrendingTopics`, `SearchEmptyState` | Search page UX. |
| `AuthLeftPanel`, `AuthFormWrapper` | Auth layout and form shell. |

---

## 6. UI/UX Audit

### 6.1 Design System: MaxQ

The visual system is defined in `frontend/src/app/globals.css` and uses:

- Near-black page background and dark surface panels.
- Signal-red accent (`--color-accent`) for live/status/action emphasis.
- Green/amber/red divergence scale.
- Blue/red/gray political lean scale.
- Instrument Serif, IBM Plex Mono, and Barlow Condensed via `next/font`.
- `ns-*` classes for nav, cards, buttons, badges, score bars, rows, skeletons, auth layout, and footer.
- Subtle fixed noise texture and dot-grid background for “flight deck” atmosphere.

This design language is distinctive and cohesive. It feels closer to intelligence tooling than a conventional news site, which fits the domain.

### 6.2 Homepage UX

The homepage is organized as sequential zones:

1. Data strip.
2. Hero story.
3. Trending story grid plus breaking/latest article feed.
4. Most fractured row.
5. Latest story rows.
6. Trending topics.
7. Mission/CTA block.

What works:

- Strong information hierarchy: hero → grid → fractured → latest.
- Motion/staggering adds polish without overwhelming the data.
- Multiple entry points support different user intents: story reading, breaking feed, search topics, pricing CTA.
- Empty states exist for early ingestion states.

What could improve:

- The page assumes users understand Fracture quickly; new-user explanatory copy is mostly at the bottom.
- Homepage uses both homepage data and a separate stories query, which is acceptable but can create inconsistent ordering and duplicated story logic.
- Inline styles are pervasive; this slows design iteration and makes responsive/accessibility tuning harder.

### 6.3 Story Detail UX

The story page is the strongest product surface. It gives users:

- Story title/meta through `StoryHeader`.
- Optional cluster summary.
- Source/lean visualization through `SourceSpectrum`.
- Sorted article coverage through `ArticleCoverageCard`.
- FDI decomposition through `FDIBreakdown`.
- Plain-English interpretation through `StoryInterpretation`.
- Keyword pills for context.

What works:

- The 65/35 main/sidebar layout fits the product: coverage evidence on the left, analytical interpretation on the right.
- Sorting articles by political lean makes the concept tangible.
- Sticky sidebar keeps the FDI interpretation visible while reading coverage.
- Loading and error states are present.

What could improve:

- The desktop grid is defined inline and then patched with a local `<style>` block; this belongs in the CSS system.
- There is no explicit breadcrumb/back-to-feed control in the successful state.
- The story page uses `use(params)` in a client component, which works in modern React/Next but is an uncommon pattern and should be documented or converted if the team wants conventional client params handling.
- `useStory()` only checks `enabled: !!id`; it should reject sentinel strings like `undefined` or invalid UUIDs defensively, even after link fixes.

### 6.4 Search UX

Search is a focused discovery page supported by `useSearchDiscover()` and trending topics. It is a good lightweight surface for early product. The main improvement is contract consistency: `/api/search` currently passes backend discovery responses through directly rather than using typed transforms like homepage/stories.

### 6.5 Briefing UX

The briefing page is server-rendered with a 30-minute revalidation window and positions itself as AI-generated synthesis. The concept is strong, but the implementation currently fetches `/narrative/homepage` directly from the backend and expects flat `hero.id`/`hero.topic` and flat `trending` story IDs. The backend homepage shape is nested (`hero.cluster.storyClusterId`, etc.), so the briefing page is likely vulnerable to the same response-shape drift that caused `/story/undefined` elsewhere. It should use the BFF transform or a shared server-safe transform.

### 6.6 Auth and Pricing UX

Auth is reasonably polished:

- Split auth shell.
- Safe relative `returnUrl` logic in login/register.
- Password checklist on register.
- Access token in memory and refresh token in HttpOnly cookie.

Pricing is visually clear, but commercially incomplete:

- Professional CTA links to `/checkout?plan=pro-monthly`, but no `/checkout` page exists.
- Enterprise links point to `/enterprise`, but no `/enterprise` page exists.
- Plan copy promises API access, team dashboards, SSO/SAML, retention policies, SLA, and support that are not represented in the current application surface.

This is the highest-priority UX/product mismatch because it breaks conversion and weakens trust.

---

## 7. Security, Auth, and Access Control

### 7.1 What Works

- Global JWT guard requires auth by default; public routes opt out with `@Public()`.
- Passwords and refresh tokens are hashed with bcrypt.
- Refresh token reuse detection revokes stored token hash.
- Access token is kept in memory, not localStorage.
- Refresh cookie is HttpOnly, `sameSite: lax`, scoped to `/api/auth`, and secure in production.
- Helmet and validation pipe are enabled globally.
- Auth forms sanitize return URLs to avoid open redirects.

### 7.2 Gaps and Risks

- Default `JWT_SECRET` falls back to `changeme`; production should fail fast if secrets are missing.
- CORS development origins include `3000`, `127.0.0.1:3000`, and `3002`; if the dev server often runs on `3001`, this should be aligned.
- Pricing/tier claims are not backed by visible backend entitlement enforcement for narrative data.
- There is no CSRF strategy beyond SameSite cookies for refresh endpoints; this may be acceptable early but should be reviewed before production.
- Operational/admin endpoints are likely protected by global auth unless explicitly public, but role-based admin restrictions should be checked for ingestion/image/narrative manual controls.

---

## 8. Operational Design

### 8.1 Local Development

`STARTUP.md` documents a clear local path:

1. `docker compose up -d` for Postgres, Redis, Elasticsearch.
2. Backend `.env`, `npm install`, `npm run build`, `node dist/main.js` or `npm run start:dev`.
3. Frontend `.env.local`, `npm install`, `npm run dev`.
4. Optional ingestion trigger.

This is a strong developer-experience baseline.

### 8.2 Docker Infrastructure

`docker-compose.yml` starts:

- Postgres 16 Alpine on `5432` with persistent volume.
- Redis 7 Alpine on `6379`, `256mb`, `allkeys-lru`.
- Elasticsearch 8.12 on `9200`, single-node, security disabled, 512MB heap.

This is appropriate for development. For production, Redis queue storage and rate-limit/cache storage should likely be separated or carefully memory-budgeted; Elasticsearch security and backup/retention must be addressed.

### 8.3 Testing and Build Scripts

Backend scripts include build, lint, Jest unit tests, coverage, and e2e test config. Frontend scripts include dev, build, start, and ESLint. The existence of scripts is good; the critical gap is coverage around business/domain behavior. The app needs targeted tests for:

- BFF transforms and backend response shapes.
- Ingestion deduplication and queue fan-out.
- Narrative scoring and cluster assignment invariants.
- Auth refresh/logout behavior.
- Link integrity for all visible navigation/CTA paths.

---

## 9. Things Done Well

1. **Clear domain differentiation:** Story-level divergence is more compelling than generic media-bias labels.
2. **Appropriate modular monolith:** NestJS modules are cleanly separated without premature microservices.
3. **Queue boundaries match domain flow:** Ingestion, narrative analysis, and image enrichment are independently retryable.
4. **BFF pattern is correct:** Frontend types are decoupled from backend internals through transform functions.
5. **Good auth posture for early product:** Memory access token, HttpOnly refresh token, refresh rotation, hashed secrets.
6. **Strong visual identity:** MaxQ is distinctive, coherent, and well aligned with “narrative intelligence.”
7. **Focused route surface:** The current 7-page frontend is easier to ship and reason about than previous 20+ route versions.
8. **Explainable FDI model:** The composite can be decomposed and visualized, making the product more trustworthy.
9. **Good empty/loading states:** Homepage and story page do not collapse when data is loading or missing.
10. **Developer startup docs:** Local setup is practical and infrastructure dependencies are containerized.

---

## 10. Things That Do Not Make Sense Yet

1. **Pricing links to nonexistent routes:** `/checkout` and `/enterprise` are promised but absent.
2. **Authenticated nav links to nonexistent routes:** `/account` and `/dashboard` appear in the user menu but are absent.
3. **Legal links are nonexistent:** `/privacy` and `/terms` are referenced from footer/register but absent.
4. **Briefing bypasses the BFF:** It fetches backend homepage directly and expects a shape that does not match the backend controller.
5. **Docs drift from implementation:** Older docs describe removed checkout, methodology, digest, compare, journey, and enterprise flows.
6. **App directory artifact files:** `frontend/src/app/var(--color-accent-dim)` and similar entries look like accidental filesystem artifacts and should not live under `app/`.
7. **Mockups directory still exists:** `frontend/src/app/mockups/layout.tsx` remains even though mockups were previously described as removed.
8. **Product claims exceed implemented product:** Pricing promises API access, dashboards, SSO, retention policies, and SLA without matching routes or visible backend enforcement.
9. **Inline styling dominates:** The design system exists, but many layout/style decisions are inline, reducing reuse.
10. **FDI labels and severity thresholds need one canonical frontend source:** Some components use local badge helpers rather than a central terminology module in the current simplified tree.

---

## 11. Cleanup Opportunities

### 11.1 Immediate Cleanup

- Add or remove links for `/checkout`, `/enterprise`, `/account`, `/dashboard`, `/privacy`, and `/terms`.
- Remove accidental `frontend/src/app/var(...)` artifacts.
- Decide whether `frontend/src/app/mockups` is intentionally retained; if not, remove it.
- Update `SYSTEM_DESIGN_v5.md` status to superseded by v6 to reduce doc confusion.
- Route the briefing page through `/api/homepage` or a shared transform.
- Add validation in `useStory()` and `/api/stories/[id]` for invalid IDs and sentinel strings.

### 11.2 Medium Refactors

- Replace broad inline style blocks with named CSS classes or component variants.
- Create a single `storyHref(story)`/`hasValidStoryId()` helper or typed domain guard.
- Centralize FDI severity labels, colors, and thresholds.
- Normalize backend response contracts: use either `id` or `storyClusterId`, either `data` or `stories`, either `fractured` or `mostFractured`.
- Add contract tests between NestJS responses and BFF transforms.
- Separate operational/admin endpoints from public app endpoints with explicit role guards.

### 11.3 Production Readiness

- Introduce TypeORM migrations and disable schema sync outside disposable dev databases.
- Fail startup on missing production secrets.
- Add structured logs, error reporting, and queue failure alerting.
- Add backup/restore policy for Postgres and Elasticsearch.
- Add rate-limit tiers or endpoint-specific throttles.
- Add monitoring for ingestion freshness, queue lag, cluster count, source failures, and search index freshness.
- Decide on payment/subscription provider or remove paid conversion UX until ready.

---

## 12. Prioritized Roadmap

### Phase 0 — Stop Broken Flows (1–2 days)

1. Fix/remove broken route links: checkout, enterprise, account, dashboard, privacy, terms.
2. Fix briefing response-shape mismatch by using the BFF transform.
3. Delete accidental `app/var(...)` artifacts and stale mockup remnants.
4. Add link-integrity check or simple route map test.

### Phase 1 — Stabilize Contracts (2–4 days)

1. Add tests for `transformCluster`, `transformHomepageResponse`, `transformStoryDetail`, and `/api/stories` mapping.
2. Define backend DTOs for homepage/stories/search responses.
3. Standardize cluster identifiers and collection envelope names.
4. Add invalid-ID handling for story routes and hooks.

### Phase 2 — Product Surface Alignment (1 week)

1. Decide whether pricing is informational or conversion-ready.
2. If conversion-ready, build checkout/subscription integration and entitlement enforcement.
3. If not conversion-ready, replace CTAs with waitlist/contact routes that exist.
4. Add legal pages and privacy/terms copy before collecting user accounts broadly.
5. Add an enterprise landing/contact path or remove enterprise plan copy.

### Phase 3 — Domain Confidence (1–2 weeks)

1. Add fixtures for sources/articles/clusters across known scenarios.
2. Test deduplication, clustering, FDI monotonicity, and article-to-cluster assignment.
3. Instrument ingestion freshness, source failure rates, and queue lag.
4. Add evaluation notebooks/scripts for FDI quality review if the team expects editorial trust.

### Phase 4 — Production Operations (1–2 weeks)

1. Add migrations, seed scripts, and rollback practices.
2. Add monitoring/error reporting.
3. Harden secrets and CORS.
4. Define retention policy and backup strategy.
5. Add deploy documentation and environment matrix.

---

## 13. Recommended Architectural Principles Going Forward

1. **BFF owns frontend contracts.** No page should consume NestJS response shapes directly unless it reuses the same transform functions.
2. **Backend DTOs are product contracts.** Controllers should not return ad hoc shapes that differ by endpoint unless documented and tested.
3. **Route map is a product contract.** Every visible link should resolve or be intentionally disabled.
4. **FDI must stay explainable.** If the model becomes more advanced, preserve user-facing decomposition and confidence indicators.
5. **Prefer a modular monolith until pain is real.** The current backend boundaries are good; microservices would add overhead before the domain stabilizes.
6. **Keep MaxQ, reduce inline styling.** The visual identity is strong; implementation should move toward reusable classes/components.
7. **Treat ingestion freshness as uptime.** For Fracture, stale data is a product outage even if servers are healthy.

---

## 14. Final Assessment

Fracture has the ingredients of a strong product: a differentiated analytical metric, a focused current UI, a sensible backend pipeline, and a clear visual identity. The system is not yet production-ready because implementation details around routes, contracts, payments, legal pages, migrations, and observability lag behind the product promise.

The highest-leverage next move is not a new feature. It is to make the current system internally consistent: every link resolves, every BFF transform is tested, every backend response shape is explicit, and every paid/enterprise claim maps to a real route or is removed. Once that foundation is stable, the domain model and UX are strong enough to support a credible public beta.
