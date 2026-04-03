import { ChevronLeft } from 'lucide-react';
import { Link, type To } from 'react-router-dom';

interface BackLinkProps {
  label: string;
  to?: To;
  onClick?: () => void;
  className?: string;
  ariaLabel?: string;
}

const baseClassName =
  'inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground no-underline transition-colors hover:text-foreground focus-visible:outline-none';

export default function BackLink({
  label,
  to,
  onClick,
  className = '',
  ariaLabel,
}: BackLinkProps) {
  const combinedClassName = `${baseClassName} ${className}`.trim();

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
        }}
      >
        <ChevronLeft size={16} />
        <span>{label}</span>
      </button>
    );
  }

  if (to === undefined) {
    return null;
  }

  return (
    <Link to={to} className={combinedClassName} aria-label={ariaLabel ?? label}>
      <ChevronLeft size={16} />
      <span>{label}</span>
    </Link>
  );
}
