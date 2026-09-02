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


(function () {
  'use strict';

  if (!/^\/public\/session\/[^/]+\/?$/.test(window.location.pathname)) return;

  var ROOT_CLASS = 'delphi-round-two-participant';
  var HEADER_ID = 'delphi-round-two-progress';
  var ACTIONS_ID = 'delphi-round-two-actions';
  var timer = 0;

  function clean(value) {
    return (value || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function sectionButtons() {
    var nav = document.querySelector('nav[aria-label="Question sections"]');
    var buttons = nav
      ? Array.prototype.slice.call(nav.querySelectorAll('button'))
      : Array.prototype.filter.call(document.querySelectorAll('button'), function (button) {
          return /^Claim\s+\d+\s*:/i.test(clean(button.textContent));
        });
    return buttons.filter(function (button) {
      return /^Claim\s+\d+\s*:/i.test(clean(button.textContent));
    });
  }

  function currentIndex(buttons) {
    var index = buttons.findIndex(function (button) {
      return button.getAttribute('aria-current') === 'step';
    });
    return index < 0 ? 0 : index;
  }

  function nativeSubmit() {
    return Array.prototype.find.call(document.querySelectorAll('button'), function (button) {
      return button.id !== 'delphi-round-two-next' &&
        clean(button.textContent) === 'Submit' &&
        button.offsetParent !== null;
    }) || null;
  }

  function isRoundTwo() {
    var text = clean(document.body && document.body.innerText);
    var buttons = sectionButtons();
    var reviewQuestion = Array.prototype.some.call(
      document.querySelectorAll('[data-question-key]'),
      function (question) {
        return /Having reviewed the group feedback/i.test(clean(question.textContent));
      }
    );
    return buttons.length > 1 &&
      (/\bRound\s*2\b/i.test(text) || reviewQuestion);
  }

  function installStyles() {
    if (document.getElementById('delphi-round-two-participant-styles')) return;
    var style = document.createElement('style');
    style.id = 'delphi-round-two-participant-styles';
    style.textContent = [
      'body.' + ROOT_CLASS + ' nav[aria-label="Question sections"]{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important}',
      'body.' + ROOT_CLASS + '{padding-bottom:86px}',
      'body.' + ROOT_CLASS + ' .card-lg{overflow:visible;padding:16px!important}',
      'body.' + ROOT_CLASS + ' .delphi-r2-form-title{font-size:1.05rem!important;line-height:1.35!important;font-weight:750!important;color:var(--muted-foreground)!important;margin:0 0 .25rem!important}',
      'body.' + ROOT_CLASS + ' .delphi-r2-form-description{display:none!important}',
      'body.' + ROOT_CLASS + ' section[aria-label^="Claim "]{padding:0!important;border:0!important;background:transparent!important;box-shadow:none!important}',
      'body.' + ROOT_CLASS + ' [data-question-key]{animation:delphi-r2-enter .22s ease-out}',
      'body.' + ROOT_CLASS + ' [data-question-key]{padding:.35rem 0!important}',
      'body.' + ROOT_CLASS + ' [data-question-key] label{min-height:54px!important;padding:.65rem .85rem!important;border-width:2px!important;border-radius:13px!important;align-items:center!important;transition:transform .12s ease,box-shadow .12s ease,border-color .12s ease,background-color .12s ease}',
      'body.' + ROOT_CLASS + ' [data-question-key] label span{font-size:1rem!important;line-height:1.35!important}',
      'body.' + ROOT_CLASS + ' .delphi-r2-meta,body.' + ROOT_CLASS + ' .delphi-r2-selected,body.' + ROOT_CLASS + ' .delphi-r2-helper{display:none!important}',
      'body.' + ROOT_CLASS + ' [data-question-key] label:has(input:checked){border-color:#58cc02!important;background:color-mix(in srgb,#58cc02 8%,var(--background))!important;box-shadow:0 3px 0 color-mix(in srgb,#58cc02 72%,#2f7d00)!important;transform:translateY(-1px)}',
      'body.' + ROOT_CLASS + ' [data-question-key] input[type="radio"]{accent-color:#58cc02!important;width:18px;height:18px;margin-top:1px}',
      'body.' + ROOT_CLASS + ' [data-question-key] textarea:focus{outline:none!important;border-color:#58cc02!important;box-shadow:0 0 0 3px color-mix(in srgb,#58cc02 16%,transparent)!important}',
      'body.' + ROOT_CLASS + ' .delphi-r2-native-submit{display:none!important}',
      '#' + HEADER_ID + '{margin:.7rem 0 1rem}',
      '.delphi-r2-progress-row{display:flex;align-items:center;justify-content:space-between;gap:1rem;margin-bottom:.55rem;font-size:.82rem;font-weight:800}',
      '.delphi-r2-progress-label{color:var(--foreground)}',
      '.delphi-r2-progress-count{color:var(--muted-foreground)}',
      '.delphi-r2-track{height:12px;border-radius:999px;background:color-mix(in srgb,var(--foreground) 9%,transparent);overflow:hidden}',
      '.delphi-r2-fill{height:100%;border-radius:inherit;background:#58cc02;box-shadow:inset 0 -2px 0 rgba(47,125,0,.22);transition:width .24s ease}',
      '#' + ACTIONS_ID + '{position:fixed;left:50%;right:auto;bottom:0;transform:translateX(-50%);width:min(100%,896px);z-index:40;display:grid;grid-template-columns:minmax(86px,.3fr) minmax(170px,1fr);gap:.65rem;margin:0;padding:.7rem max(1rem,env(safe-area-inset-left)) calc(.7rem + env(safe-area-inset-bottom)) max(1rem,env(safe-area-inset-right));background:color-mix(in srgb,var(--card) 95%,transparent);border-top:1px solid var(--border);box-shadow:0 -8px 24px rgba(15,23,42,.08);backdrop-filter:blur(14px)}',
      '#' + ACTIONS_ID + ' button{min-height:48px;border-radius:13px;padding:.65rem .9rem;font:inherit;font-weight:850;cursor:pointer;transition:transform .1s ease,box-shadow .1s ease}',
      '#delphi-round-two-back{border:2px solid var(--border);background:var(--background);color:var(--foreground);box-shadow:0 3px 0 color-mix(in srgb,var(--border) 78%,var(--foreground))}',
      '#delphi-round-two-next{border:2px solid #58cc02;background:#58cc02;color:#102800;box-shadow:0 4px 0 #46a302}',
      '#' + ACTIONS_ID + ' button:active:not(:disabled){transform:translateY(3px);box-shadow:none}',
      '#' + ACTIONS_ID + ' button:disabled{cursor:not-allowed;opacity:.42;box-shadow:none}',
      '@keyframes delphi-r2-enter{from{opacity:.55;transform:translateX(8px)}to{opacity:1;transform:none}}',
      '@media (min-width:640px){#' + ACTIONS_ID + '{bottom:14px;border:1px solid var(--border);border-radius:16px}}'
    ].join('');
    document.head.appendChild(style);
  }

  function ensureUi() {
    if (!isRoundTwo()) return;

    var buttons = sectionButtons();
    if (!buttons.length) return;
    var index = currentIndex(buttons);
    var nav = buttons[0].closest('nav') || buttons[0].parentElement;
    var title = clean(buttons[index] && buttons[index].textContent)
      .replace(/^Claim\s+\d+\s*:\s*/i, '');

    document.body.classList.add(ROOT_CLASS);
    installStyles();

    var card = nav.closest('.card-lg');
    if (card) {
      var formTitle = card.querySelector('h1');
      if (formTitle) formTitle.classList.add('delphi-r2-form-title');
      var description = formTitle && formTitle.nextElementSibling;
      if (description && description.tagName === 'P') {
        description.classList.add('delphi-r2-form-description');
      }
    }

    Array.prototype.forEach.call(document.querySelectorAll('[data-question-key] *'), function (element) {
      var value = clean(element.textContent);
      if (element.children.length === 0 &&
          /^Having reviewed the group feedback, how far do you agree with this claim\?$/i.test(value)) {
        element.textContent = 'Where do you stand on this claim?';
      }
      if (/^Review the Round 1 result and original excerpts before re-rating\./i.test(value) &&
          element.tagName === 'P') {
        element.classList.add('delphi-r2-helper');
      }
      if (value === 'Selected') element.classList.add('delphi-r2-selected');
      if (value === 'Required' && element.parentElement) {
        element.parentElement.classList.add('delphi-r2-meta');
      }
    });

    var header = document.getElementById(HEADER_ID);
    if (!header) {
      header = document.createElement('section');
      header.id = HEADER_ID;
      header.setAttribute('aria-label', 'Round 2 progress');
      header.innerHTML =
        '<div class="delphi-r2-progress-row">' +
          '<span class="delphi-r2-progress-label"></span>' +
          '<span class="delphi-r2-progress-count"></span>' +
        '</div>' +
        '<div class="delphi-r2-track" role="progressbar" aria-valuemin="1">' +
          '<div class="delphi-r2-fill"></div>' +
        '</div>';
      nav.parentElement.insertBefore(header, nav);
    }

    header.querySelector('.delphi-r2-progress-label').textContent =
      title ? 'Claim ' + (index + 1) + ': ' + title : 'Claim ' + (index + 1);
    header.querySelector('.delphi-r2-progress-count').textContent =
      (index + 1) + ' of ' + buttons.length;
    var track = header.querySelector('.delphi-r2-track');
    track.setAttribute('aria-valuemax', String(buttons.length));
    track.setAttribute('aria-valuenow', String(index + 1));
    header.querySelector('.delphi-r2-fill').style.width =
      (((index + 1) / buttons.length) * 100) + '%';

    var submit = nativeSubmit();
    if (submit) submit.classList.add('delphi-r2-native-submit');

    var actions = document.getElementById(ACTIONS_ID);
    if (!actions) {
      actions = document.createElement('div');
      actions.id = ACTIONS_ID;
      actions.innerHTML =
        '<button type="button" id="delphi-round-two-back">Back</button>' +
        '<button type="button" id="delphi-round-two-next">Continue</button>';
      var anchor = submit || nav.parentElement.lastElementChild;
      if (anchor && anchor.parentElement) anchor.parentElement.insertBefore(actions, anchor);
      else nav.parentElement.appendChild(actions);

      actions.querySelector('#delphi-round-two-back').addEventListener('click', function () {
        var current = sectionButtons();
        var active = currentIndex(current);
        if (active > 0) current[active - 1].click();
      });
      actions.querySelector('#delphi-round-two-next').addEventListener('click', function () {
        var current = sectionButtons();
        var active = currentIndex(current);
        if (active < current.length - 1) {
          current[active + 1].click();
        } else {
          var finalSubmit = document.querySelector('.delphi-r2-native-submit');
          if (finalSubmit) finalSubmit.click();
        }
      });
    }

    var back = actions.querySelector('#delphi-round-two-back');
    var next = actions.querySelector('#delphi-round-two-next');
    back.disabled = index === 0;
    next.textContent = index === buttons.length - 1 ? 'Submit response' : 'Continue';
  }

  var observer = new MutationObserver(function () {
    window.clearTimeout(timer);
    timer = window.setTimeout(ensureUi, 80);
  });
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['aria-current']
  });
  window.setTimeout(ensureUi, 250);
  window.setTimeout(ensureUi, 900);
  window.setTimeout(ensureUi, 1800);
})();
