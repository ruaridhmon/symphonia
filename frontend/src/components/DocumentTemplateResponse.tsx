import type { StructuredResponse } from '../types/structured-input';
import { buildDocumentTemplatePreview } from '../utils/documentTemplate';
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
  const blocks = buildDocumentTemplatePreview(template, answers);

  return (
    <div
      className="rounded-xl p-4 sm:p-5"
      style={{
        backgroundColor: 'color-mix(in srgb, var(--foreground) 1.5%, var(--card))',
        border: '1px solid var(--border)',
      }}
    >
      <div className="space-y-4">
        {blocks.map((block, index) => {
          if (block.type === 'text') {
            const parts = block.value.split('\n').filter((part, partIndex, list) => part.trim() || partIndex < list.length - 1);
            if (parts.length === 0) return null;
            return (
              <div key={`text-${index}`} className="space-y-3">
                {parts.map((part, partIndex) => (
                  <p
                    key={`text-${index}-${partIndex}`}
                    className="text-sm whitespace-pre-wrap"
                    style={{ color: 'var(--foreground)', lineHeight: 1.7 }}
                  >
                    {part || '\u00A0'}
                  </p>
                ))}
              </div>
            );
          }

          const key = `q${blocks
            .slice(0, index + 1)
            .filter((candidate) => candidate.type === 'field').length}`;
          const response = answers[key] ?? block.response;
          const value = response.position || '';
          const answered = isResponseAnswered(response);
          const highlighted = !readOnly && highlightedQuestionKey === key;

          return (
            <div
              key={`field-${key}`}
              className="space-y-2 rounded-2xl px-3 py-3 sm:px-4"
              data-question-key={key}
              style={{
                border: highlighted
                  ? '1px solid color-mix(in srgb, var(--destructive) 42%, var(--border))'
                  : answered
                    ? '1px solid color-mix(in srgb, var(--accent) 18%, var(--border))'
                    : '1px solid transparent',
                backgroundColor: highlighted
                  ? 'color-mix(in srgb, var(--destructive) 5%, transparent)'
                  : answered
                    ? 'color-mix(in srgb, var(--accent) 3%, transparent)'
                    : 'transparent',
                scrollMarginTop: '6rem',
              }}
            >
              <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                <span>{block.value.label}</span>
                <span
                  className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium"
                  style={{
                    backgroundColor: block.value.optional
                      ? 'color-mix(in srgb, var(--foreground) 5%, transparent)'
                      : 'color-mix(in srgb, var(--accent) 10%, transparent)',
                    color: block.value.optional ? 'var(--muted-foreground)' : 'var(--accent)',
                  }}
                >
                  {block.value.optional ? 'Optional' : 'Required'}
                </span>
                {!readOnly ? (
                  <span
                    className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium"
                    style={{
                      backgroundColor: answered
                        ? 'color-mix(in srgb, #138a52 12%, transparent)'
                        : 'color-mix(in srgb, var(--foreground) 5%, transparent)',
                      color: answered ? '#138a52' : 'var(--muted-foreground)',
                    }}
                  >
                    {answered ? 'Answered' : 'Not answered'}
                  </span>
                ) : null}
              </label>
              {readOnly ? (
                <div
                  className="rounded-lg px-3 py-3 text-sm whitespace-pre-wrap"
                  style={{
                    backgroundColor: 'var(--background)',
                    border: '1px solid var(--border)',
                    color: value ? 'var(--foreground)' : 'var(--muted-foreground)',
                    minHeight: block.value.fieldType === 'short' ? undefined : '7rem',
                  }}
                >
                  {value || 'No response provided.'}
                </div>
              ) : block.value.fieldType === 'short' ? (
                <input
                  value={value}
                  onChange={(event) =>
                    onChange?.(key, { ...response, position: event.target.value })
                  }
                  placeholder={block.value.placeholder}
                  className="w-full rounded-lg px-3 py-2.5 text-sm"
                  style={{
                    border: '1px solid var(--input)',
                    backgroundColor: 'var(--background)',
                    color: 'var(--foreground)',
                    outline: 'none',
                  }}
                />
              ) : (
                <textarea
                  value={value}
                  onChange={(event) =>
                    onChange?.(key, { ...response, position: event.target.value })
                  }
                  placeholder={block.value.placeholder}
                  rows={block.value.rows}
                  className="w-full rounded-lg px-3 py-3 text-sm"
                  style={{
                    border: '1px solid var(--input)',
                    backgroundColor: 'var(--background)',
                    color: 'var(--foreground)',
                    outline: 'none',
                    resize: 'vertical',
                    lineHeight: 1.6,
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
