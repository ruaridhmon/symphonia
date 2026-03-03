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
  useDocumentTitle(t('auth.createAccount'));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
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
      className="card-lg p-8 sm:p-10 w-full space-y-5"
    >
      <h1 className="sr-only">{t('auth.createAccount')}</h1>
      <h2 className="text-base font-medium text-center" aria-hidden="true" style={{ color: 'var(--muted-foreground)' }}>
        {t('auth.createAccount')}
      </h2>
      <div aria-live="polite" aria-atomic="true">
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
        <label htmlFor="register-email" className="block text-sm font-medium" style={{ color: 'var(--foreground)' }}>
          {t('auth.emailLabel')}
        </label>
        <input
          id="register-email"
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
        <label htmlFor="register-password" className="block text-sm font-medium" style={{ color: 'var(--foreground)' }}>
          {t('auth.passwordLabel')}
        </label>
        <PasswordInput
          id="register-password"
          placeholder={t('auth.passwordPlaceholder')}
          required
          autoComplete="new-password"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />
      </div>
      <LoadingButton
        type="submit"
        variant="accent"
        size="lg"
        loading={isRegistering || isLoading}
        loadingText={t('auth.creatingAccount')}
        className="w-full"
      >
        {t('auth.createAccount')}
      </LoadingButton>
      <div className="text-sm text-center" style={{ color: 'var(--muted-foreground)' }}>
        {t('auth.alreadyHaveAccount')}{' '}
        <Link to="/login" className="font-medium" style={{ color: 'var(--accent)' }}>
          {t('auth.signInLink')}
        </Link>
      </div>
    </form>
  );
}
