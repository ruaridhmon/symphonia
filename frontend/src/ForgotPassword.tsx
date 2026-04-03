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
  const [emailFocused, setEmailFocused] = useState(false);

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
      <div className="auth-panel w-full space-y-5">
        <div className="auth-header">
          <h1 className="auth-title">Check your email</h1>
        </div>
        <div
          className="auth-feedback auth-feedback-info"
          role="status"
        >
          If that email is registered, a reset link has been sent. Check your inbox.
        </div>
        <div>
          <Link to="/login" className="auth-secondary-cta">
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="auth-panel w-full space-y-5"
    >
      <div className="auth-header">
        <h1 className="auth-title">Forgot your password?</h1>
      </div>
      <p className="text-sm text-center" style={{ color: 'var(--muted-foreground)' }}>
        Enter your email and we&apos;ll send you a reset link.
      </p>
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
          id="forgot-email"
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
        <label htmlFor="forgot-email" className="auth-floating-label">
          Email address
        </label>
      </div>
      <LoadingButton
        type="submit"
        variant="accent"
        size="lg"
        loading={isSubmitting}
        loadingText="Sending…"
        className="w-full auth-submit"
      >
        Send Reset Link
      </LoadingButton>
      <div>
        <Link to="/login" className="auth-secondary-cta">
          Back to sign in
        </Link>
      </div>
    </form>
  );
}
