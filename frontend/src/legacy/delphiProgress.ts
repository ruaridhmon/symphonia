// Compatibility entry for the committed dev bundle. Remove when dev is source-built.
import { ratingProgress, stanceLabels, synthesisProvenanceNote } from '../utils/delphiProgress';
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
  panel.style.cssText = 'padding:20px;margin-bottom:16px;';
  panel.replaceChildren(el('h2', 'Round progress'));
  const refresh = el('button', 'Refresh results');
  refresh.setAttribute('type', 'button');
  refresh.style.cssText = 'font-size:12px;color:var(--accent);margin:4px 0 8px;';
  refresh.addEventListener('click', () => { lastFetch = 0; render(); });
  panel.append(refresh);
  if (!round || !cache) { panel.append(el('p', failed ? 'Recorded response data could not be loaded.' : 'Loading recorded responses…')); return; }
  const strip = el('div');
  strip.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;margin:12px 0;';
  for (const r of cache.rounds) {
    const item = el('span', `Round ${r.round_number} · ${r.response_count ?? '—'} responses`);
    item.style.cssText = `padding:6px 10px;border:1px solid ${r.id === round.id ? 'var(--accent)' : 'var(--border)'};border-radius:8px;font-size:13px;`;
    strip.append(item);
  }
  panel.append(strip);
  const note = synthesisProvenanceNote(round, cache.rounds);
  if (note) { const p = el('p', note); p.style.cssText = 'padding:12px;border-left:3px solid #a16207;background:var(--muted);font-size:14px;'; panel.append(p); }
  const rows = ratingProgress(round, cache.rounds, cache.responses);
  if (!rows.length) { panel.append(el('p', 'Open responses identify candidate claims. Later ratings let participants validate them.')); return; }
  panel.append(el('p', 'Direct participant ratings · neutral and uncertain answers remain in the denominator.'));
  for (const row of rows) {
    const article = el('article'); article.style.cssText = 'padding:14px 0;border-top:1px solid var(--border);';
    article.append(el('strong', row.label));
    let value = row.percent === null ? 'Awaiting ratings' : `${Math.round(row.percent)}% agree · ${row.votes[0]} of ${row.answered} ratings`;
    if (row.delta !== null) value += ` · ${row.delta > 0 ? '+' : ''}${Math.round(row.delta)} pp vs Round ${row.previousRound} (${row.previousAnswered} ratings)`;
    article.append(el('p', value));
    const total = row.votes.reduce((a, b) => a + b, 0);
    const bar = el('div'); bar.setAttribute('aria-hidden','true'); bar.style.cssText = 'display:flex;height:6px;border-radius:8px;overflow:hidden;margin-bottom:8px;';
    const colors = ['#0f766e','#be123c','#64748b','#a16207','#7c3aed','#cbd5e1'];
    row.votes.forEach((n,i) => { if(n) { const part = el('span'); part.style.cssText = `width:${n/total*100}%;background:${colors[i]};`;bar.append(part); } });
    article.append(bar, el('small', row.votes.map((n,i) => n ? `${stanceLabels[i]} ${n}` : '').filter(Boolean).join(' · ')));
    panel.append(article);
  }
  panel.append(el('small', 'Only identical questions and scales are compared. Panel composition may differ. Agreement alone does not establish scientific validity.'));
}
let timer: ReturnType<typeof setTimeout>;
new MutationObserver(() => { clearTimeout(timer); timer = setTimeout(render, 150); }).observe(document.body, { childList:true, subtree:true, characterData:true });
window.addEventListener('focus', () => { lastFetch = 0; render(); });
render();

setInterval(() => { if (document.visibilityState === 'visible') render(); }, 30000);
