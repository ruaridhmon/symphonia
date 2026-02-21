"""
Symphonia Backend - Expert Consensus Platform

Protected by Cloudflare Access.
"""
import os
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from core import routes as core_routes
from core.db import engine, SessionLocal
from core.models import Base, User, UserFormUnlock
from core.auth import get_password_hash
from core.ws import ws_manager

# Frontend dist directory (built with `npm run build`)
FRONTEND_DIR = Path(__file__).parent.parent / "frontend" / "dist"


# =============================================================================
# LIFECYCLE (modern lifespan replaces deprecated on_event)
# =============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Startup ──
    print("✅ Symphonia backend started")
    if FRONTEND_DIR.exists():
        print(f"   Frontend: {FRONTEND_DIR}")
    else:
        print("   Frontend: NOT FOUND")
    yield
    # ── Shutdown ──
    print("👋 Symphonia shutting down cleanly")


app = FastAPI(
    title="Symphonia",
    description="Expert Consensus Platform by Axiotic AI",
    version="2.0.0",
    lifespan=lifespan,
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

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =============================================================================
# ROUTES
# =============================================================================

# Main application routes
app.include_router(core_routes.router)

# =============================================================================
# DATABASE INIT
# =============================================================================

Base.metadata.create_all(bind=engine)

with SessionLocal() as db:
    admin_email = os.environ.get("ADMIN_EMAIL", "antreas@axiotic.ai")
    admin_password = os.environ.get("ADMIN_PASSWORD", "test123")
    admin = db.query(User).filter(User.email == admin_email).first()
    if not admin:
        db.add(User(
            email=admin_email,
            hashed_password=get_password_hash(admin_password),
            is_admin=True
        ))
    else:
        admin.is_admin = True

    # Also ensure samuel@axiotic.ai exists as admin
    sam_email = "samuel@axiotic.ai"
    sam = db.query(User).filter(User.email == sam_email).first()
    if not sam:
        db.add(User(
            email=sam_email,
            hashed_password=get_password_hash("test123"),
            is_admin=True,
        ))
    else:
        sam.is_admin = True

    db.commit()

    print("=" * 60)
    print("🎵 SYMPHONIA - Expert Consensus Platform")
    print("=" * 60)
    print("🔐 Protected by Cloudflare Access")
    print("   Admin users:")
    print("   • antreas@axiotic.ai")
    print("   • samuel@axiotic.ai")
    print("=" * 60)


# =============================================================================
# WEBSOCKET
# =============================================================================

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
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
        """Catch-all route for SPA - serves index.html for client-side routing."""
        if full_path.startswith(("api/", "ws", "docs", "openapi")):
            return {"detail": "Not Found"}
        
        static_file = FRONTEND_DIR / full_path
        if static_file.exists() and static_file.is_file():
            return FileResponse(str(static_file))
        
        index_html = FRONTEND_DIR / "index.html"
        if index_html.exists():
            return FileResponse(str(index_html))
        
        return {"detail": "Not Found"}
else:
    print("⚠️  Frontend not built. Run `npm run build` in frontend/")


# Lifecycle handled by lifespan context manager above.
