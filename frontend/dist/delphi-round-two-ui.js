(function () {
  'use strict';

  if (!/^\/admin\/form\/\d+\/summary\/?$/.test(window.location.pathname)) return;

  var BUTTON_ID = 'delphi-round-two-prepare';
  var MODAL_ID = 'delphi-round-two-modal';

  function clean(value) {
    return (value || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function claimData() {
    return Array.prototype.map.call(document.querySelectorAll('.claim-evidence-claim'), function (card, index) {
      var heading = card.querySelector('.claim-evidence-claim-heading');
      var title = clean(heading && heading.textContent)
        .replace(/^(?:🟥|🟨|🟩)\s*Claim\s+\d+\s*:\s*/i, '');
      var counts = clean(card.querySelector('.claim-evidence-overview')?.textContent);
      return { number: index + 1, title: title, counts: counts };
    }).filter(function (claim) { return claim.title; });
  }

  function baseQuestion(extra) {
    return Object.assign({
      requireEvidence: false,
      requireCounterarguments: false,
      requireConfidence: false,
      importedFromQuestionnaire: false,
    }, extra);
  }

  function questionsFor(claims) {
    var ratingOptions = [
      'Strongly disagree',
      'Disagree',
      'Neither agree nor disagree',
      'Agree',
      'Strongly agree',
    ];
    return claims.reduce(function (questions, claim) {
      var prefix = 'claim_' + claim.number;
      var sectionTitle = 'Claim ' + claim.number + ': ' + claim.title;
      var groupPrompt = (claim.counts ? 'Round 1: ' + claim.counts + '. ' : '') +
        'Review the original excerpts before re-rating. Consensus is not required.';
      return questions.concat([
        baseQuestion({
          label: 'Having reviewed the group feedback, how far do you agree with this claim?',
          questionId: prefix + '_rating',
          sectionTitle: sectionTitle,
          groupPrompt: groupPrompt,
          inputType: 'likert',
          options: ratingOptions,
          allowUnsure: true,
          optional: false,
        }),
        baseQuestion({
          label: 'If you disagree or are uncertain, what is the main reason?',
          questionId: prefix + '_reason',
          sectionTitle: sectionTitle,
          inputType: 'single_select',
          options: [
            'Evidence or interpretation',
            'Wording of the claim',
            'Practical feasibility',
            'Values or priorities',
            'Missing conditions or assumptions',
            'Other',
          ],
          optional: true,
        }),
        baseQuestion({
          label: 'If you disagree or are uncertain, explain precisely what needs clarification, evidence, or change.',
          questionId: prefix + '_explanation',
          sectionTitle: sectionTitle,
          inputType: 'textarea',
          rows: 4,
          placeholder: 'Explain the precise point of disagreement or uncertainty',
          optional: true,
        }),
        baseQuestion({
          label: 'If helpful, suggest revised wording for this claim.',
          questionId: prefix + '_revision',
          sectionTitle: sectionTitle,
          inputType: 'textarea',
          rows: 3,
          placeholder: 'Optional revised wording',
          optional: true,
        }),
      ]);
    }, []);
  }

  function csrfToken() {
    var match = document.cookie.match(/(?:^|; )csrf_token=([^;]*)/);
    return match ? decodeURIComponent(match[1]) : '';
  }

  function closeModal() {
    document.getElementById(MODAL_ID)?.remove();
  }

  function openModal() {
    var claims = claimData();
    if (!claims.length) {
      window.alert('No claims were found in the current synthesis.');
      return;
    }

    closeModal();
    var overlay = document.createElement('div');
    overlay.id = MODAL_ID;
    overlay.style.cssText = 'position:fixed;inset:0;z-index:120;background:rgba(15,23,42,.48);padding:1rem;overflow:auto;';
    var dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', 'delphi-round-two-title');
    dialog.style.cssText = 'max-width:680px;margin:3vh auto;background:var(--card);color:var(--foreground);border:1px solid var(--border);border-radius:14px;box-shadow:0 24px 80px rgba(15,23,42,.3);overflow:hidden;';
    dialog.innerHTML =
      '<div style="display:flex;justify-content:space-between;gap:1rem;padding:1rem 1.1rem;border-bottom:1px solid var(--border)">' +
        '<div><h2 id="delphi-round-two-title" style="margin:0;font-size:1.05rem">Prepare Delphi Round 2</h2>' +
        '<p style="margin:.35rem 0 0;color:var(--muted-foreground);font-size:.85rem">' +
          claims.length + ' claims · ' + (claims.length * 4) + ' structured prompts</p></div>' +
        '<button type="button" data-close aria-label="Close" style="height:36px;width:36px;border:1px solid var(--border);border-radius:9px;background:var(--background);color:var(--foreground);font-size:1.25rem">×</button>' +
      '</div>' +
      '<div style="padding:1rem 1.1rem">' +
        '<p style="margin:0 0 .8rem;font-size:.9rem;line-height:1.5">Each claim asks experts to re-rate it. Experts who disagree or remain uncertain can identify the reason, explain the precise issue, and propose revised wording.</p>' +
        '<div data-claims style="display:grid;gap:.5rem"></div>' +
      '</div>' +
      '<div style="display:flex;justify-content:flex-end;gap:.65rem;padding:1rem 1.1rem;border-top:1px solid var(--border)">' +
        '<button type="button" data-close style="padding:.65rem .9rem;border:1px solid var(--border);border-radius:9px;background:var(--card);color:var(--foreground);font-weight:700">Cancel</button>' +
        '<button type="button" data-start style="padding:.65rem .95rem;border:1px solid var(--accent);border-radius:9px;background:var(--accent);color:white;font-weight:800">Start Delphi Round 2</button>' +
      '</div>';
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    var list = dialog.querySelector('[data-claims]');
    claims.forEach(function (claim) {
      var item = document.createElement('div');
      item.style.cssText = 'padding:.7rem .8rem;border:1px solid var(--border);border-radius:9px;background:var(--background);font-size:.86rem;line-height:1.4;';
      item.textContent = 'Claim ' + claim.number + ': ' + claim.title;
      list.appendChild(item);
    });
    dialog.querySelectorAll('[data-close]').forEach(function (button) {
      button.addEventListener('click', closeModal);
    });
    dialog.querySelector('[data-start]').addEventListener('click', async function (event) {
      var button = event.currentTarget;
      if (!window.confirm('Start Round 2 with ' + claims.length + ' claims and ' + (claims.length * 4) + ' prompts? Round 1 will remain available.')) return;
      button.disabled = true;
      button.textContent = 'Starting Round 2…';
      var formId = window.location.pathname.match(/\/admin\/form\/(\d+)\/summary/)?.[1];
      try {
        var token = localStorage.getItem('access_token') || '';
        var csrf = csrfToken();
        var response = await fetch('/api/forms/' + formId + '/next_round', {
          method: 'POST',
          credentials: 'include',
          headers: Object.assign(
            { 'Content-Type': 'application/json' },
            token ? { Authorization: 'Bearer ' + token } : {},
            csrf ? { 'X-CSRF-Token': csrf } : {}
          ),
          body: JSON.stringify({
            questions: questionsFor(claims),
            context_settings: {
              intro_title: 'Round 2: Review and refine the claims',
              intro_body: 'Review the Round 1 group result and original excerpts, then re-rate each claim. Explain disagreement or uncertainty so the precise issue can be resolved.',
              show_previous_response: true,
            },
          }),
        });
        if (!response.ok) throw new Error((await response.text()) || 'Unable to start Round 2');
        window.location.reload();
      } catch (error) {
        button.disabled = false;
        button.textContent = 'Start Delphi Round 2';
        window.alert(error instanceof Error ? error.message : 'Unable to start Round 2');
      }
    });
  }

  function attach() {
    if (document.getElementById(BUTTON_ID)) return;
    if (!claimData().length) return;
    var roundButtons = Array.prototype.filter.call(document.querySelectorAll('button'), function (button) {
      return clean(button.textContent) === 'Round setup';
    });
    var roundButton = roundButtons.find(function (button) {
      return button.offsetParent !== null;
    }) || roundButtons[0];
    if (!roundButton || !roundButton.parentElement) return;

    var button = document.createElement('button');
    button.id = BUTTON_ID;
    button.type = 'button';
    button.textContent = 'Prepare Delphi Round 2';
    button.style.cssText = 'margin-top:.55rem;width:100%;min-height:42px;padding:.65rem .8rem;border:1px solid var(--accent);border-radius:10px;background:color-mix(in srgb,var(--accent) 8%,var(--card));color:var(--accent);font:inherit;font-size:.86rem;font-weight:800;cursor:pointer;';
    button.addEventListener('click', openModal);
    roundButton.parentElement.appendChild(button);
  }

  var timer = 0;
  var observer = new MutationObserver(function () {
    window.clearTimeout(timer);
    timer = window.setTimeout(attach, 120);
  });
  observer.observe(document.body, { childList: true, subtree: true });
  window.setTimeout(attach, 300);
  window.setTimeout(attach, 1200);
  window.setTimeout(attach, 2500);
})();
