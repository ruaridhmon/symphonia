import { createContext, useContext, useCallback, useState, useEffect, useRef } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: number;
  type: ToastType;
  message: string;
  duration: number;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType, duration?: number) => void;
  toastSuccess: (message: string) => void;
  toastError: (message: string) => void;
  toastWarning: (message: string) => void;
  toastInfo: (message: string) => void;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
}

// ---------------------------------------------------------------------------
// Icons & Styles per type
// ---------------------------------------------------------------------------

const TOAST_CONFIG: Record<ToastType, {
  icon: typeof CheckCircle2;
  bg: string;
  border: string;
  fg: string;
  iconColor: string;
}> = {
  success: {
    icon: CheckCircle2,
    bg: 'color-mix(in srgb, var(--success) 12%, var(--card))',
    border: 'var(--success)',
    fg: 'var(--card-foreground)',
    iconColor: 'var(--success)',
  },
  error: {
    icon: AlertCircle,
    bg: 'color-mix(in srgb, var(--destructive) 12%, var(--card))',
    border: 'var(--destructive)',
    fg: 'var(--card-foreground)',
    iconColor: 'var(--destructive)',
  },
  warning: {
    icon: AlertTriangle,
    bg: 'color-mix(in srgb, #f59e0b 12%, var(--card))',
    border: '#f59e0b',
    fg: 'var(--card-foreground)',
    iconColor: '#f59e0b',
  },
  info: {
    icon: Info,
    bg: 'color-mix(in srgb, var(--accent) 12%, var(--card))',
    border: 'var(--accent)',
    fg: 'var(--card-foreground)',
    iconColor: 'var(--accent)',
  },
};

// ---------------------------------------------------------------------------
// Single Toast Item
// ---------------------------------------------------------------------------

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: number) => void }) {
  const [exiting, setExiting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const config = TOAST_CONFIG[toast.type];
  const Icon = config.icon;

  const dismiss = useCallback(() => {
    setExiting(true);
    setTimeout(() => onDismiss(toast.id), 250);
  }, [toast.id, onDismiss]);

  useEffect(() => {
    timerRef.current = setTimeout(dismiss, toast.duration);
    return () => clearTimeout(timerRef.current);
  }, [dismiss, toast.duration]);

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`toast-item ${exiting ? 'toast-exit' : 'toast-enter'}`}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.75rem',
        padding: '0.875rem 1rem',
        borderRadius: 'var(--radius)',
        backgroundColor: config.bg,
        borderLeft: `3px solid ${config.border}`,
        color: config.fg,
        boxShadow: 'var(--card-shadow-lg)',
        maxWidth: '420px',
        width: '100%',
        pointerEvents: 'auto',
        cursor: 'pointer',
      }}
      onClick={dismiss}
      onKeyDown={(e) => e.key === 'Escape' && dismiss()}
      tabIndex={0}
    >
      <Icon size={18} style={{ color: config.iconColor, flexShrink: 0, marginTop: '1px' }} />
      <span style={{ flex: 1, fontSize: '0.875rem', lineHeight: '1.4' }}>{toast.message}</span>
      <button
        onClick={(e) => { e.stopPropagation(); dismiss(); }}
        style={{
          background: 'none',
          border: 'none',
          padding: '2px',
          cursor: 'pointer',
          color: 'var(--muted-foreground)',
          flexShrink: 0,
        }}
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

let toastCounter = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback((message: string, type: ToastType = 'info', duration = 4000) => {
    const id = ++toastCounter;
    setToasts(prev => [...prev, { id, type, message, duration }]);
  }, []);

  const value: ToastContextValue = {
    toast: addToast,
    toastSuccess: useCallback((msg: string) => addToast(msg, 'success', 3000), [addToast]),
    toastError: useCallback((msg: string) => addToast(msg, 'error', 5000), [addToast]),
    toastWarning: useCallback((msg: string) => addToast(msg, 'warning', 4000), [addToast]),
    toastInfo: useCallback((msg: string) => addToast(msg, 'info', 4000), [addToast]),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Toast container — fixed bottom-right */}
      <div
        aria-label="Notifications"
        style={{
          position: 'fixed',
          bottom: '1.5rem',
          right: '1.5rem',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column-reverse',
          gap: '0.5rem',
          pointerEvents: 'none',
        }}
      >
        {toasts.map(t => (
          <ToastItem key={t.id} toast={t} onDismiss={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
