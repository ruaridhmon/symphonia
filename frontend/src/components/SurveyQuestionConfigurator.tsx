import type { ReactNode } from 'react';
import type { ConfigurableQuestion, SurveyInputType } from '../utils/questions';
import { DEFAULT_LIKERT_OPTIONS } from '../utils/questions';

interface SurveyQuestionConfiguratorProps {
  question: ConfigurableQuestion;
  index: number;
  onChange: (question: ConfigurableQuestion) => void;
}

const FIELD_BG = 'color-mix(in srgb, var(--foreground) 3%, transparent)';

function normalizeOptions(raw: string): string[] {
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function getSurveyDefaults(inputType: SurveyInputType): Partial<ConfigurableQuestion> {
  if (inputType === 'text') {
    return {
      placeholder: 'Write a short response',
      rows: null,
      options: null,
      allowUnsure: null,
      maxSelections: null,
      minValue: null,
      maxValue: null,
      minLabel: null,
      midLabel: null,
      maxLabel: null,
    };
  }

  if (inputType === 'textarea') {
    return {
      placeholder: 'Write your response here',
      rows: 4,
      options: null,
      allowUnsure: null,
      maxSelections: null,
      minValue: null,
      maxValue: null,
      minLabel: null,
      midLabel: null,
      maxLabel: null,
    };
  }

  if (inputType === 'single_select') {
    return {
      options: ['Option 1', 'Option 2'],
      allowUnsure: null,
      maxSelections: null,
      placeholder: null,
      rows: null,
      minValue: null,
      maxValue: null,
      minLabel: null,
      midLabel: null,
      maxLabel: null,
    };
  }

  if (inputType === 'multi_select') {
    return {
      options: ['Option 1', 'Option 2', 'Option 3'],
      allowUnsure: null,
      maxSelections: 3,
      placeholder: null,
      rows: null,
      minValue: null,
      maxValue: null,
      minLabel: null,
      midLabel: null,
      maxLabel: null,
    };
  }

  if (inputType === 'slider') {
    return {
      options: null,
      allowUnsure: null,
      maxSelections: null,
      placeholder: null,
      rows: null,
      minValue: 0,
      maxValue: 10,
      minLabel: 'Low',
      midLabel: 'Medium',
      maxLabel: 'High',
    };
  }

  return {
    options: [...DEFAULT_LIKERT_OPTIONS],
    allowUnsure: true,
    maxSelections: null,
    placeholder: null,
    rows: null,
    minValue: null,
    maxValue: null,
    minLabel: null,
    midLabel: null,
    maxLabel: null,
  };
}

function ensureTypeTransition(
  question: ConfigurableQuestion,
  inputType: SurveyInputType,
): ConfigurableQuestion {
  const defaults = getSurveyDefaults(inputType);
  return {
    ...question,
    inputType,
    ...defaults,
    options:
      inputType === 'likert'
        ? question.options && question.options.length >= 5
          ? question.options
          : [...DEFAULT_LIKERT_OPTIONS]
        : inputType === 'single_select' || inputType === 'multi_select'
          ? question.options && question.options.length > 0
            ? question.options
            : (defaults.options ?? null)
          : defaults.options ?? null,
    allowUnsure: inputType === 'likert' ? question.allowUnsure ?? true : null,
    rows:
      inputType === 'textarea'
        ? question.rows ?? 4
        : defaults.rows ?? null,
    placeholder:
      inputType === 'text' || inputType === 'textarea'
        ? question.placeholder ?? defaults.placeholder ?? null
        : null,
    minLabel: inputType === 'slider' ? question.minLabel ?? defaults.minLabel ?? null : null,
    midLabel: inputType === 'slider' ? question.midLabel ?? defaults.midLabel ?? null : null,
    maxLabel: inputType === 'slider' ? question.maxLabel ?? defaults.maxLabel ?? null : null,
  };
}

function FieldLabel({
  htmlFor,
  children,
}: {
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="block text-xs font-medium"
      style={{ color: 'var(--foreground)' }}
    >
      {children}
    </label>
  );
}

export default function SurveyQuestionConfigurator({
  question,
  index,
  onChange,
}: SurveyQuestionConfiguratorProps) {
  const inputType = question.inputType ?? 'textarea';
  const optionText = (question.options ?? []).join('\n');
  const baseId = `survey-question-${index + 1}`;

  const patch = (updates: Partial<ConfigurableQuestion>) => {
    onChange({ ...question, ...updates });
  };

  return (
    <div
      className="mt-3 space-y-3 rounded-xl px-3 py-3"
      style={{
        backgroundColor: FIELD_BG,
        border: '1px solid var(--border)',
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <FieldLabel htmlFor={`${baseId}-type`}>Response type</FieldLabel>
          <select
            id={`${baseId}-type`}
            value={inputType}
            onChange={(event) =>
              onChange(ensureTypeTransition(question, event.target.value as SurveyInputType))
            }
            className="w-full rounded-lg px-3 py-2 text-sm"
            style={{
              border: '1px solid var(--input)',
              backgroundColor: 'var(--background)',
              color: 'var(--foreground)',
            }}
          >
            <option value="textarea">Long text</option>
            <option value="text">Short text</option>
            <option value="single_select">Single select</option>
            <option value="multi_select">Multi select</option>
            <option value="slider">0-10 slider</option>
            <option value="likert">Likert scale</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <FieldLabel htmlFor={`${baseId}-section`}>Section heading</FieldLabel>
          <input
            id={`${baseId}-section`}
            type="text"
            value={question.sectionTitle ?? ''}
            onChange={(event) => patch({ sectionTitle: event.target.value || null })}
            className="w-full rounded-lg px-3 py-2 text-sm"
            style={{
              border: '1px solid var(--input)',
              backgroundColor: 'var(--background)',
              color: 'var(--foreground)',
            }}
            placeholder="e.g. Diagnostic validity"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <FieldLabel htmlFor={`${baseId}-help`}>Help text</FieldLabel>
        <input
          id={`${baseId}-help`}
          type="text"
          value={question.helpText ?? ''}
          onChange={(event) => patch({ helpText: event.target.value || null })}
          className="w-full rounded-lg px-3 py-2 text-sm"
          style={{
            border: '1px solid var(--input)',
            backgroundColor: 'var(--background)',
            color: 'var(--foreground)',
          }}
          placeholder="Optional guidance shown under the question"
        />
      </div>

      {(inputType === 'single_select' || inputType === 'multi_select' || inputType === 'likert') && (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <FieldLabel htmlFor={`${baseId}-options`}>
              {inputType === 'likert' ? 'Scale labels' : 'Options'}
            </FieldLabel>
            <textarea
              id={`${baseId}-options`}
              rows={inputType === 'likert' ? 5 : 4}
              value={optionText}
              onChange={(event) => patch({ options: normalizeOptions(event.target.value) })}
              className="w-full rounded-lg px-3 py-2 text-sm"
              style={{
                border: '1px solid var(--input)',
                backgroundColor: 'var(--background)',
                color: 'var(--foreground)',
                resize: 'vertical',
              }}
              placeholder={
                inputType === 'likert'
                  ? DEFAULT_LIKERT_OPTIONS.join('\n')
                  : 'One option per line'
              }
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {inputType === 'multi_select' ? (
              <div className="space-y-1.5">
                <FieldLabel htmlFor={`${baseId}-max-selections`}>Maximum selections</FieldLabel>
                <input
                  id={`${baseId}-max-selections`}
                  type="number"
                  min={1}
                  value={question.maxSelections ?? ''}
                  onChange={(event) =>
                    patch({
                      maxSelections: event.target.value ? Number(event.target.value) : null,
                    })
                  }
                  className="w-28 rounded-lg px-3 py-2 text-sm"
                  style={{
                    border: '1px solid var(--input)',
                    backgroundColor: 'var(--background)',
                    color: 'var(--foreground)',
                  }}
                />
              </div>
            ) : null}

            {inputType === 'likert' ? (
              <label
                htmlFor={`${baseId}-allow-unsure`}
                className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-medium"
                style={{
                  backgroundColor: 'var(--background)',
                  border: '1px solid var(--border)',
                  color: 'var(--foreground)',
                }}
              >
                <input
                  id={`${baseId}-allow-unsure`}
                  type="checkbox"
                  checked={question.allowUnsure ?? true}
                  onChange={(event) => patch({ allowUnsure: event.target.checked })}
                />
                Include "Don't know / unsure"
              </label>
            ) : null}
          </div>
        </div>
      )}

      {inputType === 'slider' ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <FieldLabel htmlFor={`${baseId}-min-label`}>Left label</FieldLabel>
            <input
              id={`${baseId}-min-label`}
              type="text"
              value={question.minLabel ?? ''}
              onChange={(event) => patch({ minLabel: event.target.value || null })}
              className="w-full rounded-lg px-3 py-2 text-sm"
              style={{
                border: '1px solid var(--input)',
                backgroundColor: 'var(--background)',
                color: 'var(--foreground)',
              }}
              placeholder="Not at all important"
            />
          </div>
          <div className="space-y-1.5">
            <FieldLabel htmlFor={`${baseId}-mid-label`}>Middle label</FieldLabel>
            <input
              id={`${baseId}-mid-label`}
              type="text"
              value={question.midLabel ?? ''}
              onChange={(event) => patch({ midLabel: event.target.value || null })}
              className="w-full rounded-lg px-3 py-2 text-sm"
              style={{
                border: '1px solid var(--input)',
                backgroundColor: 'var(--background)',
                color: 'var(--foreground)',
              }}
              placeholder="Moderate"
            />
          </div>
          <div className="space-y-1.5">
            <FieldLabel htmlFor={`${baseId}-max-label`}>Right label</FieldLabel>
            <input
              id={`${baseId}-max-label`}
              type="text"
              value={question.maxLabel ?? ''}
              onChange={(event) => patch({ maxLabel: event.target.value || null })}
              className="w-full rounded-lg px-3 py-2 text-sm"
              style={{
                border: '1px solid var(--input)',
                backgroundColor: 'var(--background)',
                color: 'var(--foreground)',
              }}
              placeholder="Extremely important"
            />
          </div>
        </div>
      ) : null}

      {(inputType === 'text' || inputType === 'textarea') && (
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_8rem]">
          <div className="space-y-1.5">
            <FieldLabel htmlFor={`${baseId}-placeholder`}>Placeholder</FieldLabel>
            <input
              id={`${baseId}-placeholder`}
              type="text"
              value={question.placeholder ?? ''}
              onChange={(event) => patch({ placeholder: event.target.value || null })}
              className="w-full rounded-lg px-3 py-2 text-sm"
              style={{
                border: '1px solid var(--input)',
                backgroundColor: 'var(--background)',
                color: 'var(--foreground)',
              }}
              placeholder={inputType === 'text' ? 'Write a short response' : 'Write your response here'}
            />
          </div>
          {inputType === 'textarea' ? (
            <div className="space-y-1.5">
              <FieldLabel htmlFor={`${baseId}-rows`}>Rows</FieldLabel>
              <input
                id={`${baseId}-rows`}
                type="number"
                min={3}
                max={12}
                value={question.rows ?? 4}
                onChange={(event) => patch({ rows: Number(event.target.value) || 4 })}
                className="w-full rounded-lg px-3 py-2 text-sm"
                style={{
                  border: '1px solid var(--input)',
                  backgroundColor: 'var(--background)',
                  color: 'var(--foreground)',
                }}
              />
            </div>
          ) : null}
        </div>
      )}

      <label
        htmlFor={`${baseId}-optional`}
        className="inline-flex items-center gap-2 text-xs"
        style={{ color: 'var(--muted-foreground)' }}
      >
        <input
          id={`${baseId}-optional`}
          type="checkbox"
          checked={question.optional ?? false}
          onChange={(event) => patch({ optional: event.target.checked })}
        />
        Mark this question as optional
      </label>
    </div>
  );
}
