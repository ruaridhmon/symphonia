import type { StructuredResponse } from '../types/structured-input';
import SurveyQuestionInput from './SurveyQuestionInput';
import AnswerStateBadge from './AnswerStateBadge';
import type { ConfigurableQuestion } from '../utils/questions';
import type { RenderableDocumentTemplateField } from '../utils/documentTemplate';
import { isResponseAnswered } from '../utils/responseValidation';

function formatParticipantLabel(label: string) {
  return label
    .replace(/^(?:R\d+_Q\d+[a-z]?|Q\d+[a-z]?)\s*[:.)-]?\s*/i, '')
    .trim();
}

function toQuestion(field: RenderableDocumentTemplateField): ConfigurableQuestion {
  return {
    questionId: field.questionId ?? field.questionKey,
    label: formatParticipantLabel(field.label),
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
  previewOnly?: boolean;
  highlighted?: boolean;
  showMeta?: boolean;
  onChange?: (nextValue: StructuredResponse) => void;
  onSelect?: () => void;
  emptyReadOnlyText?: string;
}

export default function DocumentTemplateFieldControl({
  field,
  response,
  readOnly,
  previewOnly = false,
  highlighted = false,
  showMeta = true,
  onChange,
  onSelect,
  emptyReadOnlyText = 'No response provided.',
}: DocumentTemplateFieldControlProps) {
  const value = response.position || '';
  const answered = isResponseAnswered(response);
  const label = formatParticipantLabel(field.label);
  const usesInlineTextField = field.fieldType === 'short' || field.fieldType === 'long';
  const usesWideControl =
    usesInlineTextField ||
    field.fieldType === 'single_select' ||
    field.fieldType === 'multi_select' ||
    field.fieldType === 'slider' ||
    field.fieldType === 'likert';
  const textFieldStyle = {
    border: '1px solid var(--border)',
    backgroundColor: 'var(--background)',
    color: 'var(--foreground)',
    outline: 'none',
    boxShadow: 'none',
  } as const;

  return (
    <span
      className={`${usesWideControl ? 'flex w-full' : 'inline-flex max-w-full'} flex-col gap-1 rounded-[1.15rem] px-3 py-2 align-middle`}
      data-question-key={field.questionKey}
      onClick={() => onSelect?.()}
      style={{
        minWidth: usesWideControl ? 0 : '18rem',
        backgroundColor: highlighted
          ? 'color-mix(in srgb, var(--destructive) 4%, white)'
          : 'color-mix(in srgb, var(--background) 84%, white)',
        border: highlighted
          ? '1px solid color-mix(in srgb, var(--destructive) 42%, var(--border))'
          : answered
            ? '1px solid color-mix(in srgb, #138a52 24%, transparent)'
            : '1px solid color-mix(in srgb, var(--border) 88%, transparent)',
        boxShadow: '0 10px 24px -24px rgba(15, 23, 42, 0.24)',
        scrollMarginTop: '6rem',
        cursor: onSelect ? 'pointer' : 'default',
      }}
    >
      {showMeta ? (field.showLabel === false ? (
        <span className="flex justify-end">
          <span className="flex flex-wrap items-center justify-end gap-2">
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
                <AnswerStateBadge answered={answered} />
              </>
            )}
          </span>
        </span>
      ) : (
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--muted-foreground)' }}>
            {label}
          </span>
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
              <AnswerStateBadge answered={answered} />
            </>
          )}
        </span>
      )) : null}

      {previewOnly && field.fieldType === 'short' ? (
        <input
          value=""
          readOnly
          tabIndex={-1}
          placeholder={field.placeholder}
          className="w-full rounded-[1.4rem] px-4 py-3 text-sm leading-6"
          style={{
            border: '1px solid var(--input)',
            backgroundColor: 'color-mix(in srgb, var(--background) 84%, var(--card) 16%)',
            color: 'var(--foreground)',
            outline: 'none',
            pointerEvents: 'none',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.02)',
          }}
        />
      ) : previewOnly && field.fieldType === 'long' ? (
        <textarea
          value=""
          readOnly
          tabIndex={-1}
          placeholder={field.placeholder}
          rows={field.rows}
          className="w-full rounded-[1.6rem] px-4 py-3.5 text-sm leading-6"
          style={{
            border: '1px solid var(--input)',
            backgroundColor: 'color-mix(in srgb, var(--background) 84%, var(--card) 16%)',
            color: 'var(--foreground)',
            outline: 'none',
            resize: 'vertical',
            lineHeight: 1.6,
            pointerEvents: 'none',
            minHeight: field.rows && field.rows <= 2 ? undefined : '7rem',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.02)',
          }}
        />
      ) : readOnly && usesInlineTextField ? (
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
          className="w-full rounded-[1.15rem] px-4 py-3 text-sm leading-6"
          style={textFieldStyle}
        />
      ) : !readOnly && field.fieldType === 'long' ? (
        <textarea
          value={value}
          onChange={(event) => onChange?.({ ...response, position: event.target.value })}
          placeholder={field.placeholder}
          rows={field.rows}
          className="w-full rounded-[1.15rem] px-4 py-3.5 text-sm leading-6"
          style={{
            ...textFieldStyle,
            resize: 'vertical',
            lineHeight: 1.6,
            minHeight: field.rows && field.rows <= 2 ? undefined : '8rem',
          }}
        />
      ) : (
        <SurveyQuestionInput
          question={toQuestion(field)}
          value={response}
          onChange={(nextValue) => onChange?.(nextValue)}
          readOnly={readOnly}
          previewOnly={previewOnly}
        />
      )}
    </span>
  );
}
