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
