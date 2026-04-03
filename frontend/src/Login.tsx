import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from './AuthContext';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { LoadingButton, PasswordInput } from './components';
import { useDocumentTitle } from './hooks/useDocumentTitle';

export default function Login() {
  const { t } = useTranslation();
  useDocumentTitle(t('auth.loginTitle'));
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [sessionExpired, setSessionExpired] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
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
      <div className="auth-header">
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
      <div className={`auth-floating-field ${emailFocused || email ? 'is-active' : ''}`}>
        <input
          id="login-email"
          type="email"
          placeholder=" "
          required
          autoComplete="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onFocus={() => setEmailFocused(true)}
          onBlur={() => setEmailFocused(false)}
          className="w-full auth-floating-input"
        />
        <label htmlFor="login-email" className="auth-floating-label">
          {t('auth.emailLabel')}
        </label>
      </div>
      <div className={`auth-floating-field ${passwordFocused || password ? 'is-active' : ''}`}>
        <PasswordInput
          id="login-password"
          placeholder=" "
          required
          autoComplete="current-password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onFocus={() => setPasswordFocused(true)}
          onBlur={() => setPasswordFocused(false)}
          className="auth-floating-input auth-floating-input-password"
          wrapperClassName="auth-floating-password"
        />
        <label htmlFor="login-password" className="auth-floating-label">
          {t('auth.passwordLabel')}
        </label>
      </div>
      <LoadingButton
        type="submit"
        variant="accent"
        size="lg"
        loading={isLoggingIn}
        disabled={isLoading}
        loadingText={t('auth.signingIn')}
        className="w-full auth-submit"
        style={{ backgroundColor: 'var(--auth-accent)', color: 'var(--accent-foreground)' }}
      >
        {t('auth.signIn')}
      </LoadingButton>
      <div className="text-center">
        <Link to="/forgot-password" className="auth-text-link text-sm font-medium">
          Forgot password?
        </Link>
      </div>
      <div>
        <Link to="/register" className="auth-secondary-cta">
          {t('auth.createAccount')}
        </Link>
      </div>
    </form>
  );
}
