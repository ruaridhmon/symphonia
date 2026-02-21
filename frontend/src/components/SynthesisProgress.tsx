import { FileDown, Wand2, Microscope, Search, Map, Sparkles, CheckCircle2, Brain, Clock } from 'lucide-react';
import type { ReactNode } from 'react';

interface SynthesisProgressProps {
  stage: string;
  step: number;
  totalSteps: number;
  visible: boolean;
}

const stageLabels: Record<string, { label: string; icon: ReactNode }> = {
  preparing: { label: 'Preparing responses…', icon: <FileDown size={16} style={{ color: 'var(--accent)' }} /> },
  mock_init: { label: 'Initialising…', icon: <Wand2 size={16} style={{ color: '#a855f7' }} /> },
  synthesising: { label: 'Synthesising insights…', icon: <Microscope size={16} style={{ color: 'var(--accent)' }} /> },
  analyzing: { label: 'Analysing responses…', icon: <Search size={16} style={{ color: 'var(--accent)' }} /> },
  mapping_results: { label: 'Mapping results…', icon: <Map size={16} style={{ color: 'var(--accent)' }} /> },
  formatting: { label: 'Formatting output…', icon: <Sparkles size={16} style={{ color: '#a855f7' }} /> },
  mock_complete: { label: 'Wrapping up…', icon: <Wand2 size={16} style={{ color: '#a855f7' }} /> },
  complete: { label: 'Complete!', icon: <CheckCircle2 size={16} style={{ color: '#16a34a' }} /> },
  generating: { label: 'Generating synthesis…', icon: <Brain size={16} style={{ color: 'var(--accent)' }} /> },
};

const defaultStageInfo = { label: '', icon: <Clock size={16} style={{ color: 'var(--muted-foreground)' }} /> };

export default function SynthesisProgress({ stage, step, totalSteps, visible }: SynthesisProgressProps) {
  if (!visible) return null;

  const info = stageLabels[stage] || { ...defaultStageInfo, label: stage };
  const pct = totalSteps > 0 ? Math.round((step / totalSteps) * 100) : 0;
  const isComplete = stage === 'complete' || stage === 'mock_complete';

  return (
    <div className={`synthesis-progress ${isComplete ? 'complete' : ''}`}>
      <div className="synthesis-progress-header">
        <span className="synthesis-progress-emoji">{info.icon}</span>
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
