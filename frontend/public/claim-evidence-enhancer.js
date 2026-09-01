(function () {
  'use strict';

  var ROOT_SELECTOR = '.ProseMirror';
  var TOGGLE_TEXT = /^Show\s+(supporting|opposing)\s+statements$/i;

  function setExpanded(toggle, expanded) {
    var list = toggle.nextElementSibling;
    if (!list || list.tagName !== 'UL') return;
    toggle.setAttribute('aria-expanded', String(expanded));
    toggle.dataset.label = (expanded ? 'Hide ' : 'View ') + toggle.dataset.count + ' ' + toggle.dataset.kind + ' expert excerpt' + (toggle.dataset.count === '1' ? '' : 's');
    list.classList.toggle('is-collapsed', !expanded);
    list.setAttribute('aria-hidden', String(!expanded));
  }

  function enhance(root) {
    if (!root) return;
    var toggles = [];

    Array.prototype.forEach.call(root.children, function (node) {
      if (node.tagName === 'P' && /^[🟥🟨🟩]\s*Claim\s+\d+:/i.test((node.textContent || '').trim())) {
        node.classList.add('claim-evidence-heading');
        if ((node.textContent || '').indexOf('🟥') === 0) node.dataset.status = 'disagreement';
        if ((node.textContent || '').indexOf('🟨') === 0) node.dataset.status = 'uncertain';
        if ((node.textContent || '').indexOf('🟩') === 0) node.dataset.status = 'agreement';
      }

      if (node.tagName !== 'P') return;
      var match = (node.textContent || '').trim().match(TOGGLE_TEXT);
      if (!match) return;
      var list = node.nextElementSibling;
      if (!list || list.tagName !== 'UL') return;

      var kind = match[1].toLowerCase();
      var count = list.querySelectorAll(':scope > li').length;
      node.classList.add('claim-evidence-toggle', 'claim-evidence-toggle--' + kind);
      node.dataset.kind = kind;
      node.dataset.count = String(count);
      node.setAttribute('role', 'button');
      node.setAttribute('tabindex', '0');
      node.setAttribute('aria-label', 'View ' + count + ' ' + kind + ' expert excerpts');

      list.classList.add('claim-evidence-list', 'claim-evidence-list--' + kind);
      Array.prototype.forEach.call(list.children, function (item) {
        item.classList.add('claim-evidence-excerpt');
      });

      if (!node.dataset.evidenceEnhanced) {
        node.dataset.evidenceEnhanced = 'true';
        node.addEventListener('click', function () {
          setExpanded(node, node.getAttribute('aria-expanded') !== 'true');
        });
        node.addEventListener('keydown', function (event) {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setExpanded(node, node.getAttribute('aria-expanded') !== 'true');
          }
        });
        setExpanded(node, false);
      }
      toggles.push(node);
    });

    if (toggles.length && root.parentElement && !root.parentElement.querySelector(':scope > .claim-evidence-toolbar')) {
      var toolbar = document.createElement('div');
      toolbar.className = 'claim-evidence-toolbar';
      toolbar.setAttribute('aria-label', 'Expert excerpt controls');

      var intro = document.createElement('span');
      intro.textContent = 'Expert excerpts are collapsed by default';
      toolbar.appendChild(intro);

      var expand = document.createElement('button');
      expand.type = 'button';
      expand.textContent = 'Expand all';
      expand.addEventListener('click', function () {
        Array.prototype.forEach.call(root.querySelectorAll('.claim-evidence-toggle'), function (toggle) {
          setExpanded(toggle, true);
        });
      });
      toolbar.appendChild(expand);

      var collapse = document.createElement('button');
      collapse.type = 'button';
      collapse.textContent = 'Collapse all';
      collapse.addEventListener('click', function () {
        Array.prototype.forEach.call(root.querySelectorAll('.claim-evidence-toggle'), function (toggle) {
          setExpanded(toggle, false);
        });
      });
      toolbar.appendChild(collapse);

      root.parentElement.insertBefore(toolbar, root);
    }
  }

  function scan() {
    Array.prototype.forEach.call(document.querySelectorAll(ROOT_SELECTOR), enhance);
  }

  var timer = 0;
  var observer = new MutationObserver(function () {
    window.clearTimeout(timer);
    timer = window.setTimeout(scan, 40);
  });

  function start() {
    scan();
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
