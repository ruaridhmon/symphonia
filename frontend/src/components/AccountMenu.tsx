import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, LogOut } from 'lucide-react';

type Props = {
  email: string;
  onLogout: () => void;
};

function getInitials(email: string): string {
  const localPart = email.split('@')[0] || '';
  const tokens = localPart
    .split(/[^a-zA-Z0-9]+/)
    .map((token) => token.trim())
    .filter(Boolean);

  if (tokens.length >= 2) {
    return `${tokens[0][0] || ''}${tokens[1][0] || ''}`.toUpperCase();
  }

  if (tokens.length === 1 && tokens[0].length >= 2) {
    return tokens[0].slice(0, 2).toUpperCase();
  }

  return (localPart.slice(0, 2) || '?').toUpperCase();
}

export default function AccountMenu({ email, onLogout }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const initials = useMemo(() => getInitials(email), [email]);

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('header.accountMenu', 'Open account menu')}
        className="inline-flex items-center gap-2 rounded-full pl-1 pr-2 py-1 transition-colors"
        style={{
          border: '1px solid color-mix(in srgb, var(--border) 65%, transparent)',
          backgroundColor: open ? 'color-mix(in srgb, var(--muted) 72%, transparent)' : 'transparent',
          color: 'var(--foreground)',
        }}
        onClick={() => setOpen((current) => !current)}
        onMouseEnter={(e) => {
          if (!open) {
            e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--muted) 72%, transparent)';
          }
        }}
        onMouseLeave={(e) => {
          if (!open) {
            e.currentTarget.style.backgroundColor = 'transparent';
          }
        }}
      >
        <span
          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-semibold tracking-[0.08em]"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--accent) 12%, transparent)',
            color: 'var(--accent)',
          }}
        >
          {initials}
        </span>
        <ChevronDown size={14} aria-hidden="true" style={{ color: 'var(--muted-foreground)' }} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-60 overflow-hidden rounded-2xl"
          style={{
            backgroundColor: 'var(--card)',
            border: '1px solid color-mix(in srgb, var(--border) 62%, transparent)',
            boxShadow: '0 20px 48px rgba(15, 23, 42, 0.14)',
          }}
        >
          <div
            className="px-4 py-3 text-sm truncate"
            style={{
              color: 'var(--muted-foreground)',
              borderBottom: '1px solid color-mix(in srgb, var(--border) 52%, transparent)',
            }}
            title={email}
          >
            {email}
          </div>
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-3 px-4 py-3 text-sm transition-colors"
            style={{ color: 'var(--foreground)' }}
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--destructive) 7%, transparent)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <LogOut size={16} aria-hidden="true" style={{ color: 'var(--destructive)' }} />
            {t('common.logOut')}
          </button>
        </div>
      )}
    </div>
  );
}
