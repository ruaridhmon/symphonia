import { useState } from 'react';
import { LoadingButton, SynthesisModeSelector } from '../index';
import { ChevronDown, ChevronRight, Cpu, Clock3, Layers3, ListChecks, Palette } from 'lucide-react';

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
  summaryOptions: Record<string, boolean>;
  onSummaryOptionChange: (option: string) => void;
  synthesisBackground: 'default' | 'paper' | 'soft';
  onSynthesisBackgroundChange: (background: 'default' | 'paper' | 'soft') => void;
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
  summaryOptions,
  onSummaryOptionChange,
  synthesisBackground,
  onSynthesisBackgroundChange,
}: Props) {
  const canGenerate = responseCount > 0;
  const [contentOpen, setContentOpen] = useState(false);
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const sectionOptions = [
    ['narrative', 'Text overview'],
    ['agreements', 'Agreements'],
    ['disagreements', 'Disagreements'],
    ['nuances', 'Nuances'],
    ['consensusMap', 'Consensus heatmap'],
    ['probes', 'Follow-up questions'],
  ] as const;
  const backgroundOptions = [
    ['default', 'Default'],
    ['paper', 'White'],
    ['soft', 'Soft'],
  ] as const;

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

        <div className="space-y-2">
          <p className="text-xs" style={{ color: 'var(--muted-foreground)', margin: 0 }}>
            Choose the synthesis method. More thorough modes usually produce deeper analysis,
            but they take longer and use more compute.
          </p>
          <SynthesisModeSelector mode={synthesisMode} onModeChange={onModeChange} compact />
        </div>

        <div className="space-y-1.5">
          <button
            type="button"
            onClick={() => setContentOpen(open => !open)}
            className="flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-xs font-semibold"
            style={{ border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--foreground)' }}
            aria-expanded={contentOpen}
          >
            <span className="flex items-center gap-1.5">
              <ListChecks size={13} aria-hidden="true" />
              Synthesis content
            </span>
            {contentOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
          {contentOpen && (
            <div className="grid grid-cols-1 gap-1.5">
              {sectionOptions.map(([key, label]) => (
                <label
                  key={key}
                  className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs"
                  style={{
                    border: '1px solid var(--border)',
                    backgroundColor: summaryOptions[key]
                      ? 'color-mix(in srgb, var(--accent) 8%, var(--card))'
                      : 'var(--card)',
                    color: 'var(--foreground)',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={!!summaryOptions[key]}
                    onChange={() => onSummaryOptionChange(key)}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <button
            type="button"
            onClick={() => setAppearanceOpen(open => !open)}
            className="flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-xs font-semibold"
            style={{ border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--foreground)' }}
            aria-expanded={appearanceOpen}
          >
            <span className="flex items-center gap-1.5">
              <Palette size={13} aria-hidden="true" />
              Appearance
            </span>
            {appearanceOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
          {appearanceOpen && (
            <div className="grid grid-cols-3 gap-1.5">
              {backgroundOptions.map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => onSynthesisBackgroundChange(key)}
                  className="rounded-md px-2 py-1.5 text-xs font-medium"
                  style={{
                    border: synthesisBackground === key ? '1px solid var(--accent)' : '1px solid var(--border)',
                    backgroundColor: synthesisBackground === key
                      ? 'color-mix(in srgb, var(--accent) 10%, var(--card))'
                      : 'var(--card)',
                    color: synthesisBackground === key ? 'var(--accent)' : 'var(--foreground)',
                    cursor: 'pointer',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

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
