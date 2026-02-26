import { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword } from './api/auth';
import { LoadingButton } from './components';
import { useDocumentTitle } from './hooks/useDocumentTitle';

export default function ForgotPassword() {
  useDocumentTitle('Forgot Password');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await forgotPassword(email);
      setSubmitted(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="card-lg p-8 sm:p-10 w-full space-y-5">
        <h2 className="text-base font-medium text-center" style={{ color: 'var(--muted-foreground)' }}>
          Check Your Email
        </h2>
        <div
          className="rounded-lg px-4 py-3 text-sm text-center"
          role="status"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--accent) 10%, transparent)',
            color: 'var(--accent)',
            border: '1px solid color-mix(in srgb, var(--accent) 25%, transparent)',
          }}
        >
          If that email is registered, a reset link has been sent. Check your inbox.
        </div>
        <div className="text-sm text-center" style={{ color: 'var(--muted-foreground)' }}>
          <Link to="/login" className="font-medium" style={{ color: 'var(--accent)' }}>
            Back to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="card-lg p-8 sm:p-10 w-full space-y-5"
    >
      <h2 className="text-base font-medium text-center" style={{ color: 'var(--muted-foreground)' }}>
        Forgot Password
      </h2>
      <p className="text-sm text-center" style={{ color: 'var(--muted-foreground)' }}>
        Enter your email address and we'll send you a link to reset your password.
      </p>
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
        <label htmlFor="forgot-email" className="block text-sm font-medium" style={{ color: 'var(--foreground)' }}>
          Email address
        </label>
        <input
          id="forgot-email"
          type="email"
          placeholder="you@example.com"
          required
          autoComplete="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="w-full px-4 py-2.5 rounded-lg"
        />
      </div>
      <LoadingButton
        type="submit"
        variant="accent"
        size="lg"
        loading={isSubmitting}
        loadingText="Sending…"
        className="w-full"
      >
        Send Reset Link
      </LoadingButton>
      <div className="text-sm text-center" style={{ color: 'var(--muted-foreground)' }}>
        <Link to="/login" className="font-medium" style={{ color: 'var(--accent)' }}>
          Back to Sign In
        </Link>
      </div>
    </form>
  );
}
