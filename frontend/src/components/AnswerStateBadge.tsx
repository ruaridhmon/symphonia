import { Check } from 'lucide-react';

interface AnswerStateBadgeProps {
  answered: boolean;
  answeredLabel?: string;
  pendingLabel?: string;
}

export default function AnswerStateBadge({
  answered,
  answeredLabel = 'Answered',
  pendingLabel = 'Unanswered',
}: AnswerStateBadgeProps) {
  return (
    <span
      aria-label={answered ? answeredLabel : pendingLabel}
      title={answered ? answeredLabel : pendingLabel}
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
      style={{
        backgroundColor: answered
          ? 'color-mix(in srgb, #138a52 12%, transparent)'
          : 'color-mix(in srgb, var(--foreground) 4%, transparent)',
        color: answered ? '#138a52' : 'var(--muted-foreground)',
        border: answered
          ? '1px solid color-mix(in srgb, #138a52 28%, transparent)'
          : '1px solid color-mix(in srgb, var(--border) 80%, transparent)',
      }}
    >
      {answered ? (
        <Check size={11} strokeWidth={2.5} />
      ) : (
        <span
          aria-hidden="true"
          className="h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: 'currentColor' }}
        />
      )}
      <span>{answered ? answeredLabel : pendingLabel}</span>
    </span>
  );
}
