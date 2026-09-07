(function () {
  'use strict';

  function isSummaryPath() {
    return /^\/admin\/form\/\d+\/summary\/?$/.test(window.location.pathname);
  }

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
    var responseOptions = ['Strongly agree', 'Agree', 'Neither agree nor disagree', 'Disagree', 'Strongly disagree', 'Unable to judge — need more information'];
    return claims.reduce(function (questions, claim) {
      var prefix = 'claim_' + claim.number;
      var sectionTitle = 'Claim ' + claim.number + ': ' + claim.title;
      return questions.concat([
        baseQuestion({
          label: 'Your response',
          questionId: prefix + '_response',
          sectionTitle: sectionTitle,
          inputType: 'single_select',
          options: responseOptions,
          optional: false,
        }),
        baseQuestion({
          label: 'Comments or clarification',
          questionId: prefix + '_comment',
          sectionTitle: sectionTitle,
          inputType: 'textarea',
          rows: 2,
          placeholder: 'Optional',
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
    if (!isSummaryPath()) return;
    var claims = claimData();
    var viewedRound = (document.body.innerText || document.body.textContent).match(/Round\s+(\d+)\s+of\s+\d+/i);
    var expectedRound = viewedRound ? Number(viewedRound[1]) : null;
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
    dialog.style.cssText = 'max-width:640px;max-height:94vh;margin:2vh auto;background:var(--card);color:var(--foreground);border:1px solid var(--border);border-radius:16px;box-shadow:0 24px 80px rgba(15,23,42,.3);overflow:auto;';
    dialog.innerHTML =
      '<div style="display:flex;justify-content:space-between;gap:1rem;padding:1rem 1.1rem;border-bottom:1px solid var(--border)">' +
        '<div><h2 id="delphi-round-two-title" style="margin:0;font-size:1.1rem">Set up next Delphi round</h2>' +
        '<p style="margin:.3rem 0 0;color:var(--muted-foreground);font-size:.85rem">' +
          claims.length + ' claims ready to review</p></div>' +
        '<button type="button" data-close aria-label="Close" style="flex:0 0 auto;height:36px;width:36px;border:1px solid var(--border);border-radius:9px;background:var(--background);color:var(--foreground);font-size:1.25rem">×</button>' +
      '</div>' +
      '<div style="display:grid;gap:1rem;padding:1rem 1.1rem">' +
        '<div data-preview aria-label="Participant preview"></div>' +
        '<details><summary style="cursor:pointer;font-size:.85rem">Introduction (optional)</summary>' +
          '<textarea data-intro rows="2" aria-label="Optional introduction" placeholder="Add a short message for participants" style="width:100%;box-sizing:border-box;padding:.7rem;border:1px solid var(--border);border-radius:10px;background:var(--background);color:var(--foreground);font:inherit;font-size:16px"></textarea>' +
        '</details>' +
      '</div>' +
      '<div style="display:flex;justify-content:flex-end;gap:.65rem;padding:1rem 1.1rem;border-top:1px solid var(--border)">' +
        '<button type="button" data-close style="padding:.65rem .9rem;border:1px solid var(--border);border-radius:10px;background:var(--card);color:var(--foreground);font-weight:700">Cancel</button>' +
        '<button type="button" data-start style="padding:.65rem .95rem;border:1px solid var(--accent);border-radius:10px;background:var(--accent);color:white;font-weight:800">Open next round</button>' +
      '</div>';
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    var previewIndex = 0;
    var preview = dialog.querySelector('[data-preview]');
    var previewAnswers = {};
    function renderPreview() {
      var claim = claims[previewIndex];
      preview.replaceChildren();
      var progress = document.createElement('p');
      progress.style.cssText = 'display:flex;justify-content:space-between;color:var(--muted-foreground);font-size:.8rem;margin:0 0 .6rem';
      progress.textContent = 'Participant preview · ' + (previewIndex + 1) + ' of ' + claims.length;
      preview.appendChild(progress);
      var track = document.createElement('div');
      track.style.cssText = 'height:8px;background:var(--border);border-radius:8px;overflow:hidden;margin-bottom:1rem';
      var fill = document.createElement('div');
      fill.style.cssText = 'height:100%;background:#58cc02;width:' + ((previewIndex + 1) / claims.length * 100) + '%';
      track.appendChild(fill);
      preview.appendChild(track);
      var heading = document.createElement('h3');
      heading.textContent = claim.title;
      heading.style.cssText = 'font-size:1.1rem;line-height:1.45;margin:0 0 1rem';
      preview.appendChild(heading);
      questionsFor([claim])[0].options.forEach(function (option) {
        var label = document.createElement('label');
        label.style.cssText = 'display:flex;align-items:center;gap:.7rem;min-height:48px;padding:.5rem .8rem;box-sizing:border-box;border:2px solid var(--border);border-radius:13px;margin:.45rem 0;font-size:16px;cursor:pointer';
        var input = document.createElement('input');
        input.type = 'radio';
        input.name = 'delphi-preview-rating';
        input.checked = previewAnswers[previewIndex] === option;
        input.style.accentColor = '#58cc02';
        function highlight() {
          label.style.borderColor = input.checked ? '#58cc02' : 'var(--border)';
          label.style.background = input.checked ? 'color-mix(in srgb,#58cc02 8%,var(--background))' : 'var(--background)';
        }
        input.addEventListener('change', function () {
          previewAnswers[previewIndex] = option;
          preview.querySelectorAll('label').forEach(function (item) {
            var selected = item.querySelector('input').checked;
            item.style.borderColor = selected ? '#58cc02' : 'var(--border)';
            item.style.background = selected ? 'color-mix(in srgb,#58cc02 8%,var(--background))' : 'var(--background)';
          });
        });
        label.append(input, document.createTextNode(option));
        highlight();
        preview.appendChild(label);
      });
      var comment = document.createElement('textarea');
      comment.rows = 1;
      comment.placeholder = 'Add a comment… (optional)';
      comment.setAttribute('aria-label', 'Preview comment (not submitted)');
      comment.style.cssText = 'width:100%;box-sizing:border-box;min-height:52px;padding:14px 16px;margin:.7rem 0;border:1px solid var(--border);border-radius:22px;background:var(--background);color:var(--foreground);font:inherit;font-size:16px;resize:none';
      preview.appendChild(comment);
      var navigation = document.createElement('div');
      navigation.style.cssText = 'display:flex;gap:.65rem';
      ['Back', previewIndex + 1 === claims.length ? 'Preview complete' : 'Continue'].forEach(function (text, index) {
        var button = document.createElement('button');
        button.type = 'button';
        button.textContent = text;
        button.style.cssText = 'min-height:48px;padding:.65rem 1rem;border:2px solid var(--border);border-radius:13px;font:inherit;font-weight:750;flex:' + (index ? '2' : '1') + ';background:' + (index ? '#58cc02' : 'var(--background)') + ';color:' + (index ? '#102800' : 'var(--foreground)');
        button.disabled = index ? previewIndex + 1 === claims.length : previewIndex === 0;
        if (button.disabled) button.style.opacity = '.45';
        button.addEventListener('click', function () { previewIndex += index ? 1 : -1; renderPreview(); });
        navigation.appendChild(button);
      });
      preview.appendChild(navigation);
    }
    renderPreview();
    overlay.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') closeModal();
    });
    dialog.querySelector('[data-close]').focus();
    dialog.querySelectorAll('[data-close]').forEach(function (button) {
      button.addEventListener('click', closeModal);
    });
    dialog.querySelector('[data-start]').addEventListener('click', async function (event) {
      var button = event.currentTarget;
      var intro = clean(dialog.querySelector('[data-intro]')?.value || '');
      button.disabled = true;
      button.textContent = 'Opening next round…';
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
            expected_round_number: expectedRound,
            questions: questionsFor(claims),
            context_settings: {
              intro_title: 'Review the claims',
              intro_body: intro,
              show_previous_response: true,
            },
          }),
        });
        if (!response.ok) throw new Error((await response.text()) || 'Unable to open the next round');
        window.location.reload();
      } catch (error) {
        button.disabled = false;
        button.textContent = 'Open next round';
        window.alert(error instanceof Error ? error.message : 'Unable to open the next round');
      }
    });
  }

  function attach() {
    if (!isSummaryPath()) {
      closeModal();
      return;
    }
    if (document.getElementById(BUTTON_ID)) return;
    if (!claimData().length) return;
    var roundButtons = Array.prototype.filter.call(document.querySelectorAll('button'), function (button) {
      return button.getAttribute('aria-controls') === 'summary-round-setup' ||
        clean(button.textContent) === 'Round setup';
    });
    var button = roundButtons.find(function (candidate) {
      return candidate.offsetParent !== null;
    }) || roundButtons[0];
    if (!button) return;

    button.id = BUTTON_ID;
    button.textContent = 'Set up next Delphi round';
    button.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      openModal();
    }, true);
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

  function isPublicSessionPath() {
    return /^\/public\/session\/[^/]+\/?$/.test(window.location.pathname);
  }

  var ROOT_CLASS = 'delphi-round-two-participant';
  var HEADER_ID = 'delphi-round-two-progress';
  var ACTIONS_ID = 'delphi-round-two-actions';
  var LOADING_ID = 'delphi-round-two-loading';
  var timer = 0;

  function updateLoadingState() {
    var existing = document.getElementById(LOADING_ID);
    var card = document.querySelector('.card-lg');
    var loaded = Boolean(
      document.querySelector('[data-question-key]') ||
      (card && card.querySelector('h1')) ||
      /Unable to load form|Response submitted/i.test(document.body?.innerText || '')
    );

    if (loaded || !card) {
      if (existing) existing.remove();
      return;
    }
    if (existing) return;

    var status = document.createElement('p');
    status.id = LOADING_ID;
    status.setAttribute('role', 'status');
    status.textContent = 'Loading survey…';
    status.style.cssText =
      'margin:0 0 1rem;padding:.8rem 1rem;border-radius:10px;' +
      'background:color-mix(in srgb,var(--accent) 7%,var(--background));' +
      'color:var(--muted-foreground);font-size:.95rem;font-weight:650;';
    card.insertBefore(status, card.firstChild);
  }

  function clean(value) {
    return (value || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function setText(element, value) {
    if (element && element.textContent !== value) {
      element.textContent = value;
    }
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
    var prompts = Array.prototype.map.call(
      document.querySelectorAll('[data-question-key]'),
      function (question) { return clean(question.textContent); }
    ).join(' ');
    var roundTwoQuestions =
      /Having reviewed the group feedback/i.test(prompts) ||
      (/Your response/i.test(prompts) && /Comments or clarification/i.test(prompts));
    return buttons.length > 0 &&
      (/\bRound\s*2\b/i.test(text) || roundTwoQuestions);
  }

  function installStyles() {
    if (document.getElementById('delphi-round-two-participant-styles')) return;
    var style = document.createElement('style');
    style.id = 'delphi-round-two-participant-styles';
    style.textContent = [
      'body.' + ROOT_CLASS + ' nav[aria-label="Question sections"]{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important}',
      'body.' + ROOT_CLASS + '{padding-bottom:86px}',
      'body.' + ROOT_CLASS + ' .card-lg{overflow:visible;padding:16px!important}',
      'body.' + ROOT_CLASS + ' .delphi-r2-form-title,body.' + ROOT_CLASS + ' [data-question-key] .delphi-r2-response-heading{position:absolute!important;width:1px!important;height:1px!important;min-height:0!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip-path:inset(50%)!important;white-space:nowrap!important;border:0!important}',
      '#delphi-round-two-about{margin:0 0 .75rem;font-size:.875rem;color:var(--muted-foreground)}',
      '#delphi-round-two-about summary{cursor:pointer;width:fit-content;padding:.35rem 0;min-height:32px}',
      '#delphi-round-two-about h2{font-size:1rem;line-height:1.4;color:var(--foreground);margin:.5rem 0}',
      '#delphi-round-two-about p{font-size:.875rem;line-height:1.5;margin:.35rem 0 .75rem}',
      'body.' + ROOT_CLASS + ' .delphi-r2-form-description{display:none!important}',
      'body.' + ROOT_CLASS + ' section[aria-label^="Claim "]{padding:0!important;border:0!important;background:transparent!important;box-shadow:none!important}',
      'body.' + ROOT_CLASS + ' [data-question-key]{padding:.35rem 0!important}',
      'body.' + ROOT_CLASS + ' [data-question-key] label{min-height:54px!important;padding:.65rem .85rem!important;border-width:2px!important;border-radius:13px!important;align-items:center!important;transition:box-shadow .12s ease,border-color .12s ease,background-color .12s ease}',
      'body.' + ROOT_CLASS + ' [data-question-key] label span{font-size:1rem!important;line-height:1.35!important}',
      'body.' + ROOT_CLASS + ' .delphi-r2-meta,body.' + ROOT_CLASS + ' .delphi-r2-selected,body.' + ROOT_CLASS + ' .delphi-r2-helper,body.' + ROOT_CLASS + ' .delphi-r2-empty-selection,body.' + ROOT_CLASS + ' .delphi-r2-extra-explanation{display:none!important}',
      'body.' + ROOT_CLASS + ' [data-question-key] label:has(input:checked){border-color:#58cc02!important;background:color-mix(in srgb,#58cc02 8%,var(--background))!important;box-shadow:inset 0 0 0 1px #58cc02!important;transform:none!important}',
      'body.' + ROOT_CLASS + ' [data-question-key] input[type="radio"]{accent-color:#58cc02!important;width:18px;height:18px;margin-top:1px}',
      'body.' + ROOT_CLASS + ' [data-question-key] textarea:focus{outline:none!important;border-color:#58cc02!important;box-shadow:0 0 0 3px color-mix(in srgb,#58cc02 16%,transparent)!important}',
      'body.' + ROOT_CLASS + ' input,body.' + ROOT_CLASS + ' textarea,body.' + ROOT_CLASS + ' select{font-size:16px!important}',
      'body.' + ROOT_CLASS + ' .delphi-r2-comment-native-heading{display:none!important}',
      'body.' + ROOT_CLASS + ' .delphi-r2-saved-comment{margin:.5rem 0;padding:12px 16px;border-radius:16px;background:var(--background);color:var(--muted-foreground);font-size:16px;line-height:1.5;white-space:pre-wrap;overflow-wrap:anywhere}',
      'body.' + ROOT_CLASS + ' [data-question-key] textarea{display:none!important}',
      'body.' + ROOT_CLASS + ' .delphi-r2-composer textarea{display:block!important;box-sizing:border-box;width:100%;min-height:52px!important;max-height:180px;margin:.4rem 0!important;padding:14px 16px!important;border:1px solid var(--border)!important;border-radius:22px!important;background:var(--background)!important;line-height:24px!important;resize:none;overflow-y:auto;scroll-margin-bottom:110px;transition:border-color .12s ease,box-shadow .12s ease}',
      'body.' + ROOT_CLASS + ' .delphi-r2-composer textarea:focus{border-color:var(--accent)!important;box-shadow:0 0 0 2px color-mix(in srgb,var(--accent) 12%,transparent)!important}',
      'body.' + ROOT_CLASS + ' .delphi-r2-native-submit{display:none!important}',
      '#' + HEADER_ID + '{margin:.7rem 0 1rem}',
      '.delphi-r2-progress-row{display:flex;align-items:center;justify-content:space-between;gap:1rem;margin-bottom:.55rem;font-size:.82rem;font-weight:800}',
      '.delphi-r2-progress-label{color:var(--foreground)}',
      '.delphi-r2-progress-count{color:var(--muted-foreground);white-space:nowrap;flex-shrink:0}',
      '.delphi-r2-track{height:12px;border-radius:999px;background:color-mix(in srgb,var(--foreground) 9%,transparent);overflow:hidden}',
      '.delphi-r2-fill{height:100%;border-radius:inherit;background:#58cc02;box-shadow:inset 0 -2px 0 rgba(47,125,0,.22);transition:width .24s ease}',
      '#' + ACTIONS_ID + '{position:fixed;left:50%;right:auto;bottom:0;transform:translateX(-50%);width:min(100%,896px);z-index:40;display:grid;grid-template-columns:minmax(86px,.3fr) minmax(170px,1fr);gap:.65rem;margin:0;padding:.7rem max(1rem,env(safe-area-inset-left)) calc(.7rem + env(safe-area-inset-bottom)) max(1rem,env(safe-area-inset-right));background:color-mix(in srgb,var(--card) 95%,transparent);border-top:1px solid var(--border);box-shadow:0 -8px 24px rgba(15,23,42,.08);backdrop-filter:blur(14px)}',
      '#' + ACTIONS_ID + ' button{min-height:48px;border-radius:13px;padding:.65rem .9rem;font:inherit;font-weight:850;cursor:pointer;transition:transform .1s ease,box-shadow .1s ease}',
      '#delphi-round-two-back{border:2px solid var(--border);background:var(--background);color:var(--foreground);box-shadow:0 3px 0 color-mix(in srgb,var(--border) 78%,var(--foreground))}',
      '#delphi-round-two-next{border:2px solid #58cc02;background:#58cc02;color:#102800;box-shadow:0 4px 0 #46a302}',
      '#' + ACTIONS_ID + ' button:active:not(:disabled){transform:translateY(3px);box-shadow:none}',
      '#' + ACTIONS_ID + ' button:disabled{cursor:not-allowed;opacity:.42;box-shadow:none}',
      '@keyframes delphi-r2-comment-in{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:none}}',
      '@media (min-width:640px){#' + ACTIONS_ID + '{bottom:14px;border:1px solid var(--border);border-radius:16px}}'
    ].join('');
    document.head.appendChild(style);
  }

  function enhanceComment(question) {
    if (question.dataset.delphiCommentReady === 'true') return;
    if (!/Comments or clarification/i.test(clean(question.textContent))) return;

    var textarea = question.querySelector('textarea');
    if (!textarea) return;

    var label = Array.prototype.find.call(question.querySelectorAll('*'), function (element) {
      return element.children.length === 0 &&
        clean(element.textContent) === 'Comments or clarification';
    });
    if (label) {
      var heading = label;
      while (heading.parentElement &&
             heading.parentElement !== question &&
             !heading.parentElement.querySelector('textarea')) {
        heading = heading.parentElement;
      }
      heading.classList.add('delphi-r2-comment-native-heading');
    }

    if (textarea.readOnly || textarea.disabled) {
      var saved = document.createElement('p');
      saved.className = 'delphi-r2-saved-comment';
      saved.setAttribute('aria-label', 'Submitted comment');
      saved.textContent = textarea.value.trim() || 'No comment added';
      question.appendChild(saved);
      question.dataset.delphiCommentReady = 'true';
      return;
    }
    question.classList.add('delphi-r2-composer');
    textarea.rows = 1;
    textarea.placeholder = 'Add a comment… (optional)';
    textarea.setAttribute('aria-label', 'Comments or clarification (optional)');

    function resize() {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(180, Math.max(52, textarea.scrollHeight + 2)) + 'px';
    }
    textarea.addEventListener('input', resize);

    question.dataset.delphiCommentReady = 'true';
    resize();
  }

  function currentClaimAnswered() {
    return Array.prototype.some.call(
      document.querySelectorAll('input[type="radio"]'),
      function (input) {
        return input.checked && input.offsetParent !== null;
      }
    );
  }

  function cleanupUi() {
    document.body.classList.remove(ROOT_CLASS, 'delphi-r2-commenting');
    var header = document.getElementById(HEADER_ID);
    var actions = document.getElementById(ACTIONS_ID);
    var loading = document.getElementById(LOADING_ID);
    var about = document.getElementById('delphi-round-two-about');
    if (about) about.remove();
    if (header) header.remove();
    if (actions) actions.remove();
    if (loading) loading.remove();
  }

  function ensureUi() {
    if (!isPublicSessionPath()) {
      cleanupUi();
      return;
    }
    updateLoadingState();
    // Keep legacy participant pagination wording consistent without changing saving.
    Array.prototype.forEach.call(document.querySelectorAll('main button'), function (button) {
      var value = clean(button.textContent);
      if (value !== 'Save & Next' && value !== 'Previous') return;
      Array.prototype.forEach.call(button.childNodes, function (node) {
        if (node.nodeType === 3 && clean(node.textContent) === value) {
          node.textContent = value === 'Previous' ? 'Back' : 'Continue';
        }
      });
    });
    if (!isRoundTwo()) {
      cleanupUi();
      return;
    }

    var buttons = sectionButtons();
    if (!buttons.length) return;
    var index = currentIndex(buttons);
    var nav = buttons[0].closest('nav') || buttons[0].parentElement;
    var title = clean(buttons[index] && buttons[index].textContent)
      .replace(/^Claim\s+\d+\s*:\s*/i, '');

    document.body.classList.add(ROOT_CLASS);
    installStyles();
    Array.prototype.forEach.call(
      document.querySelectorAll('[data-question-key]'),
      enhanceComment
    );

    var card = nav.closest('.card-lg');
    if (card) {
      var formTitle = card.querySelector('h1');
      if (formTitle) formTitle.classList.add('delphi-r2-form-title');
      var description = formTitle && formTitle.nextElementSibling;
      if (description && description.tagName === 'P') {
        description.classList.add('delphi-r2-form-description');
      }
      if (formTitle) {
        var about = card.querySelector('#delphi-round-two-about');
        if (!about) {
          about = document.createElement('details');
          about.id = 'delphi-round-two-about';
          about.appendChild(document.createElement('summary'));
          about.appendChild(document.createElement('h2'));
          about.appendChild(document.createElement('p'));
          formTitle.before(about);
        }
        var descriptionText = description && description.tagName === 'P' ? clean(description.textContent) : '';
        setText(about.querySelector('summary'), /synthetic/i.test(descriptionText) ? 'About this survey · Synthetic demo' : 'About this survey');
        setText(about.querySelector('h2'), clean(formTitle.textContent));
        setText(about.querySelector('p'), descriptionText);
      }
    }

    Array.prototype.forEach.call(document.querySelectorAll('[data-question-key] > label'), function (label) {
      if (!label.querySelector('input') && /^Your response$/i.test(clean(label.firstElementChild ? label.firstElementChild.textContent : label.textContent))) {
        label.classList.add('delphi-r2-response-heading');
      }
    });

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
      if (/^No option selected yet\.?$/i.test(value)) {
        element.classList.add('delphi-r2-empty-selection');
      }
      if (/^Further explanation(?:\s*\(optional\))?$/i.test(value)) {
        var explanation = element.parentElement;
        while (
          explanation &&
          explanation.parentElement &&
          explanation.parentElement.closest('[data-question-key]') &&
          !explanation.querySelector('textarea')
        ) {
          explanation = explanation.parentElement;
        }
        if (explanation && explanation.querySelector('textarea')) {
          explanation.classList.add('delphi-r2-extra-explanation');
        }
      }
      if (value === 'Required' && element.parentElement) {
        element.parentElement.classList.add('delphi-r2-meta');
      }
    });

    var header = document.getElementById(HEADER_ID);
    if (!header) {
      header = document.createElement('section');
      header.id = HEADER_ID;
      header.setAttribute('aria-label', 'Claim review progress');
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

    setText(
      header.querySelector('.delphi-r2-progress-label'),
      title ? 'Claim ' + (index + 1) + ': ' + title : 'Claim ' + (index + 1)
    );
    setText(
      header.querySelector('.delphi-r2-progress-count'),
      (index + 1) + ' of ' + buttons.length
    );
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
        var readOnly = Array.prototype.every.call(document.querySelectorAll('[data-question-key] input[type="radio"]'), function (radio) { return radio.disabled; });
        if (!readOnly && !currentClaimAnswered()) return;
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
    var radios = Array.prototype.slice.call(document.querySelectorAll('[data-question-key] input[type="radio"]'));
    var readOnly = radios.length > 0 && radios.every(function (radio) { return radio.disabled; });
    back.disabled = index === 0;
    next.disabled = readOnly ? index === buttons.length - 1 : !currentClaimAnswered();
    setText(
      next,
      readOnly ? (index === buttons.length - 1 ? 'Review complete' : 'Next claim') :
        (index === buttons.length - 1 ? 'Submit response' : 'Continue')
    );
  }

  document.addEventListener('change', function (event) {
    if (event.target && event.target.matches('input[type="radio"]')) {
      ensureUi();
    }
  }, true);

  var updateScheduled = false;
  var observer = new MutationObserver(function () {
    if (updateScheduled) return;
    updateScheduled = true;
    window.requestAnimationFrame(function () {
      updateScheduled = false;
      ensureUi();
    });
  });
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['aria-current']
  });
  window.addEventListener('popstate', ensureUi);
  window.addEventListener('pageshow', ensureUi);
  window.setTimeout(ensureUi, 250);
  window.setTimeout(ensureUi, 900);
  window.setTimeout(ensureUi, 1800);
})();

// Keep sharing secondary controls available without competing with the invitation.
(function () {
  function enhanceShare() {
    var dialog = document.querySelector('[role="dialog"][aria-label="Share consultation"]');
    if (!dialog || dialog.dataset.delphiShareReady) return;
    var buttons = Array.from(dialog.querySelectorAll('button'));
    var copy = buttons.find(function (button) { return button.textContent.trim() === 'Copy link'; });
    var code = buttons.find(function (button) { return button.textContent.trim() === 'Copy join code'; });
    var open = Array.from(dialog.querySelectorAll('a')).find(function (link) { return link.textContent.trim() === 'Open join page'; });
    if (!copy || !code || !open) return;
    dialog.dataset.delphiShareReady = 'true';
    copy.style.cssText += ';width:100%;justify-content:center;min-height:48px;background:var(--accent);color:white;border-radius:13px;font-weight:750';
    Array.from(copy.childNodes).filter(function (node) { return node.nodeType === 3; }).forEach(function (node) { node.textContent = 'Copy invitation link'; });
    open.textContent = 'Preview invitation';
    open.style.cssText += ';background:transparent;margin-left:auto;font-size:.85rem';
    var codeRow = Array.from(dialog.querySelectorAll('span')).find(function (span) { return span.textContent === 'Code'; })?.parentElement;
    code.style.display = 'none';
    if (codeRow) codeRow.style.display = 'none';
    var more = document.createElement('button');
    more.type = 'button';
    more.textContent = 'More options';
    more.setAttribute('aria-expanded', 'false');
    more.style.cssText = 'border:0;background:transparent;color:var(--muted-foreground);font:inherit;font-size:.85rem;padding:.6rem;min-height:44px';
    more.addEventListener('click', function () {
      var expanded = more.getAttribute('aria-expanded') !== 'true';
      more.setAttribute('aria-expanded', String(expanded));
      more.textContent = expanded ? 'Fewer options' : 'More options';
      code.style.display = expanded ? '' : 'none';
      if (codeRow) codeRow.style.display = expanded ? '' : 'none';
    });
    copy.parentElement.appendChild(more);
  }
  var timer;
  new MutationObserver(function () { clearTimeout(timer); timer = setTimeout(enhanceShare, 120); }).observe(document.body, {childList:true, subtree:true});
  enhanceShare();
})();

// A later round receives its own token while preserving the participant identity.
(function () {
  var path = '', loading = false, feedbackClaims = [];
  function titleKey(value) {
    return value.replace(/^(?:🟩|🟥|🟨)?\s*Claim\s+\d+\s*:\s*/i, '').replace(/\s+/g, ' ').trim().toLowerCase();
  }
  function parseFeedback(html) {
    var doc = new DOMParser().parseFromString(html || '', 'text/html');
    var claims = [], current, group;
    doc.querySelectorAll('p,h2,h3,summary,li').forEach(function (element) {
      var text = element.textContent.trim();
      if (/^(?:🟩|🟥|🟨)?\s*Claim\s+\d+\s*:/i.test(text)) {
        current = {key:titleKey(text), groups:{}, count:''};
        claims.push(current); group = '';
      } else if (current && /^People making this claim:/i.test(text)) {
        current.count = text;
      } else if (current && /^Show (supporting|opposing|uncertain) (experts|statements)/i.test(text)) {
        var match = text.match(/^Show (supporting|opposing|uncertain) (experts|statements)/i);
        group = match[1].toLowerCase() + '_' + match[2].toLowerCase();
        current.groups[group] = [];
      } else if (current && group && element.tagName === 'LI') {
        current.groups[group].push(text);
      }
    });
    return claims;
  }
  function renderFeedback() {
    var progress = document.querySelector('#delphi-round-two-progress');
    var label = progress?.querySelector('.delphi-r2-progress-label');
    var existing = document.getElementById('delphi-previous-feedback');
    if (!label || path !== location.pathname) { if (existing) existing.remove(); return; }
    var key = titleKey(label.textContent);
    var claim = feedbackClaims.find(function (item) { return item.key === key; });
    if (!claim) { if (existing) existing.remove(); return; }
    if (existing?.dataset.claim === key) return;
    if (existing) existing.remove();
    var details = document.createElement('details');
    details.id = 'delphi-previous-feedback';
    details.dataset.claim = key;
    details.style.cssText = 'margin:0 0 .8rem;padding:.65rem .8rem;border:1px solid var(--border);border-radius:13px;font-size:.875rem;line-height:1.5';
    var summary = document.createElement('summary');
    summary.textContent = 'Previous round feedback';
    summary.style.cssText = 'cursor:pointer;min-height:28px;color:var(--muted-foreground)';
    details.appendChild(summary);
    var count = document.createElement('p'); count.textContent = claim.count; details.appendChild(count);
    ['supporting','opposing','uncertain'].forEach(function (group) {
      var statements = claim.groups[group + '_statements'] || [];
      var experts = claim.groups[group + '_experts'] || [];
      if (!statements.length && !experts.length) return;
      var heading = document.createElement('strong');
      heading.textContent = {supporting:'Supporting',opposing:'Opposing',uncertain:'Neutral / uncertain'}[group] + ' · ' + (experts.length || statements.length);
      details.appendChild(heading);
      var list = document.createElement('ul');
      list.style.cssText = 'padding-left:1.1rem;margin:.4rem 0 .8rem';
      (statements.length ? statements : experts).forEach(function (text) {
        var item = document.createElement('li'); item.textContent = text; item.style.marginBottom = '.5rem'; list.appendChild(item);
      });
      details.appendChild(list);
    });
    progress.after(details);
  }
  async function checkContinuation() {
    var match = location.pathname.match(/^\/public\/session\/([^/]+)\/?$/);
    if (!match) { path = ''; feedbackClaims = []; return; }
    var card = document.querySelector('.card-lg');
    if (!card || !card.querySelector('h1') || loading || path === location.pathname) return;
    path = location.pathname;
    var requestedPath = path;
    loading = true;
    try {
      var response = await fetch('/api/public/forms/session/' + encodeURIComponent(match[1]), {credentials:'include'});
      if (!response.ok) return;
      var data = await response.json();
      if (location.pathname !== requestedPath) return;
      feedbackClaims = parseFeedback(data.form?.previous_round_synthesis);
      renderFeedback();
      if (!data.next_round_available) return;
      var panel = document.createElement('div');
      panel.style.cssText = 'padding:1rem;margin-bottom:1rem;border:1px solid var(--border);border-radius:13px;background:var(--background)';
      var note = document.createElement('p');
      note.textContent = 'The next round is open. Your previous response is preserved.';
      var button = document.createElement('button');
      button.type = 'button';
      button.textContent = 'Continue to next round';
      button.style.cssText = 'min-height:48px;padding:.65rem 1rem;background:#58cc02;color:#102800;border:0;border-radius:13px;font:inherit;font-weight:750';
      button.addEventListener('click', async function () {
        button.disabled = true;
        try {
          var result = await fetch('/api/public/forms/session/' + encodeURIComponent(match[1]) + '/continue', {method:'POST',credentials:'include'});
          if (!result.ok) throw new Error('Unable to continue. Please try again.');
          var next = await result.json();
          location.assign('/public/session/' + encodeURIComponent(next.session_token));
        } catch (error) { note.textContent = error.message; button.disabled = false; }
      });
      panel.append(note, button);
      card.prepend(panel);
    } catch (error) {
      // The main form owns load errors. A continuation check must not break it.
    } finally { loading = false; }
  }
  var timer;
  new MutationObserver(function () { clearTimeout(timer); timer = setTimeout(function () { renderFeedback(); checkContinuation(); }, 200); }).observe(document.body, {childList:true,subtree:true});
})();

(function () {
  function positionActions() {
    var actions = document.getElementById('delphi-round-two-actions');
    var viewport = window.visualViewport;
    if (!actions || !viewport) return;
    var keyboardInset = viewport.scale === 1 ? Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop) : 0;
    actions.style.bottom = keyboardInset > 80 ? keyboardInset + 'px' : '';
  }
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', positionActions);
    window.visualViewport.addEventListener('scroll', positionActions);
  }
})();
