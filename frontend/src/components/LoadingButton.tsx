import { ButtonHTMLAttributes, ReactNode } from 'react';

interface LoadingButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  loadingText?: string;
  variant?: 'accent' | 'secondary' | 'destructive' | 'success' | 'purple' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: ReactNode;
  children: ReactNode;
}

const variantStyles: Record<string, React.CSSProperties> = {
  accent: { backgroundColor: 'var(--accent)', color: 'var(--accent-foreground)' },
  secondary: { backgroundColor: 'var(--secondary)', color: 'var(--secondary-foreground)', border: '1px solid var(--border)' },
  destructive: { backgroundColor: 'var(--destructive)', color: 'var(--destructive-foreground)' },
  success: { backgroundColor: 'var(--success)', color: 'var(--accent-foreground)' },
  purple: { backgroundColor: 'var(--accent)', color: 'var(--accent-foreground)' },
  ghost: { backgroundColor: 'transparent', color: 'var(--foreground)', border: '1px solid var(--border)' },
};

const sizeClasses: Record<string, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-3 text-base',
};

export default function LoadingButton({
  loading = false,
  loadingText,
  variant = 'accent',
  size = 'md',
  icon,
  children,
  disabled,
  className = '',
  style,
  ...props
}: LoadingButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      className={`btn-interactive ${sizeClasses[size]} ${className}`}
      style={{ ...variantStyles[variant], ...style }}
      disabled={isDisabled}
      {...props}
    >
      {loading ? (
        <>
          <span className="spinner" />
          <span>{loadingText || children}</span>
        </>
      ) : (
        <>
          {icon && <span className="btn-icon">{icon}</span>}
          {children}
        </>
      )}
    </button>
  );
}
