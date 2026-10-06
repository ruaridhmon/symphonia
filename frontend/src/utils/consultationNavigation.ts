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
  const label = document.createElement('h2'); label.textContent = 'Consultations'; nav.append(label);
  if (!data) {
    const status = document.createElement('p'); status.className = 'symphonia-navigation-status';
    status.textContent = error ? 'Could not load consultations. Open All consultations to try again.' : 'Loading consultations…';
    status.setAttribute('role', 'status'); nav.append(status); return;
  }
  const forms = [...data.forms].sort((a,b) => b.id-a.id).filter(form => form.title.toLowerCase().includes(query.toLowerCase()));
  const dev = location.hostname === 'symphonia-dev-488613.web.app' || /^symphonia-dev-488613--[a-z0-9-]+\.web\.app$/.test(location.hostname);
  const earlierIds = new Set([20,23,24,25,26,27,28]);
  const earlier = document.createElement('details'); earlier.className = 'symphonia-navigation-earlier';
  const summary = document.createElement('summary'); summary.textContent = 'Earlier examples'; earlier.append(summary);
  for (const form of forms) {
    const title = form.title.replace(/^(?:Simulated example\s*[·]|SIMULATED PANEL\s*[—–-])\s*/i, '');
    const link = makeLink(title, navigationHref(form, data.admin)); link.title = form.title;
    link.className = 'symphonia-consultation-link';
    if (/^(Simulated example|SIMULATED PANEL)/i.test(form.title)) {
      link.setAttribute('aria-label', `${title} · Simulated example`);
      const badge = document.createElement('span'); badge.className = 'symphonia-navigation-demo'; badge.textContent = 'Example'; link.append(badge);
    }
    if (dev && earlierIds.has(form.id) && !query && consultationId(path) !== form.id) earlier.append(link);
    else nav.append(link);
  }
  if (earlier.children.length > 1) nav.append(earlier);
  if (!forms.length) {
    const empty = document.createElement('p'); empty.className = 'symphonia-navigation-status';
    empty.textContent = query ? 'No matching consultations.' : 'Your consultations will appear here.'; nav.append(empty);
  }
}
