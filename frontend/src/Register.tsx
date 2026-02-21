import { useState } from 'react';
import { useAuth } from './AuthContext';
import { Link, Navigate } from 'react-router-dom';
import { API_BASE_URL } from './config';
import { LoadingButton } from './components';

export default function Register() {
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
      const reg = await fetch(`${API_BASE_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ email, password })
      });

      if (!reg.ok) {
        throw new Error('Registration failed');
      }

      await login(email, password);

    } catch (err) {
      setError('Registration failed. Please try again.');
    } finally {
      setIsRegistering(false);
    }
  };

  if (token) {
    return <Navigate to="/" />;
  }

  return (
    <form
      onSubmit={handleRegister}
      className="card-lg p-8 sm:p-10 w-full space-y-5"
    >
      <h2 className="text-lg font-semibold text-center" style={{ color: 'var(--foreground)' }}>
        Create your account
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
        <label className="block text-sm font-medium" style={{ color: 'var(--foreground)' }}>
          Email address
        </label>
        <input
          type="email"
          placeholder="you@example.com"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="w-full px-4 py-2.5 rounded-lg"
        />
      </div>
      <div className="space-y-1.5">
        <label className="block text-sm font-medium" style={{ color: 'var(--foreground)' }}>
          Password
        </label>
        <input
          type="password"
          placeholder="••••••••"
          required
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="w-full px-4 py-2.5 rounded-lg"
        />
      </div>
      <LoadingButton
        type="submit"
        variant="accent"
        size="lg"
        loading={isRegistering || isLoading}
        loadingText="Creating account…"
        className="w-full"
      >
        Create Account
      </LoadingButton>
      <div className="text-sm text-center" style={{ color: 'var(--muted-foreground)' }}>
        Already have an account?{' '}
        <Link to="/login" className="font-medium" style={{ color: 'var(--accent)' }}>
          Sign in
        </Link>
      </div>
    </form>
  );
}
