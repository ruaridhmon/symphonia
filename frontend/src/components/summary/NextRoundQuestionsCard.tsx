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
        <span>❓</span> Next Round Questions
      </h2>
      <div className="space-y-3 mt-3">
        {questions.map((q, index) => (
          <div key={index} className="flex gap-2 items-center">
            <input
              type="text"
              className="flex-1 rounded-lg px-3 py-2 text-sm min-w-0"
              value={q}
              onChange={e => onUpdateQuestion(index, e.target.value)}
              placeholder={`Question ${index + 1}`}
            />
            <LoadingButton
              variant="destructive"
              size="sm"
              onClick={() => onRemoveQuestion(index)}
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
        className="mt-4"
      >
        Add Question
      </LoadingButton>
    </div>
  );
}
