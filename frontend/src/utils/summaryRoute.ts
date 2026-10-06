import type * as React from 'react';

export const CONSULTATION_NAVIGATION = 'symphonia:navigate-consultation';

/** Use the existing router, and give each consultation its own component state. */
export function createSummaryRoute(
  R: typeof React,
  useNavigate: () => (to: string) => void,
  useParams: () => { id?: string },
  Content: React.ComponentType,
) {
  return function SummaryRoute() {
    const navigate = useNavigate();
    const { id } = useParams();
    R.useEffect(() => {
      const onNavigate = (event: Event) => {
        const href = (event as CustomEvent<{ href: string }>).detail?.href;
        if (!href) return;
        const url = new URL(href, location.origin);
        if (url.origin !== location.origin || !/^\/admin\/form\/\d+\/summary\/?$/.test(url.pathname)) return;
        event.preventDefault();
        R.startTransition(() => navigate(url.pathname + url.search));
      };
      window.addEventListener(CONSULTATION_NAVIGATION, onNavigate);
      return () => window.removeEventListener(CONSULTATION_NAVIGATION, onNavigate);
    }, [navigate]);
    return R.createElement(Content, { key: id });
  };
}

/** Preserve modified clicks/new tabs, and fall back to native links outside the summary route. */
export function forwardConsultationClick(event: MouseEvent): void {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const link = (event.target as Element).closest<HTMLAnchorElement>('a[href]');
  if (!link || link.target && link.target !== '_self' || link.hasAttribute('download')) return;
  const url = new URL(link.href, location.origin);
  if (url.origin !== location.origin || !/^\/admin\/form\/\d+\/summary\/?$/.test(location.pathname) || !/^\/admin\/form\/\d+\/summary\/?$/.test(url.pathname)) return;
  if (url.pathname === location.pathname) { event.preventDefault(); return; }
  const dirty = document.querySelector('.synthesis-draft-state')?.textContent?.includes('Unsaved changes')
    || document.querySelector('.response-workspace textarea:not(:disabled)');
  if (dirty && !window.confirm('Leave this consultation and discard unsaved edits?')) { event.preventDefault(); return; }
  const request = new CustomEvent(CONSULTATION_NAVIGATION, { cancelable: true, detail: { href: url.pathname + url.search } });
  window.dispatchEvent(request);
  if (request.defaultPrevented) event.preventDefault();
}
