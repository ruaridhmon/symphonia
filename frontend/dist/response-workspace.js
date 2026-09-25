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
    const [mode, setMode] = R.useState("question");
    const [question, setQuestion] = R.useState("");
    const [expanded, setExpanded] = R.useState(/* @__PURE__ */ new Set());
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
    const button = (text2, onClick, props = {}) => h("button", { type: "button", onClick, ...props }, text2);
    const titles = [...new Set((mode === "changes" ? rows : filtered).flatMap((row) => row.sections.map((s) => s.title)))];
    const chosen = titles.includes(question) ? question : titles[0];
    const badge = (rating) => rating ? h("span", { className: `rp-rating ${/^(strongly )?disagree$/i.test(rating) ? "rp-disagree" : /^(strongly )?agree$/i.test(rating) ? "rp-agree" : "rp-neutral"}` }, rating) : null;
    const blocks = (section) => section ? h("div", { className: "rp-answer" }, badge(section.rating), ...section.blocks.map((b, i) => h("div", { key: i }, b.label ? h("span", { className: "rp-block-label" }, b.label) : null, h("p", null, b.text)))) : h("span", { className: "rp-missing" }, "Not answered");
    const editor = (row) => active === row.response.id ? h("div", { className: "rp-edit" }, button("Close editor", () => {
      if (allowLeave()) setActive(null);
    }), h(Editor, { response: row.response, questions: row.questions, roundNumber: row.round.round_number, token: p.token, onUpdated: (response) => {
      p.onResponseUpdated(row.round.id, response);
      setActive(null);
    } })) : null;
    const identity = (row) => h("header", { className: "rp-person-heading" }, h("strong", { title: row.response.email || void 0 }, row.name), h("span", null, `Round ${row.round.round_number}`), managing ? button("Edit response", () => open(row.response.id)) : null);
    const changeRows = rows.filter((row) => row.search.includes(query.trim().toLowerCase()) && row.sections.some((s) => s.title === chosen));
    const identities = [...new Set(changeRows.map((row) => row.response.email || `anonymous-${row.response.id}`))];
    return h(
      "section",
      { className: "response-workspace response-panel", "aria-label": "Expert responses", ref: container },
      h("h2", { className: "sr-only" }, "Panel responses"),
      h("div", { className: "rp-controls" }, h("nav", { "aria-label": "Response layout" }, ...[["question", "By question"], ["person", "By person"], ["changes", "Across rounds"]].map(([value, text2]) => button(text2, () => {
        if (allowLeave()) {
          setQuestion(chosen);
          setMode(value);
          setActive(null);
        }
      }, { key: value, "aria-pressed": mode === value }))), h("label", { className: "rp-search" }, h("span", { className: "sr-only" }, "Search responses"), h("input", { type: "search", value: query, placeholder: "Search the panel\u2026", onChange: (e) => {
        if (allowLeave()) setQuery(e.target.value);
      } })), mode !== "changes" ? h("label", null, h("span", { className: "sr-only" }, "Round"), h("select", { "aria-label": "Round", value: roundId, onChange: (e) => {
        if (allowLeave()) {
          setRoundId(e.target.value === "all" ? "all" : Number(e.target.value));
          setActive(null);
        }
      } }, h("option", { value: "all" }, "All rounds"), ...p.structuredRounds.map((r) => h("option", { key: r.id, value: r.id }, `Round ${r.round_number}`)))) : null, canManage ? button(managing ? "Done" : "Manage", () => {
        if (allowLeave()) {
          setManaging(!managing);
          setSelected(/* @__PURE__ */ new Set());
          setActive(null);
        }
      }, { disabled: busy, "aria-pressed": managing }) : null),
      managing ? h("div", { className: "rw-management" }, button("Select visible", () => setSelected(new Set(filtered.map((r) => r.response.id))), { disabled: busy }), button("Clear selection", () => setSelected(/* @__PURE__ */ new Set()), { disabled: busy || !selected.size }), h("span", null, `${selectedRows.length} selected`), button(busy ? "Deleting\u2026" : "Delete selected", deleteSelected, { disabled: busy || !selectedRows.length, className: "rw-delete" }), h("div", null, ...filtered.map((row) => h("label", { key: row.response.id }, h("input", { type: "checkbox", "aria-label": `Select ${row.name}, round ${row.round.round_number}`, checked: selected.has(row.response.id), disabled: busy, onChange: () => toggle(row.response.id) }), row.name, ` \xB7 R${row.round.round_number}`)))) : null,
      error ? h("p", { role: "alert", className: "rw-error" }, error) : null,
      mode !== "person" && titles.length ? h("div", { className: "rp-question-bar" }, h("label", null, h("span", null, "Question / claim"), h("select", { "aria-label": "Question or claim", value: chosen, onChange: (e) => {
        if (allowLeave()) {
          setQuestion(e.target.value);
          setActive(null);
        }
      } }, ...titles.map((title) => h("option", { key: title, value: title }, title)))), h("h3", null, chosen)) : null,
      h("p", { className: "rp-count", "aria-live": "polite" }, mode === "changes" ? `${identities.length} participants \xB7 compare identical questions across rounds` : `${filtered.length} response${filtered.length === 1 ? "" : "s"}${query ? " found" : ""}`),
      mode === "question" ? h("div", { className: "rp-answer-list" }, ...filtered.filter((row) => row.sections.some((s) => s.title === chosen)).map((row) => h("article", { key: row.response.id, className: "rp-person-answer" }, identity(row), blocks(row.sections.find((s) => s.title === chosen)), editor(row)))) : null,
      mode === "person" ? h("div", { className: "rp-person-list" }, ...filtered.map((row) => h("article", { key: row.response.id, className: "rp-person-answer" }, h("button", { type: "button", className: "rp-expand", "aria-expanded": expanded.has(row.response.id), onClick: () => {
        if (allowLeave()) setExpanded((previous) => {
          const next = new Set(previous);
          next.has(row.response.id) ? next.delete(row.response.id) : next.add(row.response.id);
          return next;
        });
      } }, h("strong", null, row.name), h("span", null, `Round ${row.round.round_number}`), h("span", { "aria-hidden": true }, expanded.has(row.response.id) ? "\u2212" : "+")), expanded.has(row.response.id) ? h("div", null, ...row.sections.map((section, i) => h("section", { key: i, className: "rp-person-section" }, h("h4", null, section.title), blocks(section))), managing ? button("Edit response", () => open(row.response.id)) : null, editor(row)) : h("p", { className: "rp-person-preview" }, row.sections[0]?.blocks[0]?.text || row.sections[0]?.rating || "No answer text recorded.")))) : null,
      mode === "changes" ? h("div", { className: "rp-evolution" }, ...identities.map((identityKey) => {
        const history = rows.filter((row) => (row.response.email || `anonymous-${row.response.id}`) === identityKey && row.sections.some((s) => s.title === chosen)).sort((a, b) => a.round.round_number - b.round.round_number);
        const rated = history.map((row) => row.sections.find((s) => s.title === chosen)?.rating).filter(Boolean);
        const movement = rated.length > 1 ? rated.every((value) => value === rated[0]) ? "Position unchanged" : `${rated[0]} \u2192 ${rated.at(-1)}` : "One round recorded";
        return h("article", { key: identityKey, className: "rp-person-answer" }, h("header", { className: "rp-person-heading" }, h("h4", null, history[0].name), h("span", null, movement)), h("div", { className: "rp-timeline" }, ...history.map((row) => h("section", { key: row.response.id }, h("p", { className: "rp-round-label" }, `Round ${row.round.round_number}`), blocks(row.sections.find((s) => s.title === chosen))))));
      })) : null,
      (mode === "changes" ? !identities.length : !filtered.length) ? h("p", { className: "rw-empty" }, rows.length ? "No responses match these filters." : "Invite your panel to begin. Their responses will appear here as they submit.") : null
    );
  };
}
export {
  createResponseWorkspace
};
