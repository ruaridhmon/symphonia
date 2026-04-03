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
  const combinedClassName = `${className}`.trim();
  const content = (
    <>
      <span
        className="inline-flex h-7 w-7 items-center justify-center rounded-full transition-colors"
        style={{
          border: '1px solid color-mix(in srgb, var(--border) 88%, transparent)',
          backgroundColor: 'var(--card)',
          color: 'var(--muted-foreground)',
          boxShadow: '0 1px 2px rgba(15, 23, 42, 0.06)',
        }}
      >
        <ChevronLeft size={14} />
      </span>
      <span>{label}</span>
    </>
  );
  const sharedStyle = {
    color: 'var(--muted-foreground)',
    backgroundColor: 'color-mix(in srgb, var(--card) 92%, var(--muted) 8%)',
    border: '1px solid color-mix(in srgb, var(--border) 86%, transparent)',
    borderRadius: 999,
    padding: '0.375rem 0.875rem 0.375rem 0.375rem',
    boxShadow: '0 10px 24px rgba(15, 23, 42, 0.04), 0 1px 2px rgba(15, 23, 42, 0.05)',
    backdropFilter: 'blur(8px)',
  } as const;
  const handleMouseEnter = (element: HTMLElement) => {
    element.style.color = 'var(--foreground)';
    element.style.borderColor = 'color-mix(in srgb, var(--accent) 34%, var(--border))';
    element.style.backgroundColor = 'color-mix(in srgb, var(--accent) 7%, var(--card))';
    element.style.transform = 'translateY(-1px)';
    const icon = element.querySelector('span');
    if (icon instanceof HTMLElement) {
      icon.style.color = 'var(--accent)';
      icon.style.borderColor = 'color-mix(in srgb, var(--accent) 40%, var(--border))';
      icon.style.backgroundColor = 'color-mix(in srgb, var(--accent) 10%, var(--card))';
    }
  };
  const handleMouseLeave = (element: HTMLElement) => {
    element.style.color = 'var(--muted-foreground)';
    element.style.borderColor = 'color-mix(in srgb, var(--border) 86%, transparent)';
    element.style.backgroundColor = 'color-mix(in srgb, var(--card) 92%, var(--muted) 8%)';
    element.style.transform = 'translateY(0)';
    const icon = element.querySelector('span');
    if (icon instanceof HTMLElement) {
      icon.style.color = 'var(--muted-foreground)';
      icon.style.borderColor = 'color-mix(in srgb, var(--border) 88%, transparent)';
      icon.style.backgroundColor = 'var(--card)';
    }
  };

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`inline-flex items-center gap-2 text-sm font-medium no-underline transition-all duration-200 focus-visible:outline-none ${combinedClassName}`.trim()}
        aria-label={ariaLabel ?? label}
        style={{
          ...sharedStyle,
          cursor: 'pointer',
        }}
        onMouseEnter={(event) => handleMouseEnter(event.currentTarget)}
        onMouseLeave={(event) => handleMouseLeave(event.currentTarget)}
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
      className={`inline-flex items-center gap-2 text-sm font-medium no-underline transition-all duration-200 focus-visible:outline-none ${combinedClassName}`.trim()}
      aria-label={ariaLabel ?? label}
      style={sharedStyle}
      onMouseEnter={(event) => handleMouseEnter(event.currentTarget)}
      onMouseLeave={(event) => handleMouseLeave(event.currentTarget)}
    >
      {content}
    </Link>
  );
}
