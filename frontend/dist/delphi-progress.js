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
function stance(value) {
  const v = value.trim().toLowerCase();
  if (["strongly agree", "agree"].includes(v)) return 0;
  if (["strongly disagree", "disagree"].includes(v)) return 1;
  if (["neither agree nor disagree", "neutral"].includes(v)) return 2;
  if (["unable to judge \u2014 need more information", "don't know / unsure", "unsure", "uncertain"].includes(v)) return 3;
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
    const commentIndex = round.questions.findIndex((p) => typeof p === "object" && p !== null && p.sectionTitle === q.sectionTitle && !!q.sectionTitle && /comment|clarification/i.test(String(p.label)));
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
      return { participant: `Response ${i + 1}`, position, group: stance(position), comment, before: comparable ? before : null, changed: comparable && stance(before) !== stance(position) };
    });
    return [{
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
function buildNextDelphi(round, rounds, responses, retained, proposals) {
  const rows = ratingProgress(round, rounds, responses);
  const questions = [];
  for (const row of rows.filter((r) => retained.includes(r.key))) {
    const original = round.questions.find((q) => typeof q === "object" && String(q.questionId) === row.key);
    const comments = row.evidence.filter((e) => e.comment).map((e) => `${e.position}: ${e.comment}`).join("\n");
    questions.push({ ...original, groupPrompt: `Previous round: ${row.votes[0]} agree, ${row.votes[1]} disagree, ${row.votes[2]} neutral, ${row.votes[3]} unable to judge; ${row.answered} answered. Retain or revise your view independently.
${comments}` });
    questions.push({ questionId: row.key + "_reason", sectionTitle: original.sectionTitle || original.label, label: "Comments or clarification", inputType: "textarea", optional: true, placeholder: "What explains your position? What evidence or condition would change it?", requireEvidence: false, requireConfidence: false, requireCounterarguments: false });
  }
  for (const p of proposals) {
    const parent = rows.find((r) => r.key === p.parentId);
    if (!parent || !p.text.trim() || !p.rationale.trim()) throw new Error("Each proposal needs a parent claim, wording and a reason.");
    if (p.text.trim() === parent.label.replace(/^Claim\s+\d+:\s*/i, "")) throw new Error("Re-rate the original claim instead of adding identical wording.");
    const sectionTitle = p.text.trim();
    questions.push({ questionId: p.id, sectionTitle, label: "Your response", inputType: "single_select", options: ["Strongly agree", "Agree", "Neither agree nor disagree", "Disagree", "Strongly disagree", "Unable to judge \u2014 need more information"], optional: false, parentClaimId: p.parentId, parentClaimText: parent.label, claimRationale: p.rationale.trim(), introducedRound: Math.max(...rounds.map((r) => r.round_number)) + 1, groupPrompt: `New proposal, not previously rated. Related to: ${parent.label}
Why test this: ${p.rationale.trim()}
Judge this wording independently; earlier votes do not apply.`, requireEvidence: false, requireConfidence: false, requireCounterarguments: false });
    questions.push({ questionId: p.id + "_reason", sectionTitle, label: "Comments or clarification", inputType: "textarea", optional: true, placeholder: "What supports your view? What remains unresolved?", requireEvidence: false, requireConfidence: false, requireCounterarguments: false });
  }
  if (!questions.length) throw new Error("Select a claim or add a proposal before continuing.");
  return questions;
}

// src/utils/renderDelphiPlanner.ts
var el = (tag, text = "") => {
  const n = document.createElement(tag);
  n.textContent = text;
  return n;
};
function renderDelphiPlanner(root, round, rounds, responses, publish) {
  const rows = ratingProgress(round, rounds, responses);
  if (!rows.length) return;
  const box = el("details");
  box.className = "di-planner";
  box.append(el("summary", publish ? "Plan the next round" : "Explore a follow-up round"));
  box.append(el("p", "Re-rate selected claims and add proposals that investigate disagreements. Unselected claims keep their recorded results. Stable disagreement is a valid outcome."));
  const form = el("form");
  const retained = /* @__PURE__ */ new Set();
  const proposals = [];
  form.append(el("h3", "1. Choose claims to revisit"));
  rows.forEach((r) => {
    const label = el("label");
    const check = document.createElement("input");
    check.type = "checkbox";
    check.checked = !!r.answered && Math.max(r.votes[0], r.votes[1]) / r.answered < 0.8;
    if (check.checked) retained.add(r.key);
    check.onchange = () => {
      check.checked ? retained.add(r.key) : retained.delete(r.key);
    };
    label.append(check, document.createTextNode(r.label.replace(/^Claim\s+\d+:\s*/i, "")));
    form.append(label);
  });
  form.append(el("h3", "2. Develop related proposals"));
  form.append(el("p", "Read both sides above. Is the disagreement about evidence, wording, feasibility or values? Test a condition, an alternative, or a specific unresolved question."));
  const entries = el("div");
  form.append(entries);
  const add = el("button", "Add linked proposal");
  add.type = "button";
  add.onclick = () => {
    const p = { id: "claim_" + crypto.randomUUID() + "_response", parentId: rows[0].key, text: "", rationale: "" };
    proposals.push(p);
    const entry = el("fieldset");
    entry.append(el("legend", `New proposal`));
    const parent = document.createElement("select");
    parent.setAttribute("aria-label", "Original claim");
    rows.forEach((r) => {
      const o = document.createElement("option");
      o.value = r.key;
      o.textContent = r.label;
      parent.append(o);
    });
    parent.onchange = () => p.parentId = parent.value;
    entry.append(parent);
    for (const [key2, label] of [["text", "Proposed claim"], ["rationale", "Which disagreement does this address?"]]) {
      const l = el("label", label);
      const input = document.createElement("textarea");
      input.required = true;
      input.rows = 2;
      input.setAttribute("aria-label", label);
      input.oninput = () => p[key2] = input.value;
      l.append(input);
      entry.append(l);
    }
    const remove = el("button", "Remove proposal");
    remove.type = "button";
    remove.onclick = () => {
      proposals.splice(proposals.indexOf(p), 1);
      entry.remove();
    };
    entry.append(remove);
    entries.append(entry);
    parent.focus();
  };
  form.append(add);
  const review = el("button", "Preview next round");
  review.type = "submit";
  form.append(review);
  const preview = el("section");
  preview.setAttribute("aria-live", "polite");
  form.append(preview);
  form.addEventListener("input", () => preview.replaceChildren());
  form.addEventListener("change", () => preview.replaceChildren());
  add.addEventListener("click", () => preview.replaceChildren());
  entries.addEventListener("click", (e) => {
    if (e.target.tagName === "BUTTON") preview.replaceChildren();
  });
  form.onsubmit = (e) => {
    e.preventDefault();
    preview.replaceChildren();
    try {
      const questions = buildNextDelphi(round, rounds, responses, [...retained], proposals);
      preview.append(el("h3", `Review \xB7 ${questions.length / 2} claims`), el("p", "Each claim has a rating and an optional explanation. New proposals start with no votes."));
      questions.filter((_, i) => i % 2 === 0).forEach((q) => {
        const d = el("details");
        d.append(el("summary", `${q.parentClaimId ? "New proposal" : "Re-rate"} \xB7 ${q.sectionTitle || q.label}`), el("p", String(q.groupPrompt)), el("p", String(q.options.join(" \xB7 "))));
        preview.append(d);
      });
      if (publish) {
        const open = el("button", "Open reviewed round");
        open.type = "button";
        open.onclick = async () => {
          open.disabled = true;
          try {
            await publish(questions);
          } catch (err) {
            preview.append(el("p", err instanceof Error ? err.message : "Could not open round."));
            open.disabled = false;
          }
        };
        preview.append(el("p", "Opening this round closes the current round to new responses."), open);
      } else preview.append(el("p", "Simulation preview only. No live round or responses will be created."));
    } catch (err) {
      preview.append(el("p", err.message));
    }
  };
  box.append(form);
  root.append(box);
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
  const rows = ratingProgress(round, rounds, responses);
  const priorOpen = new Set(Array.from(root.querySelectorAll("details[open]")).map((d) => d.dataset.key));
  const filter = root.dataset.filter || "All claims";
  const existingPlanner = root.dataset.plannerRound === String(round.id) ? root.querySelector(".di-planner") : null;
  root.dataset.plannerRound = String(round.id);
  root.replaceChildren();
  root.className = "card delphi-insights";
  const head = node("div", "", "di-heading");
  head.append(node("div", "THE PANEL\u2019S VIEW", "di-eyebrow"));
  const title = node("div", "", "di-title");
  title.append(node("h2", "Where views stand"));
  if (refresh) title.append(button("Refresh", refresh));
  head.append(title);
  root.append(head);
  const ordered = [...rounds].filter((r) => r.round_number <= round.round_number).sort((a, b) => a.round_number - b.round_number);
  const actual = responses.find((r) => r.id === round.id)?.responses.length;
  const intro = node("p", `Round ${round.round_number} \xB7 ${actual ?? "\u2014"} responses${rows.length ? ` \xB7 ${rows.length} claims` : ""}`, "di-subtitle");
  root.append(intro);
  const note = synthesisProvenanceNote(round, rounds);
  if (note) root.append(node("p", note, "di-warning"));
  if (!rows.length) {
    root.append(node("p", "Ideas first. This round gathers independent proposals; the next round lets the panel rate the resulting claims.", "di-empty"));
    return;
  }
  const cats = ["Mostly agree", "Leaning agree", "Divided", "Leaning disagree", "Mostly disagree", "Uncertain"];
  const overview = node("div", "", "di-overview");
  cats.forEach((label) => {
    const item = node("div");
    item.append(node("strong", String(rows.filter((r) => category(r) === label).length)), node("span", label));
    overview.append(item);
  });
  root.append(overview);
  const filters = node("div", "", "di-filters");
  filters.setAttribute("role", "group");
  filters.setAttribute("aria-label", "Filter claims");
  ["All claims", ...cats].forEach((label) => {
    const b = button(label, () => {
      root.dataset.filter = label;
      renderDelphiInsights(root, round, rounds, responses, refresh, publish);
    });
    b.setAttribute("aria-pressed", String(filter === label));
    filters.append(b);
  });
  root.append(filters);
  const list = node("div", "", "di-claims");
  const selected = rows.filter((r) => filter === "All claims" || category(r) === filter);
  if (!selected.length) list.append(node("p", "No claims in this group.", "di-empty"));
  selected.forEach((row) => {
    const article = node("article", "", "di-claim");
    const heading = node("div", "", "di-claim-top");
    const left = node("div");
    left.append(node("span", category(row), "di-status " + category(row).toLowerCase().replaceAll(" ", "-")), node("h3", row.label.replace(/^Claim\s+\d+:\s*/i, "")));
    heading.append(left);
    const score = node("div", "", "di-score");
    score.append(node("strong", row.percent === null ? "\u2014" : `${Math.round(row.percent)}%`), node("span", "agree"));
    heading.append(score);
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
    article.append(bar);
    const legend = node("div", "", "di-legend");
    row.votes.forEach((n, i) => {
      if (n || i < 2) {
        const item = node("span", `${n} ${stanceLabels[i].toLowerCase()}`);
        const dot = node("i");
        dot.style.background = colors[i];
        item.prepend(dot);
        legend.append(item);
      }
    });
    article.append(legend);
    if (row.history.filter((h) => h.n > 0).length > 1) {
      const trend = node("div", "", "di-trend");
      trend.append(node("span", "Agreement:"));
      row.history.filter((h) => h.n > 0).slice(-2).forEach((h, i) => {
        if (i) trend.append(node("span", "\u2192", "di-arrow"));
        trend.append(node("span", `R${h.round} ${Math.round(h.percent)}%`));
      });
      if (row.delta !== null) trend.append(node("strong", row.delta === 0 ? "Unchanged" : `${row.delta > 0 ? "+" : ""}${Math.round(row.delta)} points`));
      article.append(trend);
    }
    if (row.matched) article.append(node("p", `${row.changed} of ${row.matched} returning respondents changed position group since Round ${row.previousRound}.`, "di-movement"));
    const detail = document.createElement("details");
    detail.className = "di-reasons";
    detail.dataset.key = row.key;
    detail.open = priorOpen.has(row.key);
    const summary = node("summary", "Reasons & history");
    detail.append(summary);
    detail.append(node("p", row.history.map((h) => `Round ${h.round}: ${h.n ? Math.round(h.percent) + "% agree" : "No ratings"} (${h.n} answered)`).join(" \xB7 ")));
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
  const methods = document.createElement("details");
  methods.className = "di-method";
  methods.dataset.key = "method";
  methods.open = priorOpen.has("method");
  methods.append(node("summary", "How to read these results"));
  methods.append(node("p", "These are recorded ratings, not AI-inferred agreement. \u201CLeaning\u201D means a majority below 80%; \u201CDivided\u201D means neither side has a majority (unless uncertainty dominates). \u201CMostly\u201D means at least 80% of answered ratings; it is a descriptive display band, not a substitute for the study\u2019s declared consensus rule. Neutral, unsure and unrecognised answers remain in the denominator; missing answers are shown separately."));
  methods.append(node("p", "Round comparisons require identical claim identifiers, wording and scales. Movement counts compare position groups for unambiguously matched returning respondents; changing intensity within agree or disagree is not counted. Response numbers identify rows within this round only. Comments are original submitted words."));
  methods.append(node("p", ordered.map((r) => `Round ${r.round_number}: ${responses.find((x) => x.id === r.id)?.responses.length ?? r.response_count ?? "\u2014"} responses`).join(" \xB7 ")));
  methods.append(node("p", "Agreement can coexist with conditional support. Changes in panel composition can change percentages. A synthetic demonstration illustrates the process; it does not establish scientific validity."));
  root.append(methods);
}

// src/legacy/delphiProgress.ts
var key = "";
var cache = null;
var pending = false;
var lastFetch = 0;
var failed = false;
var revision = 0;
function el2(tag, text, className) {
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
  const heading = Array.from(document.querySelectorAll("h2")).find((n) => /Synthesis for Round \d+/.test(n.textContent || ""));
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
    panel = el2("section", "", "card");
    panel.id = "delphi-recorded-progress";
    card.before(panel);
  }
  panel.dataset.signature = signature;
  panel.setAttribute("aria-label", "Delphi round progress");
  if (!round || !cache) {
    panel.replaceChildren(el2("p", failed ? "Recorded response data could not be loaded." : "Loading recorded responses\u2026"));
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
    await api.n(Number(nextKey), { questions, expected_round_number: round.round_number, context_settings: { intro_title: "Review the panel\u2019s reasoning", intro_body: "Rate each claim independently. New proposals have no prior votes. Explain what supports your position and what would change it.", show_previous_response: true } });
    location.assign(location.pathname);
  } : void 0);
}
var timer;
new MutationObserver(() => {
  clearTimeout(timer);
  timer = setTimeout(render, 150);
}).observe(document.body, { childList: true, subtree: true, characterData: true });
window.addEventListener("focus", () => {
  lastFetch = 0;
  render();
});
render();
setInterval(() => {
  if (document.visibilityState === "visible") render();
}, 3e4);
