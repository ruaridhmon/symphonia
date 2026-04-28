import { useState } from 'react';
import { LoadingButton, SynthesisModeSelector } from '../index';
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, Cpu, Clock3, Eye, GripVertical, Layers3, ListChecks, Palette } from 'lucide-react';

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
  summaryOrder?: string[];
  onSummaryOptionMove?: (option: string, direction: 'up' | 'down') => void;
  synthesisBackground: 'default' | 'paper' | 'soft';
  onSynthesisBackgroundChange: (background: 'default' | 'paper' | 'soft') => void;
  showOwnResponseToParticipants: boolean;
  onShowOwnResponseToParticipantsChange: (enabled: boolean) => void;
  isSavingParticipantVisibility?: boolean;
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
  summaryOrder,
  onSummaryOptionMove,
  synthesisBackground,
  onSynthesisBackgroundChange,
  showOwnResponseToParticipants,
  onShowOwnResponseToParticipantsChange,
  isSavingParticipantVisibility = false,
}: Props) {
  const canGenerate = responseCount > 0;
  const [contentOpen, setContentOpen] = useState(false);
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [participantOpen, setParticipantOpen] = useState(false);
  const sectionOptions = [
    ['narrative', 'Text overview'],
    ['agreements', 'Agreements'],
    ['disagreements', 'Disagreements'],
    ['nuances', 'Nuances'],
    ['consensusMap', 'Consensus heatmap'],
    ['probes', 'Follow-up questions'],
  ] as const;
  const sectionLabelMap = Object.fromEntries(sectionOptions.map(([key, label]) => [key, label]));
  const selectedOrder = (summaryOrder || sectionOptions.map(([key]) => key))
    .filter(key => summaryOptions[key] && sectionLabelMap[key]);
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
              Show in synthesis
            </span>
            {contentOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
          {contentOpen && (
            <div className="grid grid-cols-1 gap-1.5">
              <p className="text-[11px] px-1" style={{ color: 'var(--muted-foreground)', margin: 0 }}>
                These change the page immediately. Generate only creates a new AI draft.
              </p>
              {sectionOptions.map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  className="flex items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-xs"
                  onClick={() => onSummaryOptionChange(key)}
                  aria-pressed={!!summaryOptions[key]}
                  style={{
                    border: '1px solid var(--border)',
                    backgroundColor: summaryOptions[key]
                      ? 'color-mix(in srgb, var(--accent) 8%, var(--card))'
                      : 'var(--card)',
                    color: 'var(--foreground)',
                    cursor: 'pointer',
                  }}
                >
                  <span>{label}</span>
                  <span
                    aria-hidden="true"
                    className="inline-flex h-4 w-7 items-center rounded-full p-0.5"
                    style={{
                      backgroundColor: summaryOptions[key]
                        ? 'var(--accent)'
                        : 'color-mix(in srgb, var(--muted-foreground) 20%, var(--muted))',
                    }}
                  >
                    <span
                      className="block h-3 w-3 rounded-full transition-transform"
                      style={{
                        backgroundColor: 'white',
                        transform: summaryOptions[key] ? 'translateX(0.75rem)' : 'translateX(0)',
                      }}
                    />
                  </span>
                </button>
              ))}
              {selectedOrder.length > 1 && onSummaryOptionMove && (
                <div className="mt-1 rounded-md p-2" style={{ border: '1px solid var(--border)', backgroundColor: 'var(--card)' }}>
                  <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: 'var(--muted-foreground)' }}>
                    <GripVertical size={12} aria-hidden="true" />
                    Order in synthesis
                  </div>
                  <div className="space-y-1">
                    {selectedOrder.map((key, index) => (
                      <div
                        key={key}
                        className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-xs"
                        style={{ backgroundColor: 'color-mix(in srgb, var(--muted) 42%, var(--card))' }}
                      >
                        <span className="min-w-0 truncate">{sectionLabelMap[key]}</span>
                        <span className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => onSummaryOptionMove(key, 'up')}
                            disabled={index === 0}
                            title="Move up"
                            aria-label={`Move ${sectionLabelMap[key]} up`}
                            className="inline-flex h-6 w-6 items-center justify-center rounded"
                            style={{
                              border: '1px solid var(--border)',
                              backgroundColor: 'var(--background)',
                              color: 'var(--foreground)',
                              opacity: index === 0 ? 0.45 : 1,
                              cursor: index === 0 ? 'not-allowed' : 'pointer',
                            }}
                          >
                            <ArrowUp size={12} aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onSummaryOptionMove(key, 'down')}
                            disabled={index === selectedOrder.length - 1}
                            title="Move down"
                            aria-label={`Move ${sectionLabelMap[key]} down`}
                            className="inline-flex h-6 w-6 items-center justify-center rounded"
                            style={{
                              border: '1px solid var(--border)',
                              backgroundColor: 'var(--background)',
                              color: 'var(--foreground)',
                              opacity: index === selectedOrder.length - 1 ? 0.45 : 1,
                              cursor: index === selectedOrder.length - 1 ? 'not-allowed' : 'pointer',
                            }}
                          >
                            <ArrowDown size={12} aria-hidden="true" />
                          </button>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <button
            type="button"
            onClick={() => setParticipantOpen(open => !open)}
            className="flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-xs font-semibold"
            style={{ border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--foreground)' }}
            aria-expanded={participantOpen}
          >
            <span className="flex items-center gap-1.5">
              <Eye size={13} aria-hidden="true" />
              Participant view
            </span>
            {participantOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
          {participantOpen && (
            <label
              className="flex items-start gap-2 rounded-md px-2.5 py-2 text-xs"
              style={{
                border: '1px solid var(--border)',
                backgroundColor: showOwnResponseToParticipants
                  ? 'color-mix(in srgb, var(--accent) 8%, var(--card))'
                  : 'var(--card)',
                color: 'var(--foreground)',
                cursor: isSavingParticipantVisibility ? 'wait' : 'pointer',
                opacity: isSavingParticipantVisibility ? 0.75 : 1,
              }}
            >
              <input
                type="checkbox"
                checked={showOwnResponseToParticipants}
                disabled={isSavingParticipantVisibility}
                onChange={e => onShowOwnResponseToParticipantsChange(e.target.checked)}
              />
              <span>
                <span className="block font-medium">Show people their own response</span>
                <span className="block mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
                  Visible only to that participant in results and later rounds.
                </span>
              </span>
            </label>
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

        <div className="space-y-1.5 pt-2" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="text-xs font-semibold" style={{ color: 'var(--foreground)' }}>
            AI generation
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
            Generate new draft
          </LoadingButton>
          {!canGenerate && (
            <p className="text-xs" style={{ color: 'var(--muted-foreground)', margin: 0 }}>
              Waiting for responses
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
