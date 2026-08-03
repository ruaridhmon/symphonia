export interface QuestionOptions {
  requireEvidence: boolean;
  requireCounterarguments: boolean;
  requireConfidence: boolean;
}

export type SurveyInputType =
  | 'text'
  | 'textarea'
  | 'single_select'
  | 'multi_select'
  | 'slider'
  | 'likert'
  | 'diagnostic_likert';

export const DEFAULT_LIKERT_OPTIONS = [
  'Unimportant',
  'Somewhat important',
  'Moderately important',
  'Very important',
  'Essential',
] as const;

export interface ConfigurableQuestion extends QuestionOptions {
  label: string;
  questionId?: string | null;
  sectionTitle?: string | null;
  helpText?: string | null;
  groupPrompt?: string | null;
  optional?: boolean | null;
  conditionalOnQuestionId?: string | null;
  conditionalOnOption?: string | null;
  inputType?: SurveyInputType | null;
  options?: string[] | null;
  allowUnsure?: boolean | null;
  maxSelections?: number | null;
  minValue?: number | null;
  maxValue?: number | null;
  minLabel?: string | null;
  midLabel?: string | null;
  maxLabel?: string | null;
  importedFromQuestionnaire?: boolean | null;
  fieldType?: 'short' | 'long' | null;
  rows?: number | null;
  placeholder?: string | null;
  criteria?: DiagnosticLikertCriterion[] | null;
  previousRoundSynthesis?: string | null;
}

export interface DiagnosticLikertCriterion {
  key: string;
  label: string;
  prompt?: string | null;
  color?: string | null;
}

export const DEFAULT_DIAGNOSTIC_CRITERIA: DiagnosticLikertCriterion[] = [
  {
    key: 'diagnostic_validity',
    label: 'Diagnostic validity',
    prompt: 'Important in the manifestation of the condition?',
    color: '#168bd1',
  },
  {
    key: 'clinical_utility',
    label: 'Clinical utility',
    prompt: 'Useful for distinguishing clinically relevant cases?',
    color: '#3f8f24',
  },
  {
    key: 'prognostic_value',
    label: 'Prognostic value',
    prompt: 'Useful for predicting persistence, relapse, or future risk?',
    color: '#b76612',
  },
];

/** Question type that accepts both strings and structured objects */
export type QuestionInput = string | Record<string, unknown>;

const DEFAULT_QUESTION_OPTIONS: QuestionOptions = {
  requireEvidence: true,
  requireCounterarguments: true,
  requireConfidence: true,
};

/**
 * Shared utility for extracting question text from question objects or strings.
 *
 * Questions from the API may be plain strings OR structured objects like:
 *   { label: "What are the primary...", requireEvidence: false, requireConfidence: true }
 *
 * This helper normalises both shapes into a display string.
 */
export function extractQuestionText(q: unknown): string {
  if (typeof q === 'string') return q;
  if (q && typeof q === 'object') {
    const obj = q as Record<string, unknown>;
    return String(obj.text || obj.label || obj.question || '');
  }
  return '';
}

export function extractQuestionOptions(q: unknown): QuestionOptions {
  if (!q || typeof q !== 'object') {
    return DEFAULT_QUESTION_OPTIONS;
  }

  const obj = q as Record<string, unknown>;
  const requireEvidence =
    typeof obj.requireEvidence === 'boolean'
      ? obj.requireEvidence
      : DEFAULT_QUESTION_OPTIONS.requireEvidence;
  const requireConfidence =
    typeof obj.requireConfidence === 'boolean'
      ? obj.requireConfidence
      : DEFAULT_QUESTION_OPTIONS.requireConfidence;
  const requireCounterarguments =
    typeof obj.requireCounterarguments === 'boolean'
      ? obj.requireCounterarguments
      : !(!requireEvidence && !requireConfidence);

  return {
    requireEvidence,
    requireCounterarguments,
    requireConfidence,
  };
}

export function normalizeQuestion(q: QuestionInput): ConfigurableQuestion {
  const obj = q && typeof q === 'object' ? (q as Record<string, unknown>) : null;
  return {
    label: extractQuestionText(q),
    ...extractQuestionOptions(q),
    questionId: obj && typeof obj.questionId === 'string' ? obj.questionId : null,
    sectionTitle: obj && typeof obj.sectionTitle === 'string' ? obj.sectionTitle : null,
    helpText: obj && typeof obj.helpText === 'string' ? obj.helpText : null,
    groupPrompt: obj && typeof obj.groupPrompt === 'string' ? obj.groupPrompt : null,
    optional: obj && typeof obj.optional === 'boolean' ? obj.optional : null,
    conditionalOnQuestionId:
      obj && typeof obj.conditionalOnQuestionId === 'string' ? obj.conditionalOnQuestionId : null,
    conditionalOnOption:
      obj && typeof obj.conditionalOnOption === 'string' ? obj.conditionalOnOption : null,
    inputType:
      obj &&
      (obj.inputType === 'text' ||
        obj.inputType === 'textarea' ||
        obj.inputType === 'single_select' ||
        obj.inputType === 'multi_select' ||
        obj.inputType === 'slider' ||
        obj.inputType === 'likert' ||
        obj.inputType === 'diagnostic_likert')
        ? obj.inputType === 'textarea'
          ? 'text'
          : obj.inputType
        : null,
    options:
      obj && Array.isArray(obj.options)
        ? obj.options.filter((option): option is string => typeof option === 'string')
        : null,
    allowUnsure: obj && typeof obj.allowUnsure === 'boolean' ? obj.allowUnsure : null,
    maxSelections: obj && typeof obj.maxSelections === 'number' ? obj.maxSelections : null,
    minValue: obj && typeof obj.minValue === 'number' ? obj.minValue : null,
    maxValue: obj && typeof obj.maxValue === 'number' ? obj.maxValue : null,
    minLabel: obj && typeof obj.minLabel === 'string' ? obj.minLabel : null,
    midLabel: obj && typeof obj.midLabel === 'string' ? obj.midLabel : null,
    maxLabel: obj && typeof obj.maxLabel === 'string' ? obj.maxLabel : null,
    importedFromQuestionnaire:
      obj && typeof obj.importedFromQuestionnaire === 'boolean'
        ? obj.importedFromQuestionnaire
        : null,
    fieldType:
      obj && (obj.fieldType === 'short' || obj.fieldType === 'long')
        ? obj.fieldType
        : null,
    rows: obj && typeof obj.rows === 'number' ? obj.rows : null,
    placeholder: obj && typeof obj.placeholder === 'string' ? obj.placeholder : null,
    criteria:
      obj && Array.isArray(obj.criteria)
        ? obj.criteria
            .map((criterion): DiagnosticLikertCriterion | null => {
              if (!criterion || typeof criterion !== 'object') return null;
              const candidate = criterion as Record<string, unknown>;
              if (typeof candidate.key !== 'string' || typeof candidate.label !== 'string') return null;
              return {
                key: candidate.key,
                label: candidate.label,
                prompt: typeof candidate.prompt === 'string' ? candidate.prompt : null,
                color: typeof candidate.color === 'string' ? candidate.color : null,
              };
            })
            .filter((criterion): criterion is DiagnosticLikertCriterion => criterion !== null)
        : null,
    previousRoundSynthesis:
      obj && typeof obj.previousRoundSynthesis === 'string'
        ? obj.previousRoundSynthesis
        : obj && typeof obj.previous_round_synthesis === 'string'
          ? obj.previous_round_synthesis
          : obj && typeof obj.previousRoundResultsSummary === 'string'
            ? obj.previousRoundResultsSummary
            : null,
  };
}

export function isSurveyQuestion(question: QuestionOptions | ConfigurableQuestion): boolean {
  return !!('inputType' in question && question.inputType);
}

export function isTypedSurveyQuestion(question: ConfigurableQuestion): boolean {
  return isSurveyQuestion(question) && !!question.inputType;
}

export interface QuestionWithIndex {
  key: string;
  index: number;
  question: ConfigurableQuestion;
}

export interface QuestionSectionGroup {
  id: string;
  title: string | null;
  items: QuestionWithIndex[];
}

export function groupQuestionsBySection(items: QuestionWithIndex[]): QuestionSectionGroup[] {
  const groups: QuestionSectionGroup[] = [];

  items.forEach((item) => {
    const sectionTitle = item.question.sectionTitle?.trim() || null;
    const lastGroup = groups[groups.length - 1];
    if (lastGroup && lastGroup.title === sectionTitle) {
      lastGroup.items.push(item);
      return;
    }

    groups.push({
      id: `${sectionTitle ?? 'ungrouped'}-${groups.length + 1}`,
      title: sectionTitle,
      items: [item],
    });
  });

  return groups;
}
