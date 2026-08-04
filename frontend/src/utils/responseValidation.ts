import type { StructuredResponse } from '../types/structured-input';
import {
  getDocumentTemplateMode,
  htmlToPlainText,
  parseDocumentTemplateFields,
  slugifyDocumentFieldKey,
  type DocumentTemplateField,
} from './documentTemplate';
import { coerceAnswerPosition } from './answers';
import {
  DEFAULT_DIAGNOSTIC_CRITERIA,
  extractQuestionText,
  normalizeQuestion,
  type QuestionInput,
} from './questions';

function getAnswerPosition(answer: unknown): string {
  return htmlToPlainText(coerceAnswerPosition(answer));
}

export function validateDocumentTemplateResponses(
  template: string,
  answers: Record<string, StructuredResponse>,
): { ok: true } | { ok: false; key: string; message: string } {
  if (getDocumentTemplateMode(template) === 'editable') {
    return getAnswerPosition(answers.q1) ? { ok: true } : {
      ok: false,
      key: 'q1',
      message: 'Please complete the document before submitting.',
    };
  }

  const fields = parseDocumentTemplateFields(template);
  const orderedFields = fields.map((field, index) => ({
    field,
    key: `q${index + 1}`,
  }));

  const isVisible = (field: DocumentTemplateField) => {
    if (!field.conditionalOnQuestionId || !field.conditionalOnOption) return true;
    const controllingQuestionId = field.conditionalOnQuestionId;
    const controlling = orderedFields.find(({ field: candidate }) => (
      candidate.questionId === controllingQuestionId ||
      candidate.key === slugifyDocumentFieldKey(controllingQuestionId)
    ));
    if (!controlling) return false;
    const selected = getAnswerPosition(answers[controlling.key])
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean);
    return selected.includes(field.conditionalOnOption);
  };

  const missingField = orderedFields.find(({ field, key }) => {
    if (field.optional) return false;
    if (!isVisible(field)) return false;
    return !getAnswerPosition(answers[key]);
  });

  if (!missingField) return { ok: true };
  return {
    ok: false,
    key: missingField.key,
    message: `Please complete "${missingField.field.label}" before submitting.`,
  };
}

export function validateQuestionResponses(
  questions: QuestionInput[],
  answers: Record<string, StructuredResponse>,
): { ok: true } | { ok: false; key: string; message: string } {
  const normalized = questions.map((question, index) => ({
    key: `q${index + 1}`,
    question: normalizeQuestion(question),
  }));

  const isVisible = (question: ReturnType<typeof normalizeQuestion>) => {
    if (!question.conditionalOnQuestionId || !question.conditionalOnOption) return true;
    const controlling = normalized.find((item) => item.question.questionId === question.conditionalOnQuestionId);
    if (!controlling) return false;
    const selected = getAnswerPosition(answers[controlling.key])
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean);
    return selected.includes(question.conditionalOnOption);
  };

  const missingQuestion = normalized.find(({ key, question }) => {
    if (question.optional) return false;
    if (!isVisible(question)) return false;
    return !isQuestionResponseComplete(question, answers[key]);
  });

  if (!missingQuestion) return { ok: true };
  return {
    ok: false,
    key: missingQuestion.key,
    message: `Please answer "${extractQuestionText(missingQuestion.question)}" before submitting.`,
  };
}

export function isResponseAnswered(answer: StructuredResponse | undefined | null): boolean {
  return getAnswerPosition(answer ?? undefined).length > 0;
}

export function isQuestionResponseComplete(
  question: QuestionInput | ReturnType<typeof normalizeQuestion>,
  answer: StructuredResponse | undefined | null,
): boolean {
  const normalized = normalizeQuestion(question);
  const position = getAnswerPosition(answer ?? undefined);
  if (!position) return false;

  if (normalized.inputType === 'diagnostic_likert') {
    try {
      const ratings = JSON.parse(position || '{}');
      if (!ratings || typeof ratings !== 'object' || Array.isArray(ratings)) return false;
      const criteria = normalized.criteria && normalized.criteria.length > 0
        ? normalized.criteria
        : DEFAULT_DIAGNOSTIC_CRITERIA;
      const allowedOptions = new Set([
        ...(normalized.options ?? []),
        ...(normalized.allowUnsure ? ["Don't know / unsure"] : []),
      ]);
      return criteria.every((criterion) => {
        const selected = ratings[criterion.key];
        return typeof selected === 'string' && selected.trim() !== '' && (
          allowedOptions.size === 0 || allowedOptions.has(selected)
        );
      });
    } catch {
      return false;
    }
  }

  if (normalized.inputType) return true;

  const structured = answer ?? undefined;
  if (normalized.requireEvidence && !structured?.evidence?.trim()) return false;
  if (normalized.requireCounterarguments && !structured?.counterarguments?.trim()) return false;
  if (normalized.requireConfidence && typeof structured?.confidence !== 'number') return false;
  return true;
}
