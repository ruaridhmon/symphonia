import { Check, Copy, Mail, MessageCircle, Send, Share2, X } from 'lucide-react';
import { useMemo, useState } from 'react';

interface ConsultationShareSheetProps {
  open: boolean;
  title: string;
  joinCode: string;
  onClose: () => void;
}

function buildJoinLink(joinCode: string): string {
  if (typeof window === 'undefined') return `/join/${joinCode}`;
  return new URL(`/join/${encodeURIComponent(joinCode)}`, window.location.origin).toString();
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
    },
    {
      key: 'email',
      label: 'Email',
      icon: <Mail size={18} />,
      href: `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`${shareText}\n\n${joinLink}\n\nJoin code: ${joinCode}`)}`,
    },
    {
      key: 'telegram',
      label: 'Telegram',
      icon: <Send size={18} />,
      href: `https://t.me/share/url?url=${encodeURIComponent(joinLink)}&text=${encodeURIComponent(shareText)}`,
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
        alignItems: 'flex-end',
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
          maxWidth: 520,
          backgroundColor: 'var(--card)',
          border: '1px solid color-mix(in srgb, var(--border) 72%, transparent)',
          borderRadius: 28,
          padding: '1.1rem',
          boxShadow: '0 28px 80px rgba(15, 23, 42, 0.22)',
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
            <h2 className="mt-1 text-lg font-semibold text-foreground">{title}</h2>
            <p className="mt-1 text-sm" style={{ color: 'var(--muted-foreground)' }}>
              Send a direct join link or share the code in the channel your participants already use.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full"
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
          className="mt-4 rounded-3xl p-4"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--background) 82%, var(--card) 18%)',
            border: '1px solid color-mix(in srgb, var(--border) 72%, transparent)',
          }}
        >
          <div className="text-xs font-medium uppercase tracking-[0.16em]" style={{ color: 'var(--muted-foreground)' }}>
            Join link
          </div>
          <div className="mt-2 break-all text-sm text-foreground">{joinLink}</div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-medium uppercase tracking-[0.16em]" style={{ color: 'var(--muted-foreground)' }}>
                Join code
              </div>
              <div className="mt-1 font-mono text-sm font-semibold text-foreground">{joinCode}</div>
            </div>
            <button
              type="button"
              onClick={() => copyValue('link', joinLink)}
              className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--accent) 12%, transparent)',
                color: 'var(--accent)',
              }}
            >
              {copied === 'link' ? <Check size={16} /> : <Copy size={16} />}
              {copied === 'link' ? 'Copied' : 'Copy link'}
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {typeof navigator !== 'undefined' && typeof navigator.share === 'function' ? (
            <button
              type="button"
              onClick={nativeShare}
              className="rounded-3xl px-4 py-4 text-left"
              style={{
                backgroundColor: 'var(--background)',
                border: '1px solid color-mix(in srgb, var(--border) 72%, transparent)',
              }}
            >
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-2xl" style={{ backgroundColor: 'color-mix(in srgb, var(--accent) 12%, transparent)', color: 'var(--accent)' }}>
                <Share2 size={18} />
              </div>
              <div className="text-sm font-semibold text-foreground">More</div>
              <div className="mt-1 text-xs" style={{ color: 'var(--muted-foreground)' }}>Use device share</div>
            </button>
          ) : null}

          {options.map((option) => (
            <a
              key={option.key}
              href={option.href}
              target="_blank"
              rel="noreferrer"
              className="rounded-3xl px-4 py-4 text-left"
              style={{
                backgroundColor: 'var(--background)',
                border: '1px solid color-mix(in srgb, var(--border) 72%, transparent)',
                color: 'inherit',
                textDecoration: 'none',
              }}
            >
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-2xl" style={{ backgroundColor: 'color-mix(in srgb, var(--foreground) 5%, transparent)', color: 'var(--foreground)' }}>
                {option.icon}
              </div>
              <div className="text-sm font-semibold text-foreground">{option.label}</div>
              <div className="mt-1 text-xs" style={{ color: 'var(--muted-foreground)' }}>Open {option.label}</div>
            </a>
          ))}
        </div>

        <div className="mt-4 flex gap-3">
          <button
            type="button"
            onClick={() => copyValue('code', joinCode)}
            className="flex-1 rounded-full px-4 py-3 text-sm font-medium"
            style={{
              backgroundColor: 'var(--background)',
              border: '1px solid color-mix(in srgb, var(--border) 72%, transparent)',
              color: 'var(--foreground)',
            }}
          >
            {copied === 'code' ? 'Code copied' : 'Copy join code'}
          </button>
          <a
            href={joinLink}
            target="_blank"
            rel="noreferrer"
            className="flex-1 rounded-full px-4 py-3 text-sm font-medium text-center"
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
