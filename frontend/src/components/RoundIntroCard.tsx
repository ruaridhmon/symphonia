import { BarChart3, FileText } from 'lucide-react';
import DistributionSplitBar, { type DistributionSlice } from './DistributionSplitBar';

export type PreviousRoundStatistics = {
  round_number: number;
  response_count: number;
  items: Array<{
    key: string;
    label: string;
    dimension_label?: string | null;
    count: number;
    distribution: DistributionSlice[];
  }>;
};

function groupKey(label: string | null | undefined) {
  return (label || 'ungrouped').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'ungrouped';
}

function groupStats(items: PreviousRoundStatistics['items']) {
  const groups = new Map<string, { key: string; label: string | null; items: PreviousRoundStatistics['items'] }>();
  const ungrouped: Array<{ key: string; label: string | null; items: PreviousRoundStatistics['items'] }> = [];

  items.forEach(item => {
    if (!item.dimension_label) {
      ungrouped.push({ key: item.key, label: null, items: [item] });
      return;
    }
    const key = groupKey(item.dimension_label);
    const existing = groups.get(key);
    if (existing) {
      existing.items.push(item);
    } else {
      groups.set(key, { key, label: item.dimension_label, items: [item] });
    }
  });

  return [...groups.values(), ...ungrouped];
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function stripDimension(label: string, dimension?: string | null) {
  if (!dimension) return label;
  const suffix = ` - ${dimension}`;
  return label.endsWith(suffix) ? label.slice(0, -suffix.length) : label.replace(new RegExp(`\\s*-\\s*${escapeRegExp(dimension)}$`, 'i'), '');
}

export function PreviousRoundStatisticsPanel({ statistics }: { statistics?: PreviousRoundStatistics | null }) {
  if (!statistics || !statistics.items.length) return null;
  const groups = groupStats(statistics.items);

  return (
    <section
      className="mb-5 rounded-xl border p-4"
      style={{
        borderColor: 'color-mix(in srgb, var(--border) 70%, transparent)',
        backgroundColor: 'color-mix(in srgb, var(--muted) 22%, var(--card))',
      }}
      aria-label="Previous round survey statistics"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="m-0 flex items-center gap-2 text-sm font-semibold text-foreground">
          <BarChart3 size={16} style={{ color: 'var(--accent)' }} />
          Previous round statistics
        </h2>
        <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
          Round {statistics.round_number} - {statistics.response_count} response{statistics.response_count === 1 ? '' : 's'}
        </span>
      </div>

      <div className="mt-4 grid gap-4">
        {groups.map(group => (
          <div key={group.key} className={group.label ? 'space-y-2' : 'grid gap-3'}>
            {group.label ? (
              <h3 className="m-0 text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                {group.label}
              </h3>
            ) : null}
            <div className="grid gap-3">
              {group.items.map(item => (
                <article
                  key={item.key}
                  className="rounded-lg p-3 sm:p-4"
                  style={{
                    border: '1px solid var(--border)',
                    backgroundColor: 'color-mix(in srgb, var(--muted) 24%, var(--card))',
                  }}
                >
                  <div className="text-sm font-semibold leading-snug" style={{ color: 'var(--foreground)' }}>
                    {stripDimension(item.label, item.dimension_label)}
                  </div>
                  <DistributionSplitBar distribution={item.distribution} total={item.count} />
                </article>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function RoundIntroCard({ title, body }: { title?: string | null; body?: string | null }) {
  const cleanTitle = title?.trim();
  const cleanBody = body?.trim();
  if (!cleanTitle && !cleanBody) return null;

  return (
    <section
      className="mb-5 rounded-xl border p-4"
      style={{
        borderColor: 'color-mix(in srgb, var(--border) 70%, transparent)',
        backgroundColor: 'color-mix(in srgb, var(--muted) 18%, var(--card))',
      }}
      aria-label="Round instructions"
    >
      {cleanTitle ? (
        <h2 className="m-0 flex items-center gap-2 text-sm font-semibold text-foreground">
          <FileText size={16} style={{ color: 'var(--accent)' }} />
          {cleanTitle}
        </h2>
      ) : null}
      {cleanBody ? (
        <div className={cleanTitle ? 'mt-2' : ''}>
          {cleanBody.split(/\n{2,}/).map((paragraph, index) => (
            <p
              key={index}
              className="text-sm leading-6"
              style={{ color: 'var(--muted-foreground)', margin: index === 0 ? 0 : '0.75rem 0 0' }}
            >
              {paragraph}
            </p>
          ))}
        </div>
      ) : null}
    </section>
  );
}
