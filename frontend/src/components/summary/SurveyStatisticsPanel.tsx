import { BarChart3 } from 'lucide-react';
import { coerceAnswerPosition } from '../../utils/answers';
import { extractQuestionText } from '../../utils/questions';
import type { RoundWithResponses } from '../../types/summary';

type Question = string | Record<string, unknown>;

type StatisticRow = {
  key: string;
  label: string;
  count: number;
  numericValues: number[];
  distribution: Array<{ label: string; count: number; percent: number }>;
};

type Props = {
  questions: Question[];
  roundResponses: RoundWithResponses | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function questionId(question: Question): string | null {
  if (!isRecord(question)) return null;
  const id = question.questionId;
  return typeof id === 'string' && id.trim() ? id.trim() : null;
}

function questionType(question: Question): string {
  if (!isRecord(question)) return '';
  return typeof question.inputType === 'string' ? question.inputType : '';
}

function configuredOptions(question: Question): string[] {
  if (!isRecord(question) || !Array.isArray(question.options)) return [];
  return question.options.filter((option): option is string => typeof option === 'string' && option.trim().length > 0);
}

function parseNumeric(value: string): number | null {
  const trimmed = value.trim().replace(/%$/, '');
  if (!/^-?\d+(?:\.\d+)?$/.test(trimmed)) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, '');
}

function answerSelections(answer: unknown, inputType: string): string[] {
  if (isRecord(answer) && Array.isArray(answer.selectedOptions)) {
    return answer.selectedOptions
      .map(item => String(item).trim())
      .filter(Boolean);
  }

  const position = coerceAnswerPosition(answer).trim();
  if (!position) return [];

  if (inputType === 'multi_select') {
    return position
      .split(/\n|,/)
      .map(item => item.trim())
      .filter(Boolean);
  }

  return [position];
}

function buildStatistics(questions: Question[], roundResponses: RoundWithResponses | null): StatisticRow[] {
  if (!roundResponses) return [];

  return questions
    .map((question, index): StatisticRow | null => {
      const inputType = questionType(question);
      const id = questionId(question);
      const answerKeys = [`q${index + 1}`, ...(id ? [id] : [])];
      const selections = roundResponses.responses.flatMap(response => {
        const answerKey = answerKeys.find(key => response.answers && key in response.answers);
        return answerKey ? answerSelections(response.answers[answerKey], inputType) : [];
      });

      if (!selections.length) return null;

      const numericValues = selections
        .map(parseNumeric)
        .filter((value): value is number => value != null);
      const selectable = ['slider', 'likert', 'single_select', 'multi_select'].includes(inputType);
      const mostlyNumeric = numericValues.length >= Math.max(2, Math.ceil(selections.length * 0.6));
      if (!selectable && !mostlyNumeric) return null;

      const optionOrder = configuredOptions(question);
      const labels = optionOrder.length
        ? [...optionOrder, ...selections.filter(item => !optionOrder.includes(item))]
        : Array.from(new Set(selections));
      const distribution = labels
        .map(label => {
          const count = selections.filter(item => item === label).length;
          return {
            label,
            count,
            percent: selections.length ? Math.round((count / selections.length) * 100) : 0,
          };
        })
        .filter(item => item.count > 0);

      return {
        key: id || `q${index + 1}`,
        label: extractQuestionText(question) || `Question ${index + 1}`,
        count: selections.length,
        numericValues,
        distribution,
      };
    })
    .filter((item): item is StatisticRow => item != null);
}

export default function SurveyStatisticsPanel({ questions, roundResponses }: Props) {
  const rows = buildStatistics(questions, roundResponses);
  if (!rows.length) return null;

  return (
    <section className="space-y-3" aria-label="Survey statistics">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="text-base font-semibold text-foreground flex items-center gap-2 m-0">
          <BarChart3 size={18} style={{ color: 'var(--accent)' }} />
          Survey statistics
        </h3>
        <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
          Calculated from submitted responses
        </span>
      </div>

      <div className="grid gap-3">
        {rows.map(row => {
          const avg = row.numericValues.length
            ? row.numericValues.reduce((sum, value) => sum + value, 0) / row.numericValues.length
            : null;
          const min = row.numericValues.length ? Math.min(...row.numericValues) : null;
          const max = row.numericValues.length ? Math.max(...row.numericValues) : null;
          const med = median(row.numericValues);

          return (
            <article
              key={row.key}
              className="rounded-lg p-3 sm:p-4"
              style={{
                border: '1px solid var(--border)',
                backgroundColor: 'color-mix(in srgb, var(--muted) 24%, var(--card))',
              }}
            >
              <div className="text-sm font-semibold leading-snug" style={{ color: 'var(--foreground)' }}>
                {row.label}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <Metric label="Responses" value={String(row.count)} />
                {avg != null && <Metric label="Average" value={formatNumber(avg)} />}
                {med != null && <Metric label="Median" value={formatNumber(med)} />}
                {min != null && max != null && <Metric label="Range" value={`${formatNumber(min)} - ${formatNumber(max)}`} />}
              </div>
              {row.distribution.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  {row.distribution.map(item => (
                    <div key={item.label} className="grid grid-cols-[minmax(0,1fr)_3rem] items-center gap-2 text-xs">
                      <div className="min-w-0">
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <span className="truncate" style={{ color: 'var(--foreground)' }}>{item.label}</span>
                          <span style={{ color: 'var(--muted-foreground)' }}>{item.count}</span>
                        </div>
                        <div
                          className="h-2 overflow-hidden rounded-full"
                          style={{ backgroundColor: 'color-mix(in srgb, var(--muted-foreground) 14%, var(--muted))' }}
                        >
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${item.percent}%`,
                              backgroundColor: 'color-mix(in srgb, var(--accent) 72%, var(--foreground))',
                            }}
                          />
                        </div>
                      </div>
                      <div className="text-right font-medium" style={{ color: 'var(--muted-foreground)' }}>
                        {item.percent}%
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-md px-2.5 py-1.5"
      style={{
        backgroundColor: 'var(--card)',
        border: '1px solid color-mix(in srgb, var(--border) 70%, transparent)',
      }}
    >
      <div className="text-[10px] font-semibold uppercase" style={{ color: 'var(--muted-foreground)' }}>
        {label}
      </div>
      <div className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
        {value}
      </div>
    </div>
  );
}
