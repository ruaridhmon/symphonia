/**
 * useSynthesisNotifier
 *
 * Global synthesis-completion tracker that persists across route changes.
 *
 * Problem: synthesis_complete and synthesis_error WebSocket events are
 * only received while SummaryPage is mounted.  When the user navigates to
 * the Dashboard mid-synthesis, the WS closes and they never learn the result.
 *
 * Solution: SummaryPage writes pending synthesis metadata to sessionStorage
 * when it kicks off a background synthesis.  This hook (mounted in PrivateRoute
 * so it lives for the entire authenticated session) watches sessionStorage,
 * opens a WS connection when a synthesis is pending, and shows a toast when
 * the synthesis_complete or synthesis_error event arrives — regardless of
 * which page the user is on.
 *
 * When the user IS on SummaryPage, SummaryPage's own WS handles the event
 * and clears the sessionStorage key, so this hook stays idle.
 */

import { useEffect, useRef } from 'react';

export const SYNTHESIS_PENDING_KEY = 'symphonia_synthesis_pending';

export interface SynthesisPendingState {
  formId: number;
  roundId: number;
  startedAt: string; // ISO timestamp
}

/** Write pending synthesis state to sessionStorage (call from SummaryPage on start). */
export function markSynthesisPending(formId: number, roundId: number): void {
  const state: SynthesisPendingState = {
    formId,
    roundId,
    startedAt: new Date().toISOString(),
  };
  sessionStorage.setItem(SYNTHESIS_PENDING_KEY, JSON.stringify(state));
}

/** Clear pending synthesis state (call from SummaryPage on completion or error). */
export function clearSynthesisPending(): void {
  sessionStorage.removeItem(SYNTHESIS_PENDING_KEY);
}

/** Read pending synthesis state. Returns null if none. */
export function getSynthesisPending(): SynthesisPendingState | null {
  try {
    const raw = sessionStorage.getItem(SYNTHESIS_PENDING_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SynthesisPendingState;
  } catch {
    return null;
  }
}

interface UseSynthesisNotifierOptions {
  /** Called when synthesis_complete is received globally */
  onComplete?: (formId: number, roundId: number) => void;
  /** Called when synthesis_error is received globally */
  onError?: (message: string, formId: number) => void;
}

/**
 * Mount this hook once at the PrivateRoute/auth level.
 *
 * It polls sessionStorage every 2 s to detect a pending synthesis,
 * then opens a WebSocket and waits for synthesis_complete / synthesis_error.
 * The WS is closed once the result arrives or the pending state is cleared.
 */
export function useSynthesisNotifier({
  onComplete,
  onError,
}: UseSynthesisNotifierOptions = {}): void {
  const wsRef = useRef<WebSocket | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Stable refs so the WS message handler always calls the LATEST callbacks
  // even though the effect only mounts once. Refs are updated on every render.
  const onCompleteRef = useRef(onComplete);
  const onErrorRef = useRef(onError);
  onCompleteRef.current = onComplete;
  onErrorRef.current = onError;

  function closWs() {
    if (wsRef.current) {
      wsRef.current.onclose = null; // prevent auto-reconnect on intentional close
      wsRef.current.close();
      wsRef.current = null;
    }
    if (reconnectRef.current) {
      clearTimeout(reconnectRef.current);
      reconnectRef.current = null;
    }
  }

  function openWs(pending: SynthesisPendingState) {
    if (wsRef.current) return; // already open

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      // Send a lightweight join so the server can route messages
      ws.send(
        JSON.stringify({
          type: 'presence_join',
          form_id: pending.formId,
          page: 'background_notifier',
          user_email: '',
        })
      );
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as Record<string, unknown>;

        if (
          data.type === 'synthesis_complete' &&
          data.form_id === pending.formId
        ) {
          const roundId =
            typeof data.round_id === 'number' ? data.round_id : pending.roundId;
          clearSynthesisPending();
          closWs();
          onCompleteRef.current?.(pending.formId, roundId);
          return;
        }

        if (
          data.type === 'synthesis_error' &&
          data.form_id === pending.formId
        ) {
          const msg =
            typeof data.error === 'string'
              ? data.error
              : 'Synthesis failed in background';
          clearSynthesisPending();
          closWs();
          onErrorRef.current?.(msg, pending.formId);
          return;
        }
      } catch {
        // ignore non-JSON
      }
    };

    ws.onclose = () => {
      wsRef.current = null;
      // If synthesis is still pending, reconnect after 3 s
      const stillPending = getSynthesisPending();
      if (stillPending) {
        reconnectRef.current = setTimeout(() => openWs(stillPending), 3_000);
      }
    };

    ws.onerror = () => {
      ws.close();
    };
  }

  useEffect(() => {
    function tick() {
      const pending = getSynthesisPending();
      if (pending && !wsRef.current) {
        openWs(pending);
      } else if (!pending && wsRef.current) {
        // Synthesis was handled elsewhere (e.g. SummaryPage WS) — clean up
        closWs();
      }
    }

    // Check immediately, then every 2 s
    tick();
    pollRef.current = setInterval(tick, 2_000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      closWs();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
