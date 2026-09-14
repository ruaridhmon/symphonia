import {afterEach,expect,it} from 'vitest';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {DraftFixture,GeneratorFixture} from './synthesisControlsFixture';
afterEach(cleanup);
it('keeps publishing distinct and shows save controls only for pending edits',()=>{
 render(<DraftFixture/>);
 expect(screen.getByRole('heading',{name:'Round 2 synthesis'})).toBeTruthy();
 expect(screen.queryByRole('button',{name:'Save'})).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'Simulate an edit'}));
 fireEvent.click(screen.getByRole('button',{name:'Save'}));
 expect(screen.queryByRole('button',{name:'Save'})).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'Publish to survey'}));
 expect(screen.getByRole('button',{name:'Hide from survey'})).toBeTruthy();
});
it('retains model, method, custom instructions and a single generation action',()=>{
 render(<GeneratorFixture/>);
 fireEvent.click(screen.getByText('Generate synthesis'));
 fireEvent.change(screen.getByRole('combobox',{name:'Method'}),{target:{value:'custom'}});
 const prompt=screen.getByRole('textbox');fireEvent.change(prompt,{target:{value:'Keep original claims'}});
 expect(localStorage.getItem('symphonia-custom-synthesis-prompt:'+location.pathname)).toBe('Keep original claims');
 expect(screen.getAllByRole('button',{name:'Generate draft'})).toHaveLength(1);
 fireEvent.click(screen.getByRole('button',{name:'Generate draft'}));
 expect(screen.getByRole('status').textContent).toContain('no synthesis generated');
});
