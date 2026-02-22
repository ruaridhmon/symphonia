import { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';

/**
 * Displays a non-intrusive banner when the browser goes offline.
 * Automatically hides when connectivity is restored.
 */
export default function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => setIsOffline(false);

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div
      role="status"
      aria-live="assertive"
      className="offline-banner"
      style={{
        position: 'fixed',
        bottom: 'env(safe-area-inset-bottom, 0)',
        left: 0,
        right: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        padding: '10px 16px',
        backgroundColor: 'var(--destructive)',
        color: 'var(--destructive-foreground)',
        fontSize: '0.875rem',
        fontWeight: 500,
        fontFamily: 'var(--font-family)',
        animation: 'slide-up 0.3s ease-out',
      }}
    >
      <WifiOff size={16} />
      <span>You're offline — changes won't be saved until you reconnect</span>
    </div>
  );
}
