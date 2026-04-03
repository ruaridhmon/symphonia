import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from './AuthContext';
import { Link, Navigate } from 'react-router-dom';
import { ApiError } from './api/client';
import { register as apiRegister } from './api/auth';
import { LoadingButton, PasswordInput } from './components';
import RouteLoadingFallback from './components/RouteLoadingFallback';
import { useDocumentTitle } from './hooks/useDocumentTitle';

export default function Register() {
  const { t } = useTranslation();
  useDocumentTitle(t('auth.registerTitle'));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const { login, token, isLoading } = useAuth();
  const [isRegistering, setIsRegistering] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsRegistering(true);

    try {
      try {
        await apiRegister(email, password);
      } catch (e) {
        if (e instanceof ApiError) {
          if (e.status === 409) throw new Error(t('auth.emailExists'));
          if (e.status === 422) throw new Error(t('auth.invalidFormat'));
          if (e.status >= 500) throw new Error(t('auth.serverError'));
          throw new Error(t('auth.registrationFailed'));
        }
        throw new Error(t('auth.connectionError'));
      }

      await login(email, password);

    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.registrationFailed'));
    } finally {
      setIsRegistering(false);
    }
  };

  if (isLoading) {
    return <RouteLoadingFallback />;
  }

  if (token) {
    return <Navigate to="/" />;
  }

  return (
    <form
      onSubmit={handleRegister}
      className="auth-panel w-full space-y-5"
    >
      <div className="auth-header">
        <h1 className="auth-title">{t('auth.registerTitle')}</h1>
      </div>
      <div aria-live="polite" aria-atomic="true">
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
          id="register-email"
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
        <label htmlFor="register-email" className="auth-floating-label">
          {t('auth.emailLabel')}
        </label>
      </div>
      <div className={`auth-floating-field ${passwordFocused || password ? 'is-active' : ''}`}>
        <PasswordInput
          id="register-password"
          placeholder=" "
          required
          autoComplete="new-password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onFocus={() => setPasswordFocused(true)}
          onBlur={() => setPasswordFocused(false)}
          className="auth-floating-input auth-floating-input-password"
          wrapperClassName="auth-floating-password"
        />
        <label htmlFor="register-password" className="auth-floating-label">
          {t('auth.passwordLabel')}
        </label>
      </div>
      <LoadingButton
        type="submit"
        variant="accent"
        size="lg"
        loading={isRegistering || isLoading}
        loadingText={t('auth.creatingAccount')}
        className="w-full auth-submit"
      >
        {t('auth.createAccount')}
      </LoadingButton>
      <div>
        <Link to="/login" className="auth-secondary-cta">
          {t('auth.signIn')}
        </Link>
      </div>
    </form>
  );
}
