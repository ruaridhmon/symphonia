"""
Symphonia Backend - Expert Consensus Platform

Protected by email OTP authentication.
Only authorized emails can access the platform.
"""
import os
from pathlib import Path
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from core import routes as core_routes
from core.otp_routes import router as otp_router
from core.otp_auth import OTPAuthMiddleware, validate_session, SESSION_COOKIE_NAME
from core.db import engine, SessionLocal
from core.models import Base, User, UserFormUnlock
from core.auth import get_password_hash
from core.ws import ws_manager

# Frontend dist directory (built with `npm run build`)
FRONTEND_DIR = Path(__file__).parent.parent / "frontend" / "dist"

app = FastAPI(
    title="Symphonia",
    description="Expert Consensus Platform by Axiotic AI",
    version="2.0.0",
)

# =============================================================================
# MIDDLEWARE STACK (order matters!)
# =============================================================================

# 1. CORS (must be first)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. OTP Authentication (DISABLED - using Cloudflare Access instead)
# app.add_middleware(OTPAuthMiddleware)

# =============================================================================
# ROUTES
# =============================================================================

# OTP auth routes (login, request, verify, logout, status)
app.include_router(otp_router)

# Main application routes (protected by OTP middleware)
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
        # Only update is_admin, don't overwrite password
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
    print("🔐 OTP Authentication ENABLED")
    print("   Authorized emails:")
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
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)


# =============================================================================
# STATIC FILES & SPA ROUTING
# =============================================================================

# Mount static assets (JS, CSS, etc.) from the frontend build
if FRONTEND_DIR.exists():
    # Serve static assets under /assets
    assets_dir = FRONTEND_DIR / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")
    
    @app.get("/")
    async def serve_spa_root(request: Request):
        """Serve the SPA index.html for the root path."""
        # Auth handled by Cloudflare Access
        return FileResponse(str(FRONTEND_DIR / "index.html"))
    
    @app.get("/{full_path:path}")
    async def serve_spa_catchall(request: Request, full_path: str):
        """Catch-all route for SPA - serves index.html for client-side routing."""
        # Skip API routes
        if full_path.startswith(("otp/", "api/", "ws", "docs", "openapi")):
            return {"detail": "Not Found"}
        
        # Check if it's a static file request
        static_file = FRONTEND_DIR / full_path
        if static_file.exists() and static_file.is_file():
            return FileResponse(str(static_file))
        
        # Auth handled by Cloudflare Access
        # For all other paths, serve index.html (SPA routing)
        index_html = FRONTEND_DIR / "index.html"
        if index_html.exists():
            return FileResponse(str(index_html))
        
        return {"detail": "Not Found"}
else:
    print("⚠️  Frontend not built. Run `npm run build` in frontend/")


# =============================================================================
# LIFECYCLE
# =============================================================================

@app.on_event("startup")
async def startup_event():
    print("✅ Symphonia backend started")
    if FRONTEND_DIR.exists():
        print(f"   Frontend: {FRONTEND_DIR}")
    else:
        print("   Frontend: NOT FOUND (run `npm run build` in frontend/)")
    print("   Login: /otp/login")


@app.on_event("shutdown")
async def shutdown_event():
    print("👋 Symphonia shutting down cleanly")
