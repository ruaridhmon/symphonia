from fastapi import WebSocket
from typing import Set

class ConnectionManager:
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.discard(websocket)

    async def broadcast_summary(self, summary: str):
        for conn in self.active_connections.copy():
            try:
                await conn.send_json({
                    "type": "summary_updated",
                    "summary": summary,
                })
            except:
                self.disconnect(conn)

ws_manager = ConnectionManager()
