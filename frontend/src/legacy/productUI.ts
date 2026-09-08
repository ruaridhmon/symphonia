import { unifyClaims } from '../utils/unifiedClaims';
import { enhanceConsultationInbox } from '../utils/consultationInbox';
// Presentation only. Native form controls retain their values and React handlers.
function syncProductUI() {
  const main = document.querySelector('main');
  if (!main) return;
  unifyClaims(main);
  const dashboard = location.pathname === '/' && !!main.querySelector('input[aria-label="Search consultations"]');
  main.classList.toggle('product-dashboard', dashboard);
  if(dashboard)enhanceConsultationInbox(main);
  main.classList.toggle('product-summary',!!main.querySelector('aside[aria-label="Synthesis controls"]'));
  const select = main.querySelector<HTMLSelectElement>('#summary-workspace-select');
  if (select) {
    select.closest('label')?.classList.add('product-view-control');
    let nav = main.querySelector<HTMLElement>('.product-views');
    if (!nav) {
      nav = document.createElement('nav'); nav.className = 'product-views'; nav.setAttribute('aria-label', 'Consultation views');
      select.closest('section')?.append(nav);
      for (const option of Array.from(select.options)) {
        const button = document.createElement('button'); button.type = 'button'; button.dataset.value = option.value;
        button.textContent = option.textContent === 'Synthesis' ? 'Summary' : option.textContent;
        button.onclick = () => { select.value = option.value; select.dispatchEvent(new Event('change', { bubbles: true })); syncProductUI(); };
        nav.append(button);
      }
    }
    nav.querySelectorAll('button').forEach(button => {
      const pressed = String(button.dataset.value === select.value);
      if (button.getAttribute('aria-pressed') !== pressed) button.setAttribute('aria-pressed', pressed);
    });
  }
  // A compact question composer that grows as the facilitator writes.
  main.querySelectorAll<HTMLTextAreaElement>('.ux-question-row textarea').forEach(area => {
    if (area.dataset.productSized) return;
    area.dataset.productSized = 'true';
    const resize = () => { area.style.height = 'auto'; area.style.height = `${Math.max(96, area.scrollHeight)}px`; };
    area.addEventListener('input', resize); resize();
  });
}
let queued = false;
new MutationObserver(() => {
  if (queued) return; queued = true;
  queueMicrotask(() => { queued = false; syncProductUI(); });
}).observe(document.body, { childList: true, subtree: true });
document.addEventListener('change', syncProductUI);
document.addEventListener('click', event => {
  document.querySelectorAll<HTMLDetailsElement>('.product-more[open]').forEach(menu => {
    if (!menu.contains(event.target as Node)) menu.open = false;
  });
});
window.addEventListener('popstate', syncProductUI);
syncProductUI();
