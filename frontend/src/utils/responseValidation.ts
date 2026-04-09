import type { StructuredResponse } from '../types/structured-input';
import { parseDocumentTemplateFields } from './documentTemplate';
import { extractQuestionText, normalizeQuestion, type QuestionInput } from './questions';

function getAnswerPosition(answer: unknown): string {
  if (typeof answer === 'string') return answer.trim();
  if (answer && typeof answer === 'object' && 'position' in answer) {
    const position = (answer as StructuredResponse).position;
    return typeof position === 'string' ? position.trim() : '';
  }
  return '';
}

export function validateDocumentTemplateResponses(
  template: string,
  answers: Record<string, StructuredResponse>,
): { ok: true } | { ok: false; key: string; message: string } {
  const fields = parseDocumentTemplateFields(template);
  const missingField = fields.find((field, index) => {
    if (field.optional) return false;
    return !getAnswerPosition(answers[`q${index + 1}`]);
  });

  if (!missingField) return { ok: true };
  const key = `q${fields.indexOf(missingField) + 1}`;
  return {
    ok: false,
    key,
    message: `Please complete "${missingField.label}" before submitting.`,
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
    return !getAnswerPosition(answers[key]);
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
