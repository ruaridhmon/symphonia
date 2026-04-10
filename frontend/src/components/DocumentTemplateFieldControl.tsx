import type { StructuredResponse } from '../types/structured-input';
import SurveyQuestionInput from './SurveyQuestionInput';
import type { ConfigurableQuestion } from '../utils/questions';
import type { RenderableDocumentTemplateField } from '../utils/documentTemplate';
import { isResponseAnswered } from '../utils/responseValidation';

function toQuestion(field: RenderableDocumentTemplateField): ConfigurableQuestion {
  return {
    label: field.label,
    requireEvidence: false,
    requireCounterarguments: false,
    requireConfidence: false,
    inputType: field.inputType === 'document' ? 'textarea' : field.inputType,
    options: field.options,
    maxSelections: field.maxSelections,
    minValue: field.minValue,
    maxValue: field.maxValue,
    minLabel: field.minLabel,
    midLabel: field.midLabel,
    maxLabel: field.maxLabel,
    allowUnsure: field.allowUnsure,
    placeholder: field.placeholder,
    rows: field.rows,
    optional: field.optional,
    fieldType: field.fieldType === 'short' || field.fieldType === 'long' ? field.fieldType : null,
  };
}

interface DocumentTemplateFieldControlProps {
  field: RenderableDocumentTemplateField;
  response: StructuredResponse;
  readOnly: boolean;
  highlighted?: boolean;
  onChange?: (nextValue: StructuredResponse) => void;
  onSelect?: () => void;
  emptyReadOnlyText?: string;
}

export default function DocumentTemplateFieldControl({
  field,
  response,
  readOnly,
  highlighted = false,
  onChange,
  onSelect,
  emptyReadOnlyText = 'No response provided.',
}: DocumentTemplateFieldControlProps) {
  const value = response.position || '';
  const answered = isResponseAnswered(response);
  const usesInlineTextField = field.fieldType === 'short' || field.fieldType === 'long';

  return (
    <span
      className="inline-flex max-w-full flex-col gap-1.5 rounded-2xl px-3 py-2 align-middle"
      data-question-key={field.questionKey}
      onClick={() => onSelect?.()}
      style={{
        minWidth: usesInlineTextField ? '16rem' : '22rem',
        backgroundColor: highlighted
          ? 'color-mix(in srgb, var(--destructive) 4%, white)'
          : 'color-mix(in srgb, var(--background) 84%, white)',
        border: highlighted
          ? '1px solid color-mix(in srgb, var(--destructive) 42%, var(--border))'
          : answered
            ? '1px solid color-mix(in srgb, #138a52 24%, transparent)'
            : '1px solid color-mix(in srgb, var(--border) 88%, transparent)',
        boxShadow: '0 10px 24px -22px rgba(15, 23, 42, 0.28)',
        scrollMarginTop: '6rem',
        cursor: onSelect ? 'pointer' : 'default',
      }}
    >
      <span className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--muted-foreground)' }}>
          {field.label}
        </span>
        <span
          className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold"
          style={{
            backgroundColor: field.optional
              ? 'color-mix(in srgb, var(--foreground) 5%, transparent)'
              : 'color-mix(in srgb, var(--accent) 10%, transparent)',
            color: field.optional ? 'var(--muted-foreground)' : 'var(--accent)',
          }}
        >
          {field.optional ? 'Optional' : 'Required'}
        </span>
      </span>

      {readOnly && usesInlineTextField ? (
        <span
          className="rounded-xl px-3 py-2.5 text-sm whitespace-pre-wrap"
          style={{
            backgroundColor: 'color-mix(in srgb, white 75%, var(--background))',
            border: '1px solid color-mix(in srgb, var(--border) 72%, transparent)',
            color: value ? 'var(--foreground)' : 'var(--muted-foreground)',
            minHeight: field.fieldType === 'short' ? undefined : '7rem',
            lineHeight: 1.6,
          }}
        >
          {value || emptyReadOnlyText}
        </span>
      ) : !readOnly && field.fieldType === 'short' ? (
        <input
          value={value}
          onChange={(event) => onChange?.({ ...response, position: event.target.value })}
          placeholder={field.placeholder}
          className="w-full rounded-xl px-3 py-2.5 text-sm"
          style={{
            border: '1px solid var(--input)',
            backgroundColor: 'white',
            color: 'var(--foreground)',
            outline: 'none',
          }}
        />
      ) : !readOnly && field.fieldType === 'long' ? (
        <textarea
          value={value}
          onChange={(event) => onChange?.({ ...response, position: event.target.value })}
          placeholder={field.placeholder}
          rows={field.rows}
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
      ) : (
        <SurveyQuestionInput
          question={toQuestion(field)}
          value={response}
          onChange={(nextValue) => onChange?.(nextValue)}
          readOnly={readOnly}
        />
      )}
    </span>
  );
}
