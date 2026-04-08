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
    <div className="space-y-5">
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

          <div className="space-y-5">
            {group.items.map(({ key, index, question }, itemIndex) => {
              const options = extractQuestionOptions(question);
              const surveyQuestion = isSurveyQuestion(question);
              const previousQuestion =
                itemIndex > 0 ? group.items[itemIndex - 1]?.question : null;
              const showGroupPrompt =
                !!question.groupPrompt &&
                question.groupPrompt.trim() !== '' &&
                previousQuestion?.groupPrompt !== question.groupPrompt;

              return (
                <div key={key} className="last:mb-0">
                  {showGroupPrompt ? (
                    <p
                      className="mb-2 text-sm leading-6"
                      style={{ color: 'var(--muted-foreground)' }}
                    >
                      {question.groupPrompt}
                    </p>
                  ) : null}
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
