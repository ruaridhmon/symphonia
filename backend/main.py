"""
Symphonia Backend - Expert Consensus Platform

Protected by Cloudflare Access.
"""

# Standard library imports — must come before load_dotenv() call
import logging
import os
import shutil
import traceback
from contextlib import asynccontextmanager
from datetime import datetime
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()  # Load .env from the backend directory — must precede local imports

from fastapi import FastAPI, Request, Response, WebSocket, WebSocketDisconnect  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402
from fastapi.responses import FileResponse, JSONResponse  # noqa: E402
from fastapi.staticfiles import StaticFiles  # noqa: E402
from slowapi.errors import RateLimitExceeded  # noqa: E402
from starlette.routing import Match, Mount  # noqa: E402
from core import routes as core_routes  # noqa: E402
from core.auth import get_password_hash  # noqa: E402
from core.db import engine, SessionLocal  # noqa: E402
from core.models import Base, FormModel, InviteCode, User  # noqa: E402
from core.rate_limiter import limiter  # noqa: E402
from core.ws import ws_manager  # noqa: E402

logger = logging.getLogger("symphonia")

# Frontend dist directory (built with `npm run build`)
FRONTEND_DIR = Path(__file__).parent.parent / "frontend" / "dist"


# =============================================================================
# LIFECYCLE (modern lifespan replaces deprecated on_event)
# =============================================================================


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Startup ──

    # Auto-backup the DB before anything else
    db_path = Path(__file__).parent / "symphonia.db"
    if db_path.exists():
        backup_dir = Path(__file__).parent / "backups"
        backup_dir.mkdir(exist_ok=True)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_path = backup_dir / f"symphonia_{timestamp}.db"
        shutil.copy2(db_path, backup_path)
        logger.info("DB backup created: %s", backup_path.name)
        # Keep only last 14 backups
        backups = sorted(backup_dir.glob("symphonia_*.db"))
        for old in backups[:-14]:
            old.unlink()
            logger.info("Removed old backup: %s", old.name)

    # Log current form count for monitoring
    db = SessionLocal()
    try:
        from core.models import FormModel as _FormModel

        form_count = db.query(_FormModel).count()
        logger.info("Current form count: %d", form_count)
        if form_count == 0:
            logger.warning("WARNING: Database has zero forms!")
    finally:
        db.close()

    print("✅ Symphonia backend started")
    if FRONTEND_DIR.exists():
        print(f"   Frontend: {FRONTEND_DIR}")
    else:
        print("   Frontend: NOT FOUND")
    yield
    # ── Shutdown ──
    print("👋 Symphonia shutting down cleanly")


openapi_tags = [
    {
        "name": "Authentication",
        "description": "User registration, login, logout, and session management. Uses httpOnly cookie-based JWT with CSRF double-submit protection.",
    },
    {
        "name": "Forms",
        "description": "CRUD operations for Delphi consultation forms — creation, updates, deletion, join-code unlocking, and expert label configuration.",
    },
    {
        "name": "Rounds",
        "description": "Delphi round management — view active rounds, advance to next rounds, and list all rounds for a form.",
    },
    {
        "name": "Responses",
        "description": "Expert response submission, retrieval, editing, drafts, follow-up questions, and feedback. Includes optimistic locking for concurrent edits.",
    },
    {
        "name": "Synthesis",
        "description": "AI-powered synthesis of expert responses — single-prompt, committee, and TTD strategies. Includes versioning, comments, activation, and export (Markdown/JSON/PDF).",
    },
    {
        "name": "AI Tools",
        "description": "AI-powered analysis tools — devil's advocate counterarguments, audience translation, expert voice mirroring, and question design assistant.",
    },
    {
        "name": "Email",
        "description": "Templated email notifications — expert invitations, new round alerts, synthesis-ready notices, reminders, and template previews. Requires SMTP configuration.",
    },
    {
        "name": "Admin",
        "description": "Administrative operations — application settings, audit trail, and test data seeding. Requires admin privileges.",
    },
    {
        "name": "Health",
        "description": "Liveness and readiness probes for container orchestration and load balancers.",
    },
    {
        "name": "WebSocket",
        "description": "Real-time event streaming — synthesis progress updates, comment notifications, and live UI refreshes.",
    },
]

app = FastAPI(
    title="Symphonia API",
    description="Expert consensus platform API — Delphi-style deliberation with AI synthesis",
    version="1.0.0",
    lifespan=lifespan,
    openapi_tags=openapi_tags,
)

# =============================================================================
# RATE LIMITING
# =============================================================================

# Attach the limiter to app state (required by slowapi)
app.state.limiter = limiter


# Custom 429 handler with clear JSON error
@app.exception_handler(RateLimitExceeded)
async def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={
            "detail": "Rate limit exceeded. Please slow down and try again later.",
            "retry_after": exc.detail,
        },
        headers={"Retry-After": str(getattr(exc, "retry_after", 60))},
    )


# 405 handler — serve SPA index.html for GET requests to API-only paths.
# FastAPI raises 405 (before the catch-all route runs) when a path is
# registered for POST/PUT/etc but not GET (e.g. POST /login, POST /register).
# React Router owns these paths client-side; the browser should get index.html.
@app.exception_handler(405)
async def method_not_allowed_spa_handler(request: Request, exc: Exception):
    if request.method in ("GET", "HEAD") and FRONTEND_DIR.exists():
        index_html = FRONTEND_DIR / "index.html"
        if index_html.exists():
            return FileResponse(str(index_html))
    return JSONResponse({"detail": "Method Not Allowed"}, status_code=405)


# Global exception handler — catches unhandled exceptions and returns clean JSON
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled exception: %s\n%s", exc, traceback.format_exc())
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error. Please try again."},
    )


# =============================================================================
# MIDDLEWARE STACK
# =============================================================================


# Security headers — applied to every response
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response: Response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    # Cache static assets aggressively, don't cache API responses
    if request.url.path.startswith("/assets/"):
        response.headers["Cache-Control"] = "public, max-age=31536000, immutable"
    elif request.url.path.startswith("/api/"):
        response.headers["Cache-Control"] = "no-store"
    return response


# CSRF protection — validates X-CSRF-Token header on state-changing requests
# Uses double-submit cookie pattern: csrf_token cookie (JS-readable) must
# match the X-CSRF-Token header sent by the frontend.
_CSRF_EXEMPT_BASE_PATHS = {"/login", "/register", "/logout", "/ws"}
CSRF_EXEMPT_PATHS = _CSRF_EXEMPT_BASE_PATHS | {
    f"/api{path}" for path in _CSRF_EXEMPT_BASE_PATHS
}


@app.middleware("http")
async def csrf_protection(request: Request, call_next):
    if request.method in ("GET", "HEAD", "OPTIONS"):
        return await call_next(request)

    path = request.url.path.rstrip("/")
    if path in CSRF_EXEMPT_PATHS:
        return await call_next(request)

    # Only enforce CSRF when auth comes from cookies (not Bearer tokens).
    # If the request has an Authorization header, it's an API client using
    # Bearer tokens and CSRF doesn't apply (the token IS the proof).
    auth_header = request.headers.get("authorization", "")
    has_auth_cookie = "session_token" in request.cookies
    if auth_header.lower().startswith("bearer ") or not has_auth_cookie:
        return await call_next(request)

    # Cookie-based auth → require CSRF token
    csrf_cookie = request.cookies.get("csrf_token", "")
    csrf_header = request.headers.get("x-csrf-token", "")

    if not csrf_cookie or not csrf_header or csrf_cookie != csrf_header:
        return Response(
            content='{"detail":"CSRF token missing or invalid"}',
            status_code=403,
            media_type="application/json",
        )

    return await call_next(request)


# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "https://symphonia.axiotic.ai",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =============================================================================
# HEALTH CHECK (unauthenticated — for Docker healthcheck & load balancer probes)
# =============================================================================


@app.get(
    "/health",
    tags=["Health"],
    summary="Health check",
    description=(
        "Liveness / readiness probe. Returns 200 with DB connectivity status. "
        "Always returns 200 so the container is considered healthy even when the "
        "DB is temporarily unreachable. Consumers can inspect the `db` field for "
        "a deeper readiness check."
    ),
    response_description="Health status with DB connectivity indicator",
)
def health_check():
    db_status = "disconnected"
    form_count = None
    try:
        from sqlalchemy import text

        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        db_status = "connected"
        # Include form count for external monitoring
        db = SessionLocal()
        try:
            from core.models import FormModel as _FM

            form_count = db.query(_FM).count()
        finally:
            db.close()
    except Exception:
        pass
    return {"status": "ok", "db": db_status, "form_count": form_count}


# =============================================================================
# ROUTES
# =============================================================================

# Main application routes
# Keep root routes for local/dev compatibility and also serve /api/*
# for Firebase Hosting -> Cloud Run rewrites.
app.include_router(core_routes.router)
app.include_router(core_routes.router, prefix="/api")

# =============================================================================
# DATABASE INIT
# =============================================================================

Base.metadata.create_all(bind=engine)

with SessionLocal() as db:
    admin_email = os.environ.get("ADMIN_EMAIL", "antreas@axiotic.ai")
    admin_password = os.environ.get("ADMIN_PASSWORD", "test123")
    admin = db.query(User).filter(User.email == admin_email).first()
    if not admin:
        db.add(
            User(
                email=admin_email,
                hashed_password=get_password_hash(admin_password),
                role="platform_admin",
            )
        )
    else:
        admin.role = "platform_admin"

    # Also ensure samuel@axiotic.ai exists as admin
    sam_email = "samuel@axiotic.ai"
    sam = db.query(User).filter(User.email == sam_email).first()
    if not sam:
        db.add(
            User(
                email=sam_email,
                hashed_password=get_password_hash("test123"),
                role="platform_admin",
            )
        )
    else:
        sam.role = "platform_admin"

    # Additional platform admins
    extra_admin_passwords = {
        "ruaridh.mw@ed.ac.uk": "test",
        "d.birks@leeds.ac.uk": "test",
        "pscmmw@leeds.ac.uk": "changeme123",
    }
    for extra_admin, extra_password in extra_admin_passwords.items():
        u = db.query(User).filter(User.email == extra_admin).first()
        if not u:
            db.add(
                User(
                    email=extra_admin,
                    hashed_password=get_password_hash(extra_password),
                    role="platform_admin",
                )
            )
        else:
            u.role = "platform_admin"
            u.hashed_password = get_password_hash(extra_password)

    db.commit()

    # Phase 2: Backfill invite_codes from existing FormModel.join_code values
    forms_without_invite = (
        db.query(FormModel)
        .filter(
            FormModel.join_code.isnot(None),
            FormModel.join_code != "",
        )
        .all()
    )
    backfilled = 0
    for form in forms_without_invite:
        exists = db.query(InviteCode).filter(InviteCode.code == form.join_code).first()
        if not exists:
            creator_id = form.owner_id
            if not creator_id:
                # Use a platform admin as fallback creator
                fallback = db.query(User).filter(User.role == "platform_admin").first()
                creator_id = fallback.id if fallback else 1
            db.add(
                InviteCode(
                    form_id=form.id,
                    code=form.join_code,
                    form_role="expert",
                    created_by=creator_id,
                    is_active=form.allow_join,
                )
            )
            backfilled += 1
    if backfilled:
        db.commit()
        logger.info("Backfilled %d invite_codes from existing forms", backfilled)

    print("=" * 60)
    print("🎵 SYMPHONIA - Expert Consensus Platform")
    print("=" * 60)
    print("🔐 Protected by Cloudflare Access")
    print("   Admin users:")
    print("   • antreas@axiotic.ai")
    print("   • samuel@axiotic.ai")
    print("   • ruaridh.mw@ed.ac.uk")
    print("   • d.birks@leeds.ac.uk")
    print("   • pscmmw@leeds.ac.uk")
    print("=" * 60)


# =============================================================================
# WEBSOCKET
# =============================================================================


@app.websocket("/ws")
@app.websocket("/api/ws")
async def websocket_endpoint(websocket: WebSocket):
    """Real-time event stream (WebSocket).

    Streams synthesis progress updates, comment notifications, and
    live UI refresh events to connected clients. No authentication
    required for the WebSocket connection itself.
    """
    await ws_manager.connect(websocket)
    try:
        while True:
            raw = await websocket.receive_text()
            await ws_manager.handle_message(websocket, raw)
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)


# =============================================================================
# STATIC FILES & SPA ROUTING
# =============================================================================

if FRONTEND_DIR.exists():
    assets_dir = FRONTEND_DIR / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

    @app.get("/")
    async def serve_spa_root(request: Request):
        """Serve the SPA index.html for the root path."""
        return FileResponse(str(FRONTEND_DIR / "index.html"))

    @app.get("/{full_path:path}")
    async def serve_spa_catchall(request: Request, full_path: str):
        """Catch-all route for SPA — serves index.html for client-side routing.

        Instead of a fragile hard-coded prefix list, this dynamically checks
        every registered route on the app.  This guarantees that **all** API
        endpoints take absolute precedence over the SPA, even when new routes
        are added in the future.

        • Path matches a registered GET route → 404 JSON (safety-net; the real
          handler should have already matched before the catch-all).
        • Path matches a route registered for other methods only → 405.
        • No match at all → serve the SPA index.html for client-side routing.
        """
        request_path = request.url.path
        scope = {"type": "http", "path": request_path, "method": "GET"}

        has_full_match = False
        has_partial_match = False
        allowed_methods: set[str] = set()

        for route in app.routes:
            # Skip the catch-all itself, the SPA root, and static-file Mounts
            if getattr(route, "name", "") in ("serve_spa_catchall", "serve_spa_root"):
                continue
            if isinstance(route, Mount):
                continue

            match, _child = route.matches(scope)

            if match == Match.FULL:
                has_full_match = True
                break  # A registered GET route already covers this path
            elif match == Match.PARTIAL:
                has_partial_match = True
                allowed_methods.update(getattr(route, "methods", set()) or set())

        if has_full_match:
            # Safety-net: a registered GET route should have handled this
            return JSONResponse({"detail": "Not Found"}, status_code=404)

        if has_partial_match:
            # Path exists for other HTTP methods (e.g. POST /login, POST /register).
            # Do NOT return 405 here — this is a SPA. GET requests to paths that
            # only have POST/PUT API handlers should be served by the frontend
            # (React Router handles /login, /register client-side). The actual
            # POST route handlers will correctly match POST requests before
            # this catch-all is ever reached.
            pass  # fall through → serve SPA

        # ── No API route matches — serve the SPA ───────────────────────
        # Try serving a static file from the frontend dist first
        static_file = (FRONTEND_DIR / full_path).resolve()
        if static_file.is_relative_to(FRONTEND_DIR.resolve()) and static_file.is_file():
            return FileResponse(str(static_file))

        # Fall back to index.html for client-side routing
        index_html = FRONTEND_DIR / "index.html"
        if index_html.exists():
            return FileResponse(str(index_html))

        return JSONResponse({"detail": "Not Found"}, status_code=404)
else:
    print("⚠️  Frontend not built. Run `npm run build` in frontend/")


# Lifecycle handled by lifespan context manager above.
