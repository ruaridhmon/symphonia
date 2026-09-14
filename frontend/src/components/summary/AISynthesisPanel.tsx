import { useState } from 'react';
import { LoadingButton } from '../index';
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, ClipboardCopy,  Eye, FileDown, GripVertical,  ListChecks, Palette, PencilLine, Terminal } from 'lucide-react';

type Props = {
  synthesisMode: 'custom' | 'simple' | 'committee' | 'ttd';
  onModeChange: (mode: 'custom' | 'simple' | 'committee' | 'ttd') => void;
  customPrompt: string;
  onCustomPromptChange: (prompt: string) => void;
  selectedModel: string;
  onModelChange: (model: string) => void;
  models: string[];
  estimateLabel: string | null;
  responseCount: number;
  canGenerate?: boolean;
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
  openSynthesisKitAvailable?: boolean;
  onCopyOpenSynthesisKit?: () => void;
  onDownloadOpenSynthesisKit?: () => void;
  onStartOpenSynthesisDraft?: () => void;
  onOpenCodexWorkspace?: () => void;
};

export default function AISynthesisPanel({
  synthesisMode,
  onModeChange,
  customPrompt,
  onCustomPromptChange,
  selectedModel,
  onModelChange,
  models,
  estimateLabel,
  responseCount,
  canGenerate: canGenerateOverride,
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
  openSynthesisKitAvailable = false,
  onCopyOpenSynthesisKit,
  onDownloadOpenSynthesisKit,
  onStartOpenSynthesisDraft,
  onOpenCodexWorkspace,
}: Props) {
  const canGenerate = canGenerateOverride ?? responseCount > 0;
  const [contentOpen, setContentOpen] = useState(false);
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [participantOpen, setParticipantOpen] = useState(false);
  const sectionOptions = [
    ['statistics', 'Survey statistics'],
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
    <details className="summary-disclosure">
      <summary><span>Generate synthesis</span><small>Model, method and instructions</small></summary>
    <div
      className="card p-4 synthesis-generator"
      style={{
        backgroundColor: 'color-mix(in srgb, var(--muted) 20%, var(--card))',
        borderColor: 'color-mix(in srgb, var(--border) 58%, transparent)',
        boxShadow: '0 10px 28px rgba(15, 23, 42, 0.04)',
      }}
    >
      <div className="space-y-2.5">
        <div className="synthesis-generator-heading">
          <h3>Create a draft</h3>
          <p>{responseCount} response{responseCount === 1 ? '' : 's'}{canGenerate && estimateLabel ? ` · ${estimateLabel}` : ''}</p>
        </div>
        <label className="synthesis-field">
          <span>Model</span>
          <select id="model-select" value={selectedModel} onChange={e => onModelChange(e.target.value)}>
            {models.map(model => <option key={model} value={model}>{model}</option>)}
          </select>
        </label>
        <div>
          <label className="synthesis-field">
            <span>Method</span>
            <select aria-label="Method" value={synthesisMode} onChange={e => onModeChange(e.target.value as Props['synthesisMode'])}>
              <option value="simple">Simple</option>
              <option value="custom">Custom instructions</option>
              <option value="committee">Committee</option>
              <option value="ttd">Thorough analysis</option>
            </select>
            <small>{synthesisMode === 'committee' ? 'Multiple perspectives, combined into one draft.' : synthesisMode === 'ttd' ? 'A deeper review; takes longer.' : synthesisMode === 'custom' ? 'Add your instructions below.' : 'A concise synthesis of this round’s responses.'}</small>
          </label>
          {synthesisMode === 'custom' && (
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--muted-foreground)' }}>
                Custom prompt
              </span>
              <textarea
                value={customPrompt}
                onChange={event => onCustomPromptChange(event.target.value)}
                rows={5}
                className="w-full resize-y rounded-lg px-3 py-2.5 text-sm leading-6 outline-none"
                placeholder="Tell the model exactly how to synthesise this round..."
                style={{
                  border: '1px solid color-mix(in srgb, var(--border) 72%, transparent)',
                  backgroundColor: 'var(--background)',
                  color: 'var(--foreground)',
                  minHeight: '7rem',
                }}
              />
              <span className="mt-1 block text-xs leading-5" style={{ color: 'var(--muted-foreground)' }}>
                Default output is claim bullets with confidence only. Your prompt is added on top.
              </span>
            </label>
          )}
        </div>

        <details className="synthesis-optional">
          <summary>Display and participant settings</summary>
          <div>
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
                            className="inline-flex h-6 items-center justify-center gap-1 rounded px-1.5 text-[11px] font-medium"
                            style={{
                              border: '1px solid var(--border)',
                              backgroundColor: 'var(--background)',
                              color: 'var(--foreground)',
                              opacity: index === 0 ? 0.45 : 1,
                              cursor: index === 0 ? 'not-allowed' : 'pointer',
                            }}
                          >
                            <ArrowUp size={12} aria-hidden="true" />
                            <span>Up</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onSummaryOptionMove(key, 'down')}
                            disabled={index === selectedOrder.length - 1}
                            title="Move down"
                            aria-label={`Move ${sectionLabelMap[key]} down`}
                            className="inline-flex h-6 items-center justify-center gap-1 rounded px-1.5 text-[11px] font-medium"
                            style={{
                              border: '1px solid var(--border)',
                              backgroundColor: 'var(--background)',
                              color: 'var(--foreground)',
                              opacity: index === selectedOrder.length - 1 ? 0.45 : 1,
                              cursor: index === selectedOrder.length - 1 ? 'not-allowed' : 'pointer',
                            }}
                          >
                            <ArrowDown size={12} aria-hidden="true" />
                            <span>Down</span>
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

          </div>
        </details>
        <div className="synthesis-generate-footer">
          <p>Review the draft before publishing.</p>
          <LoadingButton
            variant={canGenerate ? 'accent' : 'secondary'}
            size="sm"
            loading={isGenerating}
            loadingText="Generating…"
            onClick={onGenerate}
            className="font-semibold"
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

        <details className="synthesis-optional">
          <summary>Other ways to create a draft</summary>
        <div className="space-y-2">
          <div>
            <div className="text-xs font-semibold" style={{ color: 'var(--foreground)' }}>
              Codex workspace
            </div>
            <p className="mt-1 text-xs" style={{ color: 'var(--muted-foreground)', marginBottom: 0 }}>
              Chat with the assistant while editing the summary HTML beside a live preview.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenCodexWorkspace}
            disabled={!onOpenCodexWorkspace}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold"
            style={{
              border: '1px solid var(--accent)',
              backgroundColor: 'var(--accent)',
              color: 'white',
              cursor: onOpenCodexWorkspace ? 'pointer' : 'not-allowed',
              opacity: onOpenCodexWorkspace ? 1 : 0.62,
            }}
          >
            <Terminal size={13} aria-hidden="true" />
            Open Codex workspace
          </button>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={onCopyOpenSynthesisKit}
              disabled={!openSynthesisKitAvailable || !onCopyOpenSynthesisKit}
              className="inline-flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium"
              style={{
                border: '1px solid var(--border)',
                backgroundColor: 'var(--card)',
                color: 'var(--foreground)',
                cursor: openSynthesisKitAvailable ? 'pointer' : 'not-allowed',
                opacity: openSynthesisKitAvailable ? 1 : 0.62,
              }}
            >
              <ClipboardCopy size={13} aria-hidden="true" />
              Copy
            </button>
            <button
              type="button"
              onClick={onDownloadOpenSynthesisKit}
              disabled={!openSynthesisKitAvailable || !onDownloadOpenSynthesisKit}
              className="inline-flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium"
              style={{
                border: '1px solid var(--border)',
                backgroundColor: 'var(--card)',
                color: 'var(--foreground)',
                cursor: openSynthesisKitAvailable ? 'pointer' : 'not-allowed',
                opacity: openSynthesisKitAvailable ? 1 : 0.62,
              }}
            >
              <FileDown size={13} aria-hidden="true" />
              Export
            </button>
          </div>
          <button
            type="button"
            onClick={onStartOpenSynthesisDraft}
            disabled={!onStartOpenSynthesisDraft}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold"
            style={{
              border: '1px solid color-mix(in srgb, var(--accent) 35%, var(--border))',
              backgroundColor: 'color-mix(in srgb, var(--accent) 7%, var(--card))',
              color: 'var(--foreground)',
              cursor: onStartOpenSynthesisDraft ? 'pointer' : 'not-allowed',
              opacity: onStartOpenSynthesisDraft ? 1 : 0.62,
            }}
          >
            <PencilLine size={13} aria-hidden="true" />
            Start blank draft
          </button>
          {!openSynthesisKitAvailable && (
            <p className="text-xs" style={{ color: 'var(--muted-foreground)', margin: 0 }}>
              Waiting for response data
            </p>
          )}
        </div>
        </details>
      </div>
    </div>
    </details>
  );
}
