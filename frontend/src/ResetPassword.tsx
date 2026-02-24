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
      <div className="card-lg p-8 sm:p-10 w-full space-y-5">
        <h2 className="text-base font-medium text-center" style={{ color: 'var(--muted-foreground)' }}>
          Password Reset
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
          Your password has been reset successfully. You can now sign in with your new password.
        </div>
        <div className="text-sm text-center" style={{ color: 'var(--muted-foreground)' }}>
          <Link to="/login" className="font-medium" style={{ color: 'var(--accent)' }}>
            Sign In
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
        Reset Password
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
        <label htmlFor="reset-password" className="block text-sm font-medium" style={{ color: 'var(--foreground)' }}>
          New password
        </label>
        <PasswordInput
          id="reset-password"
          placeholder="••••••••"
          required
          autoComplete="new-password"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="reset-confirm-password" className="block text-sm font-medium" style={{ color: 'var(--foreground)' }}>
          Confirm new password
        </label>
        <PasswordInput
          id="reset-confirm-password"
          placeholder="••••••••"
          required
          autoComplete="new-password"
          value={confirmPassword}
          onChange={e => setConfirmPassword(e.target.value)}
        />
      </div>
      <LoadingButton
        type="submit"
        variant="accent"
        size="lg"
        loading={isSubmitting}
        loadingText="Resetting…"
        className="w-full"
      >
        Reset Password
      </LoadingButton>
      <div className="text-sm text-center" style={{ color: 'var(--muted-foreground)' }}>
        <Link to="/login" className="font-medium" style={{ color: 'var(--accent)' }}>
          Back to Sign In
        </Link>
      </div>
    </form>
  );
}
