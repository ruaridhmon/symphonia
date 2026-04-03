import { ChevronLeft } from 'lucide-react';
import { Link, type To } from 'react-router-dom';

interface BackLinkProps {
  label: string;
  to?: To;
  onClick?: () => void;
  className?: string;
  ariaLabel?: string;
}

export default function BackLink({
  label,
  to,
  onClick,
  className = '',
  ariaLabel,
}: BackLinkProps) {
  const combinedClassName = `inline-flex items-center gap-1.5 text-sm font-medium no-underline transition-colors duration-200 focus-visible:outline-none ${className}`.trim();
  const content = (
    <>
      <ChevronLeft size={15} />
      <span>{label}</span>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={combinedClassName}
        aria-label={ariaLabel ?? label}
        style={{
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          color: 'var(--muted-foreground)',
        }}
        onMouseEnter={(event) => {
          event.currentTarget.style.color = 'var(--foreground)';
        }}
        onMouseLeave={(event) => {
          event.currentTarget.style.color = 'var(--muted-foreground)';
        }}
      >
        {content}
      </button>
    );
  }

  if (to === undefined) {
    return null;
  }

  return (
    <Link
      to={to}
      className={combinedClassName}
      aria-label={ariaLabel ?? label}
      style={{ color: 'var(--muted-foreground)' }}
      onMouseEnter={(event) => {
        event.currentTarget.style.color = 'var(--foreground)';
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.color = 'var(--muted-foreground)';
      }}
    >
      {content}
    </Link>
  );
}
