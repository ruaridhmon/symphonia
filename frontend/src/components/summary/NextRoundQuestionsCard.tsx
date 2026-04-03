import { CircleHelp, Plus, X } from 'lucide-react';
import { LoadingButton } from '../index';

type Props = {
  questions: string[];
  onUpdateQuestion: (index: number, value: string) => void;
  onAddQuestion: () => void;
  onRemoveQuestion: (index: number) => void;
};

export default function NextRoundQuestionsCard({
  questions,
  onUpdateQuestion,
  onAddQuestion,
  onRemoveQuestion,
}: Props) {
  return (
    <div className="card p-4 sm:p-6">
      <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
        <CircleHelp size={18} style={{ color: 'var(--accent)' }} /> Next Round Questions
      </h2>
      <p className="mt-2 text-sm" style={{ color: 'var(--muted-foreground)' }}>
        Refine the follow-up prompts while the current round is still fresh. Clear, specific questions make the next synthesis faster and stronger.
      </p>
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
              style={{ opacity: 0.4, transition: 'opacity 0.15s ease' }}
              className="group-hover:!opacity-100"
              icon={<X size={14} aria-hidden="true" />}
            >
              Remove
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
    </div>
  );
}
