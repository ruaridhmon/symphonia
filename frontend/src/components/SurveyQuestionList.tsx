import type { StructuredResponse } from '../types/structured-input';
import { emptyStructuredResponse } from '../types/structured-input';
import AnswerStateBadge from './AnswerStateBadge';
import StructuredInput from './StructuredInput';
import SurveyQuestionInput from './SurveyQuestionInput';
import {
  extractQuestionOptions,
  groupQuestionsBySection,
  isSurveyQuestion,
  normalizeQuestion,
  type QuestionInput,
} from '../utils/questions';
import { isResponseAnswered } from '../utils/responseValidation';

interface SurveyQuestionListProps {
  questions: QuestionInput[];
  formId: string | number;
  responses: Record<string, StructuredResponse>;
  onChange: (key: string, value: StructuredResponse) => void;
  highlightedQuestionKey?: string | null;
  readOnly?: boolean;
  persistDraft?: boolean;
}

export default function SurveyQuestionList({
  questions,
  formId,
  responses,
  onChange,
  highlightedQuestionKey = null,
  readOnly = false,
  persistDraft = true,
}: SurveyQuestionListProps) {
  const items = questions
    .map((rawQuestion, index) => ({
      key: `q${index + 1}`,
      index,
      question: normalizeQuestion(rawQuestion),
    }))
    .filter((item) => item.question.label.trim());

  const groups = groupQuestionsBySection(items);

  function isQuestionVisible(question: ReturnType<typeof normalizeQuestion>) {
    if (!question.conditionalOnQuestionId || !question.conditionalOnOption) return true;
    const controllingIndex = items.find(
      (item) => item.question.questionId === question.conditionalOnQuestionId,
    );
    if (!controllingIndex) return false;
    const controllingResponse = responses[controllingIndex.key] ?? emptyStructuredResponse();
    const selected = (controllingResponse.position || '')
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean);
    return selected.includes(question.conditionalOnOption);
  }

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <section
          key={group.id}
          className={group.title ? 'rounded-[1.4rem] border px-4 py-4 sm:px-5' : ''}
          style={
            group.title
              ? {
                  borderColor: 'color-mix(in srgb, var(--border) 78%, transparent)',
                  backgroundColor: 'color-mix(in srgb, var(--background) 76%, var(--card) 24%)',
                }
              : undefined
          }
        >
          {group.title ? (
            <div className="mb-4 border-b pb-3" style={{ borderColor: 'color-mix(in srgb, var(--border) 75%, transparent)' }}>
              <h3
                className="text-sm font-semibold"
                style={{ color: 'var(--accent)' }}
              >
                Section: {group.title}
              </h3>
            </div>
          ) : null}

          <div className="space-y-4">
            {group.items.map(({ key, index, question }, itemIndex) => {
              if (!isQuestionVisible(question)) return null;
              const options = extractQuestionOptions(question);
              const surveyQuestion = isSurveyQuestion(question);
              const previousQuestion =
                itemIndex > 0 ? group.items[itemIndex - 1]?.question : null;
              const answered = isResponseAnswered(responses[key]);
              const highlighted = !readOnly && highlightedQuestionKey === key;
              const showGroupPrompt =
                !!question.groupPrompt &&
                question.groupPrompt.trim() !== '' &&
                previousQuestion?.groupPrompt !== question.groupPrompt;

              return (
                <div
                  key={key}
                  className="last:mb-0 rounded-[1.35rem] px-3 py-2.5 sm:px-4 sm:py-3"
                  data-question-key={key}
                  style={{
                    border: highlighted
                      ? '1px solid color-mix(in srgb, var(--destructive) 42%, var(--border))'
                      : '1px solid transparent',
                    backgroundColor: highlighted
                      ? 'color-mix(in srgb, var(--destructive) 5%, transparent)'
                      : 'color-mix(in srgb, var(--foreground) 1.5%, transparent)',
                    scrollMarginTop: '6rem',
                  }}
                >
                  {showGroupPrompt ? (
                    <p
                      className="mb-2 text-sm leading-6"
                      style={{ color: 'var(--muted-foreground)' }}
                    >
                      {question.groupPrompt}
                    </p>
                  ) : null}
                  <label className="mb-2.5 flex flex-wrap items-center gap-2 text-sm font-medium text-foreground">
                    <span>{question.label}</span>
                    {readOnly ? (
                      <AnswerStateBadge
                        answered={answered}
                        answeredLabel="Answered"
                        pendingLabel="No response"
                        showLabel
                      />
                    ) : (
                      <>
                        <span
                          className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium"
                          style={{
                            backgroundColor: question.optional
                              ? 'color-mix(in srgb, var(--foreground) 5%, transparent)'
                              : 'color-mix(in srgb, var(--accent) 10%, transparent)',
                            color: question.optional ? 'var(--muted-foreground)' : 'var(--accent)',
                          }}
                        >
                          {question.optional ? 'Optional' : 'Required'}
                        </span>
                        <AnswerStateBadge answered={answered} />
                      </>
                    )}
                  </label>
                  {surveyQuestion ? (
                    <SurveyQuestionInput
                      question={question}
                      value={responses[key] ?? emptyStructuredResponse()}
                      onChange={(value) => onChange(key, value)}
                      readOnly={readOnly}
                    />
                  ) : (
                    <StructuredInput
                      questionIndex={index}
                      formId={formId}
                      value={responses[key] ?? emptyStructuredResponse()}
                      onChange={(value) => onChange(key, value)}
                      readOnly={readOnly}
                      showEvidence={options.requireEvidence}
                      showCounterarguments={options.requireCounterarguments}
                      showConfidence={options.requireConfidence}
                      persistDraft={persistDraft}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
