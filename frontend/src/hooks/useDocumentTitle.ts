import { useEffect } from 'react';

const BASE_TITLE = 'Symphonia';

/**
 * Set the document title reactively.
 *
 * @param title - Page-specific title (e.g. "Dashboard"). Pass `null` or `''`
 *   to reset to the base title.
 *
 * @example
 *   useDocumentTitle('Dashboard');       // → "Dashboard — Symphonia"
 *   useDocumentTitle('Edit Form #42');   // → "Edit Form #42 — Symphonia"
 *   useDocumentTitle(null);              // → "Symphonia"
 */
export function useDocumentTitle(title: string | null | undefined) {
  useEffect(() => {
    const prev = document.title;
    document.title = title ? `${title} — ${BASE_TITLE}` : BASE_TITLE;
    return () => {
      document.title = prev;
    };
  }, [title]);
}
