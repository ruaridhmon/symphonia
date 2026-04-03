interface QuestionModeToggleProps {
  isSurveyMode: boolean;
  onSelectSurvey: () => void;
  onSelectConsensus: () => void;
  label?: string;
}

export default function QuestionModeToggle({
  isSurveyMode,
  onSelectSurvey,
  onSelectConsensus,
  label = 'Survey or Consensus',
}: QuestionModeToggleProps) {
  return (
    <div className="space-y-3">
      <div className="text-sm font-medium text-foreground">{label}</div>
      <div
        className="grid items-center justify-items-stretch gap-3"
        style={{
          gridTemplateColumns: '1fr auto 1fr',
          width: 'min(100%, 28rem)',
        }}
      >
        <button
          type="button"
          onClick={onSelectSurvey}
          className="flex w-full items-center justify-center rounded-lg px-4 text-sm font-medium transition-colors"
          style={{
            minHeight: 42,
            width: '100%',
            border: '1px solid',
            borderColor: isSurveyMode ? 'var(--accent)' : 'var(--border)',
            backgroundColor: isSurveyMode
              ? 'color-mix(in srgb, var(--accent) 10%, var(--card))'
              : 'var(--card)',
            color: isSurveyMode ? 'var(--foreground)' : 'var(--muted-foreground)',
            cursor: 'pointer',
          }}
        >
          Survey
        </button>
        <span
          className="text-[11px] font-semibold uppercase tracking-[0.12em]"
          style={{ color: 'var(--muted-foreground)' }}
        >
          or
        </span>
        <button
          type="button"
          onClick={onSelectConsensus}
          className="flex w-full items-center justify-center rounded-lg px-4 text-sm font-medium transition-colors"
          style={{
            minHeight: 42,
            width: '100%',
            border: '1px solid',
            borderColor: isSurveyMode ? 'var(--border)' : 'var(--accent)',
            backgroundColor: isSurveyMode
              ? 'var(--card)'
              : 'color-mix(in srgb, var(--accent) 10%, var(--card))',
            color: isSurveyMode ? 'var(--muted-foreground)' : 'var(--foreground)',
            cursor: 'pointer',
          }}
        >
          Consensus
        </button>
      </div>
    </div>
  );
}
