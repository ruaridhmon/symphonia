import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { saveAs } from 'file-saver';
import { BarChart3, Link2, MapPin, PanelRight, Sparkles, X } from 'lucide-react';
import { useDocumentTitle } from './hooks/useDocumentTitle';
import { useAuth } from './AuthContext';
import { getMe } from './api/auth';
import { getForm as apiFetchForm } from './api/forms';
import { getRounds, getRoundsWithResponses, nextRound as apiNextRound } from './api/rounds';
import { getResponses } from './api/responses';
import {
	getSynthesisVersions as apiGetSynthesisVersions,
	activateVersion as apiActivateVersion,
	generateSynthesis as apiGenerateSynthesis,
	pollSynthesisJob as apiPollSynthesisJob,
	pushSummary as apiPushSummary,
} from './api/synthesis';

import {
	RoundTimeline,
	RoundCard,
	SynthesisProgress,
	StructuredSynthesis,
	CrossMatrix,
	ConsensusHeatmap,
	EmergenceHighlights,
	MarkdownRenderer,
	DevilsAdvocate,
	AudienceTranslation,
	LoadingButton,
	useToast,
} from './components';

import {
	SummaryHeader,
	SynthesisEditorCard,
	AISynthesisPanel,
	SynthesisVersionPanel,
	SelectedVersionContent,
	NextRoundQuestionsCard,
	FormInfoCard,
	ActionsCard,
	ResponsesModal,
	ResponsesAccordion,
	RoundHistoryCard,
	SummaryLoadingSkeleton,
	VersionCompare,
	VersionTimeline,
} from './components/summary';

import { usePresence } from './hooks/usePresence';

import type {
	Round,
	Form,
	RoundWithResponses,
	SynthesisVersion,
} from './types/summary';

// ─── Constants ───────────────────────────────────────────────────────────────

const MODELS = [
	'anthropic/claude-opus-4-6',
	'anthropic/claude-sonnet-4',
	'openai/gpt-4o',
	'google/gemini-3-flash-preview',
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function extractQuestionText(q: unknown): string {
	if (typeof q === 'string') return q;
	if (q && typeof q === 'object') {
		const obj = q as Record<string, unknown>;
		return String(obj.text || obj.label || obj.question || '');
	}
	return '';
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function SummaryPage() {
	useDocumentTitle('Synthesis Summary');
	const navigate = useNavigate();
	const { id } = useParams();
	const formId = Number(id);
	const { toastError, toastWarning, toastSuccess } = useToast();

	const { token: rawToken, logout: authLogout } = useAuth();
	const token = rawToken ?? '';

	// ── Core state ──
	const [email, setEmail] = useState('');
	const [form, setForm] = useState<Form | null>(null);
	const [rounds, setRounds] = useState<Round[]>([]);
	const [activeRound, setActiveRound] = useState<Round | null>(null);
	const [loading, setLoading] = useState(false);
	const [loadError, setLoadError] = useState<string | null>(null);

	// ── Responses modal ──
	const [responsesOpen, setResponsesOpen] = useState(false);
	const [structuredRounds, setStructuredRounds] = useState<RoundWithResponses[]>([]);

	// ── Round selection ──
	const [selectedRound, setSelectedRound] = useState<Round | null>(null);

	// ── Synthesis generation UI ──
	const [synthesisStage, setSynthesisStage] = useState('preparing');
	const [synthesisStep, setSynthesisStep] = useState(0);
	const [synthesisTotalSteps] = useState(5);
	const [synthesisMode, setSynthesisMode] = useState<'simple' | 'committee' | 'ttd'>('simple');
	const [synthesisViewMode, setSynthesisViewMode] = useState<'view' | 'edit'>('view');
	const [selectedModel, setSelectedModel] = useState('anthropic/claude-opus-4-6');
	const [isGenerating, setIsGenerating] = useState(false);

	// ── Synthesis versioning ──
	const [synthesisVersions, setSynthesisVersions] = useState<SynthesisVersion[]>([]);
	const [selectedVersionId, setSelectedVersionId] = useState<number | null>(null);
	const [showVersionCompare, setShowVersionCompare] = useState(false);

	// ── Next round questions ──
	const [nextRoundQuestions, setNextRoundQuestions] = useState<string[]>([]);
	const [hasSavedSynthesis, setHasSavedSynthesis] = useState(false);
	const [sidebarOpen, setSidebarOpen] = useState(true);

	// ── WebSocket message handler (synthesis_complete auto-refresh) ──
	const handleWsMessage = useCallback((data: Record<string, unknown>) => {
		if (data.type === 'synthesis_complete' && data.form_id === formId) {
			// Another client (or our own broadcast) completed synthesis — reload
			loadAll().then(() => {
				if (data.round_id && typeof data.round_id === 'number') {
					loadSynthesisVersions(data.round_id);
				}
			});
		}
	}, [formId]);

	// ── Presence ──
	const { viewers } = usePresence({
		formId: formId || null,
		page: 'summary',
		userEmail: email,
		onMessage: handleWsMessage,
	});

	// ── Editor ──
	const editor = useEditor({
		extensions: [
			StarterKit,
			Underline,
			Placeholder.configure({ placeholder: 'Write the synthesis for this round…' }),
		],
		content: '',
		editorProps: { attributes: { class: 'prose prose-sm max-w-none focus:outline-none' } },
	});

	// ── Derived values ──
	const displayRound = selectedRound || activeRound;
	const structuredSynthesisData = displayRound?.synthesis_json || null;

	const resolvedExpertLabels: Record<number, string> = useMemo(() => {
		if (!structuredSynthesisData) return {};
		const labels: Record<number, string> = {};
		const allExperts = new Set<number>();
		for (const a of structuredSynthesisData.agreements || []) {
			for (const e of a.supporting_experts || []) allExperts.add(e);
		}
		for (const d of structuredSynthesisData.disagreements || []) {
			for (const p of d.positions || []) {
				for (const e of p.experts || []) allExperts.add(e);
			}
		}
		for (const id of allExperts) labels[id] = `Expert ${id}`;
		return labels;
	}, [structuredSynthesisData]);

	const selectedVersion = useMemo(
		() => synthesisVersions.find(v => v.id === selectedVersionId) || null,
		[synthesisVersions, selectedVersionId]
	);

	// ─── Data loading ────────────────────────────────────────────────────────

	useEffect(() => {
		if (!token) return;
		getMe()
			.then(d => setEmail(d.email || ''))
			.catch(() => {});
	}, [token]);

	useEffect(() => {
		if (!token || !formId) return;
		loadAll().then(() => loadResponses()).catch(() => {});
	}, [token, formId, editor]);

	async function loadAll() {
		setLoading(true);
		setLoadError(null);
		try {
			const f = await apiFetchForm(formId);
			setForm(f as Form);

			const list = await getRounds(formId);
			const mapped: Round[] = (Array.isArray(list) ? list : []).map(x => ({
				id: x.id,
				round_number: x.round_number,
				synthesis: x.synthesis || '',
				synthesis_json: x.synthesis_json || null,
				is_active: !!x.is_active,
				questions: Array.isArray(x.questions) ? x.questions : [],
				convergence_score: x.convergence_score ?? null,
				response_count: x.response_count ?? 0,
			}));
			setRounds(mapped);

			const active = mapped.find(x => x.is_active) || null;
			setActiveRound(active);

			if (active && !selectedRound) {
				setSelectedRound(active);
				loadSynthesisVersions(active.id);
			}

			if (active && editor) {
				editor.commands.setContent(active.synthesis || '');
				setHasSavedSynthesis(!!(active.synthesis && active.synthesis.trim().length > 0));
				const qs = active.questions?.length ? active.questions : (Array.isArray(f.questions) ? f.questions : []);
				setNextRoundQuestions(qs.map(extractQuestionText));
			} else if (f && Array.isArray(f.questions)) {
				setNextRoundQuestions(f.questions.map(extractQuestionText));
			}
		} catch (err) {
			setLoadError((err as Error).message || 'Failed to load consultation data');
		} finally {
			setLoading(false);
		}
	}

	async function loadResponses() {
		try {
			const data = await getRoundsWithResponses(formId);
			if (Array.isArray(data)) {
				setStructuredRounds(
					data.map(r => ({
						id: r.id,
						round_number: r.round_number,
						synthesis: r.synthesis || '',
						is_active: !!r.is_active,
						responses: (r.responses || []).map(resp => ({
							id: resp.id,
							answers: typeof resp.answers === 'string' ? JSON.parse(resp.answers as string) : resp.answers || {},
							email: resp.email || null,
							timestamp: resp.timestamp,
							version: resp.version ?? 1,
							round_id: r.id,
						})),
					}))
				);
			}
		} catch {}
	}

	async function loadSynthesisVersions(roundId: number) {
		try {
			const versions = await apiGetSynthesisVersions(formId, roundId);
			setSynthesisVersions(versions);
			const active = versions.find(v => v.is_active);
			setSelectedVersionId(active?.id || (versions.length > 0 ? versions[versions.length - 1].id : null));
		} catch {
			setSynthesisVersions([]);
			setSelectedVersionId(null);
		}
	}

	// ─── Actions ─────────────────────────────────────────────────────────────

	function logout() {
		authLogout();
		navigate('/');
	}

	async function viewAllResponses() {
		if (responsesOpen) {
			setResponsesOpen(false);
			return;
		}
		await loadResponses();
		setResponsesOpen(true);
	}

	async function saveSynthesis() {
		if (!activeRound || !formId) return;
		const summary = editor?.getHTML() || '';
		try {
			await apiPushSummary(formId, summary);
			setHasSavedSynthesis(true);
			toastSuccess('Synthesis saved');
		} catch (err) {
			toastError((err as Error).message || 'Failed to save synthesis');
		}
	}

	async function startNextRound() {
		if (!formId) return;
		const cleaned = nextRoundQuestions.map(q => q.trim()).filter(q => q.length > 0);
		if (!cleaned.length) {
			toastWarning('Add at least one question for the next round.');
			return;
		}
		setLoading(true);
		try {
			await apiNextRound(formId, { questions: cleaned });
			await loadAll();
			await loadResponses();
			setHasSavedSynthesis(false);
			setSelectedRound(null);
		} catch (err) {
			toastError((err as Error).message || 'Failed to start next round');
		} finally {
			setLoading(false);
		}
	}

	async function downloadResponses() {
		try {
			const raw = await getResponses(formId, true);

			if (!Array.isArray(raw) || raw.length === 0) {
				toastWarning('No responses to download');
				return;
			}

			const paragraphs = raw.flatMap((r, i: number) => {
				const header = new Paragraph({
					children: [new TextRun({ text: `Response ${i + 1}`, bold: true })],
					spacing: { after: 200 },
				});
				const qa = Object.entries(r.answers).flatMap(([k, v]: [string, unknown]) => [
					new Paragraph({ children: [new TextRun({ text: k, bold: true })], spacing: { after: 80 } }),
					new Paragraph({ text: String(v ?? ''), spacing: { after: 160 } }),
				]);
				return [header, ...qa, new Paragraph('')];
			});

			const doc = new Document({ sections: [{ children: paragraphs }] });
			const blob = await Packer.toBlob(doc);
			saveAs(blob, 'responses.docx');
		} catch (err) {
			toastError((err as Error).message || 'Failed to download responses');
		}
	}

	async function generateSummary() {
		const targetRound = selectedRound || activeRound;
		if (!formId || !selectedModel || !targetRound) return;

		setIsGenerating(true);
		setSynthesisStage('preparing');
		setSynthesisStep(0);
		try {
			setSynthesisStage('analyzing');
			setSynthesisStep(1);

			const initial = await apiGenerateSynthesis(formId, targetRound.id, {
				model: selectedModel,
				strategy: synthesisMode,
				n_analysts: 3,
				mode: 'human_only',
			});

			// ── Async job pattern: poll until the background synthesis is done ──
			let data = initial;
			if (initial.job_id && initial.status === 'pending') {
				setSynthesisStage('synthesising');
				setSynthesisStep(2);
				const jobId = initial.job_id;
				// Poll every 3 s; timeout after 10 min
				const deadline = Date.now() + 10 * 60 * 1000;
				while (Date.now() < deadline) {
					await new Promise(res => setTimeout(res, 3000));
					const jobStatus = await apiPollSynthesisJob(jobId);
					if (jobStatus.status === 'complete' && jobStatus.result) {
						data = jobStatus.result;
						break;
					}
					if (jobStatus.status === 'failed') {
						throw new Error(jobStatus.error || 'Synthesis job failed');
					}
					// Still pending — update step animation
					setSynthesisStep(prev => prev < 4 ? prev + 1 : 2);
				}
			}

			setSynthesisStage('synthesising');
			setSynthesisStep(3);
			setSynthesisStage('formatting');
			setSynthesisStep(4);

			const content = data.synthesis || data.summary || '';
			if (content && editor) editor.commands.setContent(content);

			// Optimistic update: immediately reflect synthesis in UI state
			if (data.synthesis_json && targetRound) {
				const updatedRound = { ...targetRound, synthesis: content, synthesis_json: data.synthesis_json };
				setRounds(prev => prev.map(r => r.id === targetRound.id ? updatedRound : r));
				if (activeRound?.id === targetRound.id) setActiveRound(updatedRound);
				if (selectedRound?.id === targetRound.id) setSelectedRound(updatedRound);
			}

			setSynthesisViewMode('view');
			// Reload round data and versions to stay in sync with backend
			await loadAll();
			if (targetRound) await loadSynthesisVersions(targetRound.id);

			setSynthesisStage('complete');
			setSynthesisStep(5);
			setTimeout(() => { setSynthesisStage('preparing'); setSynthesisStep(0); }, 2000);
		} catch (error) {
			toastError((error as Error).message || 'Failed to generate synthesis');
			setSynthesisStage('preparing');
			setSynthesisStep(0);
		} finally {
			setIsGenerating(false);
		}
	}

	async function activateVersion(versionId: number) {
		try {
			await apiActivateVersion(versionId);
			if (displayRound) await loadSynthesisVersions(displayRound.id);
			await loadAll();
		} catch (error) {
			toastError((error as Error).message || 'Failed to activate version');
		}
	}

	function handleSelectRound(round: Round) {
		setSelectedRound(round);
		if (round.is_active && editor) editor.commands.setContent(round.synthesis || '');
		loadSynthesisVersions(round.id);
	}

	function handleResponseUpdated(roundId: number, updated: { id: number; answers: Record<string, string>; version: number }) {
		setStructuredRounds(prev =>
			prev.map(r =>
				r.id === roundId
					? { ...r, responses: r.responses.map(rr => rr.id === updated.id ? { ...rr, answers: updated.answers, version: updated.version } : rr) }
					: r
			)
		);
	}

	// ─── Render ──────────────────────────────────────────────────────────────

	if (loadError && !form) return (
		<div className="min-h-screen bg-background text-foreground flex items-center justify-center">
			<div className="text-center max-w-md mx-auto px-4">
				<div className="text-4xl mb-4">⚠️</div>
				<h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--foreground)' }}>
					Failed to Load
				</h2>
				<p className="text-sm mb-6" style={{ color: 'var(--muted-foreground)' }}>
					{loadError}
				</p>
				<div className="flex gap-3 justify-center">
					<LoadingButton variant="accent" size="md" onClick={() => { loadAll(); loadResponses(); }}>
						Retry
					</LoadingButton>
					<LoadingButton variant="secondary" size="md" onClick={() => navigate('/')}>
						Back to Dashboard
					</LoadingButton>
				</div>
			</div>
		</div>
	);
	if (!form) return <SummaryLoadingSkeleton />;

	return (
		<div className="min-h-screen bg-background text-foreground font-sans flex flex-col">
			<SummaryHeader email={email} viewers={viewers} onLogout={logout} />

			<main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
				{/* Navigation breadcrumb */}
				<div className="mb-4 flex items-center justify-between">
					<button
						onClick={() => navigate('/')}
						className="text-sm font-medium transition-colors"
						style={{ color: 'var(--muted-foreground)', background: 'none', border: 'none', cursor: 'pointer' }}
						onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.color = 'var(--accent)'}
						onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.color = 'var(--muted-foreground)'}
					>
						← Back to Dashboard
					</button>
					<h2 className="text-sm font-medium truncate max-w-[50vw] sm:max-w-none" style={{ color: 'var(--muted-foreground)' }}>
						{form.title}
					</h2>
				</div>

				{/* Round timeline */}
				{rounds.length > 0 && (
					<div className="mb-4 sm:mb-6 overflow-x-auto">
						<RoundTimeline
							rounds={rounds}
							activeRoundId={activeRound?.id || null}
							selectedRoundId={selectedRound?.id || null}
							onSelectRound={handleSelectRound}
						/>
					</div>
				)}

				{/* Synthesis progress bar */}
				<SynthesisProgress
					stage={synthesisStage}
					step={synthesisStep}
					totalSteps={synthesisTotalSteps}
					visible={isGenerating}
				/>

				{/* Floating sidebar toggle */}
				<button
					onClick={() => setSidebarOpen(v => !v)}
					className="fixed z-50 flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium shadow-lg transition-all"
					style={{
						right: sidebarOpen ? 'calc(20rem + 12px)' : '12px',
						top: '4.75rem',
						background: 'var(--card)',
						border: '1px solid var(--border)',
						color: 'var(--foreground)',
					}}
					title={sidebarOpen ? 'Hide panel' : 'Show panel'}
				>
					{sidebarOpen ? <X size={15} /> : <PanelRight size={15} />}
					<span className="hidden sm:inline">{sidebarOpen ? 'Hide' : 'Controls'}</span>
				</button>

				{/* Main content — full width */}
				<div className="space-y-4 sm:space-y-6">
						{/* Non-active round card */}
						{selectedRound && !selectedRound.is_active && (
							<RoundCard
								round={selectedRound}
								isCurrentRound={false}
								expertLabels={resolvedExpertLabels}
								formId={formId}
								token={token}
								currentUserEmail={email}
							/>
						)}

						{/* Inline responses accordion — toggle per round */}
						<ResponsesAccordion
							structuredRounds={structuredRounds}
							rounds={rounds}
							formQuestions={form.questions || []}
							formId={formId}
							token={token}
							onResponseUpdated={handleResponseUpdated}
						/>

						{/* Synthesis editor (active round only) */}
						{(!selectedRound || selectedRound.is_active) && (
							<SynthesisEditorCard
								activeRound={activeRound}
								synthesisViewMode={synthesisViewMode}
								onSetViewMode={setSynthesisViewMode}
								editor={editor}
							/>
						)}

						{/* Read-only synthesis for non-active rounds */}
						{selectedRound && !selectedRound.is_active && selectedRound.synthesis && (
							<div className="card p-4 sm:p-6">
								<h2 className="text-lg font-semibold mb-3 text-foreground">
									Synthesis (Round {selectedRound.round_number})
								</h2>
								<MarkdownRenderer content={selectedRound.synthesis} />
							</div>
						)}

						{/* Structured synthesis data */}
						{structuredSynthesisData && (
							<div className="card p-4 sm:p-6">
								<div className="flex items-start justify-between gap-4 mb-3 flex-wrap">
									<h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
										<BarChart3 size={20} style={{ color: 'var(--accent)' }} /> Structured Analysis
									</h2>
								</div>
								{/* Audience Translation toggle */}
								{displayRound && (
									<div className="mb-4">
										<AudienceTranslation
											formId={formId}
											roundId={displayRound.id}
											synthesisText={(() => {
												const parts: string[] = [];
												if (structuredSynthesisData.narrative) parts.push(structuredSynthesisData.narrative);
												for (const a of structuredSynthesisData.agreements || []) {
													parts.push(`Agreement: ${a.claim} — ${a.evidence_summary}`);
												}
												for (const d of structuredSynthesisData.disagreements || []) {
													parts.push(`Disagreement: ${d.topic}`);
													for (const p of d.positions || []) {
														parts.push(`  - ${p.position}: ${p.evidence}`);
													}
												}
												for (const n of structuredSynthesisData.nuances || []) {
													parts.push(`Nuance: ${n.claim} — ${n.context}`);
												}
												return parts.join('\n');
											})()}
										/>
									</div>
								)}
								<StructuredSynthesis
									data={structuredSynthesisData}
									convergenceScore={displayRound?.convergence_score ?? undefined}
									expertLabels={resolvedExpertLabels}
									formId={formId}
									roundId={displayRound?.id}
									token={token}
									currentUserEmail={email}
								/>
							</div>
						)}

						{/* AI Devil's Advocate — after structured analysis */}
						{displayRound && structuredSynthesisData && (
							<DevilsAdvocate formId={formId} roundId={displayRound.id} />
						)}

						{/* Cross-matrix */}
						{structuredSynthesisData && (
							<div className="card p-4 sm:p-6">
								<h2 className="text-lg font-semibold mb-3 text-foreground flex items-center gap-2">
									<Link2 size={20} style={{ color: 'var(--accent)' }} /> Expert Cross-Analysis
								</h2>
								<CrossMatrix
									structuredData={structuredSynthesisData}
									resolvedExpertLabels={resolvedExpertLabels}
									expertLabelPreset="default"
								/>
							</div>
						)}

						{/* Consensus heatmap */}
						{structuredSynthesisData && (
							<div className="card p-4 sm:p-6">
								<h2 className="text-lg font-semibold mb-3 text-foreground flex items-center gap-2">
									<MapPin size={20} style={{ color: 'var(--accent)' }} /> Consensus Heatmap
								</h2>
								<ConsensusHeatmap
									structuredData={structuredSynthesisData}
									resolvedExpertLabels={resolvedExpertLabels}
									questions={displayRound?.questions}
								/>
							</div>
						)}

						{/* Version comparison (side-by-side) — rendered above synthesis so it's immediately visible when toggled */}
						{showVersionCompare && synthesisVersions.length >= 2 && (
							<VersionCompare
								versions={synthesisVersions}
								currentVersionId={selectedVersionId}
								onClose={() => setShowVersionCompare(false)}
							/>
						)}

						{/* Selected version content */}
						<SelectedVersionContent
							selectedVersion={selectedVersion}
							displayRound={displayRound}
							resolvedExpertLabels={resolvedExpertLabels}
							formId={formId}
							token={token}
							currentUserEmail={email}
						/>

						{/* Emergence highlights */}
						{structuredSynthesisData?.emergent_insights && structuredSynthesisData.emergent_insights.length > 0 && (
							<div className="card p-4 sm:p-6">
								<h2 className="text-lg font-semibold mb-3 text-foreground flex items-center gap-2">
									<Sparkles size={20} style={{ color: 'var(--accent)' }} /> Emergent Insights
								</h2>
								<EmergenceHighlights
									insights={structuredSynthesisData.emergent_insights ?? []}
									expertLabels={resolvedExpertLabels}
									formId={formId}
									roundId={displayRound?.id}
									token={token}
									currentUserEmail={email}
								/>
							</div>
						)}

						{/* Next round questions */}
						<NextRoundQuestionsCard
							questions={nextRoundQuestions}
							onUpdateQuestion={(i, v) => setNextRoundQuestions(prev => { const c = [...prev]; c[i] = v; return c; })}
							onAddQuestion={() => setNextRoundQuestions(prev => [...prev, ''])}
							onRemoveQuestion={i => setNextRoundQuestions(prev => prev.filter((_, idx) => idx !== i))}
						/>
					</div>

					{/* ── Floating Sidebar ── */}
					<div
						style={{
							position: 'fixed',
							right: 0,
							top: '4.5rem',
							width: '20rem',
							height: 'calc(100vh - 4.5rem)',
							overflowY: 'auto',
							zIndex: 40,
							borderLeft: '1px solid var(--border)',
							background: 'var(--background)',
							transform: sidebarOpen ? 'translateX(0)' : 'translateX(100%)',
							transition: 'transform 0.2s ease',
							padding: '1rem',
							display: 'flex',
							flexDirection: 'column',
							gap: '1rem',
						}}
					>
						<FormInfoCard form={form} activeRound={activeRound} />

						<ActionsCard
							responsesOpen={responsesOpen}
							onToggleResponses={viewAllResponses}
							onDownloadResponses={downloadResponses}
							onSaveSynthesis={saveSynthesis}
							onStartNextRound={startNextRound}
							loading={loading}
							formTitle={form.title}
							rounds={rounds}
							structuredSynthesisData={structuredSynthesisData}
							expertLabels={resolvedExpertLabels}
						/>

						<AISynthesisPanel
							synthesisMode={synthesisMode}
							onModeChange={setSynthesisMode}
							selectedModel={selectedModel}
							onModelChange={setSelectedModel}
							models={MODELS}
							isGenerating={isGenerating}
							onGenerate={generateSummary}
						/>

						<SynthesisVersionPanel
							displayRound={displayRound}
							synthesisVersions={synthesisVersions}
							selectedVersionId={selectedVersionId}
							onSelectVersion={setSelectedVersionId}
							selectedVersion={selectedVersion}
							onActivateVersion={activateVersion}
							resolvedExpertLabels={resolvedExpertLabels}
							formId={formId}
							token={token}
							currentUserEmail={email}
							showCompare={showVersionCompare}
							onToggleCompare={() => setShowVersionCompare(v => !v)}
						/>

						{/* Version History Timeline */}
						{synthesisVersions.length > 0 && (
							<VersionTimeline
								versions={synthesisVersions}
								selectedVersionId={selectedVersionId}
								onSelectVersion={setSelectedVersionId}
							/>
						)}

						<RoundHistoryCard
							rounds={rounds}
							selectedRoundId={selectedRound?.id || null}
							onSelectRound={handleSelectRound}
						/>
					</div>
			</main>

			{/* Responses modal */}
			<ResponsesModal
				open={responsesOpen}
				onClose={() => setResponsesOpen(false)}
				structuredRounds={structuredRounds}
				rounds={rounds}
				formQuestions={form.questions || []}
				token={token}
				onResponseUpdated={handleResponseUpdated}
			/>
		</div>
	);
}
