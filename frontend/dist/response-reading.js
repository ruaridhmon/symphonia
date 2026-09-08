// frontend/src/utils/responseReading.ts
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
function renderResponseReading(h, questions, answers) {
  const sections = responseSections(questions, answers);
  const fold = sections.length > 1;
  const blocks = (s) => s.blocks.map((b, j) => h("div", { className: "rr-block", key: j }, b.label && !(b.label === "Reasoning" && s.blocks.length === 1) ? h("h5", null, b.label) : null, h("p", null, b.text)));
  const syncToggle = (root) => {
    if (!root) return;
    const all = Array.from(root.querySelectorAll("details"));
    const expanded = all.length > 0 && all.every((d) => d.open);
    const button = root.querySelector(".rr-expand");
    if (button) {
      button.textContent = expanded ? "Collapse explanations" : "Expand explanations";
      button.setAttribute("aria-expanded", String(expanded));
    }
  };
  return h(
    "div",
    { className: "response-reading", key: JSON.stringify(answers) },
    fold ? h("div", { className: "rr-toolbar" }, h("span", null, "Positions & reasoning"), h("button", { type: "button", className: "rr-expand", "aria-expanded": false, onClick: (e) => {
      const root = e.currentTarget.closest(".response-reading");
      const all = Array.from(root.querySelectorAll("details"));
      const open = !all.every((d) => d.open);
      all.forEach((d) => d.open = open);
      syncToggle(root);
    } }, "Expand explanations")) : null,
    sections.length ? sections.map((s, i) => {
      const stance = /disagree/i.test(s.rating || "") ? "disagree" : /agree/i.test(s.rating || "") ? "agree" : "neutral";
      const heading = [h("div", { className: "rr-kicker", key: "kicker" }, h("span", { className: "rr-question-number" }, `${s.rating ? "Claim" : "Question"} ${i + 1}`), s.rating ? h("span", { className: `rr-rating rr-${stance}` }, s.rating) : null), h("h4", { key: "title" }, s.title)];
      return fold ? h(
        "details",
        { className: "rr-section rr-disclosure", key: i, open: i === 0, onToggle: (e) => syncToggle(e.currentTarget.closest(".response-reading")) },
        h("summary", null, ...heading, h("span", { className: "rr-disclosure-hint" }, "Explanation", h("span", { "aria-hidden": true }, "\u2304"))),
        h("div", { className: "rr-explanation" }, ...blocks(s))
      ) : h("article", { className: "rr-section", key: i }, ...heading, ...blocks(s));
    }) : h("p", null, "No answers have been recorded.")
  );
}
export {
  renderResponseReading,
  responseSections
};
