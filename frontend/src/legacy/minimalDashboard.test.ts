// @vitest-environment jsdom
import { expect, it, vi } from 'vitest';

it('enhances the current main dashboard without replacing its action handler and cleans up on navigation', async () => {
  window.history.replaceState({}, '', '/');
  const frames: FrameRequestCallback[] = [];
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.push(callback); return frames.length; });
  document.body.innerHTML = `<header><div><button><img src="/logo-mark.png" /></button></div></header><main><div><div class="mb-8"><h1>Consultations</h1><div><input aria-label="Search consultations" /></div><div><button id="join">Enter code</button><button id="new">New</button></div></div><div class="rounded-2xl"><table><tbody><tr><td>Example</td></tr></tbody></table></div></div></main>`;
  const action = vi.fn();
  document.querySelector('#new')!.addEventListener('click', action);
  await import('./minimalDashboard');
  expect(document.querySelector('main')?.classList.contains('symphonia-admin-home')).toBe(true);
  expect(document.querySelector('#new')?.textContent).toBe('New consultation');
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
  expect(document.querySelector('header')?.classList.contains('symphonia-minimal-header')).toBe(false);
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
});
