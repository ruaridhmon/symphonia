import type { QuestionInput } from './questions';

export interface DelphiClaim {
  number: number;
  text: string;
  support: number | null;
  oppose: number | null;
  uncertain: number | null;
  notClassified: number | null;
  total: number | null;
}

const RATING_OPTIONS = [
  'Strongly disagree',
  'Disagree',
  'Neither agree nor disagree',
  'Agree',
  'Strongly agree',
];

const FOLLOW_UP_RATINGS = [
  'Strongly disagree',
  'Disagree',
  'Neither agree nor disagree',
  "Don't know / unsure",
];

function detailCount(container: Element, label: string): number | null {
  const detail = Array.from(container.querySelectorAll('details')).find((item) =>
    item.querySelector('summary')?.textContent?.toLowerCase().includes(label),
  );
  return detail ? detail.querySelectorAll('li').length : null;
}

export function extractDelphiClaims(synthesisHtml: string): DelphiClaim[] {
  if (!synthesisHtml.trim() || typeof DOMParser === 'undefined') return [];
  const document = new DOMParser().parseFromString(synthesisHtml, 'text/html');
  const claims: DelphiClaim[] = [];

  for (const paragraph of Array.from(document.querySelectorAll('p'))) {
    const line = paragraph.textContent?.replace(/\s+/g, ' ').trim() ?? '';
    const match = line.match(/^\S*\s*Claim\s+(\d+)\s*:/i);
    if (!match) continue;

    const text = paragraph.querySelector('strong')?.textContent?.replace(/\s+/g, ' ').trim()
      || line.replace(/^\S*\s*Claim\s+\d+\s*:\s*/i, '').trim();
    if (!text) continue;

    const container = paragraph.closest('div') ?? paragraph.parentElement ?? paragraph;
    const peopleLine = Array.from(container.querySelectorAll('p'))
      .map((item) => item.textContent?.replace(/\s+/g, ' ').trim() ?? '')
      .find((item) => /^People making this claim:/i.test(item));
    const peopleMatch = peopleLine?.match(/(\d+)\s+of\s+(\d+)/i);
    const support = detailCount(container, 'supporting expert') ?? (peopleMatch ? Number(peopleMatch[1]) : null);
    const oppose = detailCount(container, 'opposing expert');
    const uncertain = detailCount(container, 'uncertain expert');
    const total = peopleMatch ? Number(peopleMatch[2]) : null;
    const known = [support, oppose, uncertain].every((value) => value !== null)
      ? Number(support) + Number(oppose) + Number(uncertain)
      : null;

    claims.push({
      number: Number(match[1]),
      text,
      support,
      oppose,
      uncertain,
      total,
      notClassified: total !== null && known !== null ? Math.max(0, total - known) : null,
    });
  }

  return claims.filter((claim, index, all) =>
    all.findIndex((candidate) => candidate.number === claim.number && candidate.text === claim.text) === index,
  );
}

function groupFeedback(claim: DelphiClaim): string {
  const counts = [
    claim.support !== null ? `${claim.support} support` : null,
    claim.oppose !== null ? `${claim.oppose} oppose` : null,
    claim.uncertain !== null ? `${claim.uncertain} uncertain` : null,
    claim.notClassified !== null ? `${claim.notClassified} not classified` : null,
  ].filter(Boolean).join(' · ');

  return [
    counts ? `Round 1: ${counts}.` : 'Review the Round 1 result before re-rating.',
    'The previous-round summary contains the anonymised original excerpts.',
    'Consensus is not required: retain your view if the evidence still supports it.',
  ].join(' ');
}

function baseQuestion(overrides: Record<string, unknown>): Record<string, unknown> {
  return {
    requireEvidence: false,
    requireCounterarguments: false,
    requireConfidence: false,
    importedFromQuestionnaire: false,
    ...overrides,
  };
}

export function buildDelphiRoundTwoQuestions(synthesisHtml: string): QuestionInput[] {
  return extractDelphiClaims(synthesisHtml).flatMap((claim) => {
    const prefix = `claim_${claim.number}`;
    const sectionTitle = `Claim ${claim.number}: ${claim.text}`;
    return [
      baseQuestion({
        label: 'Having reviewed the group feedback, how far do you agree with this claim?',
        questionId: `${prefix}_rating`,
        sectionTitle,
        groupPrompt: groupFeedback(claim),
        inputType: 'likert',
        options: RATING_OPTIONS,
        allowUnsure: true,
        optional: false,
      }),
      baseQuestion({
        label: 'What is the main source of your disagreement or uncertainty?',
        questionId: `${prefix}_reason`,
        sectionTitle,
        inputType: 'single_select',
        options: [
          'Evidence or interpretation',
          'Wording of the claim',
          'Practical feasibility',
          'Values or priorities',
          'Missing conditions or assumptions',
          'Other',
        ],
        optional: false,
        conditionalOnQuestionId: `${prefix}_rating`,
        conditionalOnOptions: FOLLOW_UP_RATINGS,
      }),
      baseQuestion({
        label: 'Explain what would need to be clarified, evidenced, or changed.',
        questionId: `${prefix}_explanation`,
        sectionTitle,
        inputType: 'textarea',
        rows: 4,
        placeholder: 'Explain the precise point of disagreement or uncertainty',
        optional: false,
        conditionalOnQuestionId: `${prefix}_rating`,
        conditionalOnOptions: FOLLOW_UP_RATINGS,
      }),
      baseQuestion({
        label: 'If helpful, suggest revised wording for this claim.',
        questionId: `${prefix}_revision`,
        sectionTitle,
        inputType: 'textarea',
        rows: 3,
        placeholder: 'Optional revised wording',
        optional: true,
        conditionalOnQuestionId: `${prefix}_rating`,
        conditionalOnOptions: FOLLOW_UP_RATINGS,
      }),
    ];
  });
}
