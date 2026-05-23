import { useState } from 'react';

export type DistributionSlice = {
  label: string;
  count: number;
  percent: number;
  scaleIndex?: number;
};

const PALETTE = ['#dedbd2', '#b9d6ef', '#3f8dd8', '#236daa', '#0f568f', '#8a94a6'];

function colorFor(label: string, index: number) {
  const lower = label.toLowerCase();
  if (lower.includes('unsure') || lower.includes("don't know") || lower.includes('dont know')) {
    return '#8a94a6';
  }
  return PALETTE[index % PALETTE.length];
}

function shortLabel(label: string) {
  const lower = label.toLowerCase();
  if (lower.includes('unsure') || lower.includes("don't know") || lower.includes('dont know')) return 'Unsure';
  if (lower.includes('somewhat')) return 'Somewhat';
  if (lower.includes('moderate')) return 'Moderately';
  if (lower.includes('unimportant')) return 'Unimportant';
  if (lower.includes('very')) return 'Very important';
  if (lower.includes('essential')) return 'Essential';
  return label;
}

export default function DistributionSplitBar({
  distribution,
  total,
}: {
  distribution: DistributionSlice[];
  total: number;
}) {
  const [hoveredLabel, setHoveredLabel] = useState<string | null>(null);
  const visible = distribution.filter(item => item.count > 0);
  const hovered = hoveredLabel ? distribution.find(item => item.label === hoveredLabel) : null;
  const hoveredIndex = hovered ? distribution.findIndex(item => item.label === hovered.label) : -1;

  if (!visible.length) {
    return (
      <p className="mt-3 text-xs" style={{ color: 'var(--muted-foreground)', marginBottom: 0 }}>
        No distribution data yet.
      </p>
    );
  }

  return (
    <div className="mt-3 space-y-2">
      <div className="relative" onMouseLeave={() => setHoveredLabel(null)}>
        {hovered ? (
          <div
            className="absolute right-2 top-1/2 z-10 flex -translate-y-1/2 items-center gap-2 rounded-md px-2.5 py-1 text-xs font-semibold"
            style={{
              backgroundColor: 'rgba(15, 23, 42, 0.96)',
              border: '1px solid rgba(255,255,255,0.18)',
              color: 'white',
              boxShadow: '0 10px 24px rgba(15, 23, 42, 0.24)',
              pointerEvents: 'none',
            }}
          >
            <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: colorFor(hovered.label, hoveredIndex) }} />
            <span>{shortLabel(hovered.label)}: {hovered.percent}%</span>
          </div>
        ) : null}

        <div
          className="flex h-8 overflow-hidden rounded-md"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--muted-foreground) 10%, var(--muted))',
            border: '1px solid color-mix(in srgb, var(--border) 76%, transparent)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.48)',
          }}
          role="img"
          aria-label={`Response distribution across ${total} responses`}
        >
          {visible.map((item, index) => {
            const sourceIndex = (item.scaleIndex ?? distribution.findIndex(slice => slice.label === item.label) + 1) - 1;
            const isHovered = hoveredLabel === item.label;
            const isDimmed = Boolean(hoveredLabel && !isHovered);
            const width = Math.max(item.percent, item.count > 0 ? 2 : 0);
            return (
              <div
                key={item.label}
                className="relative flex h-full items-center justify-center overflow-hidden text-[10px] font-semibold text-white transition-all"
                title={`${item.label}: ${item.count} response${item.count === 1 ? '' : 's'} (${item.percent}%)`}
                onMouseEnter={() => setHoveredLabel(item.label)}
                style={{
                  width: `${width}%`,
                  backgroundColor: colorFor(item.label, sourceIndex),
                  minWidth: item.count > 0 ? '0.35rem' : 0,
                  boxShadow: index > 0 ? 'inset 1px 0 rgba(255,255,255,0.55)' : undefined,
                  opacity: isDimmed ? 0.42 : 1,
                  filter: isHovered ? 'saturate(1.12) brightness(1.04)' : undefined,
                }}
              >
                {item.percent >= 26 && !hoveredLabel ? `${item.percent}%` : ''}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {distribution.map((item, index) => (
          <button
            key={item.label}
            type="button"
            onMouseEnter={() => setHoveredLabel(item.label)}
            onMouseLeave={() => setHoveredLabel(null)}
            className="flex min-w-0 items-center gap-1.5 rounded-sm p-0 text-[11px] transition-opacity"
            title={`${item.label}: ${item.count} response${item.count === 1 ? '' : 's'} (${item.percent}%)`}
            style={{
              border: 'none',
              background: 'transparent',
              color: 'var(--muted-foreground)',
              opacity: item.count === 0 ? 0.42 : hoveredLabel && hoveredLabel !== item.label ? 0.45 : 1,
              cursor: 'default',
            }}
          >
            <span
              className="h-2 w-2 shrink-0 rounded-sm"
              style={{ backgroundColor: colorFor(item.label, (item.scaleIndex ?? index + 1) - 1) }}
            />
            <span className="truncate" style={{ color: 'var(--foreground)' }}>
              <span aria-hidden="true">{item.scaleIndex ?? index + 1} - </span>
              <span>{shortLabel(item.label)}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
