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
function renderReasoningFlow(root, graph) {
  clearReasoningFlow(root);
  const shared = graph.claims?.length ? [{ id: "shared-claims", title: "Shared claim map", response_number: 0, nodes: graph.claims.map((c) => ({ id: c.id, text: c.text, kind: c.origin === "inferred" ? "assumption" : "premise", question: c.question, sources: c.sources })), edges: graph.claim_edges || [] }] : [];
  const flows = [...shared, ...graph.flows];
  const remembered = root.dataset.reasoningFlow;
  const section = el("section", "", "rf-workspace");
  section.setAttribute("aria-label", "First-round reasoning");
  const head = el("header", "", "rf-header");
  head.append(el("h2", "Claims & reasoning"), el("p", "Review the shared claims and their logical connections, then inspect each original contribution. Dashed cards mark inferred steps."));
  section.append(head);
  const counts = el("div", `${graph.mapped_response_count} of ${graph.response_count} responses represented \xB7 ${graph.flows.length} source argument${graph.flows.length === 1 ? "" : "s"}${graph.claims?.length ? " \xB7 " + graph.claims.length + " shared claims" : ""}`, "rf-coverage");
  section.append(counts);
  if (graph.rejected_flow_count) counts.append(el("span", ` \xB7 ${graph.rejected_flow_count} map${graph.rejected_flow_count === 1 ? " was" : "s were"} withheld because source or structure checks failed.`));
  section.append(el("p", (graph.status === "provided_interpretation" ? "Provided interpretation" : graph.status === "authored_example" ? "Illustrative interpretation" : "AI interpretation") + " \xB7 source quotes are matched to saved responses; meaning and connections still need review. Assumptions are unconfirmed.", "rf-provenance"));
  if (!flows.length) {
    section.append(el("p", "No source-linked reasoning maps were saved for this draft. Open Claims & full summary to review the claim list."));
    root.append(section);
    return;
  }
  const nav = el("nav", "", "rf-tabs");
  nav.setAttribute("aria-label", "Expert reasoning flows");
  section.append(nav);
  const legend = el("div", "", "rf-legend");
  for (const [cls, label] of [["premise", "Stated premise"], ["recommendation", "Stated recommendation"], ["assumption", "Inferred assumption"]]) legend.append(el("span", label, "rf-key rf-" + cls));
  section.append(legend);
  const canvas = el("div", "", "rf-canvas");
  const detail = el("section", "", "rf-detail");
  detail.setAttribute("aria-live", "polite");
  section.append(canvas, detail);
  const caption = el("p", "Arrows describe a proposed logical connection, not a sequence in time or proof of causation. Separate expert contributions remain separate. These are selected arguments, not a guarantee that every statement is represented.", "rf-caption");
  section.append(caption);
  const show = (index) => {
    const flow = flows[index];
    root.dataset.reasoningFlow = flow.id;
    canvas.replaceChildren();
    detail.replaceChildren();
    nav.querySelectorAll("button").forEach((b, i) => b.setAttribute("aria-pressed", String(i === index)));
    const title = el("div", "", "rf-flow-title");
    title.append(el("h3", flow.title), el("span", flow.response_number ? `Response ${flow.response_number}` : "Explicit and inferred claims"));
    canvas.append(title);
    const diagram = el("div", "", "rf-diagram");
    canvas.append(diagram);
    const labels = new Map(flow.nodes.map((n, i) => [n.id, String.fromCharCode(65 + i)]));
    const select = (n) => {
      root.dataset.reasoningNode = n.id;
      diagram.querySelectorAll("[data-rf-node]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.rfNode === n.id)));
      detail.replaceChildren();
      detail.classList.toggle("rf-inferred-detail", n.kind === "assumption");
      detail.append(el("div", n.kind === "assumption" ? "INFERRED \xB7 UNCONFIRMED" : flow.response_number ? `SOURCE \xB7 RESPONSE ${flow.response_number}` : "EXPLICIT \xB7 SOURCE-LINKED CLAIM", "rf-eyebrow"), el("h4", n.kind === "assumption" ? "A step to check with the expert" : "The expert\u2019s words"));
      if (n.kind === "assumption") detail.append(el("p", n.text), el("blockquote", n.question || "Ask the expert to clarify this connection."), el("p", "This bridge is an interpretation, not a direct expert statement. It can be reviewed independently; ratings never change its inferred origin.", "rf-small"));
      else if (n.sources) {
        for (const source of n.sources) {
          const block = el("section");
          block.append(el("h4", `Response ${source.response_number} \xB7 ${source.stance} (interpreted)`), el("blockquote", source.quote));
          const context = document.createElement("details");
          context.append(el("summary", "Original reasoning, evidence and confidence"), el("p", source.source_text));
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
        list.append(el("span", "Connections \xB7 interpretation", "rf-small"));
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
    for (let level = 0; level <= max; level++) {
      const column = el("div", "", "rf-column");
      diagram.append(column);
      for (const n of flow.nodes.filter((n2) => levels.get(n2.id) === level)) {
        const card = el("div", "", "rf-step");
        const b = document.createElement("button");
        b.type = "button";
        b.className = "rf-node rf-" + n.kind;
        b.dataset.rfNode = n.id;
        b.setAttribute("aria-pressed", "false");
        b.append(el("span", `${labels.get(n.id)} / ${n.kind === "assumption" ? "INFERRED ASSUMPTION" : !flow.response_number ? "EXPLICIT CLAIM" : n.kind === "premise" ? "STATED PREMISE" : "STATED RECOMMENDATION"}`, "rf-eyebrow"), el("strong", n.text));
        if (n.condition) b.append(el("span", n.condition, "rf-condition"));
        b.append(el("span", n.kind === "assumption" ? "Not stated \xB7 needs checking" : "Inspect source \u2197", "rf-node-foot"));
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
      tip.setAttribute("fill", "#baa9cb");
      marker.append(tip);
      defs.append(marker);
      svg.append(defs);
      const vertical = getComputedStyle(diagram).gridTemplateColumns.split(" ").length === 1;
      for (const edge of flow.edges) {
        const cards = Array.from(diagram.querySelectorAll("[data-rf-node]"));
        const from = cards.find((c) => c.dataset.rfNode === edge.from), to = cards.find((c) => c.dataset.rfNode === edge.to);
        if (!from || !to) continue;
        const a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
        const x1 = (vertical ? a.left + a.width / 2 : a.right) - box.left, y1 = (vertical ? a.bottom : a.top + a.height / 2) - box.top;
        const x2 = (vertical ? b.left + b.width / 2 : b.left) - box.left, y2 = (vertical ? b.top : b.top + b.height / 2) - box.top;
        const path = document.createElementNS(svg.namespaceURI, "path");
        path.setAttribute("d", vertical ? `M ${x1} ${y1} C ${x1} ${(y1 + y2) / 2}, ${x2} ${(y1 + y2) / 2}, ${x2} ${y2}` : `M ${x1} ${y1} C ${(x1 + x2) / 2} ${y1}, ${(x1 + x2) / 2} ${y2}, ${x2} ${y2}`);
        path.setAttribute("marker-end", `url(#${markerId})`);
        path.setAttribute("fill", "none");
        path.setAttribute("stroke", edge.relation === "challenges" ? "#bd7883" : "#baa9cb");
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
    select(flow.nodes.find((n) => n.id === root.dataset.reasoningNode) || flow.nodes[0]);
  };
  flows.forEach((flow, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.append(el("span", flow.response_number ? `Response ${flow.response_number}` : "All contributions"), el("strong", flow.title));
    b.onclick = () => {
      delete root.dataset.reasoningNode;
      show(i);
    };
    nav.append(b);
  });
  root.append(section);
  show(Math.max(0, flows.findIndex((f) => f.id === remembered)));
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
    const opening = p.rounds.find((r) => r.round_number === 1);
    const graph = opening?.synthesis_json?.narrative === opening?.synthesis ? opening?.synthesis_json?.reasoning_graph : null;
    R.useEffect(() => {
      const root = mapRoot.current;
      if (root && graph && mapView) {
        root.replaceChildren();
        renderReasoningFlow(root, graph);
      }
      return () => {
        if (root) clearReasoningFlow(root);
      };
    }, [graph, mapView]);
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
