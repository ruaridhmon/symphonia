import { LoadingButton, SynthesisModeSelector } from '../index';
import { Cpu, Clock3, Layers3 } from 'lucide-react';

type Props = {
  synthesisMode: 'simple' | 'committee' | 'ttd';
  onModeChange: (mode: 'simple' | 'committee' | 'ttd') => void;
  selectedModel: string;
  onModelChange: (model: string) => void;
  models: string[];
  estimateLabel: string | null;
  responseCount: number;
  isGenerating: boolean;
  onGenerate: () => void;
};

export default function AISynthesisPanel({
  synthesisMode,
  onModeChange,
  selectedModel,
  onModelChange,
  models,
  estimateLabel,
  responseCount,
  isGenerating,
  onGenerate,
}: Props) {
  const canGenerate = responseCount > 0;

  return (
    <div
      className="card p-4"
      style={{
        backgroundColor: 'color-mix(in srgb, var(--muted) 20%, var(--card))',
        borderColor: 'color-mix(in srgb, var(--border) 58%, transparent)',
        boxShadow: '0 10px 28px rgba(15, 23, 42, 0.04)',
      }}
    >
      <div className="space-y-2.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--accent) 8%, transparent)',
                color: 'color-mix(in srgb, var(--accent) 86%, var(--foreground))',
              }}
            >
              <Cpu size={15} aria-hidden="true" />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-foreground" style={{ margin: 0 }}>
                Synthesis
              </h3>
            </div>
          </div>
          <select
            id="model-select"
            className="rounded-md px-2.5 py-1.5 text-xs"
            value={selectedModel}
            onChange={e => onModelChange(e.target.value)}
            style={{
              backgroundColor: 'color-mix(in srgb, var(--background) 78%, var(--card))',
              border: '1px solid color-mix(in srgb, var(--border) 62%, transparent)',
              color: 'var(--foreground)',
              maxWidth: '10.5rem',
            }}
          >
            {models.map(model => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap gap-2">
          <div
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium"
            style={{
              backgroundColor: 'var(--muted)',
              color: 'var(--foreground)',
            }}
          >
            <Layers3 size={12} aria-hidden="true" />
            {responseCount} response{responseCount === 1 ? '' : 's'}
          </div>
          {canGenerate && estimateLabel && (
            <div
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium"
              style={{
              backgroundColor: 'var(--muted)',
              color: 'var(--muted-foreground)',
            }}
            >
              <Clock3 size={12} aria-hidden="true" />
              {estimateLabel}
            </div>
          )}
        </div>

        <SynthesisModeSelector mode={synthesisMode} onModeChange={onModeChange} compact />

        <LoadingButton
          variant={canGenerate ? 'accent' : 'secondary'}
          size="sm"
          loading={isGenerating}
          loadingText="Generating…"
          onClick={onGenerate}
          className="w-full font-semibold"
          disabled={!canGenerate}
          style={!canGenerate ? { opacity: 0.72 } : undefined}
        >
          Generate
        </LoadingButton>
        {!canGenerate && (
          <p className="text-xs" style={{ color: 'var(--muted-foreground)', margin: 0 }}>
            Waiting for responses
          </p>
        )}
      </div>
    </div>
  );
}
