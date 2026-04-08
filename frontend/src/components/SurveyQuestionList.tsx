import type { StructuredResponse } from '../types/structured-input';
import { emptyStructuredResponse } from '../types/structured-input';
import StructuredInput from './StructuredInput';
import SurveyQuestionInput from './SurveyQuestionInput';
import {
  extractQuestionOptions,
  groupQuestionsBySection,
  isSurveyQuestion,
  normalizeQuestion,
  type QuestionInput,
} from '../utils/questions';

interface SurveyQuestionListProps {
  questions: QuestionInput[];
  formId: string | number;
  responses: Record<string, StructuredResponse>;
  onChange: (key: string, value: StructuredResponse) => void;
  readOnly?: boolean;
  persistDraft?: boolean;
}

export default function SurveyQuestionList({
  questions,
  formId,
  responses,
  onChange,
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

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <section
          key={group.id}
          className={group.title ? 'rounded-2xl border px-4 py-4 sm:px-5' : ''}
          style={
            group.title
              ? {
                  borderColor: 'color-mix(in srgb, var(--border) 78%, transparent)',
                  backgroundColor: 'color-mix(in srgb, var(--foreground) 2%, var(--card))',
                }
              : undefined
          }
        >
          {group.title ? (
            <div className="mb-4 border-b pb-3" style={{ borderColor: 'color-mix(in srgb, var(--border) 75%, transparent)' }}>
              <div
                className="text-[11px] font-semibold uppercase tracking-[0.18em]"
                style={{ color: 'var(--accent)' }}
              >
                Section
              </div>
              <h3 className="mt-1 text-lg font-semibold text-foreground">{group.title}</h3>
            </div>
          ) : null}

          <div className="space-y-5">
            {group.items.map(({ key, index, question }) => {
              const options = extractQuestionOptions(question);
              const surveyQuestion = isSurveyQuestion(question);

              return (
                <div key={key} className="last:mb-0">
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    {question.label}
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
