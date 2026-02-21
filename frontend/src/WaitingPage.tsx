import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lightbulb } from 'lucide-react';
import { API_BASE_URL } from './config';

export default function WaitingPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    // Fetch user info (async, but WebSocket setup is outside)
    fetch(`${API_BASE_URL}/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data) setEmail(data.email || ''); })
      .catch(err => console.error('[WaitingPage] Fetch error:', err));

    // WebSocket setup — outside async so cleanup works correctly
    const wsUrl = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${new URL(API_BASE_URL).host}/ws`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'summary_updated') {
          navigate('/result', { replace: true });
        }
      } catch (err) {
        console.error('[WaitingPage] Failed to parse WebSocket message:', err);
      }
    };

    ws.onerror = (err) => {
      console.error('[WaitingPage] WebSocket error:', err);
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [navigate]);

  function logout() {
    localStorage.clear();
    navigate('/');
  }

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
            <Lightbulb size={14} style={{ color: '#a855f7', flexShrink: 0, marginTop: '1px' }} />
            <span>The facilitator is reviewing all responses and preparing the
            next round. This page will update automatically.</span>
          </p>
        </div>

        <button
          onClick={() => navigate('/')}
          className="text-sm text-accent underline hover:text-accent-hover transition-colors"
        >
          ← Back to Dashboard
        </button>
      </div>
    </div>
  );
}
