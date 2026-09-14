import {createElement} from 'react';
import {render,screen,fireEvent,cleanup} from '@testing-library/react';
import {afterEach,expect,it} from 'vitest';
import {renderResponseReading} from './responseReading';
afterEach(cleanup);
it('keeps positions visible while toggling all original explanations',()=>{
 const {container,rerender}=render(renderResponseReading(createElement,['First claim','Second claim'],{q1:'First original answer',q2:'Second original answer'}));
 const details=Array.from(container.querySelectorAll('details'));
 expect(details.map(d=>d.open)).toEqual([true,false]);
 expect(screen.getByText('Second claim')).toBeVisible();
 fireEvent.click(screen.getByRole('button',{name:'Expand explanations'}));
 expect(details.every(d=>d.open)).toBe(true);
 expect(screen.getByText('Second original answer')).toBeVisible();
 fireEvent.click(screen.getByRole('button',{name:'Collapse explanations'}));
 expect(details.every(d=>!d.open)).toBe(true);
 rerender(renderResponseReading(createElement,['First claim','Second claim'],{q1:'Another expert',q2:'Their original answer'}));
 expect(Array.from(container.querySelectorAll('details')).map(d=>d.open)).toEqual([true,false]);
});
it('shows a single written answer without disclosure controls',()=>{
 const {container}=render(renderResponseReading(createElement,['Question'],{q1:'Original paragraph'}));
 expect(container.querySelector('details')).toBeNull();
 expect(screen.getByText('Original paragraph')).toBeVisible();
});

it('shows first-round original prose without claim or question cards, preserving supporting fields',()=>{
 const {container}=render(renderResponseReading(createElement,['First question','Second question'],{q1:{position:'First paragraph.\n\nSecond paragraph.',evidence:'Original evidence',confidence:0},q2:false},1));
 expect(screen.queryByText('First question')).toBeNull();
 expect(screen.queryByText('Positions & reasoning')).toBeNull();
 expect(screen.getByText('First paragraph. Second paragraph.').textContent).toBe('First paragraph.\n\nSecond paragraph.');
 expect(screen.getByText('false')).toBeVisible();
 expect(screen.getByText('Supporting details').closest('details')).not.toHaveAttribute('open');
 expect(container).toHaveTextContent('Original evidence');
 expect(container).toHaveTextContent('0/10');
});
