import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PresenceIndicator } from '../index';
import type { PresenceViewer } from '../PresenceIndicator';

type Props = {
  email: string;
  viewers: PresenceViewer[];
  onLogout: () => void;
};

export default function SummaryHeader({ email, viewers, onLogout }: Props) {
  const navigate = useNavigate();

  return (
    <header
      className="border-b sticky top-0 z-40"
      style={{
        backgroundColor: 'var(--card)',
        borderColor: 'var(--border)',
        boxShadow: '0 1px 3px 0 rgba(0,0,0,0.04)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex justify-between items-center">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <div
            className="flex items-center gap-2 sm:gap-3 min-w-0 cursor-pointer"
            onClick={() => navigate('/')}
          >
            <div
              className="flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0"
              style={{
                background: 'linear-gradient(135deg, var(--accent), var(--accent-hover))',
              }}
            >
              <span className="text-sm" role="img" aria-label="Symphonia">🎵</span>
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-foreground leading-tight">
                Admin Workspace
              </h1>
              <p className="text-xs text-muted-foreground leading-tight truncate">{email}</p>
            </div>
          </div>
          <PresenceIndicator viewers={viewers} currentUserEmail={email} />
        </div>
        <button
          onClick={onLogout}
          className="text-sm px-3 py-1.5 rounded-lg transition-colors flex-shrink-0"
          style={{
            color: 'var(--muted-foreground)',
            backgroundColor: 'transparent',
            border: 'none',
            cursor: 'pointer',
          }}
          onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
            e.currentTarget.style.backgroundColor = 'var(--muted)';
            e.currentTarget.style.color = 'var(--destructive)';
          }}
          onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = 'var(--muted-foreground)';
          }}
        >
          Log out
        </button>
      </div>
    </header>
  );
}
