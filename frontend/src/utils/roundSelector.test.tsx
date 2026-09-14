import * as React from 'react';
import {afterEach,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {createRoundSelector} from './roundSelector';
import type {Round} from '../types/summary';
const Selector=createRoundSelector(React);
const rounds=[{id:101,round_number:1,is_active:false},{id:305,round_number:2,is_active:false},{id:907,round_number:3,is_active:true}] as Round[];
afterEach(cleanup);
it('jumps directly using original round IDs without changing the current survey round',()=>{
 const select=vi.fn(),publish=vi.fn();const {rerender}=render(<Selector rounds={[...rounds].reverse()} selectedRoundId={907} onSelectRound={select} onMakeRoundLive={publish}/>);
 fireEvent.click(screen.getByRole('button',{name:'Round 1'}));expect(select).toHaveBeenCalledWith(rounds[0]);expect(publish).not.toHaveBeenCalled();
 rerender(<Selector rounds={rounds} selectedRoundId={101} onSelectRound={select} onMakeRoundLive={publish}/>);
 expect(screen.getByRole('button',{name:'Round 1'}).getAttribute('aria-pressed')).toBe('true');expect(screen.getByRole('button',{name:'Round 3 Current'}).getAttribute('aria-pressed')).toBe('false');
 fireEvent.click(screen.getByText('Round options'));fireEvent.click(screen.getByRole('button',{name:'Make Round 1 current'}));expect(publish).toHaveBeenCalledWith(rounds[0]);
});
it('shows only existing rounds and supports longer non-Delphi consultations',()=>{
 const select=vi.fn();const {rerender}=render(<Selector rounds={rounds.slice(0,1)} selectedRoundId={101} onSelectRound={select}/>);expect(screen.queryByRole('button',{name:'Round 2'})).toBeNull();
 rerender(<Selector rounds={[...rounds,{id:1200,round_number:4,is_active:false} as Round]} selectedRoundId={101} onSelectRound={select}/>);
 fireEvent.change(screen.getByRole('combobox'),{target:{value:'1200'}});expect(select.mock.calls[0][0].id).toBe(1200);
});
