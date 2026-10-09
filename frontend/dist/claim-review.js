// src/utils/delphiRoundTwo.ts
var CONFIDENCE_OPTIONS = ["Not at all confident", "Slightly confident", "Moderately confident", "Very confident", "Extremely confident"];
var RATING_OPTIONS = ["Agree", "Neither agree nor disagree", "Disagree", "Unable to judge"];
function detailCount(container, label) {
  const detail = Array.from(container.querySelectorAll("details")).find(
    (item) => item.querySelector("summary")?.textContent?.toLowerCase().includes(label)
  );
  return detail ? detail.querySelectorAll("li").length : null;
}
function extractDelphiClaims(synthesisHtml) {
  if (!synthesisHtml.trim() || typeof DOMParser === "undefined") return [];
  const document = new DOMParser().parseFromString(synthesisHtml, "text/html");
  const claims = [];
  for (const paragraph of Array.from(document.querySelectorAll("p"))) {
    const line = paragraph.textContent?.replace(/\s+/g, " ").trim() ?? "";
    const match = line.match(/^\S*\s*Claim\s+(\d+)\s*:/i);
    if (!match) continue;
    const text = paragraph.querySelector("strong")?.textContent?.replace(/\s+/g, " ").trim() || line.replace(/^\S*\s*Claim\s+\d+\s*:\s*/i, "").trim();
    if (!text) continue;
    const container = paragraph.closest("div") ?? paragraph.parentElement ?? paragraph;
    const peopleLine = Array.from(container.querySelectorAll("p")).map((item) => item.textContent?.replace(/\s+/g, " ").trim() ?? "").find((item) => /^People making this claim:/i.test(item));
    const peopleMatch = peopleLine?.match(/(\d+)\s+of\s+(\d+)/i);
    const support = detailCount(container, "supporting expert") ?? (peopleMatch ? Number(peopleMatch[1]) : null);
    const oppose = detailCount(container, "opposing expert");
    const uncertain = detailCount(container, "uncertain expert");
    const total = peopleMatch ? Number(peopleMatch[2]) : null;
    const known = [support, oppose, uncertain].every((value) => value !== null) ? Number(support) + Number(oppose) + Number(uncertain) : null;
    claims.push({
      ...Array.from(container.children).some((child) => /^Inferred\s*·\s*unconfirmed/i.test(child.textContent || "")) ? { origin: "inferred", inferenceQuestion: "Review this inferred claim independently; it was not directly stated by an expert." } : {},
      number: Number(match[1]),
      text,
      support,
      oppose,
      uncertain,
      total,
      notClassified: total !== null && known !== null ? Math.max(0, total - known) : null
    });
  }
  return claims.filter(
    (claim, index, all) => all.findIndex((candidate) => candidate.number === claim.number && candidate.text === claim.text) === index
  );
}
function groupFeedback(claim) {
  const counts = [
    claim.support !== null ? `${claim.support} support` : null,
    claim.oppose !== null ? `${claim.oppose} oppose` : null,
    claim.uncertain !== null ? `${claim.uncertain} uncertain` : null,
    claim.notClassified !== null ? `${claim.notClassified} not classified` : null
  ].filter(Boolean).join(" \xB7 ");
  return [
    counts ? `Previous round: ${counts}.` : "Review the previous round before re-rating.",
    "The previous-round summary contains the anonymised original excerpts.",
    "Consensus is not required: retain your view if the evidence still supports it."
  ].join(" ");
}
function baseQuestion(overrides) {
  return {
    requireEvidence: false,
    requireCounterarguments: false,
    requireConfidence: false,
    importedFromQuestionnaire: false,
    ...overrides
  };
}
function buildDelphiRoundTwoQuestions(synthesisHtml, graph) {
  const claims = graph?.claims?.length ? graph.claims.map((c, i) => ({ number: i + 1, id: c.id, text: c.text, origin: c.origin, inferenceQuestion: c.question, support: null, oppose: null, uncertain: null, notClassified: null, total: null })) : extractDelphiClaims(synthesisHtml);
  return claims.flatMap((claim) => {
    const prefix = claim.id || `claim_${claim.number}`;
    const metadata = { claimId: prefix, claimText: claim.text, claimOrigin: claim.origin || "explicit", ...claim.inferenceQuestion ? { inferenceQuestion: claim.inferenceQuestion } : {} };
    const sectionTitle = `Claim ${claim.number}: ${claim.text}`;
    return [
      baseQuestion({
        ...metadata,
        label: "Do you agree with this statement?",
        questionId: `${prefix}_response`,
        sectionTitle,
        groupPrompt: claim.origin === "inferred" ? `Inferred \xB7 unconfirmed. This claim was not directly stated by an expert. ${claim.inferenceQuestion || "Check this interpretation independently."} Agreement does not establish that the original expert stated it.` : groupFeedback(claim),
        inputType: "single_select",
        options: RATING_OPTIONS,
        optional: false
      }),
      baseQuestion({
        ...metadata,
        label: "Confidence in your rating",
        questionId: `${prefix}_confidence`,
        sectionTitle,
        inputType: "single_select",
        options: [...CONFIDENCE_OPTIONS],
        optional: false
      }),
      baseQuestion({
        ...metadata,
        label: "Explain your position",
        questionId: `${prefix}_comment`,
        sectionTitle,
        inputType: "textarea",
        rows: 1,
        placeholder: "Why do you agree or disagree? Share the reasoning or evidence behind your answer.",
        optional: true
      })
    ];
  });
}
export {
  CONFIDENCE_OPTIONS,
  buildDelphiRoundTwoQuestions,
  extractDelphiClaims
};
