/**
 * Legacy dev-dashboard compatibility layer.
 *
 * Dev hosting currently serves the committed frontend/dist mirror. Keep this
 * DOM-only enhancement deliberately conservative: it changes presentation and
 * labels on the authenticated home route without replacing React handlers,
 * auth state, API callbacks, or stored data.
 */

function cleanText(value: string |function findButton(pattern) | undefined): string {
  return (value || '').replace(/\s+/g, ' ').trim();
}

function findButton(pattern: RegExp): HTMLButtonElement |function findButton(pattern) {
  return Array.from(document.querySelectorAll('button'))
    .find((button) => pattern.test(cleanText(button.textContent))) ||function findButton(pattern);
}

function relabelButton(button: HTMLButtonElement |function findButton(pattern), label: string): void {
  if (!button || button.dataset.minimalLabel === label) return;
  button.dataset.minimalLabel = label;
  button.setAttribute('aria-label', label);
  button.textContent = label;
}

function markHeader(): void {
  const header = Array.from(document.querySelectorAll('header'))
    .find((candidate) => candidate.querySelector('img[src*="logo-mark.png"]'));
  if (!header) return;
  header.classList.add('symphonia-minimal-header');
}

function nearestCard(node: Element |function findButton(pattern)): HTMLElement |function findButton(pattern) {
  let current = node?.parentElement ||function findButton(pattern);
  while (current && current.id !== 'root') {
    if (
      current.classList.contains('rounded-xl') ||
      current.classList.contains('rounded-2xl')
    ) return current;
    current = current.parentElement;
  }
  returnfunction findButton(pattern);
}

function markAdminDashboard(): boolean {
  const newButton = findButton(/^new consultation$/i);
  const joinButton = findButton(/^(join|enter).*code|^join consultation$/i);
  if (!newButton || !newButton.closest('section')) return false;

  const section = newButton.closest('section');
  if (!section) return false;
  section.classList.add('symphonia-minimal-dashboard', 'symphonia-admin-home');

  const title = Array.from(section.querySelectorAll('h1'))
    .find((heading) => /^consultations$/i.test(cleanText(heading.textContent)));
  title?.classList.add('symphonia-redundant-title');

  relabelButton(newButton, 'New');
  if (joinButton) relabelButton(joinButton, 'Join');

  const search = section.querySelector(
    'input[aria-label*="Search"], input[placeholder*="Search"]',
  );
  search?.closest('div')?.classList.add('symphonia-minimal-search');

  const table = section.querySelector('table');
  if (table) {
    table.closest('.rounded-2xl')?.classList.add('symphonia-flat-list');
    table.classList.add('symphonia-flat-table');
  }

  Array.from(section.querySelectorAll('.rounded-2xl')).forEach((panel) => {
    if (!panel.querySelector('table')) panel.classList.add('symphonia-flat-empty');
  });

  return true;
}

function markExpertDashboard(): void {
  const joinHeading = Array.from(document.querySelectorAll('h2'))
    .find((heading) => /^join a consultation$/i.test(cleanText(heading.textContent)));
  const listHeading = Array.from(document.querySelectorAll('h2'))
    .find((heading) => /^my consultations$/i.test(cleanText(heading.textContent)));
  if (!joinHeading && !listHeading) return;

  const section = (joinHeading || listHeading)?.closest('section');
  section?.classList.add('symphonia-minimal-dashboard', 'symphonia-expert-home');

  if (joinHeading) {
    const card = nearestCard(joinHeading);
    card?.classList.add('symphonia-join-card');
    joinHeading.classList.add('symphonia-redundant-title');
    const form = card?.querySelector('form');
    form?.classList.add('symphonia-join-form');
    const input = form?.querySelector('input');
    if (input) input.placeholder = 'Join with code';
    relabelButton(form?.querySelector('button[type="submit"]') ||function findButton(pattern), 'Join');
  }

  if (listHeading) {
    nearestCard(listHeading)?.classList.add('symphonia-list-card');
    listHeading.classList.add('symphonia-redundant-title');
  }
}

function applyMinimalDashboard(): void {
  markHeader();
  if (window.location.pathname !== '/') return;
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
