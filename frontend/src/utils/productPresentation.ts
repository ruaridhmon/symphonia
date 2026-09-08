import type { createElement, ReactElement } from 'react';

/** Shared rendering for the source app and the maintained development mirror. */
export function renderActionGroup(h: typeof createElement, actions: ReactElement[], title: string) {
  const [edit, summary, download, share, remove] = actions;
  return h('div', { className: 'product-actions', 'aria-label': `Actions for ${title}` },
    summary, share,
    h('details', { className: 'product-more', onKeyDown: (event: any) => {
      if (event.key === 'Escape') { event.currentTarget.open = false; event.currentTarget.querySelector('summary')?.focus(); }
    } },
      h('summary', { 'aria-label': `More actions for ${title}`, title: 'More actions' }, '•••'),
      h('div', { className: 'product-more-items', onClick: (event: any) => {
        if (event.target.closest('a,button')) event.currentTarget.closest('details').open = false;
      } }, edit, download, remove)
    )
  );
}

/** No fake cards or unrelated screen between navigation and real content. */
export function renderWorkspaceLoading(h: typeof createElement, contentOnly = false) {
  return h('div', { className: `product-loading${contentOnly ? ' product-loading-content' : ''}`, 'aria-busy': true },
    !contentOnly && h('header', { className: 'product-loading-header' },
      h('a', { href: '/', 'aria-label': 'Symphonia dashboard' },
        h('img', { src: '/logo-mark.png', alt: '' }), h('span', null, 'Symphonia'))),
    h('div', { className: 'product-loading-status', role: 'status' },
      h('span', { className: 'product-loading-dot', 'aria-hidden': true }), 'Loading…')
  );
}
