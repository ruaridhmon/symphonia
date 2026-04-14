import { Check } from 'lucide-react';

interface AnswerStateBadgeProps {
  answered: boolean;
  answeredLabel?: string;
  pendingLabel?: string;
}

export default function AnswerStateBadge({
  answered,
  answeredLabel = 'Answered',
  pendingLabel = 'Not answered yet',
}: AnswerStateBadgeProps) {
  return (
    <span
      aria-label={answered ? answeredLabel : pendingLabel}
      title={answered ? answeredLabel : pendingLabel}
      className="inline-flex h-5 w-5 items-center justify-center rounded-full"
      style={{
        backgroundColor: answered
          ? 'color-mix(in srgb, #138a52 12%, transparent)'
          : 'transparent',
        color: answered ? '#138a52' : 'var(--muted-foreground)',
        border: answered
          ? '1px solid color-mix(in srgb, #138a52 28%, transparent)'
          : '1px solid color-mix(in srgb, var(--border) 92%, transparent)',
      }}
    >
      {answered ? (
        <Check size={11} strokeWidth={2.5} />
      ) : (
        <span
          aria-hidden="true"
          className="h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: 'color-mix(in srgb, var(--border) 78%, var(--muted-foreground))' }}
        />
      )}
    </span>
  );
}
