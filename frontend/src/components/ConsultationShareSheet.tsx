import { Check, ChevronRight, Copy, Link2, Mail, MessageCircle, Share2, X } from 'lucide-react';
import { useMemo, useState } from 'react';

interface ConsultationShareSheetProps {
  open: boolean;
  title: string;
  joinCode: string;
  onClose: () => void;
}

function buildJoinLink(joinCode: string): string {
  if (typeof window === 'undefined') return `/share/${joinCode}`;
  return new URL(`/share/${encodeURIComponent(joinCode)}`, window.location.origin).toString();
}

export default function ConsultationShareSheet({
  open,
  title,
  joinCode,
  onClose,
}: ConsultationShareSheetProps) {
  const [copied, setCopied] = useState<'link' | 'code' | null>(null);
  const joinLink = useMemo(() => buildJoinLink(joinCode), [joinCode]);
  const shareText = `Join "${title}" on Symphonia`;

  if (!open) return null;

  async function copyValue(kind: 'link' | 'code', value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      window.setTimeout(() => setCopied((current) => (current === kind ? null : current)), 1600);
    } catch {
      setCopied(null);
    }
  }

  async function nativeShare() {
    if (!navigator.share) return;
    try {
      await navigator.share({
        title,
        text: shareText,
        url: joinLink,
      });
    } catch {
      // ignore cancellation
    }
  }

  const options = [
    {
      key: 'whatsapp',
      label: 'WhatsApp',
      icon: <MessageCircle size={18} />,
      href: `https://wa.me/?text=${encodeURIComponent(`${shareText}\n${joinLink}`)}`,
      iconBg: '#25D366',
      iconFg: '#ffffff',
      hint: 'Send in chat',
    },
    {
      key: 'email',
      label: 'Email',
      icon: <Mail size={18} />,
      href: `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`${shareText}\n\n${joinLink}\n\nJoin code: ${joinCode}`)}`,
      iconBg: '#2563eb',
      iconFg: '#ffffff',
      hint: 'Open compose',
    },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Share consultation"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.42)',
          backdropFilter: 'blur(8px)',
        }}
      />

      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 480,
          backgroundColor: 'var(--card)',
          border: '1px solid color-mix(in srgb, var(--border) 72%, transparent)',
          borderRadius: 14,
          padding: '1rem',
          boxShadow: '0 24px 64px rgba(15, 23, 42, 0.18)',
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div
              className="text-[11px] font-semibold uppercase tracking-[0.18em]"
              style={{ color: 'var(--accent)' }}
            >
              Share
            </div>
            <h2 className="mt-1 text-[1.05rem] font-semibold text-foreground">{title}</h2>
            <p className="mt-1 text-sm" style={{ color: 'var(--muted-foreground)' }}>
              Send a direct join link or use a familiar channel.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md"
            style={{
              color: 'var(--muted-foreground)',
              backgroundColor: 'color-mix(in srgb, var(--foreground) 4%, transparent)',
              border: '1px solid color-mix(in srgb, var(--border) 55%, transparent)',
            }}
            aria-label="Close share sheet"
          >
            <X size={17} />
          </button>
        </div>

        <div
          className="mt-4 rounded-lg p-4"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--background) 84%, var(--card) 16%)',
            border: '1px solid color-mix(in srgb, var(--border) 72%, transparent)',
          }}
        >
          <div className="flex items-start gap-3">
            <div
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--accent) 12%, transparent)',
                color: 'var(--accent)',
              }}
            >
              <Link2 size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-medium uppercase tracking-[0.16em]" style={{ color: 'var(--muted-foreground)' }}>
                Join link
              </div>
              <div className="mt-1 break-all text-sm text-foreground">{joinLink}</div>
              <div className="mt-3 flex items-center gap-2 text-xs" style={{ color: 'var(--muted-foreground)' }}>
                <span>Code</span>
                <span className="font-mono font-semibold text-foreground">{joinCode}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {typeof navigator !== 'undefined' && typeof navigator.share === 'function' ? (
            <button
              type="button"
              onClick={nativeShare}
              aria-label="More use device share"
              className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left transition-colors"
              style={{
                backgroundColor: 'var(--background)',
                border: '1px solid color-mix(in srgb, var(--border) 72%, transparent)',
              }}
            >
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg" style={{ backgroundColor: 'color-mix(in srgb, var(--accent) 12%, transparent)', color: 'var(--accent)' }}>
                <Share2 size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-foreground">More</div>
                <div className="mt-0.5 text-xs" style={{ color: 'var(--muted-foreground)' }}>Use device share</div>
              </div>
              <ChevronRight size={16} style={{ color: 'var(--muted-foreground)' }} />
            </button>
          ) : null}

          {options.map((option) => (
            <a
              key={option.key}
              href={option.href}
              target="_blank"
              rel="noreferrer"
              aria-label={`${option.label} ${option.hint}`}
              className="flex items-center gap-3 rounded-lg px-4 py-3 text-left transition-colors"
              style={{
                backgroundColor: 'var(--background)',
                border: '1px solid color-mix(in srgb, var(--border) 72%, transparent)',
                color: 'inherit',
                textDecoration: 'none',
              }}
            >
              <div
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                style={{ backgroundColor: option.iconBg, color: option.iconFg }}
              >
                {option.icon}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-foreground">{option.label}</div>
                <div className="mt-0.5 text-xs" style={{ color: 'var(--muted-foreground)' }}>{option.hint}</div>
              </div>
              <ChevronRight size={16} style={{ color: 'var(--muted-foreground)' }} />
            </a>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => copyValue('link', joinLink)}
            className="inline-flex items-center gap-2 rounded-md px-3.5 py-2.5 text-sm font-medium"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--accent) 10%, transparent)',
              color: 'var(--accent)',
            }}
          >
            {copied === 'link' ? <Check size={16} /> : <Copy size={16} />}
            {copied === 'link' ? 'Link copied' : 'Copy link'}
          </button>
          <button
            type="button"
            onClick={() => copyValue('code', joinCode)}
            className="inline-flex items-center gap-2 rounded-md px-3.5 py-2.5 text-sm font-medium"
            style={{
              backgroundColor: 'var(--background)',
              border: '1px solid color-mix(in srgb, var(--border) 72%, transparent)',
              color: 'var(--foreground)',
            }}
          >
            {copied === 'code' ? <Check size={16} /> : <Copy size={16} />}
            {copied === 'code' ? 'Code copied' : 'Copy join code'}
          </button>
          <a
            href={joinLink}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center rounded-md px-3.5 py-2.5 text-sm font-medium text-center"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--accent) 10%, transparent)',
              color: 'var(--accent)',
              textDecoration: 'none',
            }}
          >
            Open join page
          </a>
        </div>
      </div>
    </div>
  );
}
