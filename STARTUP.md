# Fracture — Startup Guide

Step-by-step instructions to get the full Fracture stack running locally from a clean checkout.

---

## Prerequisites

| Tool | Minimum version | Check |
|---|---|---|
| **Node.js** | 20+ | `node --version` |
| **npm** | 10+ | `npm --version` |
| **Docker** & **Docker Compose** | Docker Desktop 4+ | `docker compose version` |

> All three infrastructure services (PostgreSQL, Redis, Elasticsearch) run in Docker. You do **not** need to install them natively.

---

## Step 1 — Clone the repo

```bash
git clone <repo-url> fracture-app
cd fracture-app
```

---

## Step 2 — Start the database and infrastructure

From the **project root** (where `docker-compose.yml` lives):

```bash
docker compose up -d
```

This starts three containers:

| Container | Port | Purpose |
|---|---|---|
| `fracture-postgres` | **5432** | PostgreSQL 16 — primary data store |
| `fracture-redis` | **6379** | Redis 7 — BullMQ job queue + caching |
| `fracture-elasticsearch` | **9200** | Elasticsearch 8.12 — full-text search |

### Verify all containers are healthy

```bash
docker compose ps
```

All three should show `healthy` status. If Elasticsearch is still starting (it takes ~30s), wait and re-check.

### Quick connectivity test

```bash
# PostgreSQL
docker exec fracture-postgres pg_isready -U fracture
# → accepting connections

# Redis
docker exec fracture-redis redis-cli ping
# → PONG

# Elasticsearch
curl -s http://localhost:9200/_cluster/health | grep status
# → "status":"green" (or "yellow" for single-node, which is fine)
```

---

## Step 3 — Configure the backend environment

```bash
cd backend
cp .env.example .env
```

The defaults work out of the box with the Docker containers from Step 2:

| Variable | Default | Notes |
|---|---|---|
| `NODE_ENV` | `development` | Enables TypeORM `synchronize: true` (auto-creates tables) |
| `PORT` | `4000` | Backend API port |
| `DB_HOST` | `localhost` | |
| `DB_PORT` | `5432` | |
| `DB_USERNAME` | `fracture` | Matches docker-compose |
| `DB_PASSWORD` | `fracture_dev` | Matches docker-compose |
| `DB_NAME` | `fracture` | Matches docker-compose |
| `REDIS_HOST` | `localhost` | |
| `REDIS_PORT` | `6379` | |
| `ELASTICSEARCH_NODE` | `http://localhost:9200` | |
| `JWT_SECRET` | (dev default) | **Change in production** |
| `INGESTION_SCHEDULER_ENABLED` | `true` | Auto-fetches articles every 5 min |

No changes needed for local dev — just copy the file.

---

## Step 4 — Install backend dependencies

```bash
npm install
```

---

## Step 5 — Build and start the backend

```bash
npm run build
node dist/main.js
```

You should see output like:

```
Fracture API running on http://localhost:4000 [development]
Health check: http://localhost:4000/health
```

> **Note:** In `development` mode, TypeORM automatically creates all database tables on first startup. No manual migrations needed.

### Verify the backend is running

```bash
# Health check
curl http://localhost:4000/health

# API stats
curl http://localhost:4000/api/v1/narrative/stats
```

### Alternative: watch mode (auto-restarts on file changes)

```bash
npm run start:dev
```

---

## Step 6 — Trigger article ingestion (optional)

The scheduler auto-fetches articles every 5 minutes. To ingest immediately:

```bash
# Fetch from all configured RSS sources
curl -X POST http://localhost:4000/api/v1/ingestion/fetch-all

# Fetch from a specific source (e.g. CNN)
curl -X POST http://localhost:4000/api/v1/ingestion/fetch/cnn

# Run the full pipeline (fetch + narrative analysis)
curl -X POST http://localhost:4000/api/v1/ingestion/run

# Trigger narrative analysis on all unscored articles
curl -X POST http://localhost:4000/api/v1/narrative/analyse-all
```

### Check queue status

```bash
curl http://localhost:4000/api/v1/narrative/queue-stats
curl http://localhost:4000/api/v1/ingestion/queue-stats
```

---

## Step 7 — Configure and start the frontend

Open a **new terminal**:

```bash
cd frontend
cp .env.example .env.local
npm install
```

The defaults connect to the backend at `http://localhost:4000/api/v1`:

| Variable | Default | Notes |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `/api` | Client-side BFF prefix (same-origin) |
| `BACKEND_URL` | `http://localhost:4000/api/v1` | Server-side only — Next.js API routes proxy to NestJS |

### Start the frontend dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Quick-start (all steps, copy-paste)

```bash
# 1. Infrastructure
docker compose up -d

# 2. Backend (terminal 1)
cd backend
cp .env.example .env
npm install
npm run build
node dist/main.js

# 3. Frontend (terminal 2)
cd frontend
cp .env.example .env.local
npm install
npm run dev

# 4. Seed articles (terminal 3)
curl -X POST http://localhost:4000/api/v1/ingestion/run
```

---

## Stopping everything

```bash
# Stop the frontend and backend (Ctrl+C in their terminals)

# Stop infrastructure containers (preserves data)
docker compose stop

# Stop and remove containers + volumes (full reset)
docker compose down -v
```

---

## Troubleshooting

### Port already in use

```bash
# Kill whatever is on port 4000 (backend)
lsof -ti:4000 | xargs kill -9

# Kill whatever is on port 3000 (frontend)
lsof -ti:3000 | xargs kill -9
```

### Database connection refused

Make sure Docker containers are running:

```bash
docker compose ps
```

If `fracture-postgres` isn't healthy, check its logs:

```bash
docker compose logs postgres
```

### Elasticsearch fails to start

Elasticsearch needs at least 512MB of heap. If Docker is low on memory, increase Docker Desktop's memory allocation to at least 4GB.

```bash
docker compose logs elasticsearch
```

### Tables not being created

Tables are auto-created only when `NODE_ENV=development` (which sets TypeORM `synchronize: true`). Verify your `.env`:

```bash
grep NODE_ENV backend/.env
# → NODE_ENV=development
```

### No articles appearing

1. Check that ingestion ran: `curl http://localhost:4000/api/v1/ingestion/queue-stats`
2. Trigger manually: `curl -X POST http://localhost:4000/api/v1/ingestion/run`
3. Check article count: `curl http://localhost:4000/api/v1/articles?limit=1`
4. Run narrative analysis: `curl -X POST http://localhost:4000/api/v1/narrative/analyse-all`

---

## Architecture overview

```
Browser → :3000 Next.js (frontend + BFF layer)
                  ↓ server-side fetch
              :4000 NestJS API (backend)
                  ↓         ↓         ↓
              :5432      :6379     :9200
            PostgreSQL   Redis   Elasticsearch
```

| Layer | Tech | Role |
|---|---|---|
| Frontend | Next.js 16, React 19, Tailwind v4 | UI + BFF proxy |
| Backend | NestJS 11, TypeORM | REST API, narrative analysis pipeline |
| Queue | BullMQ (Redis) | Async article ingestion + analysis jobs |
| Database | PostgreSQL 16 | Articles, sources, clusters, users |
| Search | Elasticsearch 8.12 | Full-text article search |
| Cache | Redis 7 | Job queue + general caching |
