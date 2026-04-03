import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { resetPassword } from './api/auth';
import { LoadingButton, PasswordInput } from './components';
import { useDocumentTitle } from './hooks/useDocumentTitle';

export default function ResetPassword() {
  useDocumentTitle('Reset Password');
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirmPasswordFocused, setConfirmPasswordFocused] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (!token) {
      setError('Missing reset token. Please use the link from your email.');
      return;
    }

    setIsSubmitting(true);
    try {
      await resetPassword(token, password);
      setSuccess(true);
    } catch {
      setError('Invalid or expired reset token. Please request a new one.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="auth-panel w-full space-y-5">
        <div className="auth-header">
          <h1 className="auth-title">Password reset</h1>
        </div>
        <div
          className="auth-feedback auth-feedback-info"
          role="status"
        >
          Your password has been reset successfully. You can now sign in with your new password.
        </div>
        <div>
          <Link to="/login" className="auth-secondary-cta">
            Sign in
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
        <h1 className="auth-title">Set a new password</h1>
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
      <div className={`auth-floating-field ${passwordFocused || password ? 'is-active' : ''}`}>
        <PasswordInput
          id="reset-password"
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
        <label htmlFor="reset-password" className="auth-floating-label">
          New password
        </label>
      </div>
      <div className={`auth-floating-field ${confirmPasswordFocused || confirmPassword ? 'is-active' : ''}`}>
        <PasswordInput
          id="reset-confirm-password"
          placeholder=" "
          required
          autoComplete="new-password"
          value={confirmPassword}
          onChange={e => setConfirmPassword(e.target.value)}
          onFocus={() => setConfirmPasswordFocused(true)}
          onBlur={() => setConfirmPasswordFocused(false)}
          className="auth-floating-input auth-floating-input-password"
          wrapperClassName="auth-floating-password"
        />
        <label htmlFor="reset-confirm-password" className="auth-floating-label">
          Confirm new password
        </label>
      </div>
      <LoadingButton
        type="submit"
        variant="accent"
        size="lg"
        loading={isSubmitting}
        loadingText="Resetting…"
        className="w-full auth-submit"
      >
        Reset Password
      </LoadingButton>
      <div>
        <Link to="/login" className="auth-secondary-cta">
          Back to sign in
        </Link>
      </div>
    </form>
  );
}
