(() => {
  const find = id => document.getElementById(id);
  const el = (tag, content, cls) => { const node = document.createElement(tag); node.textContent = content; if (cls) node.className = cls; return node; };
  function disclosure(label, value) {
    const details = el('details', ''); details.append(el('summary', label));
    details.addEventListener('toggle', () => { if (details.open && details.children.length === 1) details.append(el('pre', typeof value === 'string' ? value : JSON.stringify(value, null, 2))); });
    return details;
  }
  let examplesLoaded = false;
  async function examples() {
    if (examplesLoaded) return;
    try {
      const response = await fetch('engineering-examples.json', {cache:'no-store'});
      if (!response.ok) throw Error('Saved examples are unavailable.');
      const data = await response.json();
      find('output-note').textContent = data.label;
      find('model-examples').replaceChildren(...data.examples.map(row => {
        const card = el('article', '', 'output-card');
        card.append(el('h3', row.method === 'symphonia' ? 'Symphonia: generated synthesis' : 'Structured comparator: generated synthesis'), el('p', `${row.model} · ${row.map_id} · ${row.panel_size} synthetic participants · full workflow · engineering v7`, 'output-meta'), el('div', row.narrative, 'output-body'));
        card.append(disclosure('View the model’s audit table', row.audit), disclosure('View extraction, alignment and feedback', row.stage_outputs), disclosure('View exact generation requests and responses', row.calls), disclosure('View evaluator labels (engineering check)', row.scores));
        return card;
      }));
      examplesLoaded = true;
    } catch (error) { find('output-note').textContent = error.message; }
  }
  let calls = [], limit = 40;
  function renderCalls() {
    const query = find('model-search').value.trim().toLowerCase();
    const filtered = calls.filter(c => `${c.id} ${c.request?.model} ${c.status}`.toLowerCase().includes(query));
    find('model-count').textContent = `${filtered.length} matching saved calls · showing ${Math.min(limit,filtered.length)}. Newest first. Reload saved model calls for updated records.`;
    find('model-call-list').replaceChildren(...filtered.slice(0,limit).map(call => {
      const details = el('details', '', 'output-card model-call');
      details.append(el('summary', `${call.request?.model || 'Model'} · ${call.status} · ${call.id}`));
      details.addEventListener('toggle', () => {
        if (!details.open || details.children.length > 1) return;
        const output = call.output;
        details.append(el('p', `Recorded cost: $${Number(call.cost_usd || 0).toFixed(4)} · ${call.attempts?.length || 0} API attempt(s)`, 'output-meta'));
        if (output && typeof output === 'object' && output.narrative) details.append(el('div', output.narrative, 'output-body'));
        else if (output && typeof output === 'object' && output.opening) details.append(el('div', output.opening, 'output-body'));
        else details.append(el('pre', output === undefined ? (call.validation_error || 'No valid output. See recorded attempts below.') : typeof output === 'string' ? output : JSON.stringify(output,null,2)));
        details.append(disclosure('Exact request sent to the model', call.request), disclosure('Complete response and API attempts', call));
      });
      return details;
    }));
    find('more-model-calls').hidden = filtered.length <= limit;
  }
  async function loadCalls() {
    const button = find('load-model-calls'); button.disabled = true; button.textContent = 'Loading saved responses…';
    try {
      const response = await fetch(artifactBase + 'experiment-record.jsonl.gz', {cache:'no-store'});
      if (!response.ok) throw Error('The experiment archive is unavailable.');
      const stream = response.body.pipeThrough(new DecompressionStream('gzip'));
      const raw = await new Response(stream).text();
      calls = raw.split('\n').filter(Boolean).map(line => JSON.parse(line)).filter(row => row.record_type === 'model_call').map(row => row.data).sort((a,b) => (b.completed_at || b.started_at || 0) - (a.completed_at || a.started_at || 0));
      limit = 40; renderCalls(); button.textContent = 'Reload saved model calls';
    } catch (error) { find('model-count').textContent = `Could not load calls: ${error.message} The complete archive is also available under Runs & evidence.`; button.textContent = 'Retry loading model calls'; }
    finally { button.disabled = false; }
  }
  document.querySelector('[data-tab="outputs"]').addEventListener('click', examples);
  find('load-model-calls').addEventListener('click', loadCalls);
  find('model-search').addEventListener('input', () => {limit=40;renderCalls();});
  find('more-model-calls').addEventListener('click', () => {limit+=40;renderCalls();});
  if (location.hash === '#outputs') document.querySelector('[data-tab="outputs"]').click();
})();
