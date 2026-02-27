import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { magicJoin } from './api/forms';
import { ApiError } from './api/client';
import Container from './layouts/Container';
import { useDocumentTitle } from './hooks/useDocumentTitle';

/**
 * Magic-link join page: /join/:code
 *
 * If authenticated: auto-joins the consultation and redirects to the form.
 * If not authenticated: stores the code and redirects to register, with
 * auto-join after login (handled by AuthContext).
 */
export default function JoinPage() {
  useDocumentTitle('Join Consultation');
  const { code } = useParams<{ code: string }>();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (!code) return;

    if (!token) {
      // Store code for post-login auto-join
      sessionStorage.setItem('pending_join_code', code);
      navigate('/register', { replace: true });
      return;
    }

    setJoining(true);
    magicJoin(code)
      .then((result) => {
        navigate(`/form/${result.form_id}`, { replace: true });
      })
      .catch((err) => {
        if (err instanceof ApiError) {
          try {
            const body = JSON.parse(err.message);
            setError(body.detail || err.message);
          } catch {
            setError(err.message);
          }
        } else {
          setError('Failed to join. Please try again.');
        }
      })
      .finally(() => setJoining(false));
  }, [code, token, navigate]);

  return (
    <section className="flex-1 py-6 sm:py-8">
      <Container size="sm">
        <div
          className="rounded-xl p-6 sm:p-8 text-center"
          style={{
            backgroundColor: 'var(--card)',
            border: '1px solid var(--border)',
          }}
        >
          {joining && (
            <>
              <div
                className="w-8 h-8 mx-auto mb-3 rounded-full border-2 border-t-transparent animate-spin"
                style={{ borderColor: 'var(--border)', borderTopColor: 'transparent' }}
              />
              <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Joining consultation...</p>
            </>
          )}
          {error && (
            <>
              <p className="text-sm font-medium mb-3" style={{ color: 'var(--destructive)' }}>{error}</p>
              <button
                onClick={() => navigate('/')}
                className="text-sm px-4 py-2 rounded-lg"
                style={{ backgroundColor: 'var(--accent)', color: 'white' }}
              >
                Go to Dashboard
              </button>
            </>
          )}
        </div>
      </Container>
    </section>
  );
}
