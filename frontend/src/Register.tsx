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
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <form
        onSubmit={handleRegister}
        className="card-lg p-8 sm:p-10 max-w-md w-full space-y-5"
      >
        <h1 className="text-xl font-semibold text-center text-foreground">Register</h1>
        {error && (
          <p className="text-destructive text-sm text-center">{error}</p>
        )}
        <input
          type="email"
          placeholder="Email"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="w-full px-4 py-2.5 rounded-lg"
        />
        <input
          type="password"
          placeholder="Password"
          required
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="w-full px-4 py-2.5 rounded-lg"
        />
        <LoadingButton
          type="submit"
          variant="accent"
          size="lg"
          loading={isRegistering || isLoading}
          loadingText="Registering…"
          className="w-full"
        >
          Register & Login
        </LoadingButton>
        <div className="text-sm text-center">
          <Link to="/login" className="text-accent underline">
            Already have an account? Login
          </Link>
        </div>
      </form>
    </div>
  );
}
