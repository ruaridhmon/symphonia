import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Invisible live region that announces route changes to screen readers.
 * WCAG 2.2 AA: SPA navigation must be perceivable by assistive technology.
 */

const ROUTE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/login': 'Log in',
  '/register': 'Create account',
  '/atlas': 'UX Atlas',
  '/waiting': 'Waiting for results',
  '/result': 'Consultation results',
  '/thank-you': 'Thank you',
  '/admin/settings': 'Admin settings',
  '/admin/forms/new': 'Create new consultation',
};

function getPageTitle(pathname: string): string {
  // Exact match
  if (ROUTE_TITLES[pathname]) return ROUTE_TITLES[pathname];
  // Pattern matches
  if (/^\/admin\/form\/[^/]+\/summary$/.test(pathname)) return 'Consultation summary';
  if (/^\/admin\/form\/[^/]+$/.test(pathname)) return 'Edit consultation';
  if (/^\/form\/[^/]+$/.test(pathname)) return 'Submit response';
  return 'Page';
}

export default function RouteAnnouncer() {
  const { pathname } = useLocation();
  const announceRef = useRef<HTMLDivElement>(null);
  const prevPathRef = useRef(pathname);

  useEffect(() => {
    // Don't announce on first render (initial load)
    if (prevPathRef.current === pathname) return;
    prevPathRef.current = pathname;

    const title = getPageTitle(pathname);
    if (announceRef.current) {
      announceRef.current.textContent = `Navigated to ${title}`;
    }

    // Also update document title
    document.title = `${title} — Symphonia`;
  }, [pathname]);

  return (
    <div
      ref={announceRef}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      style={{
        position: 'absolute',
        width: '1px',
        height: '1px',
        padding: 0,
        margin: '-1px',
        overflow: 'hidden',
        clip: 'rect(0, 0, 0, 0)',
        whiteSpace: 'nowrap',
        border: 0,
      }}
    />
  );
}
