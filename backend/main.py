"""
Symphonia Backend - Expert Consensus Platform

Protected by email OTP authentication.
Only authorized emails can access the platform.
"""
import os
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from consensus import routes as consensus_routes
from consensus.otp_routes import router as otp_router
from consensus.otp_auth import OTPAuthMiddleware
from consensus.db import engine, SessionLocal
from consensus.models import Base, User, UserFormUnlock
from consensus.auth import get_password_hash
from consensus.ws import ws_manager

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

# 2. OTP Authentication (protects all routes except /otp/*)
app.add_middleware(OTPAuthMiddleware)

# =============================================================================
# ROUTES
# =============================================================================

# OTP auth routes (login, request, verify, logout, status)
app.include_router(otp_router)

# Main application routes (protected by OTP middleware)
app.include_router(consensus_routes.router)

# =============================================================================
# DATABASE INIT
# =============================================================================

Base.metadata.create_all(bind=engine)

with SessionLocal() as db:
    admin_email = os.environ.get("ADMIN_EMAIL", "antreas@axiotic.ai")
    admin_password = os.environ.get("ADMIN_PASSWORD", "change-me-now")
    admin = db.query(User).filter(User.email == admin_email).first()
    if not admin:
        db.add(User(
            email=admin_email,
            hashed_password=get_password_hash(admin_password),
            is_admin=True
        ))
    else:
        admin.is_admin = True
        admin.hashed_password = get_password_hash(admin_password)

    # Also ensure samuel@axiotic.ai exists as admin
    sam_email = "samuel@axiotic.ai"
    sam = db.query(User).filter(User.email == sam_email).first()
    if not sam:
        db.add(User(
            email=sam_email,
            hashed_password=get_password_hash("change-me-now"),
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
# LIFECYCLE
# =============================================================================

@app.on_event("startup")
async def startup_event():
    print("✅ Symphonia backend started")
    print("   Login: /otp/login")


@app.on_event("shutdown")
async def shutdown_event():
    print("👋 Symphonia shutting down cleanly")
