import { useEffect, useRef, useState, useCallback } from 'react';

export interface Viewer {
  email: string;
  page: string;
  color: string;
}

interface UsePresenceOptions {
  formId: number | null;
  page: string;
  userEmail: string;
}

interface UsePresenceReturn {
  viewers: Viewer[];
  isConnected: boolean;
}

/**
 * Hook for real-time presence tracking via WebSocket.
 * Connects to /ws, sends presence_join on mount, heartbeats every 15s,
 * and presence_leave on unmount. Returns current viewers for the form.
 */
export function usePresence({ formId, page, userEmail }: UsePresenceOptions): UsePresenceReturn {
  const [viewers, setViewers] = useState<Viewer[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    if (!formId || !userEmail) return;

    // Derive WebSocket URL from current page location
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      // Send join message
      ws.send(JSON.stringify({
        type: 'presence_join',
        form_id: formId,
        page,
        user_email: userEmail,
      }));

      // Start heartbeat every 15s
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      heartbeatRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'presence_heartbeat',
            form_id: formId,
          }));
        }
      }, 15_000);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'presence_update' && data.form_id === formId) {
          setViewers(data.viewers || []);
        }
        // Allow other message types (e.g. summary_updated) to pass through
      } catch {
        // Ignore non-JSON messages
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
      // Attempt reconnect after 3s
      reconnectRef.current = setTimeout(() => {
        connect();
      }, 3_000);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [formId, page, userEmail]);

  useEffect(() => {
    connect();

    return () => {
      // Send leave message before closing
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && formId) {
        wsRef.current.send(JSON.stringify({
          type: 'presence_leave',
          form_id: formId,
        }));
        wsRef.current.close();
      }
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      wsRef.current = null;
    };
  }, [connect, formId]);

  return { viewers, isConnected };
}
