// Keep the current guest's own return route available after the legacy thank-you redirect.
// Session storage is tab-scoped; another participant's route is never offered in another tab.
const key = 'symphonia-delphi-return-path';
function updateReturnLink() {
  if (/^\/public\/session\/[A-Za-z0-9_-]+\/?$/.test(location.pathname)) {
    sessionStorage.setItem(key, location.pathname);
    return;
  }
  if (location.pathname !== '/thank-you') { sessionStorage.removeItem(key); return; }
  const path = sessionStorage.getItem(key);
  if (!path || !/^\/public\/session\/[A-Za-z0-9_-]+\/?$/.test(path)) return;
  const heading = Array.from(document.querySelectorAll('h2')).find(h => h.textContent === 'Thank you for your submission');
  if (!heading || document.getElementById('delphi-return-link')) return;
  const wrapper = document.createElement('p');
  const link = document.createElement('a');
  link.id = 'delphi-return-link';
  link.href = path;
  link.textContent = 'View your response and next round';
  link.style.cssText = 'display:inline-block;padding:12px 18px;border:1px solid var(--border);border-radius:10px;color:var(--accent);font-weight:600;';
  wrapper.append(link);
  heading.parentElement?.append(wrapper);
}
let timer: ReturnType<typeof setTimeout>;
new MutationObserver(() => { clearTimeout(timer); timer=setTimeout(updateReturnLink,100); }).observe(document.body,{childList:true,subtree:true});
updateReturnLink();
