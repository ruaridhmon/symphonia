import { useEffect, useRef, useState, useCallback } from 'react';
import { getWebSocketUrl } from '../api/ws';

export interface Viewer {
  email: string;
  page: string;
  color: string;
}

interface UsePresenceOptions {
  formId: number | null;
  page: string;
  userEmail: string;
  /** Optional callback for non-presence WebSocket messages (e.g. synthesis_complete) */
  onMessage?: (data: Record<string, unknown>) => void;
}

interface UsePresenceReturn {
  viewers: Viewer[];
  isConnected: boolean;
}

const INITIAL_RECONNECT_DELAY_MS = 1_500;
const MAX_RECONNECT_DELAY_MS = 15_000;
const MAX_CONSECUTIVE_FAILURES = 4;

/**
 * Hook for real-time presence tracking via WebSocket.
 * Connects to /ws, sends presence_join on mount, heartbeats every 15s,
 * and presence_leave on unmount. Returns current viewers for the form.
 */
export function usePresence({ formId, page, userEmail, onMessage }: UsePresenceOptions): UsePresenceReturn {
  const [viewers, setViewers] = useState<Viewer[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const hasConnectedRef = useRef(false);
  const stoppedRef = useRef(false);

  const connect = useCallback(() => {
    if (!formId || stoppedRef.current) return;
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }
    const fallbackEmail = (() => {
      try {
        return localStorage.getItem('email') || '';
      } catch {
        return '';
      }
    })();
    const effectiveEmail = userEmail || fallbackEmail || 'unknown@example.com';

    const wsUrl = getWebSocketUrl('/ws');

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      reconnectAttemptsRef.current = 0;
      hasConnectedRef.current = true;
      // Send join message
      ws.send(JSON.stringify({
        type: 'presence_join',
        form_id: formId,
        page,
        user_email: effectiveEmail,
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
        } else if (onMessage) {
          // Forward non-presence messages (synthesis_complete, summary_updated, etc.)
          onMessage(data);
        }
      } catch {
        // Ignore non-JSON messages
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      wsRef.current = null;
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }

      if (stoppedRef.current) return;

      reconnectAttemptsRef.current += 1;

      // If the endpoint never came up at all, stop after a few failures so a
      // missing proxy/WebSocket deployment does not spam the browser forever.
      if (!hasConnectedRef.current && reconnectAttemptsRef.current >= MAX_CONSECUTIVE_FAILURES) {
        return;
      }

      const delay = Math.min(
        INITIAL_RECONNECT_DELAY_MS * (2 ** Math.max(reconnectAttemptsRef.current - 1, 0)),
        MAX_RECONNECT_DELAY_MS,
      );

      reconnectRef.current = setTimeout(() => {
        connect();
      }, delay);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [formId, page, userEmail, onMessage]);

  useEffect(() => {
    stoppedRef.current = false;
    connect();

    return () => {
      stoppedRef.current = true;
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
