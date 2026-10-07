
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

export default function AISynthesisPanel({selectedModel,onModelChange,models,responseCount,canGenerate:override,isGenerating,onGenerate}:Props) {
  const canGenerate=override ?? responseCount>0;
  return <details className="summary-disclosure">
    <summary><span>Generate synthesis</span><small>Model and draft</small></summary>
    <div className="card p-4 synthesis-generator">
      <div className="synthesis-generator-heading"><h3>Create a draft</h3><p>{responseCount} response{responseCount===1?'':'s'}</p></div>
      <label className="synthesis-field"><span>Model</span><select id="model-select" value={selectedModel} onChange={event=>onModelChange(event.target.value)} disabled={isGenerating}>{models.map(model=><option key={model} value={model}>{model}</option>)}</select></label>
      <p className="text-sm text-muted-foreground">Draw out the claims and reasoning, preserving the sources and differences of view.</p>
      <div className="synthesis-generate-footer"><p>Review the draft before publishing.</p><button type="button" className="btn-accent" disabled={isGenerating||!canGenerate} onClick={onGenerate}>{isGenerating?'Generating…':'Generate draft'}</button></div>
      {!canGenerate&&<p className="text-xs text-muted-foreground">Waiting for responses</p>}
    </div>
  </details>;
}
