import asyncio
import hashlib
import json
import time
from fastapi import WebSocket
from typing import Dict, Set, Optional

# Palette of 10 distinct colors for presence avatars
PRESENCE_COLORS = [
    "#6366f1",  # indigo
    "#8b5cf6",  # violet
    "#ec4899",  # pink
    "#f43f5e",  # rose
    "#f97316",  # orange
    "#eab308",  # yellow
    "#22c55e",  # green
    "#14b8a6",  # teal
    "#06b6d4",  # cyan
    "#3b82f6",  # blue
]

HEARTBEAT_TIMEOUT = 30  # seconds


def color_for_email(email: str) -> str:
    """Deterministic color from email hash."""
    h = int(hashlib.md5(email.encode()).hexdigest(), 16)
    return PRESENCE_COLORS[h % len(PRESENCE_COLORS)]


class ConnectionManager:
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()
        # Presence tracking: {form_id: {user_email: {ws, last_seen, page}}}
        self.presence: Dict[int, Dict[str, dict]] = {}
        # Reverse lookup: websocket -> (form_id, user_email)
        self._ws_to_presence: Dict[WebSocket, tuple] = {}
        self._cleanup_task: Optional[asyncio.Task] = None

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)
        # Start cleanup task if not running
        if self._cleanup_task is None or self._cleanup_task.done():
            self._cleanup_task = asyncio.create_task(self._cleanup_loop())

    def disconnect(self, websocket: WebSocket):
        self.active_connections.discard(websocket)
        # Clean up presence for this websocket
        if websocket in self._ws_to_presence:
            form_id, user_email = self._ws_to_presence.pop(websocket)
            if form_id in self.presence:
                self.presence[form_id].pop(user_email, None)
                if not self.presence[form_id]:
                    del self.presence[form_id]

    async def handle_message(self, websocket: WebSocket, raw: str):
        """Parse and route a JSON message from a client."""
        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            return

        msg_type = data.get("type")
        if msg_type == "presence_join":
            await self.presence_join(
                websocket,
                int(data.get("form_id", 0)),
                data.get("page", ""),
                data.get("user_email", ""),
            )
        elif msg_type == "presence_leave":
            await self.presence_leave(websocket, int(data.get("form_id", 0)))
        elif msg_type == "presence_heartbeat":
            self.presence_heartbeat(websocket, int(data.get("form_id", 0)))

    # ------------------------------------------------------------------
    # Presence methods
    # ------------------------------------------------------------------

    async def presence_join(
        self, websocket: WebSocket, form_id: int, page: str, user_email: str
    ):
        if not form_id or not user_email:
            return

        # Remove from previous form if any
        if websocket in self._ws_to_presence:
            old_form_id, old_email = self._ws_to_presence[websocket]
            if old_form_id in self.presence:
                self.presence[old_form_id].pop(old_email, None)
                if not self.presence[old_form_id]:
                    del self.presence[old_form_id]
                # Broadcast update to old form if different
                if old_form_id != form_id:
                    await self._broadcast_presence(old_form_id)

        # Add to new form
        if form_id not in self.presence:
            self.presence[form_id] = {}
        self.presence[form_id][user_email] = {
            "ws": websocket,
            "last_seen": time.time(),
            "page": page,
        }
        self._ws_to_presence[websocket] = (form_id, user_email)
        await self._broadcast_presence(form_id)

    async def presence_leave(self, websocket: WebSocket, form_id: int):
        if websocket in self._ws_to_presence:
            old_form_id, user_email = self._ws_to_presence.pop(websocket)
            if old_form_id in self.presence:
                self.presence[old_form_id].pop(user_email, None)
                if not self.presence[old_form_id]:
                    del self.presence[old_form_id]
                await self._broadcast_presence(old_form_id)

    def presence_heartbeat(self, websocket: WebSocket, form_id: int):
        if websocket in self._ws_to_presence:
            fid, user_email = self._ws_to_presence[websocket]
            if fid in self.presence and user_email in self.presence[fid]:
                self.presence[fid][user_email]["last_seen"] = time.time()

    async def _broadcast_presence(self, form_id: int):
        """Send current viewers list to everyone on the same form."""
        viewers_map = self.presence.get(form_id, {})
        viewers = [
            {
                "email": email,
                "page": info["page"],
                "color": color_for_email(email),
            }
            for email, info in viewers_map.items()
        ]
        message = {
            "type": "presence_update",
            "form_id": form_id,
            "viewers": viewers,
        }
        # Send to all websockets connected to this form
        for email, info in list(viewers_map.items()):
            ws = info.get("ws")
            if ws:
                try:
                    await ws.send_json(message)
                except Exception:
                    pass  # Will be cleaned up on disconnect

    async def _cleanup_loop(self):
        """Periodically expire stale presence entries."""
        while True:
            await asyncio.sleep(10)
            now = time.time()
            stale_forms = []
            for form_id, users in list(self.presence.items()):
                stale_emails = [
                    email
                    for email, info in users.items()
                    if now - info["last_seen"] > HEARTBEAT_TIMEOUT
                ]
                for email in stale_emails:
                    ws = users[email].get("ws")
                    if ws:
                        self._ws_to_presence.pop(ws, None)
                    del users[email]
                if stale_emails:
                    stale_forms.append(form_id)
                if not users:
                    del self.presence[form_id]

            # Broadcast updates for forms that had stale removals
            for form_id in stale_forms:
                if form_id in self.presence or form_id not in self.presence:
                    await self._broadcast_presence(form_id)

    # ------------------------------------------------------------------
    # Existing broadcast (unchanged)
    # ------------------------------------------------------------------

    async def broadcast_summary(self, summary: str):
        for conn in self.active_connections.copy():
            try:
                await conn.send_json({
                    "type": "summary_updated",
                    "summary": summary,
                })
            except Exception:
                self.disconnect(conn)


ws_manager = ConnectionManager()
