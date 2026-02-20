interface SynthesisProgressProps {
  stage: string;
  step: number;
  totalSteps: number;
  visible: boolean;
}

const stageLabels: Record<string, { label: string; emoji: string }> = {
  preparing: { label: 'Preparing responses…', emoji: '📋' },
  mock_init: { label: 'Initialising…', emoji: '🎭' },
  synthesising: { label: 'Synthesising insights…', emoji: '🔬' },
  analyzing: { label: 'Analysing responses…', emoji: '🔍' },
  mapping_results: { label: 'Mapping results…', emoji: '🗺️' },
  formatting: { label: 'Formatting output…', emoji: '✨' },
  mock_complete: { label: 'Wrapping up…', emoji: '🎭' },
  complete: { label: 'Complete!', emoji: '✅' },
  generating: { label: 'Generating synthesis…', emoji: '🧠' },
};

export default function SynthesisProgress({ stage, step, totalSteps, visible }: SynthesisProgressProps) {
  if (!visible) return null;

  const info = stageLabels[stage] || { label: stage, emoji: '⏳' };
  const pct = totalSteps > 0 ? Math.round((step / totalSteps) * 100) : 0;
  const isComplete = stage === 'complete' || stage === 'mock_complete';

  return (
    <div className={`synthesis-progress ${isComplete ? 'complete' : ''}`}>
      <div className="synthesis-progress-header">
        <span className="synthesis-progress-emoji">{info.emoji}</span>
        <span className="synthesis-progress-label">{info.label}</span>
        <span className="synthesis-progress-pct">{pct}%</span>
      </div>
      <div className="synthesis-progress-track">
        <div
          className="synthesis-progress-fill"
          style={{ width: `${pct}%` }}
        />
      </div>
      {!isComplete && (
        <div className="synthesis-progress-steps">
          Step {step} of {totalSteps}
        </div>
      )}
    </div>
  );
}
