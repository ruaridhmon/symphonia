# Docker Setup — Symphonia

## Quick Start (Production-like)

```bash
# 1. Copy and edit environment variables
cp .env.example .env
# Edit .env — at minimum set OPENROUTER_API_KEY for real synthesis

# 2. Build & run
docker compose up --build -d

# 3. Access
#    Frontend:  http://localhost:3000
#    Backend:   http://localhost:8000
#    Postgres:  localhost:5432
```

The stack comes up in dependency order: **db → backend → frontend**.  
Each service has a healthcheck — the backend waits for Postgres to be ready,  
and the frontend waits for the backend.

## Development Mode (Hot-Reload)

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

What changes in dev mode:

| Service  | Production              | Dev                                      |
| -------- | ----------------------- | ---------------------------------------- |
| Backend  | gunicorn (multi-worker) | `uvicorn --reload` (auto-restart on save)|
| Frontend | nginx serving static    | `vite dev` with HMR (instant reload)     |
| Volumes  | Baked into image        | Source mounted — no rebuild needed       |

**Dev frontend port:** Still `localhost:3000` (mapped to Vite's 5173 inside the container).

## Environment Variables

All variables are documented in [`.env.example`](.env.example).  
Key ones:

| Variable            | Purpose                                | Default                |
| ------------------- | -------------------------------------- | ---------------------- |
| `DATABASE_URL`      | PostgreSQL connection string           | Auto-composed from `POSTGRES_*` |
| `OPENROUTER_API_KEY`| LLM API key (empty = mock mode)        | *(empty)*              |
| `SYNTHESIS_MODE`    | `mock` or `live`                       | `mock`                 |
| `JWT_SECRET`        | JWT signing secret                     | `your-jwt-secret-CHANGE-ME` |
| `ADMIN_EMAIL`       | Admin account created on startup       | `antreas@axiotic.ai`   |
| `COOKIE_SECURE`     | `true` for HTTPS, `false` for local HTTP | `false`             |

## Architecture

```
                  ┌─────────────┐
                  │   Browser   │
                  └──────┬──────┘
                         │ :3000
                  ┌──────▼──────┐
                  │   nginx     │ (frontend container)
                  │  /api/*  ───┼──► backend:8000
                  │  /api/ws ───┼──► backend:8000/ws  (WebSocket)
                  │  /*      ───┼──► SPA static files
                  └──────┬──────┘
                         │
                  ┌──────▼──────┐
                  │   FastAPI   │ (backend container)
                  │  gunicorn   │
                  └──────┬──────┘
                         │
                  ┌──────▼──────┐
                  │  PostgreSQL │ (db container)
                  └─────────────┘
```

## Healthchecks

All services expose healthchecks:

- **db:** `pg_isready` every 5s
- **backend:** `GET /health` every 10s — returns `{"status": "ok", "db": "connected"}`
- **frontend:** `wget` to `localhost:80` every 10s

Check health status:

```bash
docker compose ps       # Shows health column
docker inspect --format='{{.State.Health.Status}}' symphonia-repo-backend-1
```

## Common Issues

### Port conflicts

Change ports in `.env`:

```env
FRONTEND_PORT=3001
BACKEND_PORT=8001
DB_PORT=5433
```

### Backend can't reach database

- Check `docker compose logs db` — is Postgres actually up?
- The backend depends on `db: service_healthy`, so it shouldn't start too early.
- If you changed `POSTGRES_PASSWORD`, update `DATABASE_URL` to match.

### WebSocket connections failing

- In production mode, nginx proxies `/api/ws` → `backend:8000/ws` with proper upgrade headers.
- In dev mode, the Vite dev server connects directly to `http://localhost:8000`.
- Check `docker compose logs frontend` for nginx errors.

### "Mock mode" — synthesis returns placeholder text

Either:
1. `OPENROUTER_API_KEY` is empty, or
2. `SYNTHESIS_MODE=mock` is set

Set both in `.env` for real LLM synthesis.

### Rebuilding after dependency changes

```bash
# Backend (requirements.txt changed)
docker compose build backend

# Frontend (package.json changed)
docker compose build frontend

# Everything
docker compose up --build
```

### Resetting the database

```bash
docker compose down -v   # -v removes the postgres_data volume
docker compose up --build
```

## Stopping

```bash
docker compose down       # Stop and remove containers
docker compose down -v    # Also remove volumes (resets DB)
```
