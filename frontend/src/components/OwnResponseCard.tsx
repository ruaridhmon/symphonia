import { useState } from 'react';
import { ChevronDown, ClipboardList } from 'lucide-react';
import type { StructuredResponse } from '../types/structured-input';

type Question = string | Record<string, unknown>;

type Props = {
  answers: Record<string, unknown> | null | undefined;
  questions?: Question[];
  title?: string;
  subtitle?: string;
  defaultOpen?: boolean;
};

function questionText(question: Question | undefined, fallback: string) {
  if (!question) return fallback;
  if (typeof question === 'string') return question;
  const value = question.label || question.title || question.text || question.question;
  return typeof value === 'string' && value.trim() ? value : fallback;
}

function answerText(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  const structured = value as Partial<StructuredResponse>;
  if (typeof structured.text === 'string' && structured.text.trim()) return structured.text;
  if (typeof structured.value === 'string' || typeof structured.value === 'number') return String(structured.value);
  if (typeof structured.selectedScore === 'number') return String(structured.selectedScore);
  if (Array.isArray(structured.selectedOptions) && structured.selectedOptions.length) {
    const other = typeof structured.otherText === 'string' && structured.otherText.trim()
      ? ` (${structured.otherText.trim()})`
      : '';
    return `${structured.selectedOptions.join(', ')}${other}`;
  }
  return JSON.stringify(value);
}

export default function OwnResponseCard({
  answers,
  questions = [],
  title = 'Your response',
  subtitle = 'Shown only to you.',
  defaultOpen = false,
}: Props) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const entries = Object.entries(answers || {}).filter(([, value]) => answerText(value).trim());

  if (!entries.length) return null;

  return (
    <div
      className="mt-4 rounded-lg overflow-hidden transition-all"
      style={{
        border: '1px solid var(--border)',
        backgroundColor: 'var(--card)',
      }}
    >
      <button
        type="button"
        onClick={() => setIsOpen(open => !open)}
        className="w-full flex items-center justify-between p-4 text-left"
        style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
        aria-expanded={isOpen}
      >
        <span className="flex items-center gap-2">
          <ClipboardList size={16} style={{ color: 'var(--accent)' }} />
          <span>
            <span className="block text-sm font-semibold text-foreground">{title}</span>
            <span className="block text-xs" style={{ color: 'var(--muted-foreground)' }}>{subtitle}</span>
          </span>
        </span>
        <ChevronDown
          size={16}
          style={{
            color: 'var(--muted-foreground)',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
          }}
        />
      </button>
      {isOpen && (
        <div className="px-4 pb-4 space-y-3" style={{ borderTop: '1px solid var(--border)' }}>
          {entries.map(([key, value], index) => (
            <div key={key} className="rounded-md p-3" style={{ backgroundColor: 'var(--muted)' }}>
              <div className="text-xs font-semibold mb-1" style={{ color: 'var(--muted-foreground)' }}>
                {questionText(
                  questions[Number(key.replace(/^q/, '')) - 1] ?? questions[index],
                  `Response ${index + 1}`,
                )}
              </div>
              <div className="text-sm whitespace-pre-wrap text-foreground">{answerText(value)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
