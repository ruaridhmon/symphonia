export { buildFixedDelphiRound } from '../utils/delphiPlanning';
// Compatibility entry for the committed dev bundle. Remove when dev is source-built.
import { renderDelphiInsights } from '../utils/renderDelphiInsights';
import type { Round, RoundWithResponses } from '../types/summary';

let key = '';
let cache: { rounds: Round[]; responses: RoundWithResponses[] } | null = null;
let pending = false;
let lastFetch = 0;
let failed = false;
let revision = 0;
function el(tag: string, text?: string, className?: string) {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  if (className) node.className = className;
  return node;
}
function render() {
  const match = location.pathname.match(/^\/admin\/form\/(\d+)\/summary\/?$/);
  if (!match) { key = ''; cache = null; document.getElementById('delphi-recorded-progress')?.remove(); return; }
  const nextKey = match[1];
  if (key !== nextKey) { key = nextKey; cache = null; lastFetch = 0; failed = false; }
  const heading = Array.from(document.querySelectorAll('h2')).find(n => /Synthesis for Round \d+/.test(n.textContent || ''));
  if (!heading) { document.getElementById('delphi-recorded-progress')?.remove(); return; }
  if (!pending && (!lastFetch || Date.now() - lastFetch > 30000)) {
    pending = true;
    lastFetch = Date.now();
    const requested = key;
    // Reuse the deployed application's authenticated API client, without copying credentials.
    const deployedApi = '/assets/rounds-CU08geHs.js';
    import(/* @vite-ignore */ deployedApi).then(async api => {
      const [rounds, responses] = await Promise.all([api.g(Number(requested)), api.a(Number(requested))]);
      if (key === requested) { cache = { rounds, responses }; revision += 1; failed = false; }
    }).catch(() => { if (key === requested) failed = true; }).finally(() => { pending = false; render(); });
  }
  const card = heading.closest('.card');
  if (!card) return;
  const roundNumber = Number(heading.textContent?.match(/Round (\d+)/)?.[1]);
  const round = cache?.rounds.find(r => r.round_number === roundNumber);
  const signature = JSON.stringify([key, roundNumber, revision, failed]);
  let panel = document.getElementById('delphi-recorded-progress');
  if (panel?.dataset.signature === signature) return;
  if (!panel) { panel = el('section', '', 'card'); panel.id = 'delphi-recorded-progress'; card.before(panel); }
  panel.dataset.signature = signature;
  panel.setAttribute('aria-label', 'Delphi round progress');
  if (!round || !cache) { panel.replaceChildren(el('p', failed ? 'Recorded response data could not be loaded.' : 'Loading recorded responses…')); return; }
  renderDelphiInsights(panel, round, cache.rounds, cache.responses, () => { lastFetch = 0; render(); }, round.is_active ? async questions => {
    const deployedApi = '/assets/rounds-CU08geHs.js';
    const api = await import(/* @vite-ignore */ deployedApi);
    await api.n(Number(nextKey), {questions, expected_round_number:round.round_number, context_settings:{intro_title:"Review the panel’s reasoning",intro_body:"Rate each claim independently. The claim set is unchanged. Explain what led you to your view.",show_previous_response:true}});
    location.assign(location.pathname);
  } : undefined);

}
let timer: ReturnType<typeof setTimeout>;
new MutationObserver(() => { clearTimeout(timer); timer = setTimeout(render, 150); }).observe(document.body, { childList:true, subtree:true, characterData:true });
window.addEventListener('focus', () => { lastFetch = 0; render(); });
render();

setInterval(() => { if (document.visibilityState === 'visible') render(); }, 30000);
