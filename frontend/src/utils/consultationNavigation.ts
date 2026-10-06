import {pinnedConsultations,toggleConsultationPin,renameConsultation} from './consultationActions';
export interface NavigationForm { id: number; title: string; owned?: boolean }
export interface NavigationData { forms: NavigationForm[]; canCreate: boolean; admin: boolean }
type Client = { get<T>(path: string): Promise<T> };

/** Read only the signed-in user's existing collections through the app client. */
export async function loadNavigation(client: Client): Promise<NavigationData> {
  const me = await client.get<{ is_admin?: boolean; role?: string }>('/me');
  const admin = me.is_admin === true;
  const canCreate = admin || me.role === 'facilitator' || me.role === 'platform_admin';
  if (admin) return { forms: await client.get<NavigationForm[]>('/forms'), canCreate, admin };
  const joined = await client.get<NavigationForm[]>('/my_forms');
  const owned = canCreate ? await client.get<NavigationForm[]>('/forms/my-created') : [];
  const forms = new Map(joined.map(form => [form.id, form]));
  owned.forEach(form => forms.set(form.id, { ...form, owned: true }));
  return { forms: [...forms.values()], canCreate, admin };
}

export function consultationId(path: string): number | null {
  const match = path.match(/^\/(?:admin\/)?form\/(\d+)(?:\/|$)/);
  return match ? Number(match[1]) : null;
}

export function navigationHref(form: NavigationForm, admin: boolean): string {
  return admin || form.owned ? `/admin/form/${form.id}/summary` : `/form/${form.id}`;
}

export function renderConsultationNavigation(nav: HTMLElement, data: NavigationData | null, path: string, error: boolean, query = ''): void {
  const makeLink = (text: string, href: string) => {
    const link = document.createElement('a'); link.href = href; link.textContent = text;
    if (href === '/' ? path === '/' : consultationId(href) !== null && consultationId(href) === consultationId(path)) link.setAttribute('aria-current', 'page');
    return link;
  };
  const top = document.createElement('div'); top.className = 'symphonia-navigation-actions';
  top.append(makeLink('All consultations', '/'));
  if (data?.canCreate) top.append(makeLink('+ New consultation', '/admin/forms/new'));
  nav.replaceChildren(top);

  if (!data) {
    const status = document.createElement('p'); status.className = 'symphonia-navigation-status';
    status.textContent = error ? 'Could not load consultations. Open All consultations to try again.' : 'Loading consultations…';
    status.setAttribute('role', 'status'); nav.append(status); return;
  }
  const pins=pinnedConsultations();
  const forms = [...data.forms].sort((a,b) => Number(pins.includes(b.id))-Number(pins.includes(a.id)) || b.id-a.id).filter(form => form.title.toLowerCase().includes(query.toLowerCase()));
  const dev = location.hostname === 'symphonia-dev-488613.web.app' || /^symphonia-dev-488613--[a-z0-9-]+\.web\.app$/.test(location.hostname);
  const earlierIds = new Set([20,23,24,25,26,27,28]);
  const earlier = document.createElement('details'); earlier.className = 'symphonia-navigation-earlier';
  const summary = document.createElement('summary'); summary.textContent = 'Earlier examples'; earlier.append(summary);
  let group='';
  for (const form of forms) {
    const nextGroup=pins.includes(form.id)?'Pinned':'Consultations';if(group!==nextGroup){group=nextGroup;const h=document.createElement('h2');h.textContent=group;nav.append(h);}
    const title = form.title.replace(/^(?:Simulated example\s*[·]|SIMULATED PANEL\s*[—–-])\s*/i, '');
    const link = makeLink(title, navigationHref(form, data.admin)); link.title = form.title;
    link.className = 'symphonia-consultation-link';
    if (/^(Simulated example|SIMULATED PANEL)/i.test(form.title)) {
      link.setAttribute('aria-label', `${title} · Simulated example`);
      const badge = document.createElement('span'); badge.className = 'symphonia-navigation-demo'; badge.textContent = 'Example'; link.append(badge);
    }
    const row=document.createElement('div');row.className='symphonia-navigation-row';row.append(link);
    const menu=document.createElement('details');menu.className='symphonia-navigation-menu';const trigger=document.createElement('summary');trigger.textContent='•••';trigger.setAttribute('aria-label',`Actions for ${title}`);menu.append(trigger);const controls=document.createElement('div');
    const pin=document.createElement('button');pin.type='button';pin.textContent=pins.includes(form.id)?'Unpin':'Pin';pin.onclick=()=>{toggleConsultationPin(form.id);menu.open=false;};controls.append(pin);
    if(data.admin||form.owned){const rename=document.createElement('button');rename.type='button';rename.textContent='Rename';rename.onclick=()=>{menu.open=false;renameConsultation(form.id,form.title,trigger);};controls.append(rename);}
    menu.append(controls);menu.onkeydown=e=>{if(e.key==='Escape'){menu.open=false;trigger.focus();}};row.append(menu);
    if (dev && earlierIds.has(form.id) && !query && consultationId(path) !== form.id) earlier.append(row);
    else nav.append(row);
  }
  if (earlier.children.length > 1) nav.append(earlier);
  if (!forms.length) {
    const empty = document.createElement('p'); empty.className = 'symphonia-navigation-status';
    empty.textContent = query ? 'No matching consultations.' : 'Your consultations will appear here.'; nav.append(empty);
  }
}
