export {};

/**
 * Legacy dev-dashboard compatibility layer.
 *
 * Dev hosting currently serves the committed frontend/dist mirror. Keep this
 * DOM-only enhancement deliberately conservative: it changes presentation and
 * labels on the authenticated home route without replacing React handlers,
 * auth state, API callbacks, or stored data.
 */

function cleanText(value: string | null | undefined): string {
  return (value || '').replace(/\s+/g, ' ').trim();
}

function findButton(pattern: RegExp): HTMLButtonElement | null {
  return Array.from(document.querySelectorAll<HTMLButtonElement>('button'))
    .find((button) => pattern.test(cleanText(button.textContent))) || null;
}

function relabelButton(button: HTMLButtonElement | null, label: string): void {
  if (!button || button.dataset.minimalLabel === label) return;
  button.dataset.minimalLabel = label;
  button.setAttribute('aria-label', label);
  button.textContent = label;
}

function markHeader(): void {
  const header = Array.from(document.querySelectorAll<HTMLElement>('header'))
    .find((candidate) => candidate.querySelector('img[src*="logo-mark.png"]'));
  if (!header) return;
  header.classList.add('symphonia-minimal-header');
}

function nearestCard(node: Element | null): HTMLElement | null {
  let current = node?.parentElement || null;
  while (current && current.id !== 'root') {
    if (
      current.classList.contains('rounded-xl') ||
      current.classList.contains('rounded-2xl')
    ) return current;
    current = current.parentElement;
  }
  return null;
}

function markAdminDashboard(): boolean {
  const newButton = findButton(/^new(?: consultation)?$/i);
  const joinButton = findButton(/^(join|enter).*code|^join consultation$/i);
  if (!newButton) return false;

  const section = newButton.closest<HTMLElement>('section, main');
  if (!section) return false;
  section.classList.add('symphonia-minimal-dashboard', 'symphonia-admin-home');

  const title = Array.from(section.querySelectorAll<HTMLElement>('h1'))
    .find((heading) => /^consultations$/i.test(cleanText(heading.textContent)));
  title?.classList.add('symphonia-redundant-title');

  relabelButton(newButton, 'New consultation');
  if (joinButton) relabelButton(joinButton, 'Join');

  const search = section.querySelector<HTMLInputElement>(
    'input[aria-label*="Search"], input[placeholder*="Search"]',
  );
  search?.closest<HTMLElement>('div')?.classList.add('symphonia-minimal-search');

  const table = section.querySelector('table');
  if (table) {
    table.closest<HTMLElement>('.rounded-2xl')?.classList.add('symphonia-flat-list');
    table.classList.add('symphonia-flat-table');
  }

  Array.from(section.querySelectorAll<HTMLElement>('.rounded-2xl')).forEach((panel) => {
    if (!panel.querySelector('table')) panel.classList.add('symphonia-flat-empty');
  });

  return true;
}

function markExpertDashboard(): void {
  const joinHeading = Array.from(document.querySelectorAll<HTMLElement>('h2'))
    .find((heading) => /^join a consultation$/i.test(cleanText(heading.textContent)));
  const listHeading = Array.from(document.querySelectorAll<HTMLElement>('h2'))
    .find((heading) => /^my consultations$/i.test(cleanText(heading.textContent)));
  if (!joinHeading && !listHeading) return;

  const section = (joinHeading || listHeading)?.closest<HTMLElement>('section, main');
  section?.classList.add('symphonia-minimal-dashboard', 'symphonia-expert-home');

  if (joinHeading) {
    const card = nearestCard(joinHeading);
    card?.classList.add('symphonia-join-card');
    joinHeading.classList.add('symphonia-redundant-title');
    const form = card?.querySelector<HTMLFormElement>('form');
    form?.classList.add('symphonia-join-form');
    const input = form?.querySelector<HTMLInputElement>('input');
    if (input) input.placeholder = 'Join with code';
    relabelButton(form?.querySelector<HTMLButtonElement>('button[type="submit"]') || null, 'Join');
  }

  if (listHeading) {
    nearestCard(listHeading)?.classList.add('symphonia-list-card');
    listHeading.classList.add('symphonia-redundant-title');
  }
}

function applyMinimalDashboard(): void {
  if (window.location.pathname !== '/') {
    document.querySelectorAll('.symphonia-minimal-header').forEach(header => header.classList.remove('symphonia-minimal-header'));
    return;
  }
  markHeader();
  if (!markAdminDashboard()) markExpertDashboard();
}

let scheduled = false;
function scheduleApply(): void {
  if (scheduled) return;
  scheduled = true;
  window.requestAnimationFrame(() => {
    scheduled = false;
    applyMinimalDashboard();
  });
}

applyMinimalDashboard();
const observer = new MutationObserver(scheduleApply);
observer.observe(document.documentElement, { childList: true, subtree: true });
window.addEventListener('popstate', scheduleApply);
