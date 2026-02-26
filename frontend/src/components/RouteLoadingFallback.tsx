import { Loader2 } from 'lucide-react';

/**
 * Lightweight loading spinner for React.lazy route transitions.
 * Used as the Suspense fallback in AppRouter.
 */
export default function RouteLoadingFallback() {
  return (
    <div
      className="flex items-center justify-center"
      style={{ minHeight: '60vh' }}
    >
      <div className="flex flex-col items-center gap-3">
        <Loader2
          className="animate-spin"
          size={32}
          style={{ color: 'var(--accent)' }}
        />
        <p
          className="text-sm font-medium"
          style={{ color: 'var(--muted-foreground)' }}
        >
          Loading…
        </p>
      </div>
    </div>
  );
}
