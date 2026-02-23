import { useTranslation } from 'react-i18next';
import { FileDown, Wand2, Microscope, Search, Map, Sparkles, CheckCircle2, Brain, Clock } from 'lucide-react';
import type { ReactNode } from 'react';

interface SynthesisProgressProps {
  stage: string;
  step: number;
  totalSteps: number;
  visible: boolean;
}

const stageIcons: Record<string, ReactNode> = {
  preparing: <FileDown size={16} style={{ color: 'var(--accent)' }} />,
  mock_init: <Wand2 size={16} style={{ color: 'var(--accent)' }} />,
  synthesising: <Microscope size={16} style={{ color: 'var(--accent)' }} />,
  analyzing: <Search size={16} style={{ color: 'var(--accent)' }} />,
  mapping_results: <Map size={16} style={{ color: 'var(--accent)' }} />,
  formatting: <Sparkles size={16} style={{ color: 'var(--accent)' }} />,
  mock_complete: <Wand2 size={16} style={{ color: 'var(--accent)' }} />,
  complete: <CheckCircle2 size={16} style={{ color: 'var(--success)' }} />,
  generating: <Brain size={16} style={{ color: 'var(--accent)' }} />,
};

const stageTranslationKeys: Record<string, string> = {
  preparing: 'synthesis.progress.preparing',
  mock_init: 'synthesis.progress.mockInit',
  synthesising: 'synthesis.progress.synthesising',
  analyzing: 'synthesis.progress.analyzing',
  mapping_results: 'synthesis.progress.mappingResults',
  formatting: 'synthesis.progress.formatting',
  mock_complete: 'synthesis.progress.mockComplete',
  complete: 'synthesis.progress.complete',
  generating: 'synthesis.progress.generating',
};

const defaultIcon = <Clock size={16} style={{ color: 'var(--muted-foreground)' }} />;

export default function SynthesisProgress({ stage, step, totalSteps, visible }: SynthesisProgressProps) {
  const { t } = useTranslation();

  if (!visible) return null;

  const icon = stageIcons[stage] || defaultIcon;
  const translationKey = stageTranslationKeys[stage];
  const label = translationKey ? t(translationKey) : stage;
  const pct = totalSteps > 0 ? Math.round((step / totalSteps) * 100) : 0;
  const isComplete = stage === 'complete' || stage === 'mock_complete';

  return (
    <div
      className={`synthesis-progress ${isComplete ? 'complete' : ''}`}
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="synthesis-progress-header">
        <span className="synthesis-progress-emoji" aria-hidden="true">{icon}</span>
        <span className="synthesis-progress-label">{label}</span>
        <span className="synthesis-progress-pct">{pct}%</span>
      </div>
      <div
        className="synthesis-progress-track"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={t('synthesis.progress.progressLabel', { label })}
      >
        <div
          className="synthesis-progress-fill"
          style={{ width: `${pct}%` }}
        />
      </div>
      {!isComplete && (
        <div className="synthesis-progress-steps">
          {t('synthesis.progress.stepOf', { step, total: totalSteps })}
        </div>
      )}
    </div>
  );
}
