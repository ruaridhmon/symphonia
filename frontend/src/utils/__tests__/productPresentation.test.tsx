// @vitest-environment jsdom
import { createElement } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { renderActionGroup, renderWorkspaceLoading } from '../productPresentation';
import { MemoryRouter, Link, Routes, Route } from 'react-router-dom';
afterEach(cleanup);
function actions(download = () => {}) {
  return [createElement(Link,{key:'edit',to:'/edit'},'Edit'),createElement(Link,{key:'summary',to:'/summary'},'Summary'),createElement('button',{key:'download',onClick:download},'Download'),createElement('button',{key:'share'},'Share'),createElement('button',{key:'delete',disabled:true},'Delete')];
}
it('opens the summary with client navigation', () => {
  render(createElement(MemoryRouter,null,renderActionGroup(createElement,actions(),'Test'),createElement(Routes,null,createElement(Route,{path:'/summary',element:createElement('h1',null,'Consultation summary')}))));
  fireEvent.click(screen.getByRole('link',{name:'Summary'}));
  expect(screen.getByRole('heading',{name:'Consultation summary'})).toBeTruthy();
});
it('retains secondary actions and closes More after an action or Escape', () => {
  const download=vi.fn();const {container}=render(createElement(MemoryRouter,null,renderActionGroup(createElement,actions(download),'Test')));
  const menu=container.querySelector('details')!;menu.open=true;
  fireEvent.click(screen.getByRole('button',{name:'Download'}));
  expect(download).toHaveBeenCalledOnce();expect(menu.open).toBe(false);
  menu.open=true;fireEvent.keyDown(menu,{key:'Escape'});expect(menu.open).toBe(false);expect(document.activeElement).toBe(menu.querySelector('summary'));
  expect(container.querySelector('button:disabled')?.textContent).toBe('Delete');
});
it('shows one stable loading shell without placeholder content', () => {
  render(renderWorkspaceLoading(createElement));
  expect(screen.getByRole('status').textContent).toBe('Loading…');
  expect(screen.getByRole('link',{name:'Symphonia dashboard'})).toBeTruthy();
  expect(screen.queryByRole('article')).toBeNull();
});
