import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  body: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  loading = false,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={onCancel}
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
          maxWidth: 420,
          backgroundColor: 'var(--card)',
          border: '1px solid color-mix(in srgb, var(--border) 72%, transparent)',
          borderRadius: 28,
          padding: '1rem',
          boxShadow: '0 28px 80px rgba(15, 23, 42, 0.22)',
        }}
      >
        <button
          type="button"
          onClick={onCancel}
          aria-label="Close dialog"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full"
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            color: 'var(--muted-foreground)',
            backgroundColor: 'color-mix(in srgb, var(--foreground) 4%, transparent)',
            border: '1px solid color-mix(in srgb, var(--border) 55%, transparent)',
          }}
        >
          <X size={16} />
        </button>

        <div
          className="inline-flex h-10 w-10 items-center justify-center rounded-2xl"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--destructive) 8%, transparent)',
            color: 'var(--destructive)',
          }}
        >
          <AlertTriangle size={18} />
        </div>

        <h2 className="mt-3 text-base font-semibold text-foreground">{title}</h2>
        <p className="mt-2 text-sm leading-6" style={{ color: 'var(--muted-foreground)' }}>
          {body}
        </p>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full px-4 py-2.5 text-sm font-medium"
            style={{
              backgroundColor: 'var(--background)',
              border: '1px solid color-mix(in srgb, var(--border) 72%, transparent)',
              color: 'var(--foreground)',
            }}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="rounded-full px-3.5 py-2.5 text-sm font-medium"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--destructive) 8%, transparent)',
              border: '1px solid color-mix(in srgb, var(--destructive) 18%, transparent)',
              color: 'var(--destructive)',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Deleting…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
