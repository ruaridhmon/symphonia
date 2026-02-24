import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from './AuthContext';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { LoadingButton, PasswordInput } from './components';
import { useDocumentTitle } from './hooks/useDocumentTitle';

export default function Login() {
  const { t } = useTranslation();
  useDocumentTitle(t('auth.signIn'));
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [sessionExpired, setSessionExpired] = useState(false);
  const { login, token, isLoading } = useAuth();
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Check if redirected due to session expiry
  useEffect(() => {
    if (searchParams.get('expired') === '1') {
      setSessionExpired(true);
      // Clean up URL
      window.history.replaceState({}, '', '/login');
    }
  }, [searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoggingIn(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.loginFailed'));
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Wait for session restore to complete before deciding to redirect.
  // Without this guard, a stale csrf_token cookie causes an instant bounce
  // to "/" before the session is validated — triggering an infinite loop.
  if (isLoading) return null;

  if (token) {
    return <Navigate to="/" />;
  }

  return (
    <form
      onSubmit={handleLogin}
      className="card-lg p-8 sm:p-10 w-full space-y-5"
    >
      <h2 className="text-base font-medium text-center" style={{ color: 'var(--muted-foreground)' }}>
        {t('auth.signIn')}
      </h2>
      <div aria-live="polite" aria-atomic="true" className="space-y-3">
        {sessionExpired && (
          <div
            className="rounded-lg px-4 py-3 text-sm text-center"
            role="status"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--accent) 10%, transparent)',
              color: 'var(--accent)',
              border: '1px solid color-mix(in srgb, var(--accent) 25%, transparent)',
            }}
          >
            {t('auth.sessionExpired')}
          </div>
        )}
        {error && (
          <div
            className="rounded-lg px-4 py-3 text-sm text-center"
            role="alert"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--destructive) 10%, transparent)',
              color: 'var(--destructive)',
              border: '1px solid color-mix(in srgb, var(--destructive) 25%, transparent)',
            }}
          >
            {error}
          </div>
        )}
      </div>
      <div className="space-y-1.5">
        <label htmlFor="login-email" className="block text-sm font-medium" style={{ color: 'var(--foreground)' }}>
          {t('auth.emailLabel')}
        </label>
        <input
          id="login-email"
          type="email"
          placeholder={t('auth.emailPlaceholder')}
          required
          autoComplete="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="w-full px-4 py-2.5 rounded-lg"
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="login-password" className="block text-sm font-medium" style={{ color: 'var(--foreground)' }}>
          {t('auth.passwordLabel')}
        </label>
        <PasswordInput
          id="login-password"
          placeholder={t('auth.passwordPlaceholder')}
          required
          autoComplete="current-password"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />
      </div>
      <LoadingButton
        type="submit"
        variant="accent"
        size="lg"
        loading={isLoggingIn || isLoading}
        loadingText={t('auth.signingIn')}
        className="w-full"
      >
        {t('auth.signIn')}
      </LoadingButton>
      <div className="text-sm text-center" style={{ color: 'var(--muted-foreground)' }}>
        {t('auth.noAccount')}{' '}
        <Link to="/register" className="font-medium" style={{ color: 'var(--accent)' }}>
          {t('auth.createOne')}
        </Link>
      </div>
    </form>
  );
}
