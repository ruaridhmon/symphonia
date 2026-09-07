import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const script = readFileSync(new URL('../dist/delphi-round-two-ui.js', import.meta.url), 'utf8');
const settle = () => new Promise(resolve => setTimeout(resolve, 180));

test('legacy participant navigation says Back and Continue without replacing controls', async () => {
  const dom = page('/public/session/legacy');
  try {
    dom.window.document.body.innerHTML = '<main><button><svg></svg>Previous</button><button>Save &amp; Next</button></main>';
    const buttons = [...dom.window.document.querySelectorAll('button')];
    let clicks = 0;
    buttons[1].addEventListener('click', () => clicks++);
    await settle();
    assert.equal(buttons[0].textContent, 'Back');
    assert.equal(buttons[1].textContent, 'Continue');
    assert.ok(buttons[0].querySelector('svg'));
    buttons[1].click();
    assert.equal(clicks, 1);
  } finally { dom.window.close(); }
});

test('submitted responses show saved comments, not an add-comment input or submit action', async () => {
  const dom = page('/public/session/submitted');
  try {
    participant(dom.window, 1);
    const input = dom.window.document.querySelector('textarea');
    input.readOnly = true;
    dom.window.document.querySelector('input').disabled = true;
    await settle();
    assert.equal(dom.window.document.querySelector('.delphi-r2-saved-comment').textContent, 'No comment added');
    assert.equal(dom.window.document.querySelector('.delphi-r2-composer'), null);
    assert.equal(dom.window.document.querySelector('#delphi-round-two-next').textContent, 'Review complete');
    assert.equal(dom.window.document.querySelector('#delphi-round-two-next').disabled, true);
  } finally { dom.window.close(); }
});

function page(path = '/') {
  const dom = new JSDOM('<body></body>', {
    url: 'https://symphonia-dev-488613.web.app' + path,
    runScripts: 'outside-only', pretendToBeVisual: true,
  });
  Object.defineProperty(dom.window.HTMLElement.prototype, 'offsetParent', {
    get() { return this.parentElement; },
  });
  const observers = [];
  const NativeObserver = dom.window.MutationObserver;
  dom.window.MutationObserver = class extends NativeObserver {
    constructor(callback) { super(callback); observers.push(this); }
  };
  const close = dom.window.close.bind(dom.window);
  dom.window.close = () => { observers.forEach(observer => observer.disconnect()); close(); };
  dom.window.eval(script);
  return dom;
}

function participant(window, count = 2) {
  window.document.body.innerHTML = `<div class="card-lg"><h1>Synthetic consultation</h1><p>Ten synthetic experts.</p>
    <nav aria-label="Question sections">${Array.from({ length: count }, (_, i) =>
      `<button ${i === 0 ? 'aria-current="step"' : ''}>Claim ${i + 1}: Test claim ${i + 1}</button>`).join('')}</nav>
    <section aria-label="Claim 1"><div data-question-key="q1"><label><span>Your response</span><span>Answered</span></label>
      <label><input type="radio" name="rating">Agree</label></div>
    <div data-question-key="q2"><div><span>Comments or clarification</span></div><textarea></textarea></div></section>
    <button>Submit</button></div>`;
}

test('activates after SPA navigation; comment is a single accessible growing input', async () => {
  const dom = page();
  try {
    const { window } = dom;
    window.history.pushState({}, '', '/public/session/demo');
    participant(window);
    await settle();
    assert.ok(window.document.body.classList.contains('delphi-round-two-participant'));
    const about = window.document.querySelector('#delphi-round-two-about');
    assert.equal(about.open, false);
    assert.equal(about.querySelector('h2').textContent, 'Synthetic consultation');
    assert.match(about.querySelector('summary').textContent, /Synthetic demo/);
    assert.ok(window.document.querySelector('.delphi-r2-response-heading'));
    assert.equal(window.document.querySelector('input').parentElement.classList.contains('delphi-r2-response-heading'), false);
    about.open = true;
    const input = window.document.querySelector('textarea');
    assert.equal(input.rows, 1);
    assert.equal(input.getAttribute('aria-label'), 'Comments or clarification (optional)');
    assert.equal(window.document.querySelectorAll('.delphi-r2-comment-toggle').length, 0);
    input.value = 'Synthetic clarification';
    input.dispatchEvent(new window.Event('input', { bubbles: true }));
    assert.equal(input.value, 'Synthetic clarification');
    assert.ok(input.style.height.endsWith('px'));
    assert.equal(window.document.querySelector('#delphi-round-two-next').disabled, true);
    const radio = window.document.querySelector('input');
    radio.checked = true;
    radio.dispatchEvent(new window.Event('change', { bubbles: true }));
    assert.equal(window.document.querySelector('#delphi-round-two-next').disabled, false);
    const header = window.document.querySelector('#delphi-round-two-progress');
    await settle();
    assert.equal(window.document.querySelector('#delphi-round-two-progress'), header);
    assert.equal(window.document.querySelectorAll('#delphi-round-two-about').length, 1);
    assert.equal(about.open, true);
  } finally { dom.window.close(); }
});

test('single-claim follow-up works; leaving cleans up the fixed participant controls', async () => {
  const dom = page('/public/session/demo');
  try {
    participant(dom.window, 1);
    await settle();
    assert.equal(dom.window.document.querySelector('#delphi-round-two-next').textContent, 'Submit response');
    dom.window.history.pushState({}, '', '/dashboard');
    dom.window.document.body.innerHTML = '<h1>Dashboard</h1>';
    await settle();
    assert.equal(dom.window.document.body.classList.contains('delphi-round-two-participant'), false);
    assert.equal(dom.window.document.querySelector('#delphi-round-two-actions'), null);
  } finally { dom.window.close(); }
});

test('setup activates on internal navigation and creates exactly two fields per claim', async () => {
  const dom = page();
  try {
    const { window } = dom;
    window.alert = () => {};
    let request;
    window.fetch = async (url, options) => {
      request = { url, body: JSON.parse(options.body) };
      return { ok: false, text: async () => 'Test: not opening a live round' };
    };
    window.history.pushState({}, '', '/admin/form/14/summary');
    window.document.body.innerHTML = '<button>Round setup</button>' +
      [1, 2].map(n => `<div class="claim-evidence-claim"><h3 class="claim-evidence-claim-heading">🟩 Claim ${n}: Synthetic claim ${n}</h3></div>`).join('');
    await settle();
    window.document.querySelector('button').click();
    const modal = window.document.querySelector('[role="dialog"]');
    assert.ok(modal);
    assert.match(modal.textContent, /Set up next Delphi round/);
    assert.doesNotMatch(modal.textContent, /Round Two|Round 2|Add question/);
    modal.querySelector('[data-intro]').value = 'Review the previous feedback.';
    modal.querySelector('[data-start]').click();
    await settle();
    assert.equal(request.url, '/api/forms/14/next_round');
    assert.equal(request.body.questions.length, 4);
    assert.equal(request.body.questions[0].options.length, 6);
    assert.equal(request.body.questions[1].optional, true);
    assert.equal(request.body.context_settings.intro_body, 'Review the previous feedback.');
    assert.equal(modal.querySelector('[data-start]').disabled, false);
  } finally { dom.window.close(); }
});
