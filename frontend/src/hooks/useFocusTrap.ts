import { useEffect, useRef, useCallback } from 'react';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Reusable focus-trap hook for modals & overlays.
 *
 * When `active` is true:
 *  - Saves the previously-focused element and restores it on deactivation.
 *  - Auto-focuses the first focusable child inside the ref container.
 *  - Traps Tab / Shift+Tab within the container.
 *  - Calls `onEscape` when Escape is pressed.
 */
export function useFocusTrap({
  active,
  onEscape,
}: {
  active: boolean;
  onEscape?: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onEscape?.();
        return;
      }

      if (e.key !== 'Tab') return;

      const container = containerRef.current;
      if (!container) return;

      const focusable = Array.from(
        container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    },
    [onEscape],
  );

  useEffect(() => {
    if (!active) return;

    // Save current focus so we can restore it later
    previousFocusRef.current = document.activeElement as HTMLElement | null;

    // Focus first focusable element inside the container
    const timer = setTimeout(() => {
      const container = containerRef.current;
      if (container) {
        const first = container.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
        first?.focus();
      }
    }, 50);

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('keydown', handleKeyDown);
      // Restore focus on deactivation
      previousFocusRef.current?.focus();
    };
  }, [active, handleKeyDown]);

  return containerRef;
}
