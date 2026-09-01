import { BarChart3 } from 'lucide-react';
import { coerceAnswerPosition } from '../../utils/answers';
import { extractQuestionText } from '../../utils/questions';
import type { RoundWithResponses } from '../../types/summary';
import DistributionSplitBar from '../DistributionSplitBar';

type Question = string | Record<string, unknown>;

type OriginalResponse = {
  key: number;
  expert: string;
  rating: string;
  text: string;
};

type StatisticRow = {
  key: string;
  label: string;
  count: number;
  numericValues: number[];
  sectionTitle?: string | null;
  originalResponses: OriginalResponse[];
  distribution: Array<{ label: string; count: number; percent: number; scaleIndex?: number }>;
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

function sectionTitle(question: Question): string | null {
  if (!isRecord(question)) return null;
  const value = question.sectionTitle;
  return typeof value === 'string' && value.trim() ? value.trim() : null;
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

function originalResponseText(answer: unknown): string {
  if (!isRecord(answer)) return '';

  const fields = [
    answer.evidence,
    answer.reasoning,
    answer.explanation,
    answer.comment,
    answer.comments,
    answer.freeText,
    answer.text,
    answer.confidenceJustification,
    answer.counterarguments,
  ];

  return Array.from(
    new Set(
      fields
        .filter((value): value is string => typeof value === 'string')
        .map(value => value.trim())
        .filter(Boolean),
    ),
  ).join('\n\n');
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
      const matchedAnswers = roundResponses.responses.flatMap(response => {
        const answerKey = answerKeys.find(key => response.answers && key in response.answers);
        return answerKey ? [{ response, answer: response.answers[answerKey] }] : [];
      });
      const selections = matchedAnswers.flatMap(({ answer }) => answerSelections(answer, inputType));
      const originalResponses = inputType === 'likert'
        ? matchedAnswers.flatMap(({ response, answer }) => {
            const text = originalResponseText(answer);
            if (!text) return [];
            return [{
              key: response.id,
              expert: response.email || 'Anonymous',
              rating: coerceAnswerPosition(answer).trim(),
              text,
            }];
          })
        : [];

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
        .map((label, labelIndex) => {
          const count = selections.filter(item => item === label).length;
          return {
            label,
            count,
            percent: selections.length ? Math.round((count / selections.length) * 100) : 0,
            scaleIndex: labelIndex + 1,
          };
        })
        .filter(item => item.count > 0);

      return {
        key: id || `q${index + 1}`,
        label: extractQuestionText(question) || `Question ${index + 1}`,
        count: selections.length,
        numericValues,
        sectionTitle: sectionTitle(question),
        originalResponses,
        distribution,
      };
    })
    .filter((item): item is StatisticRow => item != null);
}

export default function SurveyStatisticsPanel({ questions, roundResponses }: Props) {
  const rows = buildStatistics(questions, roundResponses);
  if (!rows.length) return null;
  const groups = rows.reduce<Array<{ title: string | null; rows: StatisticRow[] }>>((acc, row) => {
    const last = acc[acc.length - 1];
    if (last && last.title === row.sectionTitle) {
      last.rows.push(row);
    } else {
      acc.push({ title: row.sectionTitle ?? null, rows: [row] });
    }
    return acc;
  }, []);

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

      <div className="grid gap-4">
        {groups.map(group => (
          <div key={group.title ?? 'ungrouped'} className="grid gap-3">
            {group.title ? (
              <h4 className="m-0 text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                {group.title}
              </h4>
            ) : null}
            {group.rows.map(row => {
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
                  <DistributionSplitBar distribution={row.distribution} total={row.count} />
                  {row.originalResponses.length > 0 ? (
                    <details
                      className="mt-3 rounded-md"
                      style={{
                        border: '1px solid color-mix(in srgb, var(--border) 70%, transparent)',
                        backgroundColor: 'var(--card)',
                      }}
                    >
                      <summary
                        className="cursor-pointer px-3 py-2 text-sm font-medium"
                        style={{ color: 'var(--foreground)' }}
                      >
                        Show original responses ({row.originalResponses.length})
                      </summary>
                      <div className="space-y-3 px-3 pb-3">
                        {row.originalResponses.map(response => (
                          <div
                            key={response.key}
                            className="rounded-md p-3"
                            style={{
                              border: '1px solid var(--border)',
                              backgroundColor: 'color-mix(in srgb, var(--muted) 24%, var(--card))',
                            }}
                          >
                            <div className="mb-1 text-xs font-semibold" style={{ color: 'var(--muted-foreground)' }}>
                              {response.expert}{response.rating ? ` · ${response.rating}` : ''}
                            </div>
                            <div className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--foreground)' }}>
                              {response.text}
                            </div>
                          </div>
                        ))}
                      </div>
                    </details>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Metric label="Responses" value={String(row.count)} />
                    {avg != null && <Metric label="Average" value={formatNumber(avg)} />}
                    {med != null && <Metric label="Median" value={formatNumber(med)} />}
                    {min != null && max != null && <Metric label="Range" value={`${formatNumber(min)} - ${formatNumber(max)}`} />}
                  </div>
                </article>
              );
            })}
          </div>
        ))}
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
