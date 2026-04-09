export interface QuestionOptions {
  requireEvidence: boolean;
  requireCounterarguments: boolean;
  requireConfidence: boolean;
}

export type SurveyInputType = 'text' | 'textarea' | 'single_select' | 'multi_select' | 'slider';

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
}

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
        obj.inputType === 'slider')
        ? obj.inputType
        : null,
    options:
      obj && Array.isArray(obj.options)
        ? obj.options.filter((option): option is string => typeof option === 'string')
        : null,
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
  };
}

export function isSurveyQuestion(question: QuestionOptions): boolean {
  return (
    !question.requireEvidence &&
    !question.requireCounterarguments &&
    !question.requireConfidence
  );
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
