import type { StructuredResponse } from '../types/structured-input';
import { emptyStructuredResponse } from '../types/structured-input';
import { useEffect, useMemo, useState } from 'react';
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
import { isQuestionResponseComplete, isResponseAnswered } from '../utils/responseValidation';
import LoadingButton from './LoadingButton';

interface SurveyQuestionListProps {
  questions: QuestionInput[];
  formId: string | number;
  responses: Record<string, StructuredResponse>;
  onChange: (key: string, value: StructuredResponse) => void;
  highlightedQuestionKey?: string | null;
  readOnly?: boolean;
  persistDraft?: boolean;
  presentation?: 'default' | 'diagnosticLikert';
  diagnosticMode?: 'single' | 'accordion';
  currentQuestionIndex?: number;
  onQuestionIndexChange?: (index: number) => void;
  onSectionNavigationChange?: (active: boolean) => void;
  onSubmit?: () => void;
  submitLabel?: string;
  submitLoading?: boolean;
  submitLoadingLabel?: string;
}

export default function SurveyQuestionList({
  questions,
  formId,
  responses,
  onChange,
  highlightedQuestionKey = null,
  readOnly = false,
  persistDraft = true,
  presentation = 'default',
  diagnosticMode,
  currentQuestionIndex,
  onQuestionIndexChange,
  onSectionNavigationChange,
  onSubmit,
  submitLabel = 'Submit',
  submitLoading = false,
  submitLoadingLabel = 'Submitting...',
}: SurveyQuestionListProps) {
  const items = questions
    .map((rawQuestion, index) => ({
      key: `q${index + 1}`,
      index,
      question: normalizeQuestion(rawQuestion),
    }))
    .filter((item) => item.question.label.trim());

  const groups = groupQuestionsBySection(items);
  const isDiagnosticSingle = presentation === 'diagnosticLikert' && diagnosticMode === 'single' && !readOnly;
  const [internalQuestionIndex, setInternalQuestionIndex] = useState(0);
  const activeQuestionIndex = currentQuestionIndex ?? internalQuestionIndex;
  const clampedQuestionIndex = Math.min(Math.max(activeQuestionIndex, 0), Math.max(items.length - 1, 0));

  const answeredCount = useMemo(
    () => items.reduce((count, item) => (
      isQuestionResponseComplete(item.question, responses[item.key]) ? count + 1 : count
    ), 0),
    [items, responses],
  );

  const progressPercent = items.length > 0 ? Math.round((answeredCount / items.length) * 100) : 0;
  const activeItem = items[clampedQuestionIndex];
  const activeAnswered = activeItem ? isQuestionResponseComplete(activeItem.question, responses[activeItem.key]) : false;
  const lastAnsweredIndex = items.reduce((lastIndex, item, index) => (
    isQuestionResponseComplete(item.question, responses[item.key]) ? index : lastIndex
  ), -1);
  const furthestAllowedIndex = Math.min(
    Math.max(0, items.length - 1),
    Math.max(clampedQuestionIndex, lastAnsweredIndex + 1, 0),
  );
  const isLastQuestion = clampedQuestionIndex >= items.length - 1;

  useEffect(() => {
    onSectionNavigationChange?.(isDiagnosticSingle);
  }, [isDiagnosticSingle, onSectionNavigationChange]);

  useEffect(() => {
    if (!isDiagnosticSingle) return;
    if (clampedQuestionIndex === activeQuestionIndex) return;
    setQuestionIndex(clampedQuestionIndex);
  }, [activeQuestionIndex, clampedQuestionIndex, isDiagnosticSingle]);

  function setQuestionIndex(index: number) {
    const nextIndex = Math.min(Math.max(index, 0), Math.max(items.length - 1, 0));
    if (currentQuestionIndex === undefined) setInternalQuestionIndex(nextIndex);
    onQuestionIndexChange?.(nextIndex);
  }

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

  if (isDiagnosticSingle) {
    return (
      <div className="space-y-2.5">
        <div
          className="my-4 rounded-xl p-2.5 sm:p-4"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--muted) 34%, var(--card))',
            border: '1px solid color-mix(in srgb, var(--border) 72%, transparent)',
          }}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--muted-foreground)' }}>
                Progress
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-foreground">
                  Question {clampedQuestionIndex + 1} of {items.length}
                </span>
                <span
                  className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold"
                  style={{
                    backgroundColor: activeAnswered
                      ? 'color-mix(in srgb, var(--success) 12%, transparent)'
                      : 'color-mix(in srgb, var(--foreground) 7%, transparent)',
                    color: activeAnswered ? 'var(--success)' : 'var(--muted-foreground)',
                  }}
                >
                  {activeAnswered ? 'Answered' : 'Not answered'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-md text-base font-semibold transition-colors"
                style={{
                  border: '1px solid color-mix(in srgb, var(--border) 80%, transparent)',
                  backgroundColor: 'var(--background)',
                  color: clampedQuestionIndex === 0 ? 'var(--muted-foreground)' : 'var(--foreground)',
                  opacity: clampedQuestionIndex === 0 ? 0.55 : 1,
                }}
                disabled={clampedQuestionIndex === 0}
                onClick={() => setQuestionIndex(clampedQuestionIndex - 1)}
                aria-label="Previous question"
              >
                ‹
              </button>
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-md text-base font-semibold transition-colors"
                style={{
                  border: '1px solid color-mix(in srgb, var(--border) 80%, transparent)',
                  backgroundColor: 'var(--background)',
                  color: isLastQuestion || !activeAnswered ? 'var(--muted-foreground)' : 'var(--foreground)',
                  opacity: isLastQuestion || !activeAnswered ? 0.55 : 1,
                }}
                disabled={isLastQuestion || !activeAnswered}
                onClick={() => setQuestionIndex(clampedQuestionIndex + 1)}
                aria-label="Next question"
              >
                ›
              </button>
            </div>
          </div>
          <div className="mt-3" aria-label={`Completion ${progressPercent}%`}>
            <div className="mb-1.5 flex items-center justify-between gap-3 text-xs font-medium">
              <span style={{ color: 'var(--muted-foreground)' }}>
                {answeredCount} of {items.length} answered
              </span>
              <span style={{ color: 'var(--foreground)' }}>{progressPercent}% complete</span>
            </div>
            <div
              className="h-2 w-full overflow-hidden rounded-full"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progressPercent}
              style={{ backgroundColor: 'color-mix(in srgb, var(--foreground) 10%, transparent)' }}
            >
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%`, backgroundColor: 'var(--accent)' }}
              />
            </div>
          </div>
          <div
            className="mt-3 hidden gap-1.5 sm:grid"
            style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(2rem, 1fr))' }}
            aria-label="Question progress"
          >
            {items.map((item, index) => {
              const selected = index === clampedQuestionIndex;
              const answered = isQuestionResponseComplete(item.question, responses[item.key]);
              const disabled = index > furthestAllowedIndex;
              return (
                <button
                  key={item.key}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    if (!disabled) setQuestionIndex(index);
                  }}
                  className="relative flex h-8 min-w-8 items-center justify-center rounded-md text-xs font-semibold transition-colors"
                  style={{
                    border: selected
                      ? '1px solid color-mix(in srgb, var(--accent) 54%, var(--border))'
                      : '1px solid color-mix(in srgb, var(--border) 78%, transparent)',
                    backgroundColor: selected
                      ? 'color-mix(in srgb, var(--accent) 10%, var(--background))'
                      : answered
                        ? 'color-mix(in srgb, var(--success) 8%, var(--background))'
                        : 'var(--background)',
                    color: selected
                      ? 'var(--accent)'
                      : answered
                        ? 'color-mix(in srgb, var(--success) 78%, var(--foreground))'
                        : 'var(--foreground)',
                    boxShadow: selected ? '0 0 0 2px color-mix(in srgb, var(--accent) 10%, transparent)' : 'none',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    opacity: disabled ? 0.55 : 1,
                  }}
                  aria-current={selected ? 'step' : undefined}
                  aria-label={`Question ${index + 1}${answered ? ', completed' : ''}`}
                  title={`Question ${index + 1}${answered ? ' completed' : ''}`}
                >
                  {index + 1}
                </button>
              );
            })}
          </div>
        </div>

        {activeItem ? (
          <div
            className="last:mb-0 rounded-xl px-3 py-3 sm:px-4 sm:py-4"
            data-question-key={activeItem.key}
            style={{
              border: highlightedQuestionKey === activeItem.key
                ? '1px solid color-mix(in srgb, var(--destructive) 42%, var(--border))'
                : '1px solid transparent',
              backgroundColor: 'var(--card)',
              scrollMarginTop: '6rem',
            }}
          >
            <div className="mb-2 flex flex-wrap items-center gap-2 text-lg font-semibold leading-7 text-foreground sm:text-xl">
              <span>{activeItem.question.label.replace(/^question:\s*/i, '')}</span>
              <AnswerStateBadge answered={activeAnswered} answeredLabel="Answered" pendingLabel="No response" showLabel />
            </div>
            <SurveyQuestionInput
              question={activeItem.question}
              value={responses[activeItem.key] ?? emptyStructuredResponse()}
              onChange={(value) => onChange(activeItem.key, value)}
              readOnly={readOnly}
            />
          </div>
        ) : null}

        {onSubmit ? (
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              className="w-full rounded-lg px-4 py-3 text-sm font-semibold sm:w-auto"
              disabled={clampedQuestionIndex === 0}
              onClick={() => setQuestionIndex(clampedQuestionIndex - 1)}
              style={{
                border: '1px solid color-mix(in srgb, var(--border) 82%, transparent)',
                backgroundColor: 'var(--background)',
                color: clampedQuestionIndex === 0 ? 'var(--muted-foreground)' : 'var(--foreground)',
                opacity: clampedQuestionIndex === 0 ? 0.55 : 1,
              }}
            >
              Previous
            </button>
            {isLastQuestion ? (
              <LoadingButton
                variant="accent"
                size="lg"
                className="w-full"
                loading={submitLoading}
                loadingText={submitLoadingLabel}
                onClick={onSubmit}
              >
                {submitLabel}
              </LoadingButton>
            ) : (
              <button
                type="button"
                className="w-full rounded-lg px-4 py-3 text-sm font-semibold"
                disabled={!activeAnswered}
                onClick={() => setQuestionIndex(clampedQuestionIndex + 1)}
                style={{
                  border: '1px solid color-mix(in srgb, var(--accent) 35%, transparent)',
                  backgroundColor: 'var(--accent)',
                  color: 'var(--accent-foreground)',
                  opacity: activeAnswered ? 1 : 0.55,
                }}
              >
                Save and next
              </button>
            )}
          </div>
        ) : null}
      </div>
    );
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
