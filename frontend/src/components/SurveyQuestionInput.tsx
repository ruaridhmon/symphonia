import { Mic, MicOff } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { StructuredResponse } from '../types/structured-input';
import { DEFAULT_LIKERT_OPTIONS, type ConfigurableQuestion } from '../utils/questions';

interface SurveyQuestionInputProps {
  question: ConfigurableQuestion;
  value: StructuredResponse;
  onChange: (value: StructuredResponse) => void;
  readOnly?: boolean;
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
  border: '1px solid color-mix(in srgb, var(--border) 72%, transparent)',
  backgroundColor: 'color-mix(in srgb, var(--background) 84%, var(--card) 16%)',
  color: 'var(--foreground)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.02)',
} as const;

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
}: SurveyQuestionInputProps) {
  const inputType = question.inputType ?? 'textarea';
  const options = question.options ?? [];
  const likertOptions = getLikertOptions(question);
  const selectedValues = decodeSelections(value.position);
  const sliderMin = question.minValue ?? 0;
  const sliderMax = question.maxValue ?? 10;
  const sliderValue =
    value.position.trim() === '' ? null : Math.min(sliderMax, Math.max(sliderMin, Number(value.position)));
  const voiceInput = useVoiceInput(
    !readOnly && (inputType === 'text' || inputType === 'textarea'),
    value.position,
    (nextValue) => onChange(updatePosition(value, nextValue)),
  );

  if (readOnly) {
    return (
      <div>
        {renderHelpText(question.helpText)}
        <div
          className="rounded-xl px-4 py-3"
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
                <span>{question.maxLabel ?? sliderMax}</span>
              </div>
            </div>
          ) : inputType === 'likert' && value.position.trim() ? (
            <div className="space-y-1">
              <div className="text-sm font-semibold text-foreground">{value.position}</div>
              {question.allowUnsure ? (
                <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                  Scale: {likertOptions.join(' | ')} | Don't know / unsure
                </div>
              ) : null}
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
        <div className="relative">
          <input
            type="text"
            className="w-full rounded-[1.4rem] px-4 py-3 pr-24 text-sm leading-6"
            style={composerFieldStyle}
            placeholder={question.placeholder ?? 'Write a short response'}
            value={value.position}
            onChange={(event) => onChange(updatePosition(value, event.target.value))}
          />
          <div className="absolute inset-y-0 right-2 flex items-center">
            <VoiceButton {...voiceInput} onToggle={voiceInput.toggleListening} />
          </div>
        </div>
        <p className="mt-2 text-xs" style={{ color: 'var(--muted-foreground)' }}>
          {voiceInput.isSupported
            ? 'Use voice input to dictate this answer.'
            : 'Voice input appears here on supported browsers.'}
        </p>
      </div>
    );
  }

  if (inputType === 'single_select') {
    return (
      <div>
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
              className="flex items-start gap-3 rounded-xl px-3.5 py-2.5 text-sm transition-colors"
              style={{
                backgroundColor: value.position === option ? 'color-mix(in srgb, var(--accent) 6%, var(--background))' : 'var(--background)',
                border: value.position === option ? '1px solid color-mix(in srgb, var(--accent) 30%, var(--border))' : '1px solid var(--border)',
                color: 'var(--foreground)',
              }}
            >
              <input
                type="radio"
                name={question.questionId ?? question.label}
                checked={value.position === option}
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
                className="flex items-start gap-3 rounded-xl px-3.5 py-2.5 text-sm transition-colors"
                style={{
                  backgroundColor: checked ? 'color-mix(in srgb, var(--accent) 6%, var(--background))' : 'var(--background)',
                  border: checked ? '1px solid color-mix(in srgb, var(--accent) 30%, var(--border))' : '1px solid var(--border)',
                  color: disabled ? 'var(--muted-foreground)' : 'var(--foreground)',
                }}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={disabled}
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
      <div>
        {renderHelpText(question.helpText)}
        <p
          className="mb-2 text-xs"
          style={{ color: 'var(--muted-foreground)', minHeight: '1rem' }}
        >
          {sliderValue === null ? 'No rating selected yet.' : '\u00A0'}
        </p>
        <div
          className="rounded-xl px-3.5 py-2.5"
          style={{
            backgroundColor: 'var(--background)',
            border: '1px solid var(--border)',
          }}
        >
          <div className="mb-1.5 flex items-center justify-end">
            <div
              className="inline-flex min-w-[2.5rem] items-center justify-center rounded-full px-2.5 py-1 text-xs font-semibold"
              style={{
                backgroundColor: sliderValue === null ? 'var(--muted)' : 'color-mix(in srgb, var(--accent) 10%, transparent)',
                color: sliderValue === null ? 'var(--muted-foreground)' : 'var(--accent)',
              }}
            >
              {sliderValue ?? 'Not set'}
            </div>
          </div>
          <input
            type="range"
            min={sliderMin}
            max={sliderMax}
            step={1}
            value={sliderValue ?? Math.round((sliderMin + sliderMax) / 2)}
            onChange={(event) => onChange(updatePosition(value, event.target.value))}
            className="w-full"
            style={{
              opacity: sliderValue === null ? 0.65 : 1,
              accentColor: sliderValue === null ? 'var(--muted-foreground)' : 'var(--accent)',
            }}
          />
          <div
            className="mt-1.5 flex items-start justify-between gap-3 text-[11px] leading-4"
            style={{ color: 'var(--muted-foreground)' }}
          >
            <span className="max-w-[46%] text-left">{question.minLabel ?? sliderMin}</span>
            <span className="max-w-[46%] text-right">{question.maxLabel ?? sliderMax}</span>
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
      <div>
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
                  className="flex min-h-[4.5rem] cursor-pointer flex-col justify-between rounded-2xl px-3 py-3 text-left transition-colors"
                  style={{
                    backgroundColor: selected
                      ? 'color-mix(in srgb, var(--accent) 8%, var(--background))'
                      : 'var(--background)',
                    border: selected
                      ? '1px solid color-mix(in srgb, var(--accent) 34%, var(--border))'
                      : '1px solid var(--border)',
                    color: 'var(--foreground)',
                  }}
                >
                  <input
                    type="radio"
                    name={question.questionId ?? question.label}
                    checked={selected}
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
          placeholder={question.placeholder ?? 'Write your response here'}
          value={value.position}
          onChange={(event) => onChange(updatePosition(value, event.target.value))}
        />
        <div className="absolute bottom-2 right-2">
          <VoiceButton {...voiceInput} onToggle={voiceInput.toggleListening} />
        </div>
      </div>
      <p className="mt-2 text-xs" style={{ color: 'var(--muted-foreground)' }}>
        {voiceInput.isSupported
          ? 'Use voice input to dictate this answer.'
          : 'Voice input appears here on supported browsers.'}
      </p>
    </div>
  );
}
