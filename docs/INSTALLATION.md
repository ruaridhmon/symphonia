# Installation Guide

This guide covers every supported way to install and run **Symphonia** — from Docker (recommended) to running the frontend and backend separately for local development.

---

## Prerequisites

Regardless of install method, you will need:

| Requirement | Notes |
|---|---|
| **OpenRouter API key** | Get one at [openrouter.ai/keys](https://openrouter.ai/keys) |
| **Git** | To clone the repository |

---

## Option 1 — Docker (recommended)

The fastest path to a running instance. All services (frontend, backend, database) start with one command.

### 1.1 Install Docker

- **macOS / Windows** — [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- **Linux** — [Docker Engine](https://docs.docker.com/engine/install/) + [Compose plugin](https://docs.docker.com/compose/install/)

Verify:
```bash
docker --version          # Docker 24+ recommended
docker-compose --version  # or: docker compose version
```

### 1.2 Clone the repository

```bash
git clone https://github.com/ruaridhmon/symphonia
cd symphonia
git checkout axiotic/redesign
```

### 1.3 Configure environment

```bash
cp .env.example .env
```

Open `.env` and fill in at minimum:

```dotenv
OPENROUTER_API_KEY="sk-or-v1-your-key-here"

# Admin credentials (change before going live)
ADMIN_EMAIL="admin@yourorg.com"
ADMIN_PASSWORD="a-strong-password"

# Database (pre-filled for Docker — don't change unless you use an external DB)
DATABASE_URL="postgresql://postgres:holdbacktherive@db:5432/postgres"

# Backend URL as seen by the browser (change for production)
VITE_API_BASE_URL="http://localhost:8000"
```

> ⚠️ **Never commit `.env`** — it's already in `.gitignore`.

### 1.4 Build and start

```bash
docker-compose up --build
```

First build takes 2–4 minutes (pulling base images, installing dependencies). Subsequent starts are fast.

Services started:

| Service | URL | Description |
|---|---|---|
| Frontend | http://localhost:3000 | React SPA (served by Nginx) |
| Backend API | http://localhost:8000 | FastAPI + REST + WebSocket |
| PostgreSQL | localhost:5432 | Database (internal to Docker network) |

### 1.5 Log in

Open **http://localhost:3000** and log in with the `ADMIN_EMAIL` / `ADMIN_PASSWORD` you set in `.env`.

If you didn't set them, the defaults are:
- Email: `admin@example.com`
- Password: `change-me-now`

### 1.6 Run in background

```bash
docker-compose up -d --build   # detached mode
docker-compose logs -f         # tail logs
docker-compose down            # stop everything
```

---

## Option 2 — Local development (no Docker)

Use this if you want a fast edit-reload cycle or if Docker is unavailable.

### Requirements

| Requirement | Version |
|---|---|
| **Python** | 3.11+ |
| **Node.js** | 18+ |
| **npm** | 9+ |
| **PostgreSQL** | 14+ (or use Docker just for the DB — see tip below) |

> **Tip — DB only via Docker:** If you don't want to install PostgreSQL locally, you can run just the database in Docker:
> ```bash
> docker-compose up db -d
> ```
> Then run the frontend and backend natively. The default `DATABASE_URL` in `.env` points to this container.

### 2.1 Clone the repository

```bash
git clone https://github.com/ruaridhmon/symphonia
cd symphonia
git checkout axiotic/redesign
```

### 2.2 Backend setup

```bash
cd backend

# Create and activate a virtual environment
python3 -m venv .venv
source .venv/bin/activate        # macOS / Linux
# or: .venv\Scripts\activate     # Windows

# Install dependencies
pip install -r requirements.txt
```

#### Backend configuration

Create `backend/.env` (in addition to the root `.env`):

```dotenv
ADMIN_EMAIL="admin@yourorg.com"
ADMIN_PASSWORD="a-strong-password"
```

> The backend reads both root `.env` (for `OPENROUTER_API_KEY`, `DATABASE_URL`) and `backend/.env` (for admin credentials).

#### Start the backend

```bash
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Backend is now running at **http://localhost:8000**. The interactive API docs are at http://localhost:8000/docs.

### 2.3 Frontend setup

```bash
cd frontend

# Install dependencies
npm install
```

#### Frontend configuration

The frontend needs to know where the backend API is. Set this in the root `.env`:

```dotenv
VITE_API_BASE_URL="http://localhost:8000"
```

#### Start the frontend dev server

```bash
npm run dev
```

Frontend is now running at **http://localhost:5173** (Vite dev server with HMR).

### 2.4 Access the application

Open **http://localhost:5173** and log in with your admin credentials.

---

## Configuration Reference

All configuration is via environment variables. The root `.env` is loaded by both Docker Compose and the backend directly.

### Root `.env`

| Variable | Required | Default | Description |
|---|---|---|---|
| `OPENROUTER_API_KEY` | ✅ | — | OpenRouter API key for AI synthesis |
| `DATABASE_URL` | ✅ | `postgresql://postgres:holdbacktherive@db:5432/postgres` | PostgreSQL connection string |
| `VITE_API_BASE_URL` | ✅ | `http://localhost:8000` | Backend API URL (used by the frontend at build time) |
| `ADMIN_EMAIL` | No | `admin@example.com` | Email of the initial admin account |
| `ADMIN_PASSWORD` | No | `change-me-now` | Password of the initial admin account |

### Backend `.env` (optional override)

Placed at `backend/.env`. Overrides root `.env` values for the backend process only.

| Variable | Description |
|---|---|
| `ADMIN_EMAIL` | Admin account email |
| `ADMIN_PASSWORD` | Admin account password |

### Synthesis model

The AI synthesis model is set via the consensus library's environment variable:

```dotenv
CONSENSUS_MODEL="anthropic/claude-sonnet-4"
```

If not set, the backend uses the OpenRouter default. Models are referenced by their OpenRouter identifier — see [openrouter.ai/models](https://openrouter.ai/models).

---

## First Run

On startup, the backend automatically:

1. Creates all database tables (SQLAlchemy migrations run on boot)
2. Creates the admin user with the credentials from `.env`
3. Logs startup status to the console

You'll see:

```
🎵 SYMPHONIA - Expert Consensus Platform
============================================================
🔐 Protected by Cloudflare Access
   Admin users:
   • admin@yourorg.com
============================================================
```

### Create your first form

1. Log in as admin at http://localhost:3000
2. Click **New Form** in the admin dashboard
3. Add your questions and configure expert labels
4. Share the join code with your experts
5. When all experts have responded, trigger AI synthesis from the Summary page

---

## Running Tests

### Backend tests

```bash
cd backend
source .venv/bin/activate
pytest -v
```

### Frontend tests

```bash
cd frontend
npm test
```

### E2E journey test

```bash
bash scripts/test-journey.sh
```

---

## Production Deployment

### Environment changes for production

```dotenv
# Use your production domain
VITE_API_BASE_URL="https://api.yourdomain.com"

# Strong credentials
ADMIN_EMAIL="admin@yourdomain.com"
ADMIN_PASSWORD="<generate with: openssl rand -base64 32>"

# Use your production database
DATABASE_URL="postgresql://user:password@your-db-host:5432/symphonia"
```

### Cloudflare Access

The backend is Cloudflare Access compatible. Set up a Cloudflare Access application in front of the backend URL to restrict who can reach the API.

### HTTPS

Terminate TLS at Nginx or a load balancer in front of the Docker stack. Update `VITE_API_BASE_URL` to use `https://`.

---

## Troubleshooting

### `OPENROUTER_API_KEY not set` / synthesis fails silently

Ensure the key is in `.env` and the container was restarted after you added it:

```bash
docker-compose down && docker-compose up -d
```

### Frontend can't reach the backend

Check `VITE_API_BASE_URL` in `.env`. For Docker, this should be `http://localhost:8000`. For production, your public API domain.

Note: `VITE_API_BASE_URL` is baked into the frontend **at build time**. If you change it, you must rebuild:

```bash
docker-compose up --build frontend
```

### `relation "users" does not exist` / DB errors on startup

The database may not be ready when the backend starts. Restart:

```bash
docker-compose restart backend
```

Or add a `depends_on` healthcheck — see the Docker Compose docs.

### Port conflicts

If ports 3000, 8000, or 5432 are in use, change them in `docker-compose.yml`:

```yaml
ports:
  - "3001:80"   # frontend on 3001
```

### `CSRF token missing or invalid` (403)

This happens when calling the API from a different origin than expected. Ensure `VITE_API_BASE_URL` matches the actual backend origin seen by the browser. When using the dev server (`npm run dev`), the frontend is at `localhost:5173` and the backend at `localhost:8000` — this is expected and handled correctly.

### Admin password forgotten

Reset via the database directly:

```bash
# Docker
docker-compose exec db psql -U postgres -c \
  "UPDATE users SET hashed_password='<new-hash>' WHERE email='admin@example.com';"

# Or delete the user — it will be recreated on next startup with .env credentials
docker-compose exec db psql -U postgres -c \
  "DELETE FROM users WHERE email='admin@example.com';"
docker-compose restart backend
```

---

## Support

Raise issues in the repository or contact [Axiotic AI](https://axiotic.ai).
