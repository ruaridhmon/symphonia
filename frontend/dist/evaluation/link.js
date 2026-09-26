(() => {
  if (location.hostname !== 'symphonia-dev-488613.web.app') return;
  const sync = () => {
    const footer = document.querySelector('footer');
    if (!footer || footer.querySelector('[data-evaluation-link]')) return;
    const link = document.createElement('a');
    link.href = '/evaluation/';
    link.textContent = 'Synthetic evaluation';
    link.dataset.evaluationLink = 'true';
    link.style.cssText = 'margin-left:16px;color:inherit;text-decoration:underline;text-underline-offset:3px;white-space:nowrap';
    footer.append(link);
  };
  new MutationObserver(sync).observe(document.body, {childList:true,subtree:true});
  sync();
})();
