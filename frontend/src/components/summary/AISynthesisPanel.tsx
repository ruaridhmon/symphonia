import { LoadingButton, SynthesisModeSelector } from '../index';
import { Cpu } from 'lucide-react';

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
      className="card p-3"
      style={{
        background:
          'linear-gradient(180deg, color-mix(in srgb, var(--accent) 3%, var(--card)), var(--card))',
        borderColor: 'color-mix(in srgb, var(--accent) 20%, var(--border))',
      }}
    >
      <h3
        className="text-[10px] font-semibold uppercase tracking-wider mb-2 flex items-center gap-1"
        style={{ color: 'var(--accent)' }}
      >
        <Cpu size={10} aria-hidden="true" />
        AI Synthesis
      </h3>
      <div className="space-y-2">
        <p className="text-xs" style={{ color: 'var(--muted-foreground)', lineHeight: 1.55 }}>
          Choose the synthesis mode, then generate when the round is ready.
        </p>
        <SynthesisModeSelector mode={synthesisMode} onModeChange={onModeChange} />

        <div
          className="rounded-lg px-3 py-2"
          style={{
            backgroundColor: canGenerate
              ? 'color-mix(in srgb, var(--accent) 7%, transparent)'
              : 'var(--muted)',
            border: '1px solid color-mix(in srgb, var(--accent) 12%, var(--border))',
          }}
        >
          <p
            className="text-[11px]"
            style={{ color: 'var(--foreground)', lineHeight: 1.45, margin: 0 }}
          >
            {canGenerate
              ? `${estimateLabel} for ${responseCount} response${responseCount === 1 ? '' : 's'}.`
              : 'Waiting for responses before synthesis can begin.'}
          </p>
        </div>

        <div>
          <label
            htmlFor="model-select"
            className="block text-xs font-medium text-muted-foreground mb-1"
          >
            Model
          </label>
          <select
            id="model-select"
            className="w-full rounded-md px-2 py-1.5 text-xs"
            value={selectedModel}
            onChange={e => onModelChange(e.target.value)}
            style={{
              backgroundColor: 'var(--card)',
              border: '1px solid var(--input)',
              color: 'var(--foreground)',
            }}
          >
            {models.map(model => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </select>
        </div>

        <LoadingButton
          variant="accent"
          size="sm"
          loading={isGenerating}
          loadingText="Generating…"
          onClick={onGenerate}
          className="w-full font-semibold"
          disabled={!canGenerate}
        >
          {canGenerate ? 'Generate AI Synthesis' : 'Waiting for Responses'}
        </LoadingButton>
      </div>
    </div>
  );
}
