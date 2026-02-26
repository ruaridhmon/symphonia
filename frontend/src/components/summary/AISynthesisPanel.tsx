import { LoadingButton, SynthesisModeSelector } from '../index';

type Props = {
  synthesisMode: 'simple' | 'committee' | 'ttd';
  onModeChange: (mode: 'simple' | 'committee' | 'ttd') => void;
  selectedModel: string;
  onModelChange: (model: string) => void;
  models: string[];
  isGenerating: boolean;
  onGenerate: () => void;
};

export default function AISynthesisPanel({
  synthesisMode,
  onModeChange,
  selectedModel,
  onModelChange,
  models,
  isGenerating,
  onGenerate,
}: Props) {
  return (
    <div
      className="card p-4"
      style={{
        background:
          'linear-gradient(180deg, color-mix(in srgb, var(--accent) 4%, var(--card)), var(--card))',
        borderColor: 'color-mix(in srgb, var(--accent) 20%, var(--border))',
      }}
    >
      <h3
        className="text-xs font-semibold uppercase tracking-wider mb-3"
        style={{ color: 'var(--accent)' }}
      >
        🤖 AI-Powered Synthesis
      </h3>
      <div className="space-y-3">
        <SynthesisModeSelector mode={synthesisMode} onModeChange={onModeChange} />

        <div>
          <label
            htmlFor="model-select"
            className="block text-sm font-medium text-muted-foreground mb-1.5"
          >
            Choose a model
          </label>
          <select
            id="model-select"
            className="w-full rounded-lg px-3 py-2 text-sm"
            value={selectedModel}
            onChange={e => onModelChange(e.target.value)}
          >
            {models.map(model => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </select>
        </div>

        <LoadingButton
          variant="purple"
          size="md"
          loading={isGenerating}
          loadingText="Generating…"
          onClick={onGenerate}
          className="w-full font-semibold"
        >
          Generate Summary
        </LoadingButton>
      </div>
    </div>
  );
}
