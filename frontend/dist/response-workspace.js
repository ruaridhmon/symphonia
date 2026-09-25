// src/utils/responseReading.ts
var text = (v) => v == null ? "" : typeof v === "string" ? v : typeof v === "object" ? JSON.stringify(v, null, 2) : String(v);
function responseSections(questions, answers) {
  const result = [];
  const consumed = /* @__PURE__ */ new Set();
  questions.forEach((q, i) => {
    const config = typeof q === "string" ? {} : q;
    const key = Object.hasOwn(answers, `q${i + 1}`) ? `q${i + 1}` : String(config.questionId || "");
    if (!Object.hasOwn(answers, key) || consumed.has(key)) return;
    consumed.add(key);
    const raw = answers[key];
    const object = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : null;
    const label = typeof q === "string" ? q : String(q.label || q.text || `Question ${i + 1}`);
    const group = String(config.sectionTitle || "");
    const comment = /comment|clarification|justify|what led|explain your position/i.test(label);
    const previous = result[result.length - 1];
    const useGroup = Array.isArray(config.options) || comment || /^(Your response|Your position)$/i.test(label);
    const title = (useGroup && group ? group : label).replace(/^Claim\s+\d+:\s*/i, "");
    const section = comment && group && previous?.title === title ? previous : { title, blocks: [] };
    if (section !== previous) result.push(section);
    const position = object ? text(object.position ?? object.value ?? object.selectedOptions) : text(raw);
    const isRating = Array.isArray(config.options) && ["single_select", "likert"].includes(String(config.inputType));
    if (isRating && position) section.rating = position;
    else section.blocks.push({ label: comment ? "Reasoning" : "", text: position || "No answer provided." });
    if (object) {
      const labels = { evidence: "Evidence", counterarguments: "Reservations", confidence: "Confidence", confidenceJustification: "Confidence explained" };
      for (const [k, v] of Object.entries(object)) {
        if (k === "confidence" && config.requireConfidence === false) continue;
        if (["position", "value", "selectedOptions"].includes(k) || v == null || v === "" || Array.isArray(v) && v.length === 0 || typeof v === "object" && Object.keys(v).length === 0) continue;
        section.blocks.push({ label: labels[k] || k.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, (c) => c.toUpperCase()), text: k === "confidence" && typeof v === "number" ? `${v}/10` : text(v) });
      }
    }
  });
  for (const [key, value] of Object.entries(answers)) if (!consumed.has(key)) result.push({ title: `Additional response \xB7 ${key}`, blocks: [{ label: "", text: text(value) }] });
  return result;
}

// src/utils/responseWorkspace.ts
function createResponseWorkspace(R, Editor, remove) {
  const h = R.createElement;
  const label = (response, index) => (response.email || `Anonymous response ${index + 1}`).replace(/^Guest:\s*/, "").replace(/\s*\[[A-Za-z0-9_-]{8}\]$/, "");
  const timestamp = (value) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "" : date.toLocaleString(void 0, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  };
  return function ResponseWorkspace(p) {
    const [roundId, setRoundId] = R.useState(() => p.initialRoundId ?? p.rounds.find((r) => r.is_active)?.id ?? p.structuredRounds.at(-1)?.id ?? "all");
    const [query, setQuery] = R.useState("");
    const [active, setActive] = R.useState(null);
    const [managing, setManaging] = R.useState(false);
    const [selected, setSelected] = R.useState(/* @__PURE__ */ new Set());
    const [busy, setBusy] = R.useState(false);
    const [error, setError] = R.useState("");
    const container = R.useRef(null);
    const lastOpened = R.useRef(null);
    R.useEffect(() => {
      if (active !== null) {
        lastOpened.current = active;
        const reader = container.current?.querySelector(".rw-reader");
        reader?.querySelector("h3")?.focus({ preventScroll: true });
        reader?.scrollIntoView?.({ block: "start" });
      } else if (lastOpened.current !== null) {
        const button2 = container.current?.querySelector(`[data-response-id="${lastOpened.current}"]`);
        button2?.focus({ preventScroll: true });
        button2?.scrollIntoView?.({ block: "nearest" });
      }
    }, [active]);
    const rows = R.useMemo(() => p.structuredRounds.flatMap((round) => {
      const embedded = round.questions;
      const questions = (embedded?.length ? embedded : null) || p.rounds.find((r) => r.id === round.id)?.questions || p.formQuestions;
      return round.responses.map((response, index2) => {
        const sections = responseSections(questions, response.answers);
        const name = label(response, index2);
        return { response, round, questions, name, sections, search: JSON.stringify([name, sections]).toLowerCase() };
      });
    }), [p.structuredRounds, p.rounds, p.formQuestions]);
    const filtered = rows.filter((row) => (roundId === "all" || row.round.id === roundId) && row.search.includes(query.trim().toLowerCase()));
    const activeIndex = filtered.findIndex((row) => row.response.id === active);
    const index = Math.max(0, activeIndex);
    const current = filtered[index];
    R.useEffect(() => {
      if (active !== null && activeIndex < 0) setActive(null);
    }, [active, activeIndex]);
    R.useEffect(() => {
      if (p.initialRoundId !== void 0) {
        setRoundId(p.initialRoundId);
        setActive(null);
      }
    }, [p.initialRoundId]);
    R.useEffect(() => {
      setSelected((previous) => {
        const next = new Set([...previous].filter((id) => rows.some((r) => r.response.id === id)));
        return next.size === previous.size ? previous : next;
      });
    }, [rows]);
    const allowLeave = () => !container.current?.querySelector("textarea") || window.confirm("Discard unsaved response edits?");
    const open = (id) => {
      if (allowLeave()) setActive(id);
    };
    const toggle = (id) => setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
    const canManage = !!remove && !!p.onResponseDeleted;
    const selectedRows = rows.filter((row) => selected.has(row.response.id));
    const deleteSelected = async () => {
      if (!remove || !p.onResponseDeleted || !selectedRows.length || busy) return;
      if (!window.confirm(`Delete ${selectedRows.length} selected response${selectedRows.length === 1 ? "" : "s"}? This removes them from summaries and exports.`)) return;
      setBusy(true);
      setError("");
      try {
        for (const row of selectedRows) {
          await remove(row.response.id);
          p.onResponseDeleted(row.round.id, row.response.id);
          setSelected((prev) => {
            const next = new Set(prev);
            next.delete(row.response.id);
            return next;
          });
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not delete the selected responses.");
      } finally {
        setBusy(false);
      }
    };
    const button = (text2, onClick, props = {}) => h("button", { type: "button", onClick, ...props }, text2);
    const go = (id) => {
      if (allowLeave()) setActive(id);
    };
    return h(
      "section",
      { className: `response-workspace rw-inbox ${active !== null ? "rw-has-selection" : ""}`, ref: container, "aria-label": "Expert responses" },
      h("header", { className: "rw-heading" }, h("div", null, h("h2", null, "The panel"), h("p", null, "Each perspective, in their own words.")), canManage ? button(managing ? "Done" : "Manage", () => {
        if (allowLeave()) {
          setManaging(!managing);
          setSelected(/* @__PURE__ */ new Set());
        }
      }, { disabled: busy, "aria-pressed": managing }) : null),
      h("div", { className: "rw-toolbar" }, h("label", null, h("span", { className: "rw-label" }, "Search responses"), h("input", { type: "search", value: query, placeholder: "Search\u2026", onChange: (e) => {
        if (allowLeave()) setQuery(e.target.value);
      } })), h("label", null, h("span", { className: "rw-label" }, "Round"), h("select", { value: roundId, onChange: (e) => {
        if (allowLeave()) {
          setRoundId(e.target.value === "all" ? "all" : Number(e.target.value));
          setActive(null);
        }
      } }, h("option", { value: "all" }, "All rounds"), ...p.structuredRounds.map((r) => h("option", { key: r.id, value: r.id }, `Round ${r.round_number}`))))),
      h("p", { className: "rw-result-count", "aria-live": "polite" }, `${filtered.length} response${filtered.length === 1 ? "" : "s"}${query ? " found" : ""}`),
      managing ? h("div", { className: "rw-management" }, button("Select visible", () => setSelected(new Set(filtered.map((r) => r.response.id))), { disabled: busy }), button("Clear selection", () => setSelected(/* @__PURE__ */ new Set()), { disabled: busy || !selected.size }), h("span", null, `${selectedRows.length} selected`), button(busy ? "Deleting\u2026" : "Delete selected", deleteSelected, { disabled: busy || !selectedRows.length, className: "rw-delete" })) : null,
      error ? h("p", { role: "alert", className: "rw-error" }, error) : null,
      h(
        "div",
        { className: "rw-inbox-layout" },
        h("div", { className: "rw-list", "aria-label": "Participant responses" }, ...filtered.map((row) => {
          const excerpt = row.sections.flatMap((s) => s.blocks.map((b) => b.text)).find(Boolean) || row.sections.map((s) => s.rating).filter(Boolean).join(" \xB7 ") || "No answer text recorded.";
          const initials = row.name.split(/[\s@._-]+/).filter(Boolean).slice(0, 2).map((x) => x[0]).join("").toUpperCase();
          return h(
            "div",
            { className: "rw-list-row", key: row.response.id },
            managing ? h("input", { type: "checkbox", "aria-label": `Select ${row.name}, round ${row.round.round_number}`, checked: selected.has(row.response.id), disabled: busy, onChange: () => toggle(row.response.id) }) : null,
            h(
              "button",
              { type: "button", className: "rw-open", "aria-label": `Read response from ${row.name}, round ${row.round.round_number}`, "data-response-id": row.response.id, "aria-pressed": current?.response.id === row.response.id, "aria-controls": "panel-response-reader", onClick: () => open(row.response.id) },
              h("span", { className: "rw-avatar", "aria-hidden": true }, initials),
              h("div", { className: "rw-row-main" }, h("strong", { title: row.response.email || void 0 }, row.name), h("span", { className: "rw-preview" }, excerpt), roundId === "all" ? h("small", null, `Round ${row.round.round_number}`) : null),
              h("span", { "aria-hidden": true, className: "rw-arrow" }, "\u203A")
            )
          );
        })),
        current ? h(
          "article",
          { id: "panel-response-reader", className: "rw-reader" },
          h("nav", { className: "rw-reader-nav", "aria-label": "Response navigation" }, button("\u2190 All responses", () => go(null), { className: "rw-back" }), h("span", { className: "rw-position" }, `${index + 1} of ${filtered.length}`), h("div", null, button("\u2190", () => go(filtered[index - 1]?.response.id), { disabled: index === 0, "aria-label": "Previous response" }), button("\u2192", () => go(filtered[index + 1]?.response.id), { disabled: index === filtered.length - 1, "aria-label": "Next response" }))),
          h("header", { className: "rw-reader-heading" }, h("p", { className: "rw-reader-eyebrow" }, `Round ${current.round.round_number} \xB7 Original response`), h("h3", { className: "rw-reader-title", tabIndex: -1 }, current.name), h("time", { dateTime: current.response.timestamp }, timestamp(current.response.timestamp))),
          h(Editor, { key: current.response.id, response: current.response, questions: current.questions, roundNumber: current.round.round_number, token: p.token, onUpdated: (response) => p.onResponseUpdated(current.round.id, response) })
        ) : h("p", { className: "rw-empty" }, rows.length ? "No responses match these filters." : "Invite your panel to begin. Their responses will appear here as they submit.")
      )
    );
  };
}
export {
  createResponseWorkspace
};
