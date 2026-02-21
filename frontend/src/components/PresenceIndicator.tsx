import { useMemo } from 'react';

export interface PresenceViewer {
  email: string;
  page: string;
  color: string;
}

interface PresenceIndicatorProps {
  viewers: PresenceViewer[];
  currentUserEmail?: string;
}

/**
 * Compact presence indicator showing colored avatar dots for active viewers.
 * Designed to fit in a header bar.
 */
export default function PresenceIndicator({ viewers, currentUserEmail }: PresenceIndicatorProps) {
  // Filter out the current user from the displayed viewers
  const otherViewers = useMemo(
    () => viewers.filter((v) => v.email !== currentUserEmail),
    [viewers, currentUserEmail]
  );

  if (otherViewers.length === 0) return null;

  return (
    <div style={styles.container}>
      <div style={styles.dots}>
        {otherViewers.slice(0, 5).map((viewer) => {
          const initial = viewer.email.split('@')[0]?.[0]?.toUpperCase() || '?';
          return (
            <div
              key={viewer.email}
              style={{
                ...styles.dot,
                backgroundColor: viewer.color,
              }}
              title={`${viewer.email} — viewing ${viewer.page}`}
            >
              <span style={styles.initial}>{initial}</span>
            </div>
          );
        })}
        {otherViewers.length > 5 && (
          <div
            style={{
              ...styles.dot,
              backgroundColor: 'var(--muted)',
              color: 'var(--muted-foreground)',
            }}
            title={otherViewers
              .slice(5)
              .map((v) => v.email)
              .join(', ')}
          >
            <span style={styles.initial}>+{otherViewers.length - 5}</span>
          </div>
        )}
      </div>
      <span style={styles.label}>
        {otherViewers.length} viewing
      </span>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    animation: 'presenceFadeIn 0.3s ease-out',
  },
  dots: {
    display: 'flex',
    alignItems: 'center',
    gap: '0px',
  },
  dot: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '2px solid var(--card)',
    marginLeft: '-6px',
    cursor: 'default',
    transition: 'transform 0.15s ease, opacity 0.3s ease',
    flexShrink: 0,
  },
  initial: {
    fontSize: '11px',
    fontWeight: 600,
    color: '#ffffff',
    lineHeight: 1,
    userSelect: 'none' as const,
  },
  label: {
    fontSize: '12px',
    color: 'var(--muted-foreground)',
    fontWeight: 500,
    whiteSpace: 'nowrap' as const,
  },
};

// Inject the keyframe animation once
if (typeof document !== 'undefined') {
  const styleId = 'presence-indicator-styles';
  if (!document.getElementById(styleId)) {
    const styleEl = document.createElement('style');
    styleEl.id = styleId;
    styleEl.textContent = `
      @keyframes presenceFadeIn {
        from { opacity: 0; transform: translateY(-4px); }
        to { opacity: 1; transform: translateY(0); }
      }
    `;
    document.head.appendChild(styleEl);
  }
}
