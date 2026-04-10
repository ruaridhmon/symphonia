import { emptyStructuredResponse, type StructuredResponse } from '../types/structured-input';
import RichDocumentEditor from './RichDocumentEditor';
import { buildDocumentTemplateLines, getDocumentTemplateContent, isEditableDocumentTemplate } from '../utils/documentTemplate';
import { isResponseAnswered } from '../utils/responseValidation';

interface DocumentTemplateResponseProps {
  template: string;
  answers: Record<string, StructuredResponse>;
  onChange?: (key: string, value: StructuredResponse) => void;
  highlightedQuestionKey?: string | null;
  readOnly?: boolean;
}

export default function DocumentTemplateResponse({
  template,
  answers,
  onChange,
  highlightedQuestionKey = null,
  readOnly = false,
}: DocumentTemplateResponseProps) {
  if (isEditableDocumentTemplate(template)) {
    const key = 'q1';
    const response = answers[key];
    const value = response?.position || getDocumentTemplateContent(template);
    const highlighted = !readOnly && highlightedQuestionKey === key;

    return (
      <div
        className="rounded-xl p-4 sm:p-5"
        data-question-key={key}
        style={{
          backgroundColor: 'color-mix(in srgb, var(--foreground) 1.5%, var(--card))',
          border: highlighted
            ? '1px solid color-mix(in srgb, var(--destructive) 42%, var(--border))'
            : '1px solid var(--border)',
          scrollMarginTop: '6rem',
        }}
      >
        <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
          <span>Edit your copy of the document</span>
          {!readOnly ? (
            <span
              aria-label={isResponseAnswered(response) ? 'Document ready to submit' : 'Document not ready'}
              className="inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-semibold"
              style={{
                border: isResponseAnswered(response)
                  ? '1px solid color-mix(in srgb, #138a52 35%, transparent)'
                  : '1px solid color-mix(in srgb, var(--border) 90%, transparent)',
                backgroundColor: isResponseAnswered(response)
                  ? 'color-mix(in srgb, #138a52 12%, transparent)'
                  : 'transparent',
                color: isResponseAnswered(response) ? '#138a52' : 'var(--muted-foreground)',
              }}
            >
              {isResponseAnswered(response) ? '✓' : ''}
            </span>
          ) : null}
        </div>
        <RichDocumentEditor
          value={value}
          readOnly={readOnly}
          placeholder="Write the document here…"
          minHeight={readOnly ? '14rem' : '20rem'}
          onChange={(nextValue) => onChange?.(key, { ...(response ?? emptyStructuredResponse()), position: nextValue })}
        />
      </div>
    );
  }

  const lines = buildDocumentTemplateLines(template, answers);

  return (
    <div
      className="rounded-xl p-4 sm:p-5"
      style={{
        background:
          'linear-gradient(180deg, color-mix(in srgb, var(--card) 96%, white) 0%, color-mix(in srgb, var(--foreground) 1%, var(--card)) 100%)',
        border: '1px solid var(--border)',
      }}
    >
      <div
        className="rounded-2xl px-4 py-5 sm:px-5 sm:py-6"
        style={{
          backgroundColor: 'color-mix(in srgb, white 88%, var(--background))',
          border: '1px solid color-mix(in srgb, var(--border) 68%, transparent)',
          boxShadow: '0 10px 24px -20px rgba(15, 23, 42, 0.38)',
        }}
      >
        <div className="space-y-3">
          {lines.map((line) => {
            if (line.segments.length === 0) {
              return <div key={line.key} style={{ minHeight: '0.9rem' }} aria-hidden="true" />;
            }

            return (
              <div
                key={line.key}
                className="flex flex-wrap items-start gap-x-2 gap-y-2"
                style={{ minHeight: '1.9rem' }}
              >
                {line.segments.map((segment, segmentIndex) => {
                  if (segment.type === 'text') {
                    return (
                      <span
                        key={`${line.key}-text-${segmentIndex}`}
                        className="text-sm whitespace-pre-wrap"
                        style={{ color: 'var(--foreground)', lineHeight: 1.75 }}
                      >
                        {segment.value}
                      </span>
                    );
                  }

                  const { questionKey } = segment.value;
                  const response = answers[questionKey] ?? segment.response;
                  const value = response.position || '';
                  const answered = isResponseAnswered(response);
                  const highlighted = !readOnly && highlightedQuestionKey === questionKey;
                  const isShort = segment.value.fieldType === 'short';

                  return (
                    <span
                      key={`${line.key}-${questionKey}-${segmentIndex}`}
                      className="inline-flex min-w-[15rem] max-w-full flex-col gap-1 rounded-2xl px-3 py-2.5 align-top"
                      data-question-key={questionKey}
                      style={{
                        width: isShort ? 'min(100%, 22rem)' : 'min(100%, 34rem)',
                        backgroundColor: highlighted
                          ? 'color-mix(in srgb, var(--destructive) 4%, white)'
                          : 'color-mix(in srgb, var(--background) 78%, white)',
                        border: highlighted
                          ? '1px solid color-mix(in srgb, var(--destructive) 42%, var(--border))'
                          : '1px solid color-mix(in srgb, var(--border) 88%, transparent)',
                        boxShadow: answered
                          ? 'inset 0 0 0 1px color-mix(in srgb, #138a52 18%, transparent)'
                          : 'none',
                        scrollMarginTop: '6rem',
                      }}
                    >
                      <span className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--muted-foreground)' }}>
                          {segment.value.label}
                        </span>
                        <span
                          className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold"
                          style={{
                            backgroundColor: segment.value.optional
                              ? 'color-mix(in srgb, var(--foreground) 5%, transparent)'
                              : 'color-mix(in srgb, var(--accent) 10%, transparent)',
                            color: segment.value.optional ? 'var(--muted-foreground)' : 'var(--accent)',
                          }}
                        >
                          {segment.value.optional ? 'Optional' : 'Required'}
                        </span>
                        {!readOnly ? (
                          <span
                            aria-label={answered ? 'Question answered' : 'Question not answered'}
                            title={answered ? 'Answered' : 'Not answered'}
                            className="inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-semibold"
                            style={{
                              border: answered
                                ? '1px solid color-mix(in srgb, #138a52 35%, transparent)'
                                : '1px solid color-mix(in srgb, var(--border) 90%, transparent)',
                              backgroundColor: answered
                                ? 'color-mix(in srgb, #138a52 12%, transparent)'
                                : 'transparent',
                              color: answered ? '#138a52' : 'var(--muted-foreground)',
                            }}
                          >
                            {answered ? '✓' : ''}
                          </span>
                        ) : null}
                      </span>
                      {readOnly ? (
                        <span
                          className="rounded-xl px-3 py-2.5 text-sm whitespace-pre-wrap"
                          style={{
                            backgroundColor: 'color-mix(in srgb, white 75%, var(--background))',
                            border: '1px solid color-mix(in srgb, var(--border) 72%, transparent)',
                            color: value ? 'var(--foreground)' : 'var(--muted-foreground)',
                            minHeight: isShort ? undefined : '7rem',
                            lineHeight: 1.6,
                          }}
                        >
                          {value || 'No response provided.'}
                        </span>
                      ) : isShort ? (
                        <input
                          value={value}
                          onChange={(event) =>
                            onChange?.(questionKey, { ...response, position: event.target.value })
                          }
                          placeholder={segment.value.placeholder}
                          className="w-full rounded-xl px-3 py-2.5 text-sm"
                          style={{
                            border: '1px solid var(--input)',
                            backgroundColor: 'white',
                            color: 'var(--foreground)',
                            outline: 'none',
                          }}
                        />
                      ) : (
                        <textarea
                          value={value}
                          onChange={(event) =>
                            onChange?.(questionKey, { ...response, position: event.target.value })
                          }
                          placeholder={segment.value.placeholder}
                          rows={segment.value.rows}
                          className="w-full rounded-xl px-3 py-3 text-sm"
                          style={{
                            border: '1px solid var(--input)',
                            backgroundColor: 'white',
                            color: 'var(--foreground)',
                            outline: 'none',
                            resize: 'vertical',
                            lineHeight: 1.6,
                          }}
                        />
                      )}
                    </span>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
