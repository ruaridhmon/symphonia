interface QuestionModeToggleProps {
  isSurveyMode: boolean;
  onSelectSurvey: () => void;
  onSelectConsensus: () => void;
}

export default function QuestionModeToggle({
  isSurveyMode,
  onSelectSurvey,
  onSelectConsensus,
}: QuestionModeToggleProps) {
  return (
    <div
      className="grid gap-1"
      style={{
        width: '100%',
        maxWidth: '20rem',
      }}
    >
      <div
        className="grid items-center gap-1 rounded-xl p-1"
        style={{
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          backgroundColor: 'color-mix(in srgb, var(--foreground) 4%, var(--card))',
          border: '1px solid color-mix(in srgb, var(--border) 70%, transparent)',
        }}
      >
        <button
          type="button"
          onClick={onSelectSurvey}
          aria-pressed={isSurveyMode}
          className="flex w-full items-center justify-center rounded-[10px] px-4 text-sm font-medium transition-colors"
          style={{
            minHeight: 40,
            width: '100%',
            border: '1px solid transparent',
            boxShadow: 'none',
            backgroundColor: isSurveyMode
              ? 'var(--card)'
              : 'transparent',
            borderColor: isSurveyMode
              ? 'color-mix(in srgb, var(--accent) 40%, var(--border))'
              : 'transparent',
            color: isSurveyMode ? 'var(--foreground)' : 'var(--muted-foreground)',
            cursor: 'pointer',
          }}
        >
          Survey
        </button>
        <button
          type="button"
          onClick={onSelectConsensus}
          aria-pressed={!isSurveyMode}
          className="flex w-full items-center justify-center rounded-[10px] px-4 text-sm font-medium transition-colors"
          style={{
            minHeight: 40,
            width: '100%',
            border: '1px solid transparent',
            boxShadow: 'none',
            backgroundColor: isSurveyMode
              ? 'transparent'
              : 'var(--card)',
            borderColor: isSurveyMode
              ? 'transparent'
              : 'color-mix(in srgb, var(--accent) 40%, var(--border))',
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
