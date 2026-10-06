// @vitest-environment jsdom
import { expect, it, vi } from 'vitest';
import { consultationId, loadNavigation, renderConsultationNavigation } from './consultationNavigation';
it('loads only joined consultations for an expert and uses participant routes', async () => {
 const get=vi.fn().mockResolvedValueOnce({role:'expert'}).mockResolvedValueOnce([{id:7,title:'Panel'}]);
 const data=await loadNavigation({get});
 expect(get.mock.calls).toEqual([['/me'],['/my_forms']]);
 const nav=document.createElement('nav');renderConsultationNavigation(nav,data,'/form/7',false);
 expect(nav.querySelector('a[aria-current]')?.getAttribute('href')).toBe('/form/7');
 expect(nav.querySelector('a[href="/admin/forms/new"]')).toBeNull();
});
it('merges owned and joined forms without duplicates and preserves their correct routes', async () => {
 const get=vi.fn().mockResolvedValueOnce({role:'facilitator'}).mockResolvedValueOnce([{id:7,title:'Joined'},{id:8,title:'Owned'}]).mockResolvedValueOnce([{id:8,title:'Owned'}]);
 const data=await loadNavigation({get});const nav=document.createElement('nav');renderConsultationNavigation(nav,data,'/admin/form/8/summary',false);
 expect(data.forms).toHaveLength(2);
 expect(nav.querySelector('a[aria-current]')?.getAttribute('href')).toBe('/admin/form/8/summary');
 expect(nav.querySelector('a[href="/form/7"]')).not.toBeNull();
});
it('loads admin collection, renders untrusted titles as text, and filters without affecting data', async () => {
 const get=vi.fn().mockResolvedValueOnce({is_admin:true}).mockResolvedValueOnce([{id:32,title:'<img onerror=alert(1)> Coastal panel'}]);
 const data=await loadNavigation({get});const nav=document.createElement('nav');renderConsultationNavigation(nav,data,'/admin/form/32/summary',false,'coastal');
 expect(get.mock.calls).toEqual([['/me'],['/forms']]);expect(nav.querySelector('img')).toBeNull();
 expect(nav.querySelector('a[aria-current]')?.textContent).toContain('Coastal');
 renderConsultationNavigation(nav,data,'/',false,'missing');expect(nav.textContent).toContain('No matching');expect(data.forms).toHaveLength(1);
 expect(consultationId('/admin/forms/new')).toBeNull();
});

it('pins per account and exposes rename only for owned consultations',()=>{
 localStorage.setItem('email','first@example.test');localStorage.setItem('symphonia:pins:first@example.test','[7]');
 const nav=document.createElement('nav');renderConsultationNavigation(nav,{admin:false,canCreate:true,forms:[{id:8,title:'Joined'},{id:7,title:'Owned',owned:true}]},'/admin/form/7/summary',false);
 expect(nav.querySelector('.symphonia-navigation-row')?.textContent).toContain('Owned');expect(nav.textContent).toContain('Pinned');expect(nav.querySelectorAll('button')).toHaveLength(3);
 const rows=nav.querySelectorAll('.symphonia-navigation-row');expect(rows[1].textContent).not.toContain('Rename');
 localStorage.setItem('email','second@example.test');renderConsultationNavigation(nav,{admin:false,canCreate:false,forms:[{id:8,title:'Joined'},{id:7,title:'Owned'}]},'/',false);expect(nav.querySelector('.symphonia-navigation-row')?.textContent).toContain('Joined');localStorage.clear();
});
