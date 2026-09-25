import {createElement} from 'react';
import {render,screen,fireEvent,cleanup} from '@testing-library/react';
import {afterEach,expect,it} from 'vitest';
import {renderResponseReading} from './responseReading';
afterEach(cleanup);
it('shows every original answer directly, without nested accordions',()=>{
 const {container,rerender}=render(renderResponseReading(createElement,['First claim','Second claim'],{q1:'First original answer',q2:'Second original answer'}));
 expect(container.querySelector('details')).toBeNull();
 expect(screen.getByText('First original answer')).toBeVisible();
 expect(screen.getByText('Second original answer')).toBeVisible();
 rerender(renderResponseReading(createElement,['First claim','Second claim'],{q1:'Another expert',q2:'Their original answer'}));
 expect(screen.queryByText('First original answer')).toBeNull();
 expect(screen.getByText('Their original answer')).toBeVisible();
});
it('shows a single written answer without disclosure controls',()=>{
 const {container}=render(renderResponseReading(createElement,['Question'],{q1:'Original paragraph'}));
 expect(container.querySelector('details')).toBeNull();
 expect(screen.getByText('Original paragraph')).toBeVisible();
});

it('shows first-round original prose without claim or question cards, preserving supporting fields',()=>{
 const {container}=render(renderResponseReading(createElement,['First question','Second question'],{q1:{position:'First paragraph.\n\nSecond paragraph.',evidence:'Original evidence',confidence:0},q2:false},1));
 expect(screen.getByText('First question')).toBeVisible();
 expect(screen.queryByText('Positions & reasoning')).toBeNull();
 expect(screen.getByText('First paragraph. Second paragraph.').textContent).toBe('First paragraph.\n\nSecond paragraph.');
 expect(screen.getByText('false')).toBeVisible();
 expect(screen.getByText('Original evidence')).toBeVisible();
 expect(container).toHaveTextContent('Original evidence');
 expect(container).toHaveTextContent('0/10');
});
