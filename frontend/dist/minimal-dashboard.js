var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

// <define:import.meta.env>
var define_import_meta_env_default;
var init_define_import_meta_env = __esm({
  "<define:import.meta.env>"() {
    define_import_meta_env_default = {};
  }
});

// src/api/client.ts
var client_exports = {};
__export(client_exports, {
  ApiError: () => ApiError,
  api: () => api,
  clearAuthAndRedirect: () => clearAuthAndRedirect,
  getApiErrorDetail: () => getApiErrorDetail,
  isCfAccessRedirect: () => isCfAccessRedirect,
  publicApi: () => publicApi
});
function getCookie(name) {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}
function isCfAccessRedirect(response) {
  if (response.type === "opaqueredirect") return true;
  if (response.redirected) {
    const url = response.url.toLowerCase();
    if (url.includes("cloudflareaccess.com") || url.includes("cdn-cgi/access")) {
      return true;
    }
  }
  return false;
}
function clearAuthAndRedirect() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("email");
  localStorage.removeItem("is_admin");
  document.cookie = "csrf_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax";
  document.cookie = `csrf_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${window.location.hostname}; SameSite=Lax`;
  if (!_redirecting) {
    _redirecting = true;
    window.location.href = "/login?expired=1";
  }
}
async function apiClient(endpoint, options = {}) {
  const csrfToken = getCookie("csrf_token");
  const bearerToken = localStorage.getItem("access_token");
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      credentials: "include",
      // Send httpOnly cookies automatically
      headers: {
        "Content-Type": "application/json",
        ...csrfToken ? { "X-CSRF-Token": csrfToken } : {},
        ...bearerToken ? { Authorization: `Bearer ${bearerToken}` } : {},
        ...options.headers
      }
    });
  } catch (err) {
    throw new ApiError(0, "Connection interrupted. Please try again when you are online.");
  }
  if (isCfAccessRedirect(response)) {
    clearAuthAndRedirect();
    throw new ApiError(401, "Session expired (CF Access). Please log in again.");
  }
  if (!response.ok) {
    if (response.status === 401) {
      if (endpoint !== "/login") {
        clearAuthAndRedirect();
        throw new ApiError(401, "Session expired. Please log in again.");
      }
    }
    let errorBody;
    try {
      errorBody = await response.text();
    } catch {
      errorBody = `HTTP ${response.status}`;
    }
    throw new ApiError(response.status, errorBody, response.headers);
  }
  try {
    return await response.json();
  } catch {
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("text/html")) {
      throw new ApiError(502, "The server returned an unexpected page. Please try again.");
    }
    throw new ApiError(response.status, "Invalid JSON response from server");
  }
}
async function publicApiClient(endpoint, options = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      credentials: "omit"
    });
  } catch (err) {
    throw new ApiError(0, err instanceof Error ? err.message : "Network request failed");
  }
  if (!response.ok) {
    let errorBody;
    try {
      errorBody = await response.text();
    } catch {
      errorBody = `HTTP ${response.status}`;
    }
    throw new ApiError(response.status, errorBody, response.headers);
  }
  try {
    return await response.json();
  } catch {
    throw new ApiError(response.status, "Invalid JSON response from server");
  }
}
function getApiErrorDetail(error) {
  if (!(error instanceof ApiError)) return null;
  try {
    const parsed = JSON.parse(error.message);
    if (parsed && typeof parsed.detail === "string") return parsed.detail;
  } catch {
  }
  return error.message || null;
}
var API_BASE_URL, _redirecting, ApiError, api, publicApi;
var init_client = __esm({
  "src/api/client.ts"() {
    "use strict";
    init_define_import_meta_env();
    API_BASE_URL = (define_import_meta_env_default.VITE_API_BASE_URL || "/api").trim();
    _redirecting = false;
    ApiError = class extends Error {
      constructor(status, message, headers) {
        super(message);
        this.status = status;
        __publicField(this, "headers");
        this.name = "ApiError";
        this.headers = headers ?? new Headers();
      }
    };
    api = {
      get: (endpoint) => apiClient(endpoint),
      post: (endpoint, data) => apiClient(endpoint, {
        method: "POST",
        body: data !== void 0 ? JSON.stringify(data) : void 0
      }),
      /** POST with URL-encoded form body (for endpoints that expect form data) */
      postForm: (endpoint, params) => apiClient(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(params).toString()
      }),
      patch: (endpoint, data) => apiClient(endpoint, { method: "PATCH", body: JSON.stringify(data) }),
      put: (endpoint, data) => apiClient(endpoint, {
        method: "PUT",
        body: JSON.stringify(data)
      }),
      delete: (endpoint) => apiClient(endpoint, { method: "DELETE" })
    };
    publicApi = {
      get: (endpoint) => publicApiClient(endpoint),
      post: (endpoint, data) => publicApiClient(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: data !== void 0 ? JSON.stringify(data) : void 0
      }),
      postMultipart: (endpoint, data) => publicApiClient(endpoint, {
        method: "POST",
        body: data
      }),
      put: (endpoint, data) => publicApiClient(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      })
    };
  }
});

// src/legacy/minimalDashboard.ts
init_define_import_meta_env();

// src/utils/summaryRoute.ts
init_define_import_meta_env();
var CONSULTATION_NAVIGATION = "symphonia:navigate-consultation";
function forwardConsultationClick(event) {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const link = event.target.closest("a[href]");
  if (!link || link.target && link.target !== "_self" || link.hasAttribute("download")) return;
  const url = new URL(link.href, location.origin);
  if (url.origin !== location.origin || !/^\/admin\/form\/\d+\/summary\/?$/.test(location.pathname) || !/^\/admin\/form\/\d+\/summary\/?$/.test(url.pathname)) return;
  if (url.pathname === location.pathname) {
    event.preventDefault();
    return;
  }
  const dirty = document.querySelector(".synthesis-draft-state")?.textContent?.includes("Unsaved changes") || document.querySelector(".response-workspace textarea:not(:disabled)") || document.querySelector('.manual-response-sheet[data-dirty="true"]');
  if (dirty && !window.confirm("Leave this consultation and discard unsaved edits?")) {
    event.preventDefault();
    return;
  }
  const request = new CustomEvent(CONSULTATION_NAVIGATION, { cancelable: true, detail: { href: url.pathname + url.search } });
  window.dispatchEvent(request);
  if (request.defaultPrevented) event.preventDefault();
}

// src/utils/consultationNavigation.ts
init_define_import_meta_env();

// src/utils/consultationActions.ts
init_define_import_meta_env();
var pinKey = () => `symphonia:pins:${localStorage.getItem("email") || "anonymous"}`;
function pinnedConsultations() {
  try {
    const value = JSON.parse(localStorage.getItem(pinKey()) || "[]");
    return Array.isArray(value) ? value.filter((v) => Number.isSafeInteger(v) && v > 0) : [];
  } catch {
    return [];
  }
}
function toggleConsultationPin(id) {
  const pins = pinnedConsultations();
  const next = pins.includes(id) ? pins.filter((n) => n !== id) : [id, ...pins];
  localStorage.setItem(pinKey(), JSON.stringify(next));
  document.dispatchEvent(new CustomEvent("symphonia:consultations-changed", { detail: { pinned: true } }));
  return next.includes(id);
}
async function client() {
  if (document.querySelector('script[src*="index-HJquNmhn.js"],script[src*="index-workspace-v1.js"]')) {
    const path = "/assets/index-HJquNmhn.js";
    return (await import(
      /* @vite-ignore */
      path
    )).b;
  }
  return (await Promise.resolve().then(() => (init_client(), client_exports))).api;
}
function renameConsultation(id, title, trigger) {
  const prefix = title.match(/^(?:SIMULATED PANEL\s*[—–-]|Simulated example\s*·)\s*/i)?.[0] || "";
  const dialog = document.createElement("dialog");
  dialog.className = "consultation-rename";
  dialog.setAttribute("aria-labelledby", "rename-consultation-title");
  const form = document.createElement("form");
  const heading = document.createElement("h2");
  heading.id = "rename-consultation-title";
  heading.textContent = "Rename consultation";
  const label = document.createElement("label");
  label.textContent = "Name";
  const input = document.createElement("input");
  input.name = "title";
  input.required = true;
  input.maxLength = 240 - prefix.length;
  input.value = title.slice(prefix.length);
  label.append(input);
  const error = document.createElement("p");
  error.className = "rename-error";
  error.setAttribute("role", "alert");
  const actions = document.createElement("div");
  actions.className = "rename-actions";
  const cancel = document.createElement("button");
  cancel.type = "button";
  cancel.textContent = "Cancel";
  const save = document.createElement("button");
  save.type = "submit";
  save.textContent = "Save";
  actions.append(cancel, save);
  form.append(heading, label, error, actions);
  dialog.append(form);
  document.body.append(dialog);
  let busy = false;
  const close = () => {
    if (busy) return;
    dialog.close();
  };
  cancel.onclick = close;
  dialog.addEventListener("cancel", (e) => {
    if (busy) e.preventDefault();
  });
  dialog.addEventListener("close", () => {
    dialog.remove();
    trigger?.focus();
  });
  form.onsubmit = async (e) => {
    e.preventDefault();
    const next = input.value.trim();
    if (!next) {
      error.textContent = "Enter a name.";
      input.focus();
      return;
    }
    busy = true;
    save.disabled = true;
    cancel.disabled = true;
    input.disabled = true;
    save.textContent = "Saving\u2026";
    error.textContent = "";
    try {
      await (await client()).patch(`/forms/${id}/title`, { title: prefix + next, expected_title: title });
      document.dispatchEvent(new CustomEvent("symphonia:consultations-changed", { detail: { id, title: prefix + next } }));
      busy = false;
      dialog.close();
    } catch (err) {
      error.textContent = err instanceof Error ? err.message : "Could not rename. Please try again.";
      busy = false;
      save.disabled = false;
      cancel.disabled = false;
      input.disabled = false;
      save.textContent = "Save";
    }
  };
  dialog.showModal();
  input.focus();
  input.select();
  return dialog;
}

// src/utils/consultationNavigation.ts
async function loadNavigation(client2) {
  const me = await client2.get("/me");
  const admin = me.is_admin === true;
  const canCreate = admin || me.role === "facilitator" || me.role === "platform_admin";
  if (admin) return { forms: await client2.get("/forms"), canCreate, admin };
  const joined = await client2.get("/my_forms");
  const owned = canCreate ? await client2.get("/forms/my-created") : [];
  const forms = new Map(joined.map((form) => [form.id, form]));
  owned.forEach((form) => forms.set(form.id, { ...form, owned: true }));
  return { forms: [...forms.values()], canCreate, admin };
}
function consultationId(path) {
  const match = path.match(/^\/(?:admin\/)?form\/(\d+)(?:\/|$)/);
  return match ? Number(match[1]) : null;
}
function navigationHref(form, admin) {
  return admin || form.owned ? `/admin/form/${form.id}/summary` : `/form/${form.id}`;
}
function renderConsultationNavigation(nav, data, path, error, query = "") {
  const makeLink = (text, href) => {
    const link = document.createElement("a");
    link.href = href;
    link.textContent = text;
    if (href === "/" ? path === "/" : consultationId(href) !== null && consultationId(href) === consultationId(path)) link.setAttribute("aria-current", "page");
    return link;
  };
  const top = document.createElement("div");
  top.className = "symphonia-navigation-actions";
  top.append(makeLink("All consultations", "/"));
  if (data?.canCreate) top.append(makeLink("+ New consultation", "/admin/forms/new"));
  nav.replaceChildren(top);
  if (!data) {
    const status = document.createElement("p");
    status.className = "symphonia-navigation-status";
    status.textContent = error ? "Could not load consultations. Open All consultations to try again." : "Loading consultations\u2026";
    status.setAttribute("role", "status");
    nav.append(status);
    return;
  }
  const pins = pinnedConsultations();
  const forms = [...data.forms].sort((a, b) => Number(pins.includes(b.id)) - Number(pins.includes(a.id)) || b.id - a.id).filter((form) => form.title.toLowerCase().includes(query.toLowerCase()));
  const dev = location.hostname === "symphonia-dev-488613.web.app" || /^symphonia-dev-488613--[a-z0-9-]+\.web\.app$/.test(location.hostname);
  const earlierIds = /* @__PURE__ */ new Set([20, 23, 24, 25, 26, 27, 28]);
  const earlier = document.createElement("details");
  earlier.className = "symphonia-navigation-earlier";
  const summary = document.createElement("summary");
  summary.textContent = "Earlier examples";
  earlier.append(summary);
  let group = "";
  for (const form of forms) {
    const nextGroup = pins.includes(form.id) ? "Pinned" : "Consultations";
    if (group !== nextGroup) {
      group = nextGroup;
      const h = document.createElement("h2");
      h.textContent = group;
      nav.append(h);
    }
    const title = form.title.replace(/^(?:Simulated example\s*[·]|SIMULATED PANEL\s*[—–-])\s*/i, "");
    const link = makeLink(title, navigationHref(form, data.admin));
    link.title = form.title;
    link.className = "symphonia-consultation-link";
    if (/^(Simulated example|SIMULATED PANEL)/i.test(form.title)) {
      link.setAttribute("aria-label", `${title} \xB7 Simulated example`);
      const badge = document.createElement("span");
      badge.className = "symphonia-navigation-demo";
      badge.textContent = "Example";
      link.append(badge);
    }
    const row = document.createElement("div");
    row.className = "symphonia-navigation-row";
    row.append(link);
    const menu = document.createElement("details");
    menu.className = "symphonia-navigation-menu";
    const trigger = document.createElement("summary");
    trigger.textContent = "\u2022\u2022\u2022";
    trigger.setAttribute("aria-label", `Actions for ${title}`);
    menu.append(trigger);
    const controls = document.createElement("div");
    const pin = document.createElement("button");
    pin.type = "button";
    pin.textContent = pins.includes(form.id) ? "Unpin" : "Pin";
    pin.onclick = () => {
      toggleConsultationPin(form.id);
      menu.open = false;
    };
    controls.append(pin);
    if (data.admin || form.owned) {
      const rename = document.createElement("button");
      rename.type = "button";
      rename.textContent = "Rename";
      rename.onclick = () => {
        menu.open = false;
        renameConsultation(form.id, form.title, trigger);
      };
      controls.append(rename);
    }
    menu.append(controls);
    menu.onkeydown = (e) => {
      if (e.key === "Escape") {
        menu.open = false;
        trigger.focus();
      }
    };
    row.append(menu);
    if (dev && earlierIds.has(form.id) && !query && consultationId(path) !== form.id) earlier.append(row);
    else nav.append(row);
  }
  if (earlier.children.length > 1) nav.append(earlier);
  if (!forms.length) {
    const empty = document.createElement("p");
    empty.className = "symphonia-navigation-status";
    empty.textContent = query ? "No matching consultations." : "Your consultations will appear here.";
    nav.append(empty);
  }
}

// src/legacy/minimalDashboard.ts
function cleanText(value) {
  return (value || "").replace(/\s+/g, " ").trim();
}
function findButton(pattern) {
  return Array.from(document.querySelectorAll("button")).find((button) => pattern.test(cleanText(button.textContent))) || null;
}
function relabelButton(button, label) {
  if (!button || button.dataset.minimalLabel === label) return;
  button.dataset.minimalLabel = label;
  button.setAttribute("aria-label", label);
  button.textContent = label;
}
var shells = /* @__PURE__ */ new WeakMap();
var collapsed = false;
var navigationCache = null;
function accountIdentity() {
  const email = localStorage.getItem("email");
  return email ? [email, localStorage.getItem("role") || ""].join("|") : "";
}
function panelIcon() {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", "20");
  svg.setAttribute("height", "20");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "1.6");
  svg.setAttribute("aria-hidden", "true");
  const rect = document.createElementNS(svg.namespaceURI, "rect");
  rect.setAttribute("x", "3");
  rect.setAttribute("y", "4");
  rect.setAttribute("width", "18");
  rect.setAttribute("height", "16");
  rect.setAttribute("rx", "3");
  const path = document.createElementNS(svg.namespaceURI, "path");
  path.setAttribute("d", "M9 4v16M5.5 8h1M5.5 12h1M5.5 16h1");
  path.setAttribute("stroke-linecap", "round");
  svg.append(rect, path);
  return svg;
}
async function navigationClient() {
  if (document.querySelector('script[src*="index-HJquNmhn.js"],script[src*="index-workspace-v1.js"]')) {
    const deployed = "/assets/index-HJquNmhn.js";
    const module = await import(
      /* @vite-ignore */
      deployed
    );
    return module.b;
  }
  return (await Promise.resolve().then(() => (init_client(), client_exports))).api;
}
function markHeader() {
  const header = Array.from(document.querySelectorAll("header")).find((candidate) => candidate.querySelector('img[src*="logo-mark.png"]') && candidate.querySelector('button[aria-haspopup="menu"]'));
  if (!header) {
    if (/^\/(?:login|register|forgot-password|reset-password)/.test(location.pathname)) navigationCache = null;
    return;
  }
  header.classList.add("symphonia-shell-header");
  const shell = header.parentElement;
  shell.classList.add("symphonia-shell");
  shell.classList.toggle("symphonia-consultation-open", consultationId(location.pathname) !== null);
  shell.classList.toggle("symphonia-sidebar-collapsed", collapsed);
  const account = header.querySelector('button[aria-haspopup="menu"]');
  account?.classList.add("symphonia-account-trigger");
  account?.parentElement?.classList.add("symphonia-account");
  let state = shells.get(header);
  if (!state) {
    const nav = document.createElement("nav");
    nav.className = "symphonia-shell-navigation";
    nav.setAttribute("aria-label", "Consultations");
    const search = document.createElement("input");
    search.type = "search";
    search.placeholder = "Find a consultation";
    search.setAttribute("aria-label", "Find a consultation");
    search.className = "symphonia-navigation-search";
    const list = document.createElement("div");
    list.className = "symphonia-navigation-list";
    nav.append(search, list);
    nav.addEventListener("click", forwardConsultationClick);
    header.append(nav);
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "symphonia-navigation-toggle";
    toggle.append(panelIcon());
    toggle.setAttribute("aria-label", "Open consultations");
    toggle.setAttribute("title", "Open consultations");
    header.querySelector("div")?.prepend(toggle);
    const dialog = document.createElement("dialog");
    dialog.className = "symphonia-navigation-drawer";
    dialog.setAttribute("aria-label", "Consultations");
    dialog.addEventListener("click", forwardConsultationClick);
    header.append(dialog);
    const cached = accountIdentity() && navigationCache?.identity === accountIdentity() && Date.now() - navigationCache.at < 3e4 ? navigationCache.data : null;
    state = { data: cached, error: false, path: "", signature: "", nav, dialog, toggle, query: "", pending: false, loadedPath: cached ? location.pathname : "" };
    shells.set(header, state);
    const current = state;
    const closeDrawer = () => dialog.close();
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) {
        const r = dialog.getBoundingClientRect();
        if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) closeDrawer();
      }
    });
    dialog.addEventListener("close", () => {
      toggle.setAttribute("aria-expanded", "false");
      toggle.focus();
    });
    toggle.addEventListener("click", () => {
      if (innerWidth > 800 && consultationId(location.pathname) !== null) {
        collapsed = !collapsed;
        shell.classList.toggle("symphonia-sidebar-collapsed", collapsed);
        toggle.setAttribute("aria-label", collapsed ? "Open consultations" : "Collapse consultations");
        toggle.setAttribute("aria-expanded", String(!collapsed));
        return;
      }
      const close = document.createElement("button");
      close.type = "button";
      close.className = "symphonia-drawer-close";
      close.append(panelIcon());
      close.setAttribute("aria-label", "Close consultations");
      close.setAttribute("title", "Close consultations");
      close.onclick = closeDrawer;
      const drawerHeader = document.createElement("div");
      drawerHeader.className = "symphonia-drawer-header";
      const wordmark = document.createElement("span");
      wordmark.textContent = "Symphonia";
      drawerHeader.append(close, wordmark);
      const drawerNav = document.createElement("nav");
      drawerNav.setAttribute("aria-label", "Switch consultation");
      const drawerSearch = document.createElement("input");
      drawerSearch.type = "search";
      drawerSearch.placeholder = "Find a consultation";
      drawerSearch.setAttribute("aria-label", "Find a consultation");
      drawerSearch.className = "symphonia-navigation-search";
      drawerSearch.addEventListener("input", () => renderConsultationNavigation(drawerNav, current.data, location.pathname, current.error, drawerSearch.value));
      renderConsultationNavigation(drawerNav, current.data, location.pathname, current.error);
      dialog.replaceChildren(drawerHeader, drawerSearch, drawerNav);
      dialog.showModal();
      toggle.setAttribute("aria-expanded", "true");
    });
    search.addEventListener("input", () => {
      current.query = search.value;
      current.signature = "";
      scheduleApply();
    });
  }
  if (!state.pending && state.loadedPath !== location.pathname) {
    state.pending = true;
    state.loadedPath = location.pathname;
    const current = state;
    navigationClient().then(loadNavigation).then((data) => {
      if (header.isConnected) {
        current.data = data;
        current.error = false;
        current.signature = "";
        navigationCache = { identity: accountIdentity(), data, at: Date.now() };
      }
    }).catch(() => {
      if (header.isConnected) {
        current.error = true;
        current.signature = "";
      }
    }).finally(() => {
      current.pending = false;
      if (header.isConnected) scheduleApply();
    });
  }
  if (state.path !== location.pathname) {
    state.path = location.pathname;
    if (state.dialog.open) state.dialog.close();
  }
  const signature = JSON.stringify([location.pathname, state.data, state.error, state.query]);
  if (state.signature !== signature) {
    state.signature = signature;
    renderConsultationNavigation(state.nav.querySelector(".symphonia-navigation-list"), state.data, location.pathname, state.error, state.query);
    const drawerNav = state.dialog.querySelector("nav");
    if (state.dialog.open && drawerNav) renderConsultationNavigation(drawerNav, state.data, location.pathname, state.error, state.dialog.querySelector("input")?.value);
  }
  if (!state.dialog.open) {
    const expanded = consultationId(location.pathname) !== null && !collapsed && innerWidth > 800;
    state.toggle.setAttribute("aria-expanded", String(expanded));
    state.toggle.setAttribute("aria-label", expanded ? "Collapse consultations" : "Open consultations");
    state.toggle.setAttribute("title", expanded ? "Collapse consultations" : "Open consultations");
  }
}
function nearestCard(node) {
  let current = node?.parentElement || null;
  while (current && current.id !== "root") {
    if (current.classList.contains("rounded-xl") || current.classList.contains("rounded-2xl")) return current;
    current = current.parentElement;
  }
  return null;
}
function markAdminDashboard() {
  const newButton = findButton(/^new(?: consultation)?$/i);
  const joinButton = findButton(/^(join|enter).*code|^join(?: consultation)?$/i);
  if (!newButton) return false;
  const section = newButton.closest("section, main");
  if (!section) return false;
  section.classList.add("symphonia-minimal-dashboard", "symphonia-admin-home");
  const title = Array.from(section.querySelectorAll("h1")).find((heading) => /^consultations$/i.test(cleanText(heading.textContent)));
  title?.classList.add("symphonia-redundant-title");
  relabelButton(newButton, "New consultation");
  newButton.classList.add("symphonia-create-action");
  if (joinButton) relabelButton(joinButton, "Join with code");
  const search = section.querySelector(
    'input[aria-label*="Search"], input[placeholder*="Search"]'
  );
  search?.closest("div")?.classList.add("symphonia-minimal-search");
  const table = section.querySelector("table");
  if (table) {
    table.closest(".rounded-2xl")?.classList.add("symphonia-flat-list");
    table.classList.add("symphonia-flat-table");
  }
  Array.from(section.querySelectorAll(".rounded-2xl")).forEach((panel) => {
    if (!panel.querySelector("table")) panel.classList.add("symphonia-flat-empty");
  });
  return true;
}
function markExpertDashboard() {
  const joinHeading = Array.from(document.querySelectorAll("h2")).find((heading) => /^join a consultation$/i.test(cleanText(heading.textContent)));
  const listHeading = Array.from(document.querySelectorAll("h2")).find((heading) => /^my consultations$/i.test(cleanText(heading.textContent)));
  if (!joinHeading && !listHeading) return;
  const section = (joinHeading || listHeading)?.closest("section, main");
  section?.classList.add("symphonia-minimal-dashboard", "symphonia-expert-home");
  if (joinHeading) {
    const card = nearestCard(joinHeading);
    card?.classList.add("symphonia-join-card");
    joinHeading.classList.add("symphonia-redundant-title");
    const form = card?.querySelector("form");
    form?.classList.add("symphonia-join-form");
    const input = form?.querySelector("input");
    if (input) input.placeholder = "Join with code";
    relabelButton(form?.querySelector('button[type="submit"]') || null, "Join with code");
  }
  if (listHeading) {
    nearestCard(listHeading)?.classList.add("symphonia-list-card");
    listHeading.classList.add("symphonia-redundant-title");
  }
}
function applyMinimalDashboard() {
  markHeader();
  if (location.pathname === "/join") {
    const heading = document.querySelector("main h1, section h1");
    const card = nearestCard(heading);
    card?.classList.add("symphonia-code-entry");
    const input = card?.querySelector("input");
    if (input) {
      input.setAttribute("aria-label", "Consultation code");
      input.placeholder = "Consultation code";
    }
  }
  if (window.location.pathname !== "/") return;
  if (!markAdminDashboard()) markExpertDashboard();
}
var scheduled = false;
function scheduleApply() {
  if (scheduled) return;
  scheduled = true;
  window.requestAnimationFrame(() => {
    scheduled = false;
    applyMinimalDashboard();
  });
}
applyMinimalDashboard();
var observer = new MutationObserver(scheduleApply);
observer.observe(document.documentElement, { childList: true, subtree: true });
window.addEventListener("popstate", scheduleApply);
window.addEventListener("resize", scheduleApply);
document.addEventListener("symphonia:consultations-changed", (event) => {
  const detail = event.detail;
  document.querySelectorAll(".symphonia-shell-header").forEach((header) => {
    const state = shells.get(header);
    if (!state) return;
    if (detail?.id && state.data) {
      state.data.forms = state.data.forms.map((f) => f.id === detail.id ? { ...f, title: detail.title } : f);
      if (navigationCache) navigationCache.data = state.data;
    }
    state.signature = "";
  });
  scheduleApply();
});
document.addEventListener("pointerdown", (event) => {
  document.querySelectorAll(".symphonia-navigation-menu[open]").forEach((menu) => {
    if (!menu.contains(event.target)) menu.open = false;
  });
});
