import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';
import { LoadingButton } from './components';
import { useDocumentTitle } from './hooks/useDocumentTitle';

/**
 * 404 Not Found page — themed, friendly, with navigation options.
 */
export default function NotFoundPage() {
  useDocumentTitle('Page Not Found');
  const navigate = useNavigate();

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{
        backgroundColor: 'var(--background)',
        color: 'var(--foreground)',
        fontFamily: 'var(--font-family)',
      }}
    >
      <div
        className="text-center max-w-md mx-auto p-8 rounded-xl"
        style={{
          backgroundColor: 'var(--card)',
          boxShadow: 'var(--card-shadow-lg)',
          border: '1px solid var(--border)',
        }}
      >
        {/* Large 404 indicator */}
        <div
          className="w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center text-3xl"
          style={{
            background: 'linear-gradient(135deg, var(--accent), var(--accent-hover))',
            opacity: 0.15,
          }}
        >
          <span style={{ opacity: 1 }}>🎵</span>
        </div>

        <h1
          className="text-6xl font-bold tracking-tight mb-2"
          style={{ color: 'var(--accent)' }}
        >
          404
        </h1>

        <h2
          className="text-xl font-semibold mb-3"
          style={{ color: 'var(--foreground)' }}
        >
          Page not found
        </h2>

        <p
          className="text-sm mb-8 leading-relaxed"
          style={{ color: 'var(--muted-foreground)' }}
        >
          The page you're looking for doesn't exist or has been moved.
          Let's get you back on track.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <LoadingButton
            variant="ghost"
            size="md"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft size={16} />
            Go back
          </LoadingButton>

          <LoadingButton
            variant="accent"
            size="md"
            onClick={() => navigate('/')}
          >
            <Home size={16} />
            Dashboard
          </LoadingButton>
        </div>
      </div>
    </div>
  );
}
