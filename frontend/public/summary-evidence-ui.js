(function () {
  'use strict';

  document.documentElement.setAttribute('data-claim-evidence-enhancer', 'loaded');

  var ROOT_SELECTOR = '.ProseMirror';
  var PANEL_CLASS = 'claim-evidence-preview';
  var editing = false;
  var rebuildTimer = 0;

  function text(node) {
    return (node && node.textContent ? node.textContent : '').replace(/\u00a0/g, ' ').trim();
  }

  function evidenceGroup(labelNode, listNode) {
    var groupMatch = text(labelNode).match(/^Show\s+(supporting|opposing|uncertain)\s+(statements|experts)$/i);
    if (!groupMatch || !listNode || (listNode.tagName !== 'UL' && listNode.tagName !== 'OL')) return null;
    var kind = groupMatch[1].toLowerCase();
    var contentType = groupMatch[2].toLowerCase() === 'experts' ? 'positions' : 'excerpts';
    var items = Array.prototype.slice.call(listNode.querySelectorAll(':scope > li'));
    if (!items.length) return null;

    var details = document.createElement('details');
    details.className = 'claim-evidence-group claim-evidence-group--' + kind +
      ' claim-evidence-group--' + contentType;

    var label = kind.charAt(0).toUpperCase() + kind.slice(1);
    label += contentType === 'positions' ? ' expert positions' : ' original excerpts';
    var summary = document.createElement('summary');
    summary.innerHTML = '<span>' + label +
      '</span><span class="claim-evidence-count">' + items.length + '</span>';
    details.appendChild(summary);

    var list = document.createElement('div');
    list.className = 'claim-evidence-cards';
    items.forEach(function (item, index) {
      var card = document.createElement(contentType === 'excerpts' ? 'blockquote' : 'div');
      card.className = 'claim-evidence-card claim-evidence-card--' + contentType;
      var raw = text(item);
      var split = raw.match(/^(Response\s+[^:]+):\s*([\s\S]*)$/i);
      var expert = document.createElement('div');
      expert.className = 'claim-evidence-expert';
      expert.textContent = split ? split[1].replace(/^Response\s+/i, '') : 'Expert ' + (index + 1);
      var value = document.createElement('div');
      value.className = contentType === 'excerpts' ? 'claim-evidence-quote' : 'claim-evidence-position';
      value.textContent = split ? split[2] : raw;
      card.appendChild(expert);
      card.appendChild(value);
      list.appendChild(card);
    });
    details.appendChild(list);
    return details;
  }

  function flattenClaimContainer(container) {
    var nodes = [];
    Array.prototype.forEach.call(container.children, function (child) {
      if (child.tagName === 'DETAILS') {
        var summary = child.querySelector(':scope > summary');
        var list = child.querySelector(':scope > ul, :scope > ol');
        if (summary) nodes.push(summary);
        if (list) nodes.push(list);
        return;
      }
      nodes.push(child);
    });
    return nodes;
  }

  function claimBlocks(root) {
    var blocks = [];
    var current = [];
    Array.prototype.forEach.call(root.children, function (child) {
      var wrappedHeading = child.tagName === 'DIV'
        ? child.querySelector(':scope > p')
        : null;
      if (wrappedHeading && /^(?:🟥|🟨|🟩)\s*Claim\s+\d+:/i.test(text(wrappedHeading))) {
        if (current.length) blocks.push(current);
        current = [];
        blocks.push(flattenClaimContainer(child));
        return;
      }
      if (child.tagName === 'P' && /^(?:🟥|🟨|🟩)\s*Claim\s+\d+:/i.test(text(child))) {
        if (current.length) blocks.push(current);
        current = [child];
        return;
      }
      if (child.tagName === 'HR') {
        if (current.length) blocks.push(current);
        current = [];
        return;
      }
      if (current.length) current.push(child);
    });
    if (current.length) blocks.push(current);
    return blocks;
  }

  function buildPreview(root) {
    if (!root || !root.parentElement) return;
    var existing = root.parentElement.querySelector(':scope > .' + PANEL_CLASS);
    var toolbar = root.parentElement.querySelector(':scope > .claim-evidence-toolbar');
    if (existing) existing.remove();
    if (toolbar) toolbar.remove();

    var blocks = claimBlocks(root);
    if (!blocks.length) {
      document.body.classList.remove('claim-evidence-view-active');
      return;
    }

    var preview = document.createElement('section');
    preview.className = PANEL_CLASS;
    preview.setAttribute('aria-label', 'Claims and expert evidence');

    var title = document.createElement('div');
    title.className = 'claim-evidence-preview-title';
    title.innerHTML = '<h2>Claims</h2><p>Open a section to read each expert\'s original words. Rating-only claims show recorded positions instead.</p>';
    preview.appendChild(title);

    blocks.forEach(function (nodes) {
      var headingNode = nodes.find(function (node) {
        return node.tagName === 'P' && /^(?:🟥|🟨|🟩)\s*Claim\s+\d+:/i.test(text(node));
      });
      if (!headingNode) return;

      var hasOriginalExcerpts = nodes.some(function (node, nodeIndex) {
        if ((node.tagName !== 'P' && node.tagName !== 'SUMMARY')
          || !/^Show\s+(supporting|opposing)\s+statements$/i.test(text(node))) return false;
        var listNode = nodes[nodeIndex + 1];
        return Boolean(listNode
          && (listNode.tagName === 'UL' || listNode.tagName === 'OL')
          && listNode.querySelector(':scope > li'));
      });

      var card = document.createElement('article');
      card.className = 'claim-evidence-claim';
      if (text(headingNode).indexOf('🟥') === 0) card.dataset.status = 'disagreement';
      if (text(headingNode).indexOf('🟨') === 0) card.dataset.status = 'uncertain';
      if (text(headingNode).indexOf('🟩') === 0) card.dataset.status = 'agreement';

      var heading = document.createElement('div');
      heading.className = 'claim-evidence-claim-heading';
      heading.innerHTML = headingNode.innerHTML;
      card.appendChild(heading);

      var evidenceCount = 0;
      for (var index = nodes.indexOf(headingNode) + 1; index < nodes.length; index += 1) {
        var currentNode = nodes[index];
        if (!text(currentNode)) continue;

        if ((currentNode.tagName === 'P' || currentNode.tagName === 'SUMMARY')
          && /^Show\s+(supporting|opposing|uncertain)\s+(statements|experts)$/i.test(text(currentNode))) {
          var parsedGroup = text(currentNode).match(
            /^Show\s+(supporting|opposing|uncertain)\s+(statements|experts)$/i
          );
          if (hasOriginalExcerpts && parsedGroup && parsedGroup[2].toLowerCase() === 'experts') {
            index += 1;
            continue;
          }

          var group = evidenceGroup(currentNode, nodes[index + 1]);
          if (group) {
            evidenceCount += 1;
            card.appendChild(group);
            index += 1;
          }
          continue;
        }

        if (currentNode.tagName === 'P') {
          var meta = document.createElement('div');
          meta.className = /^People making/i.test(text(currentNode))
            ? 'claim-evidence-meta claim-evidence-people'
            : 'claim-evidence-meta claim-evidence-opposition';
          meta.innerHTML = currentNode.innerHTML;
          card.appendChild(meta);
        }
      }

      if (!evidenceCount) {
        var empty = document.createElement('div');
        empty.className = 'claim-evidence-empty';
        empty.textContent = 'No original free-text expert excerpts were submitted for this claim.';
        card.appendChild(empty);
      }
      preview.appendChild(card);
    });

    if (!preview.querySelector('.claim-evidence-claim')) return;

    var controls = document.createElement('div');
    controls.className = 'claim-evidence-toolbar';
    controls.setAttribute('aria-label', 'Expert evidence controls');

    var note = document.createElement('span');
    note.textContent = 'Expert evidence is collapsed by default';
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

  function mutationTouchesEditor(mutation) {
    if (mutation.target.closest && mutation.target.closest(ROOT_SELECTOR)) return true;
    return Array.prototype.some.call(mutation.addedNodes || [], function (node) {
      return node.nodeType === 1
        && ((node.matches && node.matches(ROOT_SELECTOR))
          || (node.querySelector && node.querySelector(ROOT_SELECTOR)));
    });
  }

  var observer = new MutationObserver(function (mutations) {
    if (!mutations.some(mutationTouchesEditor)) return;
    window.clearTimeout(rebuildTimer);
    rebuildTimer = window.setTimeout(scan, 120);
  });

  function scheduleScans(delays) {
    delays.forEach(function (delay) {
      window.setTimeout(scan, delay);
    });
  }

  function start() {
    scan();
    scheduleScans([250, 1000, 2500]);
    document.addEventListener('click', function (event) {
      var button = event.target && event.target.closest
        ? event.target.closest('button')
        : null;
      if (!button) return;
      var label = text(button);
      if (label === 'Generate') {
        scheduleScans([500, 1500, 3000, 6000, 10000, 20000, 30000, 45000]);
      } else if (/^v\d+$/i.test(label) || /^Version\s+\d+/i.test(label)) {
        scheduleScans([250, 1000, 2500]);
      }
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['class', 'contenteditable'],
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
