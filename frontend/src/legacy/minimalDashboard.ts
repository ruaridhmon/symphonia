import { consultationId, loadNavigation, renderConsultationNavigation, type NavigationData } from '../utils/consultationNavigation';

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

type ShellState = { data: NavigationData | null; error: boolean; path: string; signature: string; nav: HTMLElement; dialog: HTMLDialogElement; toggle: HTMLButtonElement; query: string; pending: boolean; loadedPath: string };
const shells = new WeakMap<HTMLElement, ShellState>();
let collapsed = false;

async function navigationClient() {
  // Preserve the deployed React/auth singleton; source builds use their own client.
  if (document.querySelector('script[src*="index-HJquNmhn.js"]')) {
    const deployed = '/assets/index-HJquNmhn.js';
    const module = await import(/* @vite-ignore */ deployed);
    return module.b;
  }
  return (await import('../api/client')).api;
}

function markHeader(): void {
  const header = Array.from(document.querySelectorAll<HTMLElement>('header'))
    .find(candidate => candidate.querySelector('img[src*="logo-mark.png"]'));
  if (!header) return;
  header.classList.add('symphonia-shell-header');
  const shell = header.parentElement!;
  shell.classList.add('symphonia-shell');
  shell.classList.toggle('symphonia-consultation-open', consultationId(location.pathname) !== null);
  shell.classList.toggle('symphonia-sidebar-collapsed', collapsed);
  const account = header.querySelector<HTMLButtonElement>('button[aria-haspopup="menu"]');
  account?.classList.add('symphonia-account-trigger');
  account?.parentElement?.classList.add('symphonia-account');
  let state = shells.get(header);
  if (!state) {
    const nav = document.createElement('nav'); nav.className = 'symphonia-shell-navigation'; nav.setAttribute('aria-label', 'Consultations');
    const search = document.createElement('input'); search.type = 'search'; search.placeholder = 'Find a consultation'; search.setAttribute('aria-label', 'Find a consultation'); search.className = 'symphonia-navigation-search';
    const list = document.createElement('div'); list.className = 'symphonia-navigation-list'; nav.append(search, list); header.append(nav);
    const toggle = document.createElement('button'); toggle.type = 'button'; toggle.className = 'symphonia-navigation-toggle'; toggle.textContent = '☰'; toggle.setAttribute('aria-label', 'Open consultations');
    header.querySelector('div')?.prepend(toggle);
    const dialog = document.createElement('dialog'); dialog.className = 'symphonia-navigation-drawer'; dialog.setAttribute('aria-label', 'Consultations'); header.append(dialog);
    state = { data: null, error: false, path: '', signature: '', nav, dialog, toggle, query: '', pending: false, loadedPath: '' }; shells.set(header, state);
    const current = state;
    const closeDrawer = () => dialog.close();
    dialog.addEventListener('click', event => { if (event.target === dialog) { const r=dialog.getBoundingClientRect(); if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom) closeDrawer(); } });
    dialog.addEventListener('close', () => { toggle.setAttribute('aria-expanded', 'false'); toggle.focus(); });
    toggle.addEventListener('click', () => {
      if (innerWidth > 800 && consultationId(location.pathname) !== null) {
        collapsed = !collapsed; shell.classList.toggle('symphonia-sidebar-collapsed', collapsed);
        toggle.setAttribute('aria-label', collapsed ? 'Open consultations' : 'Collapse consultations'); toggle.setAttribute('aria-expanded', String(!collapsed));
        return;
      }
      const close = document.createElement('button'); close.type='button'; close.className='symphonia-drawer-close'; close.textContent='Close'; close.setAttribute('aria-label','Close consultations'); close.onclick=closeDrawer;
      const drawerNav = document.createElement('nav'); drawerNav.setAttribute('aria-label','Switch consultation');
      renderConsultationNavigation(drawerNav, current.data, location.pathname, current.error);
      dialog.replaceChildren(close, drawerNav); dialog.showModal(); toggle.setAttribute('aria-expanded','true');
    });
    search.addEventListener('input', () => { current.query = search.value; current.signature=''; scheduleApply(); });

  }
  if (!state.pending && state.loadedPath !== location.pathname) {
    state.pending=true; state.loadedPath=location.pathname;
    const current=state;
    navigationClient().then(loadNavigation).then(data => { if(header.isConnected) { current.data=data; current.error=false; current.signature=''; } }).catch(() => { if(header.isConnected) { current.error=true; current.signature=''; } }).finally(() => { current.pending=false; if(header.isConnected) scheduleApply(); });
  }
  if (state.path !== location.pathname) { state.path=location.pathname; if(state.dialog.open)state.dialog.close(); }
  const signature = JSON.stringify([location.pathname, state.data, state.error, state.query]);
  if (state.signature !== signature) {
    state.signature=signature;
    renderConsultationNavigation(state.nav.querySelector('.symphonia-navigation-list')!, state.data, location.pathname, state.error, state.query);
    const drawerNav=state.dialog.querySelector('nav');
    if (state.dialog.open && drawerNav) renderConsultationNavigation(drawerNav,state.data,location.pathname,state.error);
  }
  if (!state.dialog.open) {
    const expanded = consultationId(location.pathname) !== null && !collapsed && innerWidth > 800;
    state.toggle.setAttribute('aria-expanded', String(expanded));
    state.toggle.setAttribute('aria-label', expanded ? 'Collapse consultations' : 'Open consultations');
  }
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
  const joinButton = findButton(/^(join|enter).*code|^join(?: consultation)?$/i);
  if (!newButton) return false;

  const section = newButton.closest<HTMLElement>('section, main');
  if (!section) return false;
  section.classList.add('symphonia-minimal-dashboard', 'symphonia-admin-home');

  const title = Array.from(section.querySelectorAll<HTMLElement>('h1'))
    .find((heading) => /^consultations$/i.test(cleanText(heading.textContent)));
  title?.classList.add('symphonia-redundant-title');

  relabelButton(newButton, 'New consultation');
  newButton.classList.add('symphonia-create-action');
  if (joinButton) relabelButton(joinButton, 'Join with code');

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
    relabelButton(form?.querySelector<HTMLButtonElement>('button[type="submit"]') || null, 'Join with code');
  }

  if (listHeading) {
    nearestCard(listHeading)?.classList.add('symphonia-list-card');
    listHeading.classList.add('symphonia-redundant-title');
  }
}

function applyMinimalDashboard(): void {
  markHeader();
  if (location.pathname === '/join') {
    const heading = document.querySelector('main h1, section h1');
    const card = nearestCard(heading);
    card?.classList.add('symphonia-code-entry');
    const input = card?.querySelector<HTMLInputElement>('input');
    if (input) { input.setAttribute('aria-label', 'Consultation code'); input.placeholder='Consultation code'; }
  }
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

window.addEventListener('resize', scheduleApply);
