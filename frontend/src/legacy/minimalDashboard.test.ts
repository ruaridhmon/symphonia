// @vitest-environment jsdom
import { expect, it, vi } from 'vitest';

it('enhances the current main dashboard without replacing its action handler and cleans up on navigation', async () => {
  window.history.replaceState({}, '', '/');
  const frames: FrameRequestCallback[] = [];
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.push(callback); return frames.length; });
  document.body.innerHTML = `<header><div><button><img src="/logo-mark.png" /></button><nav><div><button id="account" aria-haspopup="menu"><span class="rounded-full">TE</span></button><div role="menu"><button id="theme" aria-haspopup="menu">Theme</button></div></div></nav></div></header><main><div><div class="mb-8"><h1>Consultations</h1><div><input aria-label="Search consultations" /></div><div><button id="join">Enter code</button><button id="new">New</button></div></div><div class="rounded-2xl"><table><tbody><tr><td>Example</td></tr></tbody></table></div></div></main>`;
  const action = vi.fn();
  document.querySelector('#new')!.addEventListener('click', action);
  vi.mock('../api/client', () => ({api:{get:vi.fn(async (path:string) => path === '/me' ? {role:'expert'} : [])}}));
  await import('./minimalDashboard');
  expect(document.querySelector('main')?.classList.contains('symphonia-admin-home')).toBe(true);
  expect(document.querySelector('#new')?.textContent).toBe('New consultation');
  expect(document.querySelector('#join')?.textContent).toBe('Join with code');
  expect(document.querySelector('#account')?.classList.contains('symphonia-account-trigger')).toBe(true);
  expect(document.querySelector('#theme')?.classList.contains('symphonia-account-trigger')).toBe(false);
  (document.querySelector('#new') as HTMLButtonElement).click();
  expect(action).toHaveBeenCalledOnce();
  // A React rerender must still be detected after the button has been relabelled.
  document.querySelector('main')!.classList.remove('symphonia-admin-home');
  document.querySelector('main')!.append(document.createElement('span'));
  await Promise.resolve();
  frames.splice(0).forEach(callback => callback(0));
  expect(document.querySelector('main')?.classList.contains('symphonia-admin-home')).toBe(true);
  window.history.replaceState({}, '', '/admin/form/32/summary');
  window.dispatchEvent(new PopStateEvent('popstate'));
  frames.splice(0).forEach(callback => callback(0));
  expect(document.querySelector('header')?.classList.contains('symphonia-shell-header')).toBe(true);
  expect(document.querySelector('.symphonia-shell-navigation a[href="/"]')?.hasAttribute('aria-current')).toBe(false);
  expect(document.querySelectorAll('.symphonia-shell-navigation')).toHaveLength(1);
  expect(document.querySelector('.symphonia-navigation-toggle')?.getAttribute('aria-expanded')).toBe('true');
  (document.querySelector('.symphonia-navigation-toggle') as HTMLButtonElement).click();
  expect(document.querySelector('.symphonia-shell')?.classList.contains('symphonia-sidebar-collapsed')).toBe(true);
  vi.stubGlobal('innerWidth',390);
  HTMLDialogElement.prototype.showModal=function(){this.open=true;};
  HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new Event('close'));};
  const toggle=document.querySelector('.symphonia-navigation-toggle') as HTMLButtonElement;
  toggle.click();
  const drawer=document.querySelector('.symphonia-navigation-drawer') as HTMLDialogElement;
  expect(drawer.open).toBe(true);
  expect(drawer.querySelector('input[aria-label="Find a consultation"]')).not.toBeNull();
  (drawer.querySelector('button') as HTMLButtonElement).click();
  expect(drawer.open).toBe(false);
  expect(document.activeElement).toBe(toggle);
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
});
