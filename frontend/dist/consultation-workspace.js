var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

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
    API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "/api").trim();
    _redirecting = false;
    ApiError = class extends Error {
      constructor(status, message, headers) {
        super(message);
        this.status = status;
        this.name = "ApiError";
        this.headers = headers ?? new Headers();
      }
      headers;
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

// src/utils/consultationActions.ts
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

// src/utils/reasoningFlow.ts
var el = (tag, text = "", cls = "") => {
  const e = document.createElement(tag);
  e.textContent = text;
  e.className = cls;
  return e;
};
var observers = /* @__PURE__ */ new WeakMap();
function clearReasoningFlow(root) {
  observers.get(root)?.disconnect();
  observers.delete(root);
}
function renderReasoningFlow(root, graph, selectedNode) {
  clearReasoningFlow(root);
  const shared = graph.claims?.length ? [{ id: "shared-claims", title: "Shared claim map", response_number: 0, nodes: graph.claims.map((c) => ({ id: c.id, text: c.text, kind: c.origin === "inferred" ? "assumption" : "premise", question: c.question, sources: c.sources })), edges: graph.claim_edges || [] }] : [];
  const flows = [...shared, ...graph.flows];
  const remembered = root.dataset.reasoningFlow;
  const section = el("section", "", "rf-workspace");
  section.setAttribute("aria-label", "First-round reasoning");
  if (graph.rejected_flow_count) section.append(el("p", `${graph.rejected_flow_count} source maps could not be validated.`, "rf-coverage"));
  if (!flows.length) {
    section.append(el("p", "No source-linked reasoning maps were saved for this draft. Open Claims & full summary to review the claim list."));
    root.append(section);
    return;
  }
  const nav = el("nav", "", "rf-tabs");
  nav.setAttribute("aria-label", "Expert reasoning flows");
  section.append(nav);
  const canvas = el("div", "", "rf-canvas");
  const detail = document.createElement("dialog");
  detail.className = "rf-detail di-supporting-dialog";
  detail.setAttribute("aria-label", "Supporting information");
  detail.setAttribute("aria-live", "polite");
  section.append(canvas, detail);
  const show = (index) => {
    picker.value = String(index);
    const flow = flows[index];
    root.dataset.reasoningFlow = flow.id;
    canvas.replaceChildren();
    detail.replaceChildren();
    nav.querySelectorAll("button").forEach((b, i) => b.setAttribute("aria-pressed", String(i === index)));
    const title = el("div", "", "rf-flow-title");
    if (flow.response_number) {
      title.append(el("h3", flow.title));
      canvas.append(title);
    }
    const diagram = el("div", "", "rf-diagram");
    canvas.append(diagram);
    const labels = new Map(flow.nodes.map((n, i) => [n.id, flow.response_number ? `${flow.response_number}.${i + 1}` : String(i + 1).padStart(2, "0")]));
    const select = (n, open = true, invoker) => {
      root.dataset.reasoningNode = n.id;
      diagram.querySelectorAll("[data-rf-node]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.rfNode === n.id)));
      detail.replaceChildren();
      detail.classList.toggle("rf-inferred-detail", n.kind === "assumption");
      detail.hidden = !open;
      const top = el("div", "", "rf-detail-heading");
      const title2 = el("div");
      title2.append(el("p", "Supporting information", "di-supporting-kicker"), el("h4", n.text, "di-supporting-claim"));
      top.append(title2);
      const close = document.createElement("button");
      close.type = "button";
      close.textContent = "\xD7";
      close.setAttribute("aria-label", "Close supporting information");
      close.onclick = () => {
        detail.close();
        detail.hidden = true;
        (invoker || diagram.querySelector(`[data-rf-node="${n.id}"]`))?.focus();
      };
      top.append(close);
      detail.append(top);
      if (n.kind === "assumption") detail.append(el("p", "Inferred \xB7 unconfirmed", "di-supporting-origin"), el("p", n.question || "Ask the expert to clarify this connection.", "di-supporting-text"));
      else if (n.sources) {
        for (const source of n.sources) {
          const block = el("section", "", "di-supporting-entry");
          block.append(el("div", `Response ${source.response_number}`, "di-supporting-person"), el("blockquote", source.source_text || source.quote, "di-supporting-text"));
          detail.append(block);
        }
      } else {
        detail.append(el("blockquote", n.source_text || n.quote || "", "di-supporting-text"));
        if (n.condition) detail.append(el("p", "Qualification: " + n.condition, "rf-qualification"));
      }
      detail.oncancel = (e) => {
        e.preventDefault();
        close.click();
      };
      detail.onclick = (e) => {
        if (e.target === detail) {
          const r = detail.getBoundingClientRect();
          if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) close.click();
        }
      };
      if (open && !detail.open) detail.showModal();
    };
    const ordered = [];
    const pending = [...flow.nodes];
    while (pending.length) {
      const ready = pending.findIndex((n) => flow.edges.filter((e) => e.to === n.id).every((e) => ordered.some((p) => p.id === e.from) || !flow.nodes.some((p) => p.id === e.from)));
      if (ready < 0) {
        ordered.push(...pending);
        break;
      }
      ordered.push(pending.splice(ready, 1)[0]);
    }
    ordered.forEach((n, i) => labels.set(n.id, flow.response_number ? `${flow.response_number}.${i + 1}` : String(i + 1).padStart(2, "0")));
    diagram.className = "rf-claim-list";
    diagram.setAttribute("role", "list");
    for (const n of ordered) {
      const row = el("div", "", "rf-claim-row");
      row.setAttribute("role", "listitem");
      const b = document.createElement("button");
      b.type = "button";
      b.className = "rf-node rf-list-node";
      b.dataset.rfNode = n.id;
      b.setAttribute("aria-pressed", "false");
      b.append(el("span", labels.get(n.id), "rf-number"), el("strong", n.text));
      if (n.kind === "assumption") {
        row.classList.add("rf-inferred-row");
        b.append(el("span", "Inferred assumption \xB7 unconfirmed", "rf-list-origin"));
      }
      b.title = n.kind === "assumption" ? "Inspect inferred assumption" : "Read supporting information";
      b.setAttribute("aria-haspopup", "dialog");
      b.onclick = () => select(n);
      row.append(b);
      const incoming = flow.edges.filter((e) => e.to === n.id);
      if (incoming.length) {
        const links = el("div", "", "rf-dependencies");
        for (const edge of incoming) {
          const source = flow.nodes.find((t) => t.id === edge.from);
          if (!source) continue;
          const link = document.createElement("button");
          link.type = "button";
          const relation = { supports: "Supported by", qualifies: "Qualified by", challenges: "Challenged by", motivates: "Motivated by" }[edge.relation];
          link.textContent = `${relation} ${labels.get(source.id)}`;
          link.setAttribute("aria-label", `${n.text}: ${relation.toLowerCase()} claim ${labels.get(source.id)}. ${source.text}`);
          link.onclick = () => {
            select(source);
            diagram.querySelector(`[data-rf-node="${source.id}"]`)?.scrollIntoView?.({ block: "nearest", behavior: "smooth" });
          };
          links.append(link);
        }
        row.append(links);
      }
      diagram.append(row);
    }
    select(flow.nodes.find((n) => n.id === (selectedNode || root.dataset.reasoningNode)) || flow.nodes[0], !!selectedNode);
  };
  const picker = document.createElement("select");
  picker.className = "rf-source-picker";
  picker.setAttribute("aria-label", "Claim sources");
  flows.forEach((flow, i) => {
    const option = document.createElement("option");
    option.value = String(i);
    option.textContent = flow.response_number ? `Response ${flow.response_number} \xB7 ${flow.title}` : "Shared claims";
    picker.append(option);
  });
  picker.onchange = () => {
    selectedNode = void 0;
    delete root.dataset.reasoningNode;
    show(Number(picker.value));
  };
  nav.append(picker);
  root.append(section);
  show(selectedNode ? 0 : Math.max(0, flows.findIndex((f) => f.id === remembered)));
}

// src/utils/consultationWorkspace.ts
function questionOutline(questions) {
  const groups = [];
  for (const [index, q] of questions.entries()) {
    const config = typeof q === "string" ? {} : q;
    const label = typeof q === "string" ? q : String(q.label || q.question || q.text || `Question ${index + 1}`);
    const section = String(config.sectionTitle || "");
    let group = section && groups.at(-1)?.title === section ? groups.at(-1) : void 0;
    if (!group) {
      group = { title: section || label, fields: [] };
      groups.push(group);
    }
    group.fields.push({ label: section ? label : "", options: Array.isArray(config.options) ? config.options.map(String) : [], optional: config.optional === true });
  }
  const scales = [...new Set(groups.flatMap((group) => group.fields.filter((field) => field.options.length).map((field) => JSON.stringify(field.options))))];
  return { groups, sharedScale: scales.length === 1 ? JSON.parse(scales[0]) : null };
}
function createConsultationWorkspace(R, ManualResponse, FinalSynthesis) {
  const h = R.createElement;
  return function ConsultationWorkspace(p) {
    const [panel, setPanel] = R.useState(null);
    const [finalView, setFinalView] = R.useState(false);
    const [mapView, setMapView] = R.useState(false);
    const mapRoot = R.useRef(null);
    const [mapNode, setMapNode] = R.useState();
    const opening = p.rounds.find((r) => r.round_number === 1);
    const graph = opening?.synthesis_json?.narrative === opening?.synthesis ? opening?.synthesis_json?.reasoning_graph : null;
    R.useEffect(() => {
      const root = mapRoot.current;
      if (root && graph && mapView) {
        root.replaceChildren();
        renderReasoningFlow(root, graph, mapNode);
      }
      return () => {
        if (root) clearReasoningFlow(root);
      };
    }, [graph, mapView, mapNode]);
    R.useEffect(() => {
      const open = (event) => {
        const id = event.detail?.nodeId;
        if (graph?.claims?.some((c) => c.id === id)) {
          setMapNode(id);
          setMapView(true);
          setFinalView(false);
          p.onView("synthesis");
        }
      };
      document.addEventListener("symphonia:claim-map", open);
      return () => document.removeEventListener("symphonia:claim-map", open);
    }, [graph, p.form.id, p.onView]);
    const [completed, setCompleted] = R.useState(false);
    const [copyState, setCopyState] = R.useState("");
    const [adding, setAdding] = R.useState(null);
    const [saved, setSaved] = R.useState("");
    const addTrigger = R.useRef(null);
    const dialog = R.useRef(null);
    const titleId = R.useId();
    const invoker = R.useRef(null);
    const options = R.useRef(null);
    const openPanel = (next) => {
      invoker.current = options.current?.contains(document.activeElement) ? options.current.querySelector("summary") || null : document.activeElement;
      if (options.current) options.current.open = false;
      setCopyState("");
      setPanel(next);
    };
    const ordered = [...p.rounds].sort((a, b) => a.round_number - b.round_number);
    const round = ordered.find((r) => r.id === p.selectedRoundId) || ordered.find((r) => r.is_active) || ordered[0];
    const responseGroup = p.responses?.find((r) => r.id === round?.id);
    const count = responseGroup ? responseGroup.responses.length : round?.response_count;
    const joinUrl = new URL(`/share/${encodeURIComponent(p.form.join_code)}`, window.location.origin).href;
    const outline = questionOutline(round?.questions || p.form.questions);
    const [currentTitle, setCurrentTitle] = R.useState(p.form.title);
    const [pinned, setPinned] = R.useState(() => pinnedConsultations().includes(p.form.id));
    R.useEffect(() => {
      setCurrentTitle(p.form.title);
      setPinned(pinnedConsultations().includes(p.form.id));
    }, [p.form.id, p.form.title]);
    R.useEffect(() => {
      const changed = (e) => {
        const d = e.detail;
        if (d?.id === p.form.id) setCurrentTitle(d.title);
        setPinned(pinnedConsultations().includes(p.form.id));
      };
      document.addEventListener("symphonia:consultations-changed", changed);
      return () => document.removeEventListener("symphonia:consultations-changed", changed);
    }, [p.form.id]);
    const simulated = /^SIMULATED PANEL\s*[—–-]\s*/i.test(currentTitle);
    const displayTitle = currentTitle.replace(/^SIMULATED PANEL\s*[—–-]\s*/i, "");
    const hint = round?.round_number === 1 ? "Collect independent views, then draw out the claims." : round?.round_number === 2 ? "Review the claims and where the panel agrees or differs." : "Review final ratings alongside the reasons behind them.";
    R.useEffect(() => {
      if (panel && dialog.current && !dialog.current.open) dialog.current.showModal();
      if (!panel && dialog.current?.open) dialog.current.close();
    }, [panel]);
    R.useEffect(() => {
      const dismiss = (e) => {
        if (options.current?.open && !options.current.contains(e.target)) options.current.open = false;
      };
      document.addEventListener("pointerdown", dismiss);
      return () => document.removeEventListener("pointerdown", dismiss);
    }, []);
    R.useEffect(() => {
      setPanel(null);
      setCopyState("");
      setAdding(null);
      setSaved("");
      setFinalView(false);
      setMapView(false);
      setMapNode(void 0);
      setCompleted(false);
    }, [p.form.id]);
    const canLeave = () => !document.querySelector(".response-workspace textarea") || window.confirm("Discard unsaved response edits?");
    const button = (text, onClick, props = {}) => h("button", { type: "button", onClick, ...props }, props.children ?? text);
    const copy = async () => {
      try {
        await navigator.clipboard.writeText(joinUrl);
        setCopyState("Link copied");
      } catch {
        setCopyState("Copy unavailable. Select the link below and copy it.");
      }
    };
    return h(
      "section",
      { className: "consultation-workspace", "data-final-view": finalView || mapView ? "true" : void 0, "data-final-round": ordered.some((r) => r.round_number === 3) ? "true" : void 0, "aria-label": "Consultation workspace" },
      h(
        "div",
        { className: "cw-title-row" },
        h("div", { className: "cw-identity" }, h("h2", null, displayTitle), simulated && !p.isDemo ? h("span", { className: "cw-provenance", title: "Simulated consultation with fictional experts", "aria-label": "Demo with fictional experts" }, "Demo") : null),
        p.isDemo ? h("span", { className: "cw-demo-badge" }, "Synthetic example") : h(
          "div",
          { className: "cw-title-actions" },
          !finalView && ManualResponse && p.onResponseAdded ? button("Add response", () => {
            if (round?.is_active && !completed && canLeave()) {
              setSaved("");
              setAdding(round);
            }
          }, { ref: addTrigger, className: "cw-add-response", "aria-label": "Add response", disabled: !round?.is_active || completed, title: round?.is_active ? "Record a response received outside Symphonia" : "Select the current round to add a response", children: [h("svg", { key: "icon", width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.7, "aria-hidden": true }, h("path", { d: "M12 5v14M5 12h14" })), h("span", { key: "label" }, "Add response")] }) : null,
          h(
            "details",
            { ref: options, className: "cw-options", onKeyDown: (e) => {
              if (e.key === "Escape") {
                e.currentTarget.open = false;
                e.currentTarget.querySelector("summary")?.focus();
              }
            } },
            h("summary", { "aria-label": "Consultation options" }, "\u2022\u2022\u2022"),
            h(
              "div",
              null,
              button("Rename", () => {
                if (options.current) options.current.open = false;
                renameConsultation(p.form.id, currentTitle, options.current?.querySelector("summary"));
              }),
              button(pinned ? "Unpin" : "Pin", () => {
                toggleConsultationPin(p.form.id);
                if (options.current) options.current.open = false;
              }),
              button("Invite people", () => openPanel("invite")),
              h("a", { href: `/admin/form/${p.form.id}` }, "Edit consultation"),
              button("View questions", () => openPanel("questions"), { "aria-label": "View questions", disabled: !round }),
              p.onDownload ? button("Download", p.onDownload) : null,
              round && !round.is_active && p.onMakeLive ? button(p.makingLiveId === round.id ? "Updating\u2026" : `Make Round ${round.round_number} current`, () => p.onMakeLive?.(round), { disabled: p.makingLiveId === round.id }) : null
            )
          )
        )
      ),
      h(
        "nav",
        { className: "cw-views", "aria-label": "Consultation views" },
        [["synthesis", "Summary"], ["responses", "Responses"]].map(([view, label]) => button(label, () => {
          if (canLeave()) {
            setFinalView(false);
            setMapView(false);
            p.onView(view);
          }
        }, { key: view, "aria-pressed": !finalView && !mapView && p.view === view })),
        button("Claim map", () => {
          if (canLeave()) {
            p.onView("synthesis");
            setFinalView(false);
            setMapNode(void 0);
            setMapView(true);
          }
        }, { "aria-pressed": mapView, className: "cw-map-tab" }),
        h(
          "div",
          { className: "cw-context cw-simple-context" },
          h("div", { className: "cw-round-tabs", "aria-label": "Rounds" }, ...ordered.map((r) => button(`Round ${r.round_number}`, () => {
            if (canLeave()) {
              setFinalView(false);
              setMapView(false);
              p.onRound(r);
            }
          }, { key: r.id, "aria-pressed": !finalView && !mapView && round?.id === r.id, title: r.is_active ? "Current round" : `View Round ${r.round_number}` }))),
          ordered.some((r) => r.round_number === 3) && FinalSynthesis ? button("Final synthesis", () => {
            if (canLeave()) {
              p.onView("synthesis");
              setMapView(false);
              setFinalView(true);
            }
          }, { "aria-pressed": finalView, className: "cw-final-tab", title: "Round 4 \xB7 final synthesis" }) : null
        )
      ),
      p.view === "synthesis" && !finalView && !mapView ? h("div", { className: "cw-summary-slot" }) : null,
      mapView ? h("section", { className: "cw-claim-map", "aria-label": "Shared claim map" }, graph ? h("div", { ref: mapRoot }) : h(R.Fragment, null, h("h2", null, "No shared claim map yet"), h("p", null, "Extract the Round 1 contributions to create source-linked explicit claims, inferred assumptions and their connections."))) : null,
      finalView && FinalSynthesis ? h(FinalSynthesis, { formId: p.form.id, onComplete: () => setCompleted(true) }) : null,
      saved ? h("p", { className: "cw-response-saved", role: "status" }, saved) : null,
      adding && ManualResponse ? h(ManualResponse, { form: p.form, round: adding, onClose: () => {
        setAdding(null);
        requestAnimationFrame(() => addTrigger.current?.focus());
      }, onSaved: async () => {
        await p.onResponseAdded?.();
        setSaved("Response saved");
      } }) : null,
      h(
        "dialog",
        { ref: dialog, className: "cw-dialog", "aria-labelledby": titleId, onCancel: () => setPanel(null), onClose: () => {
          setPanel(null);
          requestAnimationFrame(() => invoker.current?.focus());
        }, onClick: (event) => {
          if (event.target === event.currentTarget) setPanel(null);
        } },
        h(
          "div",
          { className: "cw-dialog-body" },
          h("header", null, h("h2", { id: titleId }, panel === "invite" ? "Invite people" : `Round ${round?.round_number} questions`), button("\xD7", () => setPanel(null), { "aria-label": "Close dialog", className: "cw-close" })),
          panel === "invite" ? h(
            R.Fragment,
            null,
            h("p", { className: "cw-dialog-intro" }, "Share one link. Each person joins the consultation and responds in their own space."),
            !p.form.allow_join ? h("p", { role: "status", className: "cw-notice" }, "Joining is currently closed. Review access settings before inviting new participants.") : null,
            h("label", { className: "cw-link-label" }, "Invitation link", h("input", { value: joinUrl, readOnly: true, onFocus: (e) => e.target.select() })),
            h("div", { className: "cw-invite-actions" }, button(copyState === "Link copied" ? "Copied \u2713" : "Copy invite link", () => {
              void copy();
            }, { className: "cw-primary" }), h("a", { href: joinUrl, target: "_blank", rel: "noreferrer" }, "Preview join page \u2197")),
            h("p", { className: "cw-copy-status", role: "status" }, copyState),
            h("div", { className: "cw-invite-note" }, h("strong", null, "One panel, every round"), h("p", null, "Participants use this link again when the next round opens. Existing sign-in and consent requirements still apply.")),
            h("a", { className: "cw-settings-link", href: `/admin/form/${p.form.id}` }, "Manage access and consultation settings \u2192")
          ) : h(
            R.Fragment,
            null,
            h("p", { className: "cw-dialog-intro" }, hint),
            outline.sharedScale ? h("details", { className: "cw-shared-scale" }, h("summary", null, "Rating scale used for every rated claim"), h("p", null, outline.sharedScale.join(" \xB7 "))) : null,
            h("ol", { className: "cw-questions cw-question-outline" }, ...outline.groups.map((group, i) => h(
              "li",
              { key: i },
              h("h3", null, group.title),
              h("div", { className: "cw-field-outline" }, ...group.fields.map((field, j) => h(
                "p",
                { key: j },
                field.options.length && /^your (response|position)$/i.test(field.label) ? "Rating" : /^explain your position$/i.test(field.label) ? "Written explanation" : field.label || "Written response",
                h("span", null, field.optional ? " \xB7 Optional" : " \xB7 Required"),
                !outline.sharedScale && field.options.length ? h("small", null, field.options.join(" \xB7 ")) : null
              )))
            )))
          )
        )
      )
    );
  };
}
export {
  createConsultationWorkspace,
  questionOutline
};
