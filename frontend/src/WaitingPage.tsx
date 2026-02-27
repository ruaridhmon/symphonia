import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Lightbulb, Pencil } from 'lucide-react';
import { API_BASE_URL } from './config';
import { useDocumentTitle } from './hooks/useDocumentTitle';

interface WaitingState {
  formId?: string;
  formTitle?: string;
  roundNumber?: number;
}

export default function WaitingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state as WaitingState) || {};
  const { formId, formTitle, roundNumber } = state;

  useDocumentTitle(formTitle ? `Waiting — ${formTitle}` : 'Waiting for Next Round');
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    // WebSocket setup for live synthesis notification.
    // API_BASE_URL may be empty (same-origin SPA) — fall back to window.location.host.
    let wsHost: string;
    try {
      wsHost = API_BASE_URL ? new URL(API_BASE_URL).host : window.location.host;
    } catch {
      wsHost = window.location.host;
    }
    const wsUrl = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${wsHost}/ws`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'summary_updated') {
          navigate('/result', { replace: true });
        }
      } catch {
        // Ignore unparseable messages
      }
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [navigate]);

  return (
    <div className="flex-1 px-4 py-6 sm:py-8 max-w-6xl mx-auto flex justify-center items-center">
      <div className="card-lg p-8 sm:p-10 max-w-3xl w-full text-center space-y-8 bounce-in">
        {/* Collaborative orbit animation */}
        <div className="waiting-orbit mx-auto">
          <div className="waiting-orbit-dot" />
          <div className="waiting-orbit-dot" />
          <div className="waiting-orbit-dot" />
          <div className="waiting-orbit-dot" />
        </div>

        <div className="space-y-3">
          <h2 className="text-2xl font-semibold text-foreground">
            Thank you for your submission
          </h2>

          {/* Form context — show which form & round */}
          {(formTitle || roundNumber) && (
            <div
              className="inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-full mx-auto"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--accent) 10%, transparent)',
                color: 'var(--accent)',
              }}
            >
              {formTitle && <span className="font-medium">{formTitle}</span>}
              {formTitle && roundNumber && <span style={{ opacity: 0.5 }}>·</span>}
              {roundNumber && <span>Round {roundNumber}</span>}
            </div>
          )}

          <p className="text-lg text-muted-foreground max-w-md mx-auto">
            Your response has been recorded. You'll be notified when the
            synthesis is ready
            <span className="waiting-dots">
              <span>.</span>
              <span>.</span>
              <span>.</span>
            </span>
          </p>
        </div>

        <div
          className="rounded-lg p-4 mx-auto max-w-sm"
          style={{
            backgroundColor: 'var(--muted)',
            border: '1px solid var(--border)',
          }}
        >
          <p className="text-xs text-muted-foreground" style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
            <Lightbulb size={14} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: '1px' }} />
            <span>The facilitator is reviewing all responses and preparing the
            next round. This page will update automatically.</span>
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          {formId && (
            <button
              onClick={() => navigate(`/form/${formId}`)}
              className="inline-flex items-center gap-1.5 text-sm text-accent underline hover:text-accent-hover transition-colors"
            >
              <Pencil size={13} />
              Edit response
            </button>
          )}
          <button
            onClick={() => navigate('/')}
            className="text-sm text-accent underline hover:text-accent-hover transition-colors"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
