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
    const [expanded, setExpanded] = R.useState(/* @__PURE__ */ new Set());
    const [searching, setSearching] = R.useState(false);
    const [query, setQuery] = R.useState("");
    const [active, setActive] = R.useState(null);
    const [managing, setManaging] = R.useState(false);
    const [selected, setSelected] = R.useState(/* @__PURE__ */ new Set());
    const [busy, setBusy] = R.useState(false);
    const [error, setError] = R.useState("");
    const container = R.useRef(null);
    const rows = R.useMemo(() => p.structuredRounds.flatMap((round) => {
      const embedded = round.questions;
      const questions = (embedded?.length ? embedded : null) || p.rounds.find((r) => r.id === round.id)?.questions || p.formQuestions;
      return round.responses.map((response, index) => {
        const sections = responseSections(questions, response.answers);
        const name = label(response, index);
        return { response, round, questions, name, sections, search: JSON.stringify([name, sections]).toLowerCase() };
      });
    }), [p.structuredRounds, p.rounds, p.formQuestions]);
    const filtered = rows.filter((row) => (roundId === "all" || row.round.id === roundId) && row.search.includes(query.trim().toLowerCase()));
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
    const button = (text2, onClick, props = {}) => h("button", { type: "button", onClick, ...props }, props.children ?? text2);
    const badge = (rating) => rating ? h("span", { className: `rp-rating ${/^(strongly )?disagree$/i.test(rating) ? "rp-disagree" : /^(strongly )?agree$/i.test(rating) ? "rp-agree" : "rp-neutral"}` }, rating) : null;
    const blocks = (section) => section ? h("div", { className: "rp-answer" }, badge(section.rating), ...section.blocks.map((b, i) => h("div", { key: i }, b.label ? h("span", { className: "rp-block-label" }, b.label) : null, h("p", null, b.text)))) : h("span", { className: "rp-missing" }, "Not answered");
    const editor = (row) => active === row.response.id ? h("div", { className: "rp-edit" }, button("Close editor", () => {
      if (allowLeave()) setActive(null);
    }), h(Editor, { response: row.response, questions: row.questions, roundNumber: row.round.round_number, token: p.token, onUpdated: (response) => {
      p.onResponseUpdated(row.round.id, response);
      setActive(null);
    } })) : null;
    const visible = filtered;
    const titles = [...new Set(rows.filter((row) => roundId === "all" || row.round.id === roundId).flatMap((row) => row.sections.map((section) => section.title)))];
    const singleQuestion = titles.length === 1 ? titles[0] : null;
    return h(
      "section",
      { className: "response-workspace response-panel", "aria-label": "Expert responses", ref: container },
      h("h2", { className: "sr-only" }, "Panel responses"),
      h("div", { className: "rp-controls" }, h("span", { className: query || p.initialRoundId === void 0 ? "rp-count" : "rp-count sr-only", "aria-live": "polite" }, `${visible.length} response${visible.length === 1 ? "" : "s"}${query ? " found" : ""}`), searching || query ? h("label", { className: "rp-search" }, h("span", { className: "sr-only" }, "Search responses"), h("input", { type: "search", value: query, placeholder: "Search the panel\u2026", onChange: (e) => {
        if (allowLeave()) setQuery(e.target.value);
      } })) : button("Search", () => setSearching(true), { "aria-label": "Search responses", className: "rp-search-trigger" }), p.initialRoundId === void 0 ? h("label", null, h("span", { className: "sr-only" }, "Round"), h("select", { "aria-label": "Round", value: roundId, onChange: (e) => {
        if (allowLeave()) {
          setRoundId(e.target.value === "all" ? "all" : Number(e.target.value));
          setActive(null);
        }
      } }, h("option", { value: "all" }, "All rounds"), ...p.structuredRounds.map((r) => h("option", { key: r.id, value: r.id }, `Round ${r.round_number}`)))) : null, canManage ? button(managing ? "Done" : "\u2022\u2022\u2022", () => {
        if (allowLeave()) {
          setManaging(!managing);
          setSelected(/* @__PURE__ */ new Set());
          setActive(null);
        }
      }, { disabled: busy, "aria-pressed": managing, "aria-label": managing ? "Done managing responses" : "Manage responses", title: "Manage responses" }) : null),
      managing ? h("div", { className: "rw-management" }, button("Select visible", () => setSelected(new Set(visible.map((r) => r.response.id))), { disabled: busy }), button("Clear selection", () => setSelected(/* @__PURE__ */ new Set()), { disabled: busy || !selected.size }), h("span", null, `${selectedRows.length} selected`), button(busy ? "Deleting\u2026" : "Delete selected", deleteSelected, { disabled: busy || !selectedRows.length, className: "rw-delete" }), h("div", null, ...visible.map((row) => h("label", { key: row.response.id }, h("input", { type: "checkbox", "aria-label": `Select ${row.name}, round ${row.round.round_number}`, checked: selected.has(row.response.id), disabled: busy, onChange: () => toggle(row.response.id) }), row.name, ` \xB7 R${row.round.round_number}`)))) : null,
      error ? h("p", { role: "alert", className: "rw-error" }, error) : null,
      singleQuestion ? h("h3", { className: "rp-shared-question" }, singleQuestion) : null,
      h("div", { className: "rp-answer-list" }, ...visible.map((row) => {
        const earlier = row.response.email ? rows.filter((previous) => previous.response.email === row.response.email && previous.round.round_number < row.round.round_number).sort((a, b) => b.round.round_number - a.round.round_number) : [];
        const history = earlier.filter((previous) => previous.sections.some((section) => row.sections.some((current) => current.title === section.title)) || previous.round.round_number === 1);
        const isExpanded = expanded.has(row.response.id);
        const heading = h(R.Fragment, null, h("strong", null, row.name), roundId === "all" ? h("span", { className: "rp-round-label" }, `Round ${row.round.round_number}`) : null, history.length ? h("span", { className: "rp-history-cue" }, isExpanded ? "Hide history" : "Earlier answers") : null);
        return h(
          "article",
          { key: row.response.id, className: "rp-person-answer rp-unified-answer" },
          history.length ? button("", () => setExpanded((previous) => {
            const next = new Set(previous);
            isExpanded ? next.delete(row.response.id) : next.add(row.response.id);
            return next;
          }), { className: "rp-answer-heading", "aria-expanded": isExpanded, "aria-controls": `answer-history-${row.response.id}`, children: heading }) : h("header", { className: "rp-answer-heading" }, heading),
          h("div", { className: "rp-person-answers" }, ...row.sections.map((section, index) => {
            const previous = earlier.flatMap((past) => past.sections.filter((pastSection) => pastSection.title === section.title)).find((pastSection) => pastSection.rating);
            const changed = !!previous?.rating && !!section.rating && previous.rating !== section.rating;
            return h(
              "section",
              { key: index, className: "rp-question-answer" },
              h("div", { className: "rp-question-heading" }, singleQuestion ? null : h("h3", null, section.title), changed ? h("span", { className: "rp-rating-change" }, `${previous.rating} \u2192 ${section.rating}`) : badge(section.rating)),
              h("div", { className: "rp-answer" }, ...section.blocks.map((block, i) => h("div", { key: i }, block.label && block.label !== "Reasoning" ? h("span", { className: "rp-block-label" }, block.label) : null, h("p", null, block.text))))
            );
          })),
          isExpanded ? h("div", { className: "rp-inline-history", id: `answer-history-${row.response.id}` }, ...history.slice().reverse().map((previous) => {
            const exact = previous.sections.filter((section) => row.sections.some((current) => current.title === section.title));
            const context = !exact.length;
            return h("section", { key: previous.response.id }, h("h4", null, `Round ${previous.round.round_number}${context ? " \xB7 Opening context" : ""}`), ...(context ? previous.sections : exact).map((past, index) => h("div", { key: index }, h("p", { className: "rp-history-question" }, past.title), blocks(past))));
          })) : null,
          managing ? button("Edit response", () => open(row.response.id)) : null,
          editor(row)
        );
      })),
      !visible.length ? h("p", { className: "rw-empty" }, rows.length ? "No responses match these filters." : "Invite your panel to begin. Their responses will appear here as they submit.") : null
    );
  };
}
export {
  createResponseWorkspace
};
