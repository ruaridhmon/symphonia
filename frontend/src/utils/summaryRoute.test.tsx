// @vitest-environment jsdom
import * as R from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { expect, it, vi } from 'vitest';
import { CONSULTATION_NAVIGATION, createSummaryRoute, forwardConsultationClick } from './summaryRoute';

it('switches through the router, resets consultation state and ignores a late response from the previous consultation', async () => {
 window.history.replaceState({},'', '/admin/form/1/summary');
 const pending=new Map<string,()=>void>();
 function Content() {
  const {id}=useParams();const [value,setValue]=R.useState('Loading consultation');
  R.useEffect(()=>{pending.set(id!,()=>setValue(`Results for ${id}`));},[id]);
  return <main><h1>Consultation {id}</h1><p>{value}</p></main>;
 }
 const SummaryRoute=createSummaryRoute(R,useNavigate,useParams,Content);
 render(<MemoryRouter initialEntries={['/admin/form/1/summary']}><nav onClick={e=>forwardConsultationClick(e.nativeEvent)}><a href="/admin/form/2/summary">Second</a><a href="/admin/form/3/summary">Third</a></nav><Routes><Route path="/admin/form/:id/summary" element={<SummaryRoute/>}/></Routes></MemoryRouter>);
 await act(async()=>pending.get('1')!());
 expect(screen.getByText('Results for 1')).toBeTruthy();
 fireEvent.click(screen.getByText('Second'));
 await waitFor(()=>expect(screen.getByRole('heading').textContent).toBe('Consultation 2'));
 expect(screen.queryByText('Results for 1')).toBeNull();
 fireEvent.click(screen.getByText('Third'));
 await waitFor(()=>expect(screen.getByRole('heading').textContent).toBe('Consultation 3'));
 await act(async()=>{pending.get('2')!();pending.get('3')!();});
 expect(screen.getByText('Results for 3')).toBeTruthy();expect(screen.queryByText('Results for 2')).toBeNull();
});

it('preserves native modified clicks and refuses to discard an unsaved draft without confirmation', () => {
 window.history.replaceState({},'', '/admin/form/1/summary');
 const nav=document.createElement('nav');nav.innerHTML='<a href="/admin/form/2/summary">Second</a><span class="synthesis-draft-state">Unsaved changes</span>';document.body.append(nav);

 const request=vi.fn((e:Event)=>e.preventDefault());window.addEventListener(CONSULTATION_NAVIGATION,request);
 const confirm=vi.spyOn(window,'confirm').mockReturnValue(false);
 const link=nav.querySelector('a')!;
 const click=(options:MouseEventInit={})=>{const event=new MouseEvent('click',{cancelable:true,...options});Object.defineProperty(event,'target',{value:link});forwardConsultationClick(event);return event;};
 const modified=click({ctrlKey:true});
 expect(modified.defaultPrevented).toBe(false);expect(request).not.toHaveBeenCalled();expect(confirm).not.toHaveBeenCalled();
 const regular=click();
 expect(regular.defaultPrevented).toBe(true);expect(confirm).toHaveBeenCalledOnce();expect(request).not.toHaveBeenCalled();
 confirm.mockReturnValue(true);click();expect(request).toHaveBeenCalledOnce();
 window.removeEventListener(CONSULTATION_NAVIGATION,request);confirm.mockRestore();nav.remove();
});
