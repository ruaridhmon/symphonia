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

  if (token && !isLoading) {
    return <Navigate to="/" replace />;
  }

  return (
    <form
      onSubmit={handleLogin}
      className="auth-panel w-full space-y-5"
    >
      <div className="text-center">
        <h1 className="auth-title">{t('auth.loginTitle')}</h1>
      </div>
      <div aria-live="polite" aria-atomic="true" className="space-y-3">
        {sessionExpired && (
          <div
            className="auth-feedback auth-feedback-info"
            role="status"
          >
            {t('auth.sessionExpired')}
          </div>
        )}
        {error && (
          <div
            className="auth-feedback auth-feedback-error"
            role="alert"
          >
            {error}
          </div>
        )}
      </div>
      <div className="auth-floating-field">
        <input
          id="login-email"
          type="email"
          placeholder=" "
          required
          autoComplete="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="w-full auth-floating-input"
        />
        <label htmlFor="login-email" className="auth-floating-label">
          {t('auth.emailLabel')}
        </label>
      </div>
      <div className="auth-floating-field">
        <PasswordInput
          id="login-password"
          placeholder=" "
          required
          autoComplete="current-password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="auth-floating-input auth-floating-input-password"
          wrapperClassName="auth-floating-password"
        />
        <label htmlFor="login-password" className="auth-floating-label">
          {t('auth.passwordLabel')}
        </label>
      </div>
      <div className="text-right">
        <Link to="/forgot-password" className="auth-link text-sm font-medium">
          Forgot password?
        </Link>
      </div>
      <LoadingButton
        type="submit"
        variant="accent"
        size="lg"
        loading={isLoggingIn}
        disabled={isLoading}
        loadingText={t('auth.signingIn')}
        className="w-full auth-submit"
      >
        {t('auth.signIn')}
      </LoadingButton>
      <div className="text-sm text-center auth-footnote">
        {t('auth.noAccount')}{' '}
        <Link to="/register" className="auth-link font-medium">
          {t('auth.createOne')}
        </Link>
      </div>
    </form>
  );
}
