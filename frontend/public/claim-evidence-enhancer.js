(function () {
  'use strict';

  var ROOT_SELECTOR = '.synthesis-editor-prosemirror';
  var PANEL_CLASS = 'claim-evidence-preview';
  var editing = false;
  var rebuildTimer = 0;

  function text(node) {
    return (node && node.textContent ? node.textContent : '').replace(/\u00a0/g, ' ').trim();
  }

  function evidenceGroup(labelNode, listNode) {
    var kindMatch = text(labelNode).match(/^Show\s+(supporting|opposing)\s+statements$/i);
    if (!kindMatch || !listNode || listNode.tagName !== 'UL') return null;
    var kind = kindMatch[1].toLowerCase();
    var items = Array.prototype.slice.call(listNode.querySelectorAll(':scope > li'));
    if (!items.length) return null;

    var details = document.createElement('details');
    details.className = 'claim-evidence-group claim-evidence-group--' + kind;

    var summary = document.createElement('summary');
    summary.innerHTML = '<span>' + (kind === 'supporting' ? 'Supporting' : 'Opposing') +
      ' expert excerpts</span><span class="claim-evidence-count">' + items.length + '</span>';
    details.appendChild(summary);

    var list = document.createElement('div');
    list.className = 'claim-evidence-cards';
    items.forEach(function (item, index) {
      var card = document.createElement('blockquote');
      card.className = 'claim-evidence-card';
      var raw = text(item);
      var split = raw.match(/^(Response\s+[^:]+):\s*([\s\S]*)$/i);
      var expert = document.createElement('div');
      expert.className = 'claim-evidence-expert';
      expert.textContent = split ? split[1].replace(/^Response\s+/i, '') : 'Expert excerpt ' + (index + 1);
      var quote = document.createElement('div');
      quote.className = 'claim-evidence-quote';
      quote.textContent = split ? split[2] : raw;
      card.appendChild(expert);
      card.appendChild(quote);
      list.appendChild(card);
    });
    details.appendChild(list);
    return details;
  }

  function buildPreview(root) {
    if (!root || !root.parentElement) return;
    var existing = root.parentElement.querySelector(':scope > .' + PANEL_CLASS);
    var toolbar = root.parentElement.querySelector(':scope > .claim-evidence-toolbar');
    if (existing) existing.remove();
    if (toolbar) toolbar.remove();

    var nodes = Array.prototype.slice.call(root.children);
    if (!nodes.some(function (node) { return /^Claims$/i.test(text(node)); })) {
      document.body.classList.remove('claim-evidence-view-active');
      return;
    }

    var preview = document.createElement('section');
    preview.className = PANEL_CLASS;
    preview.setAttribute('aria-label', 'Claims and expert excerpts');

    var title = document.createElement('div');
    title.className = 'claim-evidence-preview-title';
    title.innerHTML = '<h2>Claims</h2><p>Expand a claim’s evidence to inspect the available expert excerpts.</p>';
    preview.appendChild(title);

    for (var i = 0; i < nodes.length; i += 1) {
      var node = nodes[i];
      if (node.tagName !== 'P' || !/^[🟥🟨🟩]\s*Claim\s+\d+:/i.test(text(node))) continue;

      var card = document.createElement('article');
      card.className = 'claim-evidence-claim';
      if (text(node).indexOf('🟥') === 0) card.dataset.status = 'disagreement';
      if (text(node).indexOf('🟨') === 0) card.dataset.status = 'uncertain';
      if (text(node).indexOf('🟩') === 0) card.dataset.status = 'agreement';

      var heading = document.createElement('div');
      heading.className = 'claim-evidence-claim-heading';
      heading.innerHTML = node.innerHTML;
      card.appendChild(heading);

      for (i += 1; i < nodes.length; i += 1) {
        var current = nodes[i];
        if (current.tagName === 'HR' || (current.tagName === 'P' && /^[🟥🟨🟩]\s*Claim\s+\d+:/i.test(text(current)))) {
          if (current.tagName === 'P') i -= 1;
          break;
        }
        if (!text(current)) continue;

        if (current.tagName === 'P' && /^Show\s+(supporting|opposing)\s+statements$/i.test(text(current))) {
          var group = evidenceGroup(current, nodes[i + 1]);
          if (group) {
            card.appendChild(group);
            i += 1;
          }
          continue;
        }

        if (current.tagName === 'P') {
          var meta = document.createElement('div');
          meta.className = /^People making/i.test(text(current))
            ? 'claim-evidence-meta claim-evidence-people'
            : 'claim-evidence-meta claim-evidence-opposition';
          meta.innerHTML = current.innerHTML;
          card.appendChild(meta);
        }
      }
      preview.appendChild(card);
    }

    if (!preview.querySelector('.claim-evidence-claim')) return;

    var controls = document.createElement('div');
    controls.className = 'claim-evidence-toolbar';
    controls.setAttribute('aria-label', 'Expert excerpt controls');

    var note = document.createElement('span');
    note.textContent = 'Expert excerpts are collapsed by default';
    controls.appendChild(note);

    var expand = document.createElement('button');
    expand.type = 'button';
    expand.textContent = 'Expand all';
    expand.addEventListener('click', function () {
      Array.prototype.forEach.call(preview.querySelectorAll('details'), function (details) { details.open = true; });
    });
    controls.appendChild(expand);

    var collapse = document.createElement('button');
    collapse.type = 'button';
    collapse.textContent = 'Collapse all';
    collapse.addEventListener('click', function () {
      Array.prototype.forEach.call(preview.querySelectorAll('details'), function (details) { details.open = false; });
    });
    controls.appendChild(collapse);

    var edit = document.createElement('button');
    edit.type = 'button';
    edit.className = 'claim-evidence-edit-toggle';
    edit.textContent = editing ? 'Preview evidence' : 'Edit synthesis text';
    edit.addEventListener('click', function () {
      editing = !editing;
      document.body.classList.toggle('claim-evidence-view-active', !editing);
      preview.hidden = editing;
      edit.textContent = editing ? 'Preview evidence' : 'Edit synthesis text';
    });
    controls.appendChild(edit);

    root.parentElement.insertBefore(controls, root);
    root.parentElement.insertBefore(preview, root);
    document.body.classList.toggle('claim-evidence-view-active', !editing);
    preview.hidden = editing;
  }

  function scan() {
    var root = document.querySelector(ROOT_SELECTOR);
    if (!root) return;
    buildPreview(root);
  }

  var observer = new MutationObserver(function (mutations) {
    if (!mutations.some(function (mutation) {
      return mutation.target.closest && mutation.target.closest(ROOT_SELECTOR);
    })) return;
    window.clearTimeout(rebuildTimer);
    rebuildTimer = window.setTimeout(scan, 120);
  });

  function start() {
    scan();
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
