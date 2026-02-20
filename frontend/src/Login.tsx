import { useState } from 'react';
import { useAuth } from './AuthContext';
import { Link, Navigate } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, token, isLoading } = useAuth();
  const [isLoggingIn, setIsLoggingIn] = useState(false);


  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoggingIn(true);
    try {
      await login(email, password);
    } catch (err) {
      setError('Login failed. Please check your credentials.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (token) {
    return <Navigate to="/" />;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <form
        onSubmit={handleLogin}
        className="card-lg p-8 sm:p-10 max-w-md w-full space-y-5"
      >
        <h1 className="text-xl font-semibold text-center text-foreground">Login</h1>
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
        <button
          type="submit"
          disabled={isLoggingIn || isLoading}
          className="btn btn-accent w-full py-2.5 text-base"
        >
          {isLoggingIn ? 'Logging in…' : 'Login'}
        </button>
        <div className="text-sm text-center">
          <Link to="/register" className="text-accent underline">
            No account? Register
          </Link>
        </div>
      </form>
    </div>
  );
}
