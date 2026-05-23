import { ArrowRight, CircleHelp, Plus, Save, X } from 'lucide-react';
import { LoadingButton } from '../index';

type Props = {
  questions: string[];
  onUpdateQuestion: (index: number, value: string) => void;
  onAddQuestion: () => void;
  onRemoveQuestion: (index: number) => void;
  onSaveCurrentRound?: () => void;
  onStartNextRound: () => void;
  loading: boolean;
  saving?: boolean;
};

export default function NextRoundQuestionsCard({
  questions,
  onUpdateQuestion,
  onAddQuestion,
  onRemoveQuestion,
  onSaveCurrentRound,
  onStartNextRound,
  loading,
  saving = false,
}: Props) {
  const hasQuestions = questions.some(q => q.trim().length > 0);

  return (
    <div
      className="card p-4 sm:p-5"
      style={{
        backgroundColor: 'color-mix(in srgb, var(--muted) 18%, var(--card))',
        borderColor: 'color-mix(in srgb, var(--border) 56%, transparent)',
      }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="m-0 flex items-center gap-2 text-lg font-semibold text-foreground">
            <CircleHelp size={18} style={{ color: 'var(--accent)' }} /> Round setup
          </h2>
          <p className="mt-1 text-sm" style={{ color: 'var(--muted-foreground)', marginBottom: 0 }}>
            Review the next prompts before participants see them.
          </p>
        </div>
        <span
          className="rounded-full px-3 py-1 text-xs font-semibold"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--accent) 9%, transparent)',
            color: 'var(--accent)',
          }}
        >
          {questions.length} question{questions.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className="space-y-2.5 mt-4">
        {questions.map((q, index) => (
          <div
            key={index}
            className="group grid gap-2 rounded-xl p-3 sm:grid-cols-[2rem_minmax(0,1fr)_auto] sm:items-start"
            style={{
              backgroundColor: 'var(--background)',
              border: '1px solid color-mix(in srgb, var(--border) 72%, transparent)',
            }}
          >
            <span
              className="text-xs font-semibold shrink-0 w-8 h-8 flex items-center justify-center rounded-md"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--accent) 10%, transparent)',
                color: 'var(--accent)',
              }}
            >
              Q{index + 1}
            </span>
            <textarea
              rows={2}
              className="min-w-0 resize-y rounded-lg px-3 py-2 text-sm leading-6"
              value={q}
              onChange={e => onUpdateQuestion(index, e.target.value)}
              placeholder={`Question ${index + 1}`}
              style={{ minHeight: '3.25rem' }}
            />
            <LoadingButton
              variant="secondary"
              size="sm"
              onClick={() => onRemoveQuestion(index)}
              aria-label={`Remove question ${index + 1}`}
              style={{ opacity: 0.55, transition: 'opacity 0.15s ease', minWidth: 0, paddingInline: '0.65rem' }}
              className="group-hover:!opacity-100"
              icon={<X size={14} aria-hidden="true" />}
            >Remove</LoadingButton>
          </div>
        ))}
      </div>
      <LoadingButton
        variant="secondary"
        size="sm"
        onClick={onAddQuestion}
        className="mt-3"
        icon={<Plus size={14} aria-hidden="true" />}
      >
        Add Question
      </LoadingButton>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm" style={{ color: 'var(--muted-foreground)', margin: 0 }}>
          Save the current setup, or open a new round with these prompts.
        </p>
        <div className="flex flex-wrap gap-2">
          {onSaveCurrentRound ? (
            <LoadingButton
              variant="secondary"
              size="sm"
              onClick={onSaveCurrentRound}
              loading={saving}
              loadingText="Saving…"
              disabled={!hasQuestions || loading}
              icon={<Save size={14} aria-hidden="true" />}
            >
              Save setup
            </LoadingButton>
          ) : null}
          <LoadingButton
            variant="accent"
            size="sm"
            onClick={onStartNextRound}
            loading={loading}
            loadingText="Starting next round…"
            disabled={!hasQuestions || saving}
            className="sm:self-auto"
            icon={<ArrowRight size={14} aria-hidden="true" />}
          >
            {hasQuestions ? 'Start next round' : 'Add a question first'}
          </LoadingButton>
        </div>
      </div>
    </div>
  );
}
