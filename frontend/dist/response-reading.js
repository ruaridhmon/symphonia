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
    const title = (group || label).replace(/^Claim\s+\d+:\s*/i, "");
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
        if (["position", "value", "selectedOptions"].includes(k) || v == null || v === "") continue;
        section.blocks.push({ label: labels[k] || k, text: k === "confidence" && typeof v === "number" ? `${v}/10` : text(v) });
      }
    }
  });
  for (const [key, value] of Object.entries(answers)) if (!consumed.has(key)) result.push({ title: `Additional response \xB7 ${key}`, blocks: [{ label: "", text: text(value) }] });
  return result;
}
function renderResponseReading(h, questions, answers) {
  const sections = responseSections(questions, answers);
  return h("div", { className: "response-reading" }, sections.length ? sections.map((s, i) => h(
    "article",
    { className: "rr-section", key: i },
    h("div", { className: "rr-question-number" }, `Question ${i + 1}`),
    h("h4", null, s.title),
    s.rating ? h("p", { className: "rr-rating" }, s.rating) : null,
    ...s.blocks.map((b, j) => h("div", { className: "rr-block", key: j }, b.label ? h("h5", null, b.label) : null, h("p", null, b.text)))
  )) : h("p", null, "No answers have been recorded."));
}
export {
  renderResponseReading,
  responseSections
};
