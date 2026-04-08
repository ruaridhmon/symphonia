import type { StructuredResponse } from '../types/structured-input';
import type { ConfigurableQuestion } from '../utils/questions';

interface SurveyQuestionInputProps {
  question: ConfigurableQuestion;
  value: StructuredResponse;
  onChange: (value: StructuredResponse) => void;
  readOnly?: boolean;
}

function updatePosition(value: StructuredResponse, position: string): StructuredResponse {
  return {
    ...value,
    position,
    evidence: '',
    counterarguments: '',
    confidenceJustification: '',
    confidence: 5,
    citations: [],
    expertNominations: [],
  };
}

function decodeSelections(position: string): string[] {
  return position
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}

function renderHelpText(helpText: string | null | undefined) {
  if (!helpText) return null;
  return (
    <p className="mb-2 text-xs" style={{ color: 'var(--muted-foreground)' }}>
      {helpText}
    </p>
  );
}

export default function SurveyQuestionInput({
  question,
  value,
  onChange,
  readOnly = false,
}: SurveyQuestionInputProps) {
  const inputType = question.inputType ?? 'textarea';
  const options = question.options ?? [];
  const selectedValues = decodeSelections(value.position);
  const sliderMin = question.minValue ?? 0;
  const sliderMax = question.maxValue ?? 10;
  const sliderValue =
    value.position.trim() === '' ? null : Math.min(sliderMax, Math.max(sliderMin, Number(value.position)));

  if (readOnly) {
    return (
      <div>
        {renderHelpText(question.helpText)}
        <div
          className="rounded-lg px-4 py-3"
          style={{
            backgroundColor: 'var(--background)',
            border: '1px solid var(--border)',
          }}
        >
          {inputType === 'multi_select' && selectedValues.length > 0 ? (
            <ul className="space-y-1 text-sm text-foreground">
              {selectedValues.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : inputType === 'slider' && sliderValue !== null && Number.isFinite(sliderValue) ? (
            <div>
              <div className="text-lg font-semibold text-foreground">{sliderValue}</div>
              <div className="mt-1 flex justify-between gap-3 text-xs" style={{ color: 'var(--muted-foreground)' }}>
                <span>{question.minLabel ?? sliderMin}</span>
                <span>{question.midLabel ?? ''}</span>
                <span>{question.maxLabel ?? sliderMax}</span>
              </div>
            </div>
          ) : value.position.trim() ? (
            <div className="whitespace-pre-wrap text-sm text-foreground">{value.position}</div>
          ) : (
            <span style={{ color: 'var(--muted-foreground)' }}>No response provided</span>
          )}
        </div>
      </div>
    );
  }

  if (inputType === 'text') {
    return (
      <div>
        {renderHelpText(question.helpText)}
        <input
          type="text"
          className="w-full rounded-lg px-3 py-2.5 text-sm"
          style={{
            border: '1px solid var(--input)',
            backgroundColor: 'var(--background)',
            color: 'var(--foreground)',
          }}
          placeholder={question.placeholder ?? 'Write a short response'}
          value={value.position}
          onChange={(event) => onChange(updatePosition(value, event.target.value))}
        />
      </div>
    );
  }

  if (inputType === 'single_select') {
    return (
      <div>
        {renderHelpText(question.helpText)}
        <div className="space-y-2">
          {options.map((option) => (
            <label
              key={option}
              className="flex items-start gap-3 rounded-lg px-3 py-2 text-sm"
              style={{
                backgroundColor: 'var(--background)',
                border: '1px solid var(--border)',
                color: 'var(--foreground)',
              }}
            >
              <input
                type="radio"
                name={question.questionId ?? question.label}
                checked={value.position === option}
                onChange={() => onChange(updatePosition(value, option))}
              />
              <span>{option}</span>
            </label>
          ))}
        </div>
      </div>
    );
  }

  if (inputType === 'multi_select') {
    return (
      <div>
        {renderHelpText(question.helpText)}
        {question.maxSelections ? (
          <p className="mb-2 text-xs" style={{ color: 'var(--muted-foreground)' }}>
            Select up to {question.maxSelections}.
          </p>
        ) : null}
        <div className="space-y-2">
          {options.map((option) => {
            const checked = selectedValues.includes(option);
            const disabled =
              !checked &&
              typeof question.maxSelections === 'number' &&
              selectedValues.length >= question.maxSelections;

            return (
              <label
                key={option}
                className="flex items-start gap-3 rounded-lg px-3 py-2 text-sm"
                style={{
                  backgroundColor: 'var(--background)',
                  border: '1px solid var(--border)',
                  color: disabled ? 'var(--muted-foreground)' : 'var(--foreground)',
                }}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={disabled}
                  onChange={(event) => {
                    const nextSelections = event.target.checked
                      ? [...selectedValues, option]
                      : selectedValues.filter((item) => item !== option);
                    onChange(updatePosition(value, nextSelections.join('\n')));
                  }}
                />
                <span>{option}</span>
              </label>
            );
          })}
        </div>
      </div>
    );
  }

  if (inputType === 'slider') {
    return (
      <div>
        {renderHelpText(question.helpText)}
        <div
          className="rounded-lg px-4 py-4"
          style={{
            backgroundColor: 'var(--background)',
            border: '1px solid var(--border)',
          }}
        >
          <div className="mb-2 text-2xl font-semibold text-foreground">
            {sliderValue ?? 'Choose a value'}
          </div>
          <input
            type="range"
            min={sliderMin}
            max={sliderMax}
            step={1}
            value={sliderValue ?? Math.round((sliderMin + sliderMax) / 2)}
            onChange={(event) => onChange(updatePosition(value, event.target.value))}
            className="w-full"
          />
          <div className="mt-2 flex justify-between gap-3 text-xs" style={{ color: 'var(--muted-foreground)' }}>
            <span>{question.minLabel ?? sliderMin}</span>
            <span>{question.midLabel ?? ''}</span>
            <span>{question.maxLabel ?? sliderMax}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {renderHelpText(question.helpText)}
      <textarea
        rows={question.rows ?? 4}
        className="w-full rounded-lg px-3 py-2.5 text-sm"
        style={{
          border: '1px solid var(--input)',
          backgroundColor: 'var(--background)',
          color: 'var(--foreground)',
          resize: 'vertical',
        }}
        placeholder={question.placeholder ?? 'Write your response here'}
        value={value.position}
        onChange={(event) => onChange(updatePosition(value, event.target.value))}
      />
    </div>
  );
}
