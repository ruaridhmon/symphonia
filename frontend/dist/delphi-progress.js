// src/utils/answers.ts
function isRecord(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
function stringifyAnswerScalar(value) {
  if (typeof value === "string") return value;
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
  if (typeof value === "boolean") return String(value);
  return "";
}
function coerceAnswerPosition(value) {
  const scalar = stringifyAnswerScalar(value);
  if (scalar) return scalar;
  if (Array.isArray(value)) {
    return value.map((item) => coerceAnswerPosition(item).trim()).filter(Boolean).join("\n");
  }
  if (!isRecord(value)) return "";
  for (const key2 of ["position", "value", "answer", "selected", "selectedScore", "score"]) {
    if (key2 in value) {
      const next = coerceAnswerPosition(value[key2]);
      if (next.trim()) return next;
    }
  }
  return "";
}

// src/utils/delphiProgress.ts
var stanceLabels = ["Agree", "Disagree", "Neutral", "Unable to judge", "Unrecognised", "Not answered"];
var confidenceLabels = ["Not at all confident", "Slightly confident", "Moderately confident", "Very confident", "Extremely confident"];
function stance(value) {
  const v = value.trim().toLowerCase();
  if (["strongly agree", "agree"].includes(v)) return 0;
  if (["strongly disagree", "disagree"].includes(v)) return 1;
  if (["neither agree nor disagree", "neutral"].includes(v)) return 2;
  if (["unable to judge", "insufficient evidence", "unable to judge \u2014 need more information", "don't know / unsure", "unsure", "uncertain"].includes(v)) return 3;
  return v ? 4 : 5;
}
function ratingQuestion(q) {
  return typeof q === "object" && q !== null && ["likert", "single_select"].includes(String(q.inputType)) && Array.isArray(q.options) && q.options.some((o) => stance(String(o)) === 0) && q.options.some((o) => stance(String(o)) === 1);
}
function wording(q) {
  return `${String(q.sectionTitle || "").trim()}|${String(q.label || "").trim()}`;
}
function counts(q, index, responses) {
  const result = [0, 0, 0, 0, 0, 0];
  for (const r of responses?.responses || []) {
    const answer = r.answers[`q${index + 1}`] ?? r.answers[String(q.questionId)];
    result[stance(coerceAnswerPosition(answer))]++;
  }
  return result;
}
function ratingProgress(round, rounds, responses) {
  const current = responses.find((r) => r.id === round.id);
  const previous = rounds.find((r) => r.round_number === round.round_number - 1);
  const previousResponses = responses.find((r) => r.id === previous?.id);
  return round.questions.flatMap((q, index) => {
    if (!ratingQuestion(q)) return [];
    const priorIndex = previous?.questions.findIndex((p) => ratingQuestion(p) && !!q.questionId && p.questionId === q.questionId && wording(p) === wording(q) && JSON.stringify(p.options) === JSON.stringify(q.options)) ?? -1;
    const votes = counts(q, index, current);
    const prior = priorIndex >= 0 && previousResponses ? counts(previous.questions[priorIndex], priorIndex, previousResponses) : null;
    const answered = votes.slice(0, 5).reduce((a, b) => a + b, 0);
    const priorAnswered = prior?.slice(0, 5).reduce((a, b) => a + b, 0) || 0;
    const percent = answered ? 100 * votes[0] / answered : null;
    const history = rounds.filter((r) => r.round_number <= round.round_number).sort((a, b) => a.round_number - b.round_number).flatMap((r) => {
      const i = r.questions.findIndex((p) => ratingQuestion(p) && !!q.questionId && p.questionId === q.questionId && wording(p) === wording(q) && JSON.stringify(p.options) === JSON.stringify(q.options));
      const data = responses.find((x) => x.id === r.id);
      if (i < 0 || !data) return [];
      const v = counts(r.questions[i], i, data);
      const n = v.slice(0, 5).reduce((a, b) => a + b, 0);
      return [{ round: r.round_number, votes: v, n, percent: n ? 100 * v[0] / n : null }];
    });
    const commentIndex = round.questions.findIndex((p) => typeof p === "object" && p !== null && p.sectionTitle === q.sectionTitle && !!q.sectionTitle && /comment|clarification|justify|what led|explain your position/i.test(String(p.label)));
    const confidenceIndex = round.questions.findIndex((p) => typeof p === "object" && p !== null && !!q.sectionTitle && p.sectionTitle === q.sectionTitle && /^Confidence in your rating$/i.test(String(p.label)));
    const confidenceQuestion = round.questions[confidenceIndex];
    const stableEmails = (rs) => {
      const map = /* @__PURE__ */ new Map();
      const duplicate = /* @__PURE__ */ new Set();
      for (const r of rs?.responses || []) if (r.email) {
        if (map.has(r.email)) duplicate.add(r.email);
        map.set(r.email, r);
      }
      duplicate.forEach((e) => map.delete(e));
      return map;
    };
    const oldByIdentity = stableEmails(previousResponses);
    const newByIdentity = stableEmails(current);
    let matched = 0, changed = 0;
    const evidence = (current?.responses || []).map((r, i) => {
      const position = coerceAnswerPosition(r.answers[`q${index + 1}`] ?? r.answers[String(q.questionId)]);
      const old = priorIndex >= 0 && r.email && newByIdentity.has(r.email) ? oldByIdentity.get(r.email) : void 0;
      const before = old ? coerceAnswerPosition(old.answers[`q${priorIndex + 1}`] ?? old.answers[String(q.questionId)]) : "";
      const comparable = !!old && stance(before) < 4 && stance(position) < 4;
      if (comparable) {
        matched++;
        if (stance(before) !== stance(position)) changed++;
      }
      const commentQuestion = round.questions[commentIndex];
      const comment = commentIndex >= 0 ? coerceAnswerPosition(r.answers[`q${commentIndex + 1}`] ?? r.answers[String(typeof commentQuestion === "object" ? commentQuestion.questionId : "")]) : "";
      const confidence = confidenceIndex >= 0 ? coerceAnswerPosition(r.answers[`q${confidenceIndex + 1}`] ?? r.answers[String(typeof confidenceQuestion === "object" ? confidenceQuestion.questionId : "")]) : "";
      return { confidence, participant: `Response ${i + 1}`, position, group: stance(position), comment, before: comparable ? before : null, changed: comparable && stance(before) !== stance(position) };
    });
    return [{
      hasConfidence: confidenceIndex >= 0,
      history,
      evidence,
      matched,
      changed,
      key: String(q.questionId || index),
      label: String(q.sectionTitle || q.label),
      votes,
      answered,
      percent,
      previousRound: previous?.round_number,
      delta: percent !== null && prior && priorAnswered ? percent - 100 * prior[0] / priorAnswered : null,
      previousAnswered: priorAnswered
    }];
  });
}
function synthesisProvenanceNote(round, rounds) {
  if (!round?.synthesis?.trim()) return null;
  if (round.response_count === 0) return `No responses have been submitted in Round ${round.round_number}. This text is background or a draft, not a result from this round.`;
  const previous = rounds.find((r) => r.round_number === round.round_number - 1);
  if (previous?.synthesis?.trim() === round.synthesis.trim()) return `This text matches Round ${previous.round_number}. Review it against this round\u2019s responses before treating it as an updated result.`;
  return null;
}

// src/utils/delphiPlanning.ts
function buildFixedDelphiRound(round, rounds, responses) {
  if (round.round_number !== 2 || rounds.some((r) => r.round_number >= 3)) throw new Error("This Delphi has three rounds. No further rating round is available.");
  const baseline = rounds.find((r) => r.round_number === 2) || round;
  const rows = ratingProgress(baseline, rounds, responses);
  if (!rows.length) throw new Error("No recorded claim questionnaire is available.");
  return baseline.questions.map((q) => {
    if (typeof q === "string") return q;
    const row = rows.find((r) => r.key === String(q.questionId));
    if (row) return { ...q, groupPrompt: [`Round 2: ${row.votes[0]} agree, ${row.votes[1]} disagree, ${row.votes[2]} neutral, ${row.votes[3]} unable to judge; ${row.answered} answered.`, "Review the other participants\u2019 reasoning, then rate this same claim again. You do not need to change your mind.", ...row.evidence.filter((e) => e.comment).map((e) => `${e.position}: ${e.comment}`)].join("\n") };
    if (/comment|clarification|justify|what led|explain your position/i.test(String(q.label))) return { ...q, label: "Explain your position", placeholder: "Why do you agree or disagree? Share the reasoning or evidence behind your answer." };
    return { ...q };
  });
}

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
  const flows = graph.flows;
  const remembered = root.dataset.reasoningFlow;
  const section = el("section", "", "rf-workspace");
  section.setAttribute("aria-label", "First-round reasoning");
  const head = el("header", "", "rf-header");
  head.append(el("h2", "Claims & reasoning"), el("p", "Follow each contribution from its premises to its conclusion. Dashed cards make the unstated steps visible."));
  section.append(head);
  const counts2 = el("div", `${graph.mapped_response_count} of ${graph.response_count} responses represented \xB7 ${flows.length} argument${flows.length === 1 ? "" : "s"}`, "rf-coverage");
  section.append(counts2);
  if (graph.rejected_flow_count) counts2.append(el("span", ` \xB7 ${graph.rejected_flow_count} map${graph.rejected_flow_count === 1 ? " was" : "s were"} withheld because source or structure checks failed.`));
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
    title.append(el("h3", flow.title), el("span", `Response ${flow.response_number}`));
    canvas.append(title);
    const diagram = el("div", "", "rf-diagram");
    canvas.append(diagram);
    const labels = new Map(flow.nodes.map((n, i) => [n.id, String.fromCharCode(65 + i)]));
    const select = (n) => {
      root.dataset.reasoningNode = n.id;
      diagram.querySelectorAll("[data-rf-node]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.rfNode === n.id)));
      detail.replaceChildren();
      detail.classList.toggle("rf-inferred-detail", n.kind === "assumption");
      detail.append(el("div", n.kind === "assumption" ? "INFERRED \xB7 UNCONFIRMED" : `SOURCE \xB7 RESPONSE ${flow.response_number}`, "rf-eyebrow"), el("h4", n.kind === "assumption" ? "A step to check with the expert" : "The expert\u2019s words"));
      if (n.kind === "assumption") detail.append(el("p", n.text), el("blockquote", n.question || "Ask the expert to clarify this connection."), el("p", "This bridge is an interpretation. It is not attributed to the expert and is not part of the rating questionnaire.", "rf-small"));
      else {
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
        b.append(el("span", `${labels.get(n.id)} / ${n.kind === "assumption" ? "INFERRED ASSUMPTION" : n.kind === "premise" ? "STATED PREMISE" : "STATED RECOMMENDATION"}`, "rf-eyebrow"), el("strong", n.text));
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
    b.append(el("span", `Response ${flow.response_number}`), el("strong", flow.title));
    b.onclick = () => {
      delete root.dataset.reasoningNode;
      show(i);
    };
    nav.append(b);
  });
  root.append(section);
  show(Math.max(0, flows.findIndex((f) => f.id === remembered)));
}

// src/utils/renderDelphiPlanner.ts
var el2 = (tag, text = "") => {
  const n = document.createElement(tag);
  n.textContent = text;
  return n;
};
function renderDelphiPlanner(root, round, rounds, responses, publish) {
  if (round.round_number >= 3) return;
  const box = el2("div");
  box.className = "di-planner";
  root.append(box);
  if (round.round_number !== 2) return;
  const detail = el2("details");
  detail.append(el2("summary", "Preview round 3 \xB7 Final ratings"), el2("p", "All claims, wording and rating options stay unchanged. Participants review the previous opinions, rate each claim again and explain their reasoning."));
  box.append(detail);
  try {
    const questions = buildFixedDelphiRound(round, rounds.filter((r) => r.round_number <= 2), responses);
    questions.filter((q) => typeof q === "object" && Array.isArray(q.options)).forEach((q) => {
      if (typeof q === "string") return;
      const item = el2("details");
      item.append(el2("summary", String(q.sectionTitle || q.label)), el2("p", String(q.groupPrompt)), el2("p", q.options.join(" \xB7 ")), el2("p", "Explain your position \u2014 why do you agree or disagree? Share the reasoning or evidence behind your answer."));
      detail.append(item);
    });
    if (publish && !rounds.some((r) => r.round_number >= 3)) {
      const open = el2("button", "Open round 3");
      open.type = "button";
      open.onclick = async () => {
        open.disabled = true;
        try {
          await publish(questions);
        } catch (e) {
          detail.append(el2("p", e.message));
          open.disabled = false;
        }
      };
      detail.append(open);
    } else detail.append(el2("p", rounds.some((r) => r.round_number >= 3) ? "Round 3 already exists." : "Simulation preview only."));
  } catch (e) {
    detail.append(el2("p", e.message));
  }
}

// src/utils/renderDelphiInsights.ts
var colors = ["#137c70", "#b34d60", "#94a3b8", "#c28a2a", "#8b5fbf", "#e2e8f0"];
var node = (tag, text = "", cls = "") => {
  const n = document.createElement(tag);
  n.textContent = text;
  n.className = cls;
  return n;
};
var button = (label, run) => {
  const b = node("button", label);
  b.type = "button";
  b.onclick = run;
  return b;
};
function category(row) {
  if (!row.answered) return "Awaiting ratings";
  if (row.votes[0] / row.answered >= 0.8) return "Mostly agree";
  if (row.votes[1] / row.answered >= 0.8) return "Mostly disagree";
  if ((row.votes[2] + row.votes[3] + row.votes[4]) / row.answered >= 0.5) return "Uncertain";
  if (row.votes[0] / row.answered > 0.5) return "Leaning agree";
  if (row.votes[1] / row.answered > 0.5) return "Leaning disagree";
  return "Divided";
}
function renderDelphiInsights(root, round, rounds, responses, refresh, publish) {
  clearReasoningFlow(root);
  const rows = ratingProgress(round, rounds, responses);
  const priorOpen = new Set(Array.from(root.querySelectorAll("details[open]")).map((d) => d.dataset.key));
  delete root.dataset.filter;
  const existingPlanner = root.dataset.plannerRound === String(round.id) ? root.querySelector(".di-planner") : null;
  root.dataset.plannerRound = String(round.id);
  root.replaceChildren();
  root.className = "card delphi-insights";
  root.dataset.claimLabels = JSON.stringify(rows.map((r) => r.label.replace(/^Claim\s+\d+:\s*/i, "").replace(/\s+/g, " ").trim()));
  const head = node("div", "", "di-heading");
  const title = node("div", "", "di-title");
  if (refresh) title.append(button("Refresh", refresh));
  head.append(title);
  root.append(head);
  const ordered = [...rounds].filter((r) => r.round_number <= round.round_number).sort((a, b) => a.round_number - b.round_number);
  const actual = responses.find((r) => r.id === round.id)?.responses.length;
  root.dataset.empty = String(actual === 0);
  const note = synthesisProvenanceNote(round, rounds);
  if (note) root.append(node("p", note, "di-warning"));
  if (round.round_number === 1 && !rows.length) {
    const graph = round.synthesis_json?.reasoning_graph;
    if (graph?.version === 1 && round.synthesis_json?.narrative === round.synthesis) {
      renderReasoningFlow(root, graph);
      return;
    }
    if (actual && round.synthesis) {
      root.append(node("p", "This saved draft contains claims only. Generate a new draft with Simple or Custom instructions to include source-linked reasoning and inferred assumptions.", "di-empty"));
      return;
    }
  }
  if (!rows.length) {
    root.append(node("p", actual === 0 ? "No responses yet for this round. Responses will appear here as participants submit them." : round.round_number === 1 ? "This round gathers independent views. Extract claims from the responses before setting up the rating round." : "There are no comparable claim ratings in this round. Review the written responses or synthesis below.", "di-empty"));
    return;
  }
  const comparable = rows.filter((row) => row.delta !== null);
  if (comparable.length) {
    const increased = comparable.filter((row) => row.delta > 0).length;
    const decreased = comparable.filter((row) => row.delta < 0).length;
    const unchanged = comparable.length - increased - decreased;
    const changes = [increased ? `${increased} ${increased === 1 ? "claim gained" : "claims gained"} support` : null, decreased ? `${decreased} ${decreased === 1 ? "lost" : "lost"} support` : null, unchanged ? `${unchanged} ${unchanged === 1 ? "was" : "were"} unchanged` : null].filter(Boolean).join(" \xB7 ");
    root.append(node("p", changes + ".", "di-change-overview"));
  }
  const list = node("div", "", "di-claims");
  const columns = node("div", "", "di-column-head");
  columns.setAttribute("aria-hidden", "true");
  columns.append(node("span", "Claim"), node("span", "Recorded agreement"));
  list.append(columns);
  const selected = rows;
  if (!selected.length) list.append(node("p", "No claims in this group.", "di-empty"));
  selected.forEach((row) => {
    const article = node("article", "", "di-claim");
    article.dataset.key = row.key;
    article.dataset.openExcerpts = JSON.stringify([...priorOpen].filter((k) => k?.startsWith(`${row.key}:excerpt:`)));
    const heading = node("div", "", "di-claim-top");
    const left = node("div", "", "di-claim-copy");
    const number = node("span", String(rows.indexOf(row) + 1).padStart(2, "0"), "di-claim-number");
    number.setAttribute("aria-label", `Claim ${rows.indexOf(row) + 1}`);
    left.append(number, node("h3", row.label.replace(/^Claim\s+\d+:\s*/i, "")));
    heading.append(left);
    const rating = node("div", "", "di-rating");
    rating.setAttribute("aria-label", category(row));
    const score = node("div", "", "di-score");
    score.append(node("strong", row.percent === null ? "\u2014" : `${Math.round(row.percent)}%`), node("span", row.percent === null ? "No ratings" : "agree"));
    rating.append(score);
    heading.append(rating);
    article.append(heading);
    const bar = node("div", "", "di-bar");
    bar.setAttribute("aria-hidden", "true");
    row.votes.slice(0, 5).forEach((n, i) => {
      if (n && row.answered) {
        const part = node("span");
        part.style.width = `${n / row.answered * 100}%`;
        part.style.background = colors[i];
        bar.append(part);
      }
    });
    rating.append(bar);
    const legend = node("div", "", "di-legend");
    row.votes.forEach((n, i) => {
      if (n || i < 2) {
        const item = node("span", "", "di-stance-group");
        const count = node("span", `${n} ${stanceLabels[i].toLowerCase()}`);
        const dot = node("i");
        dot.style.background = colors[i];
        count.prepend(dot);
        item.append(count);
        if (n && i < 4 && row.hasConfidence) {
          const group = row.evidence.filter((e) => e.group === i);
          const values = group.map((e) => confidenceLabels.indexOf(e.confidence)).filter((v) => v >= 0);
          const high = values.filter((v) => v >= 3).length, low = values.filter((v) => v <= 1).length, moderate = values.filter((v) => v === 2).length;
          const label = !values.length ? "confidence not recorded" : high > values.length / 2 ? "high confidence" : low > values.length / 2 ? "low confidence" : moderate > values.length / 2 ? "moderate confidence" : "mixed confidence";
          const disclosure = node("details", "", "di-confidence");
          disclosure.dataset.key = `${row.key}:confidence:${i}`;
          disclosure.open = false;
          const trigger = node("summary", label + (values.length && values.length < n ? ` (${values.length}/${n})` : ""));
          trigger.setAttribute("aria-label", `${stanceLabels[i]}: ${trigger.textContent}. Show confidence responses`);
          disclosure.append(trigger);
          const body = document.createElement("dialog");
          body.className = "di-confidence-detail";
          body.setAttribute("aria-label", `Confidence among people who ${stanceLabels[i].toLowerCase()}`);
          const position = () => {
            if (!body.open) return;
            const viewport = window.visualViewport;
            const leftEdge = (viewport?.offsetLeft || 0) + 12, topEdge = (viewport?.offsetTop || 0) + 12;
            const rightEdge = leftEdge + (viewport?.width || window.innerWidth) - 24, bottomEdge = topEdge + (viewport?.height || window.innerHeight) - 24;
            body.style.maxWidth = `${rightEdge - leftEdge}px`;
            body.style.maxHeight = `${bottomEdge - topEdge}px`;
            const anchor = trigger.getBoundingClientRect(), box = body.getBoundingClientRect();
            const below = bottomEdge - anchor.bottom - 8, above = anchor.top - topEdge - 8;
            const top = below >= box.height || below >= above ? anchor.bottom + 8 : anchor.top - box.height - 8;
            body.style.left = `${Math.max(leftEdge, Math.min(anchor.left, rightEdge - box.width))}px`;
            body.style.top = `${Math.max(topEdge, Math.min(top, bottomEdge - box.height))}px`;
          };
          const dismiss = () => {
            body.close();
            disclosure.open = false;
            trigger.focus();
          };
          trigger.onclick = (e) => {
            e.preventDefault();
            root.querySelectorAll(".di-confidence dialog[open]").forEach((d) => d.close());
            disclosure.open = true;
            body.showModal();
            position();
            window.addEventListener("resize", position);
            window.addEventListener("scroll", position, true);
            window.visualViewport?.addEventListener("resize", position);
          };
          body.onclose = () => {
            disclosure.open = false;
            window.removeEventListener("resize", position);
            window.removeEventListener("scroll", position, true);
            window.visualViewport?.removeEventListener("resize", position);
          };
          body.oncancel = (e) => {
            e.preventDefault();
            dismiss();
          };
          body.onclick = (e) => {
            if (e.target === body) {
              const r = body.getBoundingClientRect();
              if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dismiss();
            }
          };
          const header = node("div", "", "di-confidence-header");
          const close = button("\xD7", dismiss);
          close.className = "di-confidence-close";
          close.setAttribute("aria-label", "Close confidence");
          header.append(node("strong", `Confidence \xB7 ${stanceLabels[i].toLowerCase()}`), close);
          body.append(header, node("p", `${values.length} of ${n} answered`, "di-confidence-subtitle"));
          const distribution = node("div", "", "di-confidence-distribution");
          confidenceLabels.forEach((label2, j) => {
            const total = values.filter((v) => v === j).length;
            const line = node("div", "", "di-confidence-level");
            line.setAttribute("aria-label", `${label2}: ${total}`);
            const track = node("span", "", "di-confidence-track");
            track.setAttribute("aria-hidden", "true");
            const fill = node("span");
            fill.style.width = `${values.length ? 100 * total / values.length : 0}%`;
            track.append(fill);
            line.append(node("span", label2.replace(" confident", "")), track, node("span", String(total), "di-confidence-count"));
            distribution.append(line);
          });
          body.append(distribution);
          const method = node("details", "", "di-confidence-method");
          method.addEventListener("toggle", position);
          method.append(node("summary", "How this is summarised"), node("p", "High: very or extremely. Moderate: moderately. Low: slightly or not at all. The label describes more than half of recorded answers; otherwise mixed. Missing answers are excluded. This is self-reported certainty, not correctness."));
          body.append(method);
          disclosure.append(body);
          item.append(disclosure);
        }
        legend.append(item);
      }
    });
    rating.append(legend);
    if (row.history.filter((h) => h.n > 0).length > 1) {
      const previous = row.history.filter((h) => h.n > 0).at(-2);
      const trend = node("div", "", "di-trend");
      if (row.delta !== null && Math.round(row.delta) !== 0) {
        const change = Math.round(row.delta);
        trend.append(node("span", change === 0 ? "No change" : `${change > 0 ? "+" : "\u2212"}${Math.abs(change)} pp`, "di-change"), node("span", `since Round ${previous.round}`));
        trend.title = `Agreement: Round ${previous.round} ${Math.round(previous.percent)}% \u2192 Round ${round.round_number} ${Math.round(row.percent)}%. Change in percentage points.`;
      }
      rating.append(trend);
    }
    const detail = document.createElement("details");
    detail.className = "di-reasons";
    detail.dataset.key = row.key;
    detail.open = priorOpen.has(row.key);
    const summary = node("summary", "Responses and changes");
    detail.append(summary);
    detail.append(node("p", row.history.map((h) => `Round ${h.round}: ${h.n ? Math.round(h.percent) + "% agree" : "No ratings"} (${h.n} answered)`).join(" \xB7 ")));
    if (row.matched) detail.append(node("p", `${row.changed} of ${row.matched} returning respondents changed position group since Round ${row.previousRound}.`, "di-movement"));
    const question = round.questions.find((q) => typeof q === "object" && String(q.questionId) === row.key);
    if (question?.parentClaimId) {
      article.prepend(node("p", `Related proposal \xB7 introduced in Round ${question.introducedRound || round.round_number}`, "di-eyebrow"));
      detail.append(node("p", `Original claim: ${question.parentClaimText || question.parentClaimId}`), node("p", `Reason for this proposal: ${question.claimRationale || "Not recorded"}`));
    }
    const evidence = row.evidence.filter((e) => e.comment || e.changed);
    if (!evidence.length) detail.append(node("p", "No separate comments were recorded for this claim. Original responses remain available in the Responses view."));
    [0, 1, 2, 3, 4, 5].forEach((group) => {
      const subset = evidence.filter((e) => e.group === group);
      if (!subset.length) return;
      const section = node("section");
      section.append(node("h4", `${stanceLabels[group]} \xB7 ${subset.length}`));
      subset.forEach((e) => {
        const block = node("blockquote");
        block.append(node("div", `${e.participant} \xB7 ${e.position || "Not answered"}`, "di-attribution"));
        if (e.changed) block.append(node("p", `${e.before} \u2192 ${e.position}`, "di-shift"));
        block.append(node("p", e.comment || "No reason supplied."));
        section.append(block);
      });
      detail.append(section);
    });
    article.append(detail);
    list.append(article);
  });
  root.append(list);
  const archived = node("details", "", "di-method");
  archived.append(node("summary", "Earlier claims not rated in this round"));
  const seen = new Set(rows.map((r) => r.key));
  [...ordered].reverse().filter((r) => r.id !== round.id).forEach((r) => ratingProgress(r, rounds, responses).forEach((row) => {
    if (seen.has(row.key)) return;
    seen.add(row.key);
    archived.append(node("p", `${row.label} \u2014 last rated Round ${r.round_number}: ${row.percent === null ? "no ratings" : Math.round(row.percent) + "% agree"} (${row.answered} answered). Not re-rated; no current-round result.`));
  }));
  if (archived.childElementCount > 1) root.append(archived);
  if (existingPlanner) root.append(existingPlanner);
  else if (round.is_active || !refresh) renderDelphiPlanner(root, round, rounds, responses, publish);
}

// src/legacy/delphiProgress.ts
var key = "";
var cache = null;
var pending = false;
var lastFetch = 0;
var failed = false;
var revision = 0;
function el3(tag, text, className) {
  const node2 = document.createElement(tag);
  if (text) node2.textContent = text;
  if (className) node2.className = className;
  return node2;
}
function render() {
  const match = location.pathname.match(/^\/admin\/form\/(\d+)\/summary\/?$/);
  if (!match) {
    key = "";
    cache = null;
    document.getElementById("delphi-recorded-progress")?.remove();
    return;
  }
  const nextKey = match[1];
  if (key !== nextKey) {
    key = nextKey;
    cache = null;
    lastFetch = 0;
    failed = false;
  }
  const heading = Array.from(document.querySelectorAll("h2")).find((n) => /(?:Synthesis for Round \d+|Round \d+ synthesis)/.test(n.textContent || ""));
  if (!heading) {
    document.getElementById("delphi-recorded-progress")?.remove();
    return;
  }
  if (!pending && (!lastFetch || Date.now() - lastFetch > 3e4)) {
    pending = true;
    lastFetch = Date.now();
    const requested = key;
    const deployedApi = "/assets/rounds-CU08geHs.js";
    import(
      /* @vite-ignore */
      deployedApi
    ).then(async (api) => {
      const [rounds, responses] = await Promise.all([api.g(Number(requested)), api.a(Number(requested))]);
      if (key === requested) {
        cache = { rounds, responses };
        revision += 1;
        failed = false;
      }
    }).catch(() => {
      if (key === requested) failed = true;
    }).finally(() => {
      pending = false;
      render();
    });
  }
  const card = heading.closest(".card");
  if (!card) return;
  const roundNumber = Number(heading.textContent?.match(/Round (\d+)/)?.[1]);
  const round = cache?.rounds.find((r) => r.round_number === roundNumber);
  const signature = JSON.stringify([key, roundNumber, revision, failed]);
  let panel = document.getElementById("delphi-recorded-progress");
  if (panel?.dataset.signature === signature) return;
  if (!panel) {
    panel = el3("section", "", "card");
    panel.id = "delphi-recorded-progress";
    card.before(panel);
  }
  panel.dataset.signature = signature;
  panel.setAttribute("aria-label", "Delphi round progress");
  panel.dataset.loading = String(!cache && !failed);
  if (!round || !cache) {
    panel.replaceChildren(el3("p", failed ? "Recorded response data could not be loaded." : "Loading recorded responses\u2026"));
    return;
  }
  renderDelphiInsights(panel, round, cache.rounds, cache.responses, () => {
    lastFetch = 0;
    render();
  }, round.is_active ? async (questions) => {
    const deployedApi = "/assets/rounds-CU08geHs.js";
    const api = await import(
      /* @vite-ignore */
      deployedApi
    );
    await api.n(Number(nextKey), { questions, expected_round_number: round.round_number, context_settings: { intro_title: "Review the panel\u2019s reasoning", intro_body: "Rate each claim independently. The claim set is unchanged. Explain what led you to your view.", show_previous_response: true } });
    location.assign(location.pathname);
  } : void 0);
}
var timer;
new MutationObserver(() => {
  clearTimeout(timer);
  timer = setTimeout(render, 0);
}).observe(document.body, { childList: true, subtree: true, characterData: true });
window.addEventListener("focus", () => {
  lastFetch = 0;
  render();
});
render();
setInterval(() => {
  if (document.visibilityState === "visible") render();
}, 3e4);
export {
  buildFixedDelphiRound
};
