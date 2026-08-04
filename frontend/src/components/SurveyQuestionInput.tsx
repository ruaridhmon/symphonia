import { Mic, MicOff } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { StructuredResponse } from '../types/structured-input';
import { DEFAULT_LIKERT_OPTIONS, type ConfigurableQuestion } from '../utils/questions';

interface SurveyQuestionInputProps {
  question: ConfigurableQuestion;
  value: StructuredResponse;
  onChange: (value: StructuredResponse) => void;
  readOnly?: boolean;
  previewOnly?: boolean;
}

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<{
    isFinal?: boolean;
    0: {
      transcript: string;
    };
  }>;
};

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  }
}

const composerFieldStyle = {
  border: '1px solid var(--border)',
  backgroundColor: 'var(--background)',
  color: 'var(--foreground)',
  boxShadow: 'none',
} as const;

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function parseSliderValue(position: string, min: number, max: number): number | null {
  const trimmed = position.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) return null;
  return clampNumber(parsed, min, max);
}

function formatSliderBoundary(value: number): string {
  return String(value);
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

function getLikertOptions(question: ConfigurableQuestion): string[] {
  return question.options && question.options.length >= 2
    ? question.options
    : [...DEFAULT_LIKERT_OPTIONS];
}

function renderHelpText(helpText: string | null | undefined) {
  if (!helpText) return null;
  return (
    <p className="mb-2 text-xs leading-5" style={{ color: 'var(--muted-foreground)' }}>
      {helpText}
    </p>
  );
}

function appendTranscript(baseValue: string, transcript: string) {
  const next = transcript.trim();
  if (!next) return baseValue;
  if (!baseValue.trim()) return next;
  const spacer = /[\s\n]$/.test(baseValue) ? '' : ' ';
  return `${baseValue}${spacer}${next}`;
}

function useVoiceInput(
  enabled: boolean,
  currentValue: string,
  onTranscript: (nextValue: string) => void,
) {
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const latestValueRef = useRef(currentValue);
  const [isListening, setIsListening] = useState(false);

  const isSupported = useMemo(() => {
    if (typeof window === 'undefined' || !enabled) return false;
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }, [enabled]);

  useEffect(() => {
    latestValueRef.current = currentValue;
  }, [currentValue]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
    };
  }, []);

  const toggleListening = () => {
    if (!isSupported) return;

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const RecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!RecognitionCtor) return;

    const recognition = new RecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-GB';

    recognition.onresult = (event) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (result?.isFinal !== false) {
          transcript += result[0]?.transcript ?? '';
        }
      }
      if (transcript.trim()) {
        onTranscript(appendTranscript(latestValueRef.current, transcript));
      }
    };
    recognition.onerror = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };
    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    setIsListening(true);
    recognition.start();
  };

  return { isSupported, isListening, toggleListening };
}

function VoiceButton({
  isSupported,
  isListening,
  onToggle,
}: {
  isSupported: boolean;
  isListening: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={isListening}
      aria-label={
        !isSupported
          ? 'Voice input unavailable in this browser'
          : isListening
            ? 'Stop voice input'
            : 'Start voice input'
      }
      disabled={!isSupported}
      title={!isSupported ? 'Voice input unavailable in this browser' : undefined}
      className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-medium"
      style={{
        backgroundColor: !isSupported
          ? 'color-mix(in srgb, var(--foreground) 3%, transparent)'
          : isListening
            ? 'color-mix(in srgb, var(--accent) 14%, transparent)'
            : 'color-mix(in srgb, var(--foreground) 4%, transparent)',
        color: !isSupported
          ? 'var(--muted-foreground)'
          : isListening
            ? 'var(--accent)'
            : 'var(--muted-foreground)',
        border: `1px solid ${
          !isSupported
            ? 'color-mix(in srgb, var(--border) 75%, transparent)'
            : isListening
              ? 'color-mix(in srgb, var(--accent) 28%, transparent)'
              : 'color-mix(in srgb, var(--border) 65%, transparent)'
        }`,
        opacity: !isSupported ? 0.75 : 1,
        cursor: !isSupported ? 'not-allowed' : 'pointer',
      }}
    >
      {isSupported ? (isListening ? <MicOff size={14} /> : <Mic size={14} />) : null}
      {!isSupported ? 'Voice unavailable' : isListening ? 'Listening…' : 'Voice input'}
    </button>
  );
}

export default function SurveyQuestionInput({
  question,
  value,
  onChange,
  readOnly = false,
  previewOnly = false,
}: SurveyQuestionInputProps) {
  const inputType = question.inputType ?? 'textarea';
  const options = question.options ?? [];
  const likertOptions = getLikertOptions(question);
  const selectedValues = decodeSelections(value.position);
  const sliderMin = question.minValue ?? 0;
  const sliderMax = question.maxValue ?? 10;
  const sliderMidpoint = Math.round((sliderMin + sliderMax) / 2);
  const sliderValue = parseSliderValue(value.position, sliderMin, sliderMax);
  const sliderStartLabel = formatSliderBoundary(sliderMin);
  const sliderEndLabel = formatSliderBoundary(sliderMax);
  const voiceInput = useVoiceInput(
    !readOnly && (inputType === 'text' || inputType === 'textarea'),
    value.position,
    (nextValue) => onChange(updatePosition(value, nextValue)),
  );

  function commitSliderValue(nextValue: number) {
    onChange(updatePosition(value, String(clampNumber(nextValue, sliderMin, sliderMax))));
  }

  function commitCurrentSliderValue(target: HTMLInputElement | null) {
    const parsed = Number(target?.value ?? sliderMidpoint);
    commitSliderValue(Number.isFinite(parsed) ? parsed : sliderMidpoint);
  }

  if (inputType === 'text') {
    return (
      <div>
        {renderHelpText(question.helpText)}
        <div className="relative">
          <input
            type="text"
            className="w-full rounded-[1.4rem] px-4 py-3 pr-24 text-sm leading-6"
            style={composerFieldStyle}
            placeholder={readOnly ? 'No response provided' : question.placeholder ?? 'Write a short response'}
            value={value.position}
            readOnly={readOnly}
            onChange={(event) => onChange(updatePosition(value, event.target.value))}
          />
          {!readOnly ? (
            <div className="absolute inset-y-0 right-2 flex items-center">
              <VoiceButton {...voiceInput} onToggle={voiceInput.toggleListening} />
            </div>
          ) : null}
        </div>
        {!readOnly ? (
          <p className="mt-2 text-xs" style={{ color: 'var(--muted-foreground)' }}>
            {voiceInput.isSupported
              ? 'Use voice input to dictate this answer.'
              : 'Voice input appears here on supported browsers.'}
          </p>
        ) : null}
      </div>
    );
  }

  if (inputType === 'single_select') {
    return (
      <div style={previewOnly ? { pointerEvents: 'none' } : undefined}>
        {renderHelpText(question.helpText)}
        {!value.position.trim() ? (
          <p className="mb-2 text-xs" style={{ color: 'var(--muted-foreground)' }}>
            No option selected yet.
          </p>
        ) : null}
        <div className="space-y-2">
          {options.map((option) => (
            <label
              key={option}
              className={`flex items-start gap-3 rounded-xl px-3.5 py-2.5 text-sm transition-colors ${readOnly ? '' : ''}`}
              style={{
                backgroundColor: value.position === option ? 'color-mix(in srgb, var(--accent) 6%, var(--background))' : 'var(--background)',
                border: value.position === option ? '1px solid color-mix(in srgb, var(--accent) 30%, var(--border))' : '1px solid var(--border)',
                color: 'var(--foreground)',
                cursor: readOnly ? 'default' : 'pointer',
              }}
            >
              <input
                type="radio"
                name={question.questionId ?? question.label}
                checked={value.position === option}
                disabled={readOnly}
                onChange={() => onChange(updatePosition(value, option))}
                style={{ accentColor: value.position === option ? 'var(--accent)' : 'var(--muted-foreground)' }}
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
      <div style={previewOnly ? { pointerEvents: 'none' } : undefined}>
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
                className="flex items-start gap-3 rounded-xl px-3.5 py-2.5 text-sm transition-colors"
                style={{
                  backgroundColor: checked ? 'color-mix(in srgb, var(--accent) 6%, var(--background))' : 'var(--background)',
                  border: checked ? '1px solid color-mix(in srgb, var(--accent) 30%, var(--border))' : '1px solid var(--border)',
                  color: disabled ? 'var(--muted-foreground)' : 'var(--foreground)',
                  cursor: readOnly ? 'default' : 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={disabled || readOnly}
                  style={{ accentColor: checked ? 'var(--accent)' : 'var(--muted-foreground)' }}
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
      <div style={previewOnly ? { pointerEvents: 'none' } : undefined}>
        {renderHelpText(question.helpText)}
        <div
          className="rounded-[1.15rem] px-3.5 py-3"
          style={{
            backgroundColor: 'var(--background)',
            border: '1px solid var(--border)',
          }}
        >
          <div className="mb-2 flex justify-end">
            <div
              className="inline-flex min-w-[3.5rem] items-center justify-center rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums"
              style={{
                backgroundColor: sliderValue === null ? 'var(--muted)' : 'color-mix(in srgb, var(--accent) 10%, transparent)',
                color: sliderValue === null ? 'var(--muted-foreground)' : 'var(--accent)',
              }}
            >
              {sliderValue ?? 'Unset'}
            </div>
          </div>
          <input
            type="range"
            min={sliderMin}
            max={sliderMax}
            step={1}
            value={sliderValue ?? sliderMidpoint}
            disabled={readOnly}
            onPointerDown={(event) => {
              if (!readOnly && sliderValue === null) {
                commitCurrentSliderValue(event.currentTarget);
              }
            }}
            onClick={(event) => {
              if (!readOnly && sliderValue === null) {
                commitCurrentSliderValue(event.currentTarget);
              }
            }}
            onChange={(event) => commitSliderValue(Number(event.target.value))}
            className="w-full"
            style={{
              opacity: sliderValue === null ? 0.65 : 1,
              accentColor: sliderValue === null ? 'var(--muted-foreground)' : 'var(--accent)',
              cursor: readOnly ? 'default' : 'pointer',
            }}
          />
          <div
            className="mt-2 flex items-start justify-between gap-3 text-[11px] leading-4"
            style={{ color: 'var(--muted-foreground)' }}
          >
            <span className="text-left">{sliderStartLabel}</span>
            <span className="text-right">{sliderEndLabel}</span>
          </div>
        </div>
      </div>
    );
  }

  if (inputType === 'likert') {
    const scaleItems = question.allowUnsure
      ? [...likertOptions, "Don't know / unsure"]
      : likertOptions;

    return (
      <div style={previewOnly ? { pointerEvents: 'none' } : undefined}>
        {renderHelpText(question.helpText)}
        {!value.position.trim() ? (
          <p className="mb-2 text-xs" style={{ color: 'var(--muted-foreground)' }}>
            No option selected yet.
          </p>
        ) : null}
        <div className="space-y-2.5">
          <div
            className="grid gap-2 sm:grid-cols-3 xl:grid-cols-6"
            role="radiogroup"
            aria-label={question.label}
          >
            {scaleItems.map((option, optionIndex) => {
              const selected = value.position === option;
              const isUnsure = option === "Don't know / unsure";
              return (
                <label
                  key={option}
                  className="flex min-h-[4.5rem] flex-col justify-between rounded-2xl px-3 py-3 text-left transition-colors"
                  style={{
                    backgroundColor: selected
                      ? 'color-mix(in srgb, var(--accent) 8%, var(--background))'
                      : 'var(--background)',
                    border: selected
                      ? '1px solid color-mix(in srgb, var(--accent) 34%, var(--border))'
                      : '1px solid var(--border)',
                    color: 'var(--foreground)',
                    cursor: readOnly ? 'default' : 'pointer',
                  }}
                >
                  <input
                    type="radio"
                    name={question.questionId ?? question.label}
                    checked={selected}
                    disabled={readOnly}
                    onChange={() => onChange(updatePosition(value, option))}
                    className="sr-only"
                    aria-label={option}
                  />
                  <span
                    className="inline-flex w-fit items-center rounded-full px-2 py-0.5 text-[11px] font-semibold"
                    style={{
                      backgroundColor: selected
                        ? 'color-mix(in srgb, var(--accent) 14%, transparent)'
                        : 'color-mix(in srgb, var(--foreground) 5%, transparent)',
                      color: selected ? 'var(--accent)' : 'var(--muted-foreground)',
                    }}
                  >
                    {isUnsure ? 'Unsure' : optionIndex + 1}
                  </span>
                  <span className="mt-2 text-sm leading-5">{option}</span>
                </label>
              );
            })}
          </div>
          <div className="flex items-start justify-between gap-3 text-[11px] leading-4" style={{ color: 'var(--muted-foreground)' }}>
            <span className="max-w-[46%]">{likertOptions[0]}</span>
            <span className="max-w-[46%] text-right">{likertOptions[likertOptions.length - 1]}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {renderHelpText(question.helpText)}
      <div className="relative">
        <textarea
          rows={question.rows ?? 4}
          className="w-full rounded-[1.6rem] px-4 py-3.5 pr-24 text-sm leading-6"
          style={{
            ...composerFieldStyle,
            resize: 'vertical',
            minHeight: question.rows && question.rows <= 2 ? undefined : '7rem',
          }}
          placeholder={readOnly ? 'No response provided' : question.placeholder ?? 'Write your response here'}
          value={value.position}
          readOnly={readOnly}
          onChange={(event) => onChange(updatePosition(value, event.target.value))}
        />
        {!readOnly ? (
          <div className="absolute bottom-2 right-2">
            <VoiceButton {...voiceInput} onToggle={voiceInput.toggleListening} />
          </div>
        ) : null}
      </div>
      {!readOnly ? (
        <p className="mt-2 text-xs" style={{ color: 'var(--muted-foreground)' }}>
          {voiceInput.isSupported
            ? 'Use voice input to dictate this answer.'
            : 'Voice input appears here on supported browsers.'}
        </p>
      ) : null}
    </div>
  );
}
