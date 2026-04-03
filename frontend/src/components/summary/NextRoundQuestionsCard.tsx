import { CircleHelp, Plus, X } from 'lucide-react';
import { LoadingButton } from '../index';

type Props = {
  questions: string[];
  onUpdateQuestion: (index: number, value: string) => void;
  onAddQuestion: () => void;
  onRemoveQuestion: (index: number) => void;
  onStartNextRound: () => void;
  loading: boolean;
};

export default function NextRoundQuestionsCard({
  questions,
  onUpdateQuestion,
  onAddQuestion,
  onRemoveQuestion,
  onStartNextRound,
  loading,
}: Props) {
  const hasQuestions = questions.some(q => q.trim().length > 0);

  return (
    <div className="card p-4 sm:p-6">
      <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
        <CircleHelp size={18} style={{ color: 'var(--accent)' }} /> Next round
      </h2>
      <div className="space-y-2 mt-3">
        {questions.map((q, index) => (
          <div key={index} className="flex gap-2 items-center group">
            <span
              className="text-xs font-medium shrink-0 w-6 h-6 flex items-center justify-center rounded-full"
              style={{
                backgroundColor: 'var(--muted)',
                color: 'var(--muted-foreground)',
              }}
            >
              {index + 1}
            </span>
            <input
              type="text"
              className="flex-1 rounded-lg px-3 py-2 text-sm min-w-0"
              value={q}
              onChange={e => onUpdateQuestion(index, e.target.value)}
              placeholder={`Question ${index + 1}`}
            />
            <LoadingButton
              variant="secondary"
              size="sm"
              onClick={() => onRemoveQuestion(index)}
              aria-label={`Remove question ${index + 1}`}
              style={{ opacity: 0.55, transition: 'opacity 0.15s ease', minWidth: 0, paddingInline: '0.65rem' }}
              className="group-hover:!opacity-100"
              icon={<X size={14} aria-hidden="true" />}
            >
            </LoadingButton>
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
          Finalise these prompts, then open the next round with them.
        </p>
        <LoadingButton
          variant="accent"
          size="sm"
          onClick={onStartNextRound}
          loading={loading}
          loadingText="Starting next round…"
          disabled={!hasQuestions}
          className="sm:self-auto"
        >
          {hasQuestions ? 'Start next round' : 'Add a question first'}
        </LoadingButton>
      </div>
    </div>
  );
}
