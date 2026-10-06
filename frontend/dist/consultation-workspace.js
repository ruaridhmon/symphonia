// src/utils/reasoningFlow.ts
var el = (tag, text = "", cls = "") => {
  const e = document.createElement(tag);
  e.textContent = text;
  e.className = cls;
  return e;
};
var wireId = 0;
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
  const detail = el("section", "", "rf-detail");
  detail.setAttribute("aria-live", "polite");
  section.append(canvas, detail);
  const show = (index) => {
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
    const select = (n, open = true) => {
      root.dataset.reasoningNode = n.id;
      diagram.querySelectorAll("[data-rf-node]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.rfNode === n.id)));
      detail.replaceChildren();
      detail.classList.toggle("rf-inferred-detail", n.kind === "assumption");
      detail.hidden = !open;
      const top = el("div", "", "rf-detail-heading");
      top.append(el("h4", `Claim ${labels.get(n.id)}`));
      const close = document.createElement("button");
      close.type = "button";
      close.textContent = "Close";
      close.onclick = () => {
        detail.hidden = true;
        diagram.querySelector(`[data-rf-node="${n.id}"]`)?.focus();
      };
      top.append(close);
      detail.append(top);
      if (n.kind === "assumption") detail.append(el("p", n.text), el("blockquote", n.question || "Ask the expert to clarify this connection."), el("p", "Inferred \xB7 unconfirmed", "rf-small"));
      else if (n.sources) {
        for (const source of n.sources) {
          const block = el("section");
          block.append(el("h4", `Response ${source.response_number}`), el("blockquote", source.quote));
          const context = document.createElement("details");
          context.append(el("summary", "Full response"), el("p", source.source_text));
          if (source.source_answers) {
            const raw = el("pre", JSON.stringify(source.source_answers, null, 2), "rf-original-answer");
            context.append(raw);
          }
          block.append(context);
          detail.append(block);
        }
      } else {
        detail.append(el("blockquote", n.quote || ""));
        if (n.condition) detail.append(el("p", "Qualification: " + n.condition, "rf-qualification"));
        if (n.source_text && n.source_text !== n.quote) {
          const context = document.createElement("details");
          context.append(el("summary", "Read the source in context"), el("p", n.source_text));
          detail.append(context);
        }
      }
      const links = flow.edges.filter((e) => e.from === n.id || e.to === n.id);
      if (links.length) {
        const list = el("div", "", "rf-connections");
        for (const edge of links) {
          const other = flow.nodes.find((t) => t.id === (edge.from === n.id ? edge.to : edge.from));
          if (!other) continue;
          const b = document.createElement("button");
          b.type = "button";
          b.textContent = `${labels.get(edge.from)} ${edge.relation} ${labels.get(edge.to)} \xB7 ${other.text}`;
          b.onclick = () => select(other);
          list.append(b);
        }
        detail.append(list);
      }
    };
    const levels = /* @__PURE__ */ new Map();
    for (const n of flow.nodes) {
      const incoming = flow.edges.filter((e) => e.to === n.id);
      levels.set(n.id, incoming.length ? Math.max(...incoming.map((e) => (levels.get(e.from) ?? 0) + 1)) : 0);
    }
    const max = Math.max(...levels.values());
    diagram.style.setProperty("--rf-columns", String(max + 1));
    diagram.style.setProperty("--rf-bus-space", `${24 + 12 * flow.edges.filter((e) => (levels.get(e.to) || 0) - (levels.get(e.from) || 0) > 1).length}px`);
    for (let level = 0; level <= max; level++) {
      const column = el("div", "", "rf-column");
      column.append(el("h4", level === 0 ? "Starting points" : `Step ${level + 1}`, "rf-stage"));
      diagram.append(column);
      for (const n of flow.nodes.filter((n2) => levels.get(n2.id) === level)) {
        const card = el("div", "", "rf-step");
        const b = document.createElement("button");
        b.type = "button";
        b.className = "rf-node rf-" + n.kind;
        b.dataset.rfNode = n.id;
        b.setAttribute("aria-pressed", "false");
        const identity = el("div", "", "rf-node-identity");
        identity.append(el("span", labels.get(n.id), "rf-number"));
        if (n.kind === "assumption") identity.append(el("span", "Inferred", "rf-origin"));
        b.append(identity, el("strong", n.text));
        if (n.condition) b.append(el("span", n.condition, "rf-condition"));
        b.onclick = () => select(n);
        card.append(b);
        const outgoing = flow.edges.filter((e) => e.from === n.id);
        if (outgoing.length) {
          const links = el("div", "", "rf-arrows");
          for (const edge of outgoing) {
            const link = document.createElement("button");
            link.type = "button";
            link.textContent = `${edge.relation} \u2192 ${labels.get(edge.to)}`;
            link.setAttribute("aria-label", `${labels.get(n.id)} ${edge.relation} ${labels.get(edge.to)}. Inspect connected step`);
            link.onclick = () => {
              const target = flow.nodes.find((t) => t.id === edge.to);
              if (target) select(target);
            };
            links.append(link);
          }
          card.append(links);
        }
        column.append(card);
      }
    }
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.classList.add("rf-wires");
    svg.setAttribute("aria-hidden", "true");
    diagram.prepend(svg);
    const markerId = "rf-arrow-" + ++wireId;
    const draw = () => {
      const box = diagram.getBoundingClientRect();
      if (!box.width) return;
      svg.setAttribute("width", String(diagram.scrollWidth));
      svg.setAttribute("height", String(diagram.scrollHeight));
      svg.replaceChildren();
      const defs = document.createElementNS(svg.namespaceURI, "defs"), marker = document.createElementNS(svg.namespaceURI, "marker"), tip = document.createElementNS(svg.namespaceURI, "path");
      marker.setAttribute("id", markerId);
      marker.setAttribute("viewBox", "0 0 6 6");
      marker.setAttribute("refX", "6");
      marker.setAttribute("refY", "3");
      marker.setAttribute("markerWidth", "5");
      marker.setAttribute("markerHeight", "5");
      marker.setAttribute("orient", "auto");
      tip.setAttribute("d", "M 0 0 L 6 3 L 0 6");
      tip.setAttribute("fill", "#9ca3af");
      marker.append(tip);
      defs.append(marker);
      svg.append(defs);
      const vertical = getComputedStyle(diagram).gridTemplateColumns.split(" ").length === 1;
      let skipped = 0;
      for (const edge of flow.edges) {
        const cards = Array.from(diagram.querySelectorAll("[data-rf-node]"));
        const from = cards.find((c) => c.dataset.rfNode === edge.from), to = cards.find((c) => c.dataset.rfNode === edge.to);
        if (!from || !to) continue;
        const a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
        const outgoing = flow.edges.filter((e) => e.from === edge.from), incoming = flow.edges.filter((e) => e.to === edge.to);
        const x1 = (vertical ? a.left + a.width / 2 : a.right) - box.left, y1 = (vertical ? a.bottom : a.top + a.height * (outgoing.indexOf(edge) + 1) / (outgoing.length + 1)) - box.top;
        const x2 = (vertical ? b.left + b.width / 2 : b.left) - box.left, y2 = (vertical ? b.top : b.top + b.height * (incoming.indexOf(edge) + 1) / (incoming.length + 1)) - box.top;
        const path = document.createElementNS(svg.namespaceURI, "path");
        const skip = (levels.get(edge.to) || 0) - (levels.get(edge.from) || 0) > 1;
        if (skip && !vertical) {
          const lane = diagram.scrollHeight - 14 - skipped++ * 12, exit = x1 + 12, entry = x2 - 12;
          path.setAttribute("d", `M ${x1} ${y1} L ${exit} ${y1} L ${exit} ${lane} L ${entry} ${lane} L ${entry} ${y2} L ${x2} ${y2}`);
        } else path.setAttribute("d", vertical ? `M ${x1} ${y1} C ${x1} ${(y1 + y2) / 2}, ${x2} ${(y1 + y2) / 2}, ${x2} ${y2}` : `M ${x1} ${y1} C ${(x1 + x2) / 2} ${y1}, ${(x1 + x2) / 2} ${y2}, ${x2} ${y2}`);
        path.setAttribute("marker-end", `url(#${markerId})`);
        path.setAttribute("fill", "none");
        path.setAttribute("stroke", edge.relation === "challenges" ? "#b56a72" : "#9ca3af");
        path.setAttribute("stroke-width", "1.4");
        if (flow.nodes.some((n) => (n.id === edge.from || n.id === edge.to) && n.kind === "assumption")) path.setAttribute("stroke-dasharray", "4 4");
        svg.append(path);
      }
    };
    observers.get(root)?.disconnect();
    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(draw);
      observer.observe(diagram);
      observers.set(root, observer);
    }
    requestAnimationFrame(draw);
    select(flow.nodes.find((n) => n.id === (selectedNode || root.dataset.reasoningNode)) || flow.nodes[0], !!selectedNode);
  };
  flows.forEach((flow, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.append(el("span", flow.response_number ? `Response ${flow.response_number}` : "All contributions"), el("strong", flow.title));
    b.onclick = () => {
      selectedNode = void 0;
      delete root.dataset.reasoningNode;
      show(i);
    };
    nav.append(b);
  });
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
    const simulated = /^SIMULATED PANEL\s*[—–-]\s*/i.test(p.form.title);
    const displayTitle = p.form.title.replace(/^SIMULATED PANEL\s*[—–-]\s*/i, "");
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
              button("Invite people", () => openPanel("invite")),
              h("a", { href: `/admin/form/${p.form.id}` }, "Edit consultation"),
              button("View questions", () => openPanel("questions"), { className: "cw-mobile-questions", "aria-label": "Preview round questions", disabled: !round }),
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
          ordered.length <= 5 ? h("div", { className: "cw-round-tabs", "aria-label": "Rounds" }, ...ordered.map((r) => button(`Round ${r.round_number}`, () => {
            if (canLeave()) {
              setFinalView(false);
              setMapView(false);
              p.onRound(r);
            }
          }, { key: r.id, "aria-pressed": !finalView && !mapView && round?.id === r.id, title: r.is_active ? "Current round" : `View Round ${r.round_number}` }))) : h("label", { className: "cw-round-picker" }, h("span", { className: "cw-round-display", "aria-hidden": true }, `Round ${round?.round_number || "\u2014"} \u2304`), h("select", { "aria-label": "Round", value: round?.id || "", onChange: (event) => {
            const selected = ordered.find((r) => r.id === Number(event.target.value));
            if (selected && canLeave()) {
              setFinalView(false);
              setMapView(false);
              p.onRound(selected);
            }
          } }, ...ordered.map((r) => h("option", { key: r.id, value: r.id }, `Round ${r.round_number}${r.is_active ? " \xB7 Current" : ""}`)))),
          ordered.some((r) => r.round_number === 3) && FinalSynthesis ? button("Final synthesis", () => {
            if (canLeave()) {
              p.onView("synthesis");
              setMapView(false);
              setFinalView(true);
            }
          }, { "aria-pressed": finalView, className: "cw-final-tab", title: "Round 4 \xB7 final synthesis" }) : null,
          count !== void 0 && !finalView && !mapView ? h("span", null, `${count} response${count === 1 ? "" : "s"}`) : null,
          button("View questions", () => openPanel("questions"), { className: "cw-text-button", disabled: !round })
        )
      ),
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
