import { Component, useCallback, useEffect, useMemo, useState } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import { ChartNoAxesColumn, ChevronDown, ChevronRight, Globe, Link2, MapPin, PanelRight, Sparkles, X } from 'lucide-react';
import { useDocumentTitle } from './hooks/useDocumentTitle';
import { useAuth } from './AuthContext';
import { api } from './api/client';
import { getMe } from './api/auth';
import { getForm as apiFetchForm } from './api/forms';
import { getRounds, getRoundsWithResponses, nextRound as apiNextRound } from './api/rounds';
import type { Round as ApiRound } from './api/rounds';
import {
	getSynthesisVersions as apiGetSynthesisVersions,
	activateVersion as apiActivateVersion,
	generateSynthesis as apiGenerateSynthesis,
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
	ProbeQuestionsPanel,
	LoadingButton,
	useToast,
} from './components';

import {
	SummaryHeader,
	SynthesisEditorCard,
	AISynthesisPanel,
	SynthesisVersionPanel,
	NextRoundQuestionsCard,
	ActionsCard,
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

// ─── Error Boundary ──────────────────────────────────────────────────────────

interface ErrorBoundaryProps {
	children: ReactNode;
	fallbackTitle?: string;
	onReset?: () => void;
}

interface ErrorBoundaryState {
	hasError: boolean;
	error: Error | null;
}

class SectionErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
	constructor(props: ErrorBoundaryProps) {
		super(props);
		this.state = { hasError: false, error: null };
	}

	static getDerivedStateFromError(error: Error): ErrorBoundaryState {
		return { hasError: true, error };
	}

	componentDidCatch(error: Error, errorInfo: ErrorInfo) {
		console.error('[SectionErrorBoundary]', error, errorInfo);
	}

	render() {
		if (this.state.hasError) {
			return (
				<div className="card p-4" style={{ borderColor: 'var(--destructive)', borderWidth: '1px' }}>
					<div className="text-center py-4">
						<div className="text-2xl mb-2"><span aria-hidden="true">⚠️</span></div>
						<h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--foreground)' }}>
							{this.props.fallbackTitle || 'This section encountered an error'}
						</h3>
						<p className="text-xs mb-3" style={{ color: 'var(--muted-foreground)' }}>
							{this.state.error?.message || 'An unexpected error occurred'}
						</p>
						<button
							onClick={() => {
								this.setState({ hasError: false, error: null });
								this.props.onReset?.();
							}}
							className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
							style={{
								backgroundColor: 'var(--muted)',
								color: 'var(--foreground)',
								border: '1px solid var(--border)',
								cursor: 'pointer',
							}}
						>
							Try Again
						</button>
					</div>
				</div>
			);
		}
		return this.props.children;
	}
}

// ─── Constants ───────────────────────────────────────────────────────────────

const MODELS = [
	'openai/gpt-4o',
	'openai/gpt-4o-mini',
];

function isBlockedModel(model: string): boolean {
	return model.startsWith('anthropic/');
}

function sanitizeModel(model: string | null | undefined): string {
	if (!model || isBlockedModel(model)) return MODELS[0];
	return model;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function extractQuestionText(q: unknown): string {
	if (typeof q === 'string') return q;
	if (q && typeof q === 'object') {
		const obj = q as Record<string, unknown>;
		return String(obj.text || obj.label || obj.question || '');
	}
	return '';
}

function buildStructuredSummaryText(data: Record<string, any> | null): string {
	if (!data) return '';
	const parts: string[] = [];
	if (data.narrative) parts.push(data.narrative);
	for (const a of data.agreements || []) {
		parts.push(`Agreement: ${a.claim} — ${a.evidence_summary}`);
	}
	for (const d of data.disagreements || []) {
		parts.push(`Disagreement: ${d.topic}`);
		for (const p of d.positions || []) {
			parts.push(`  - ${p.position}: ${p.evidence}`);
		}
	}
	for (const n of data.nuances || []) {
		parts.push(`Nuance: ${n.claim} — ${n.context}`);
	}
	return parts.join('\n');
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function SummaryPage() {
	const { t } = useTranslation();
	useDocumentTitle(t('summary.pageTitle'));
	const navigate = useNavigate();
	const { id } = useParams();
	const formId = Number(id);
	const { toastError, toastWarning, toastSuccess, toastInfo } = useToast();

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
	const [structuredSectionOpen, setStructuredSectionOpen] = useState(true);
	const [aiToolsOpen, setAiToolsOpen] = useState(false);
	const [selectedModel, setSelectedModel] = useState(MODELS[0]);
	const [isGenerating, setIsGenerating] = useState(false);
	const [isSavingSynthesis, setIsSavingSynthesis] = useState(false);
	const [isSynthesisDirty, setIsSynthesisDirty] = useState(false);
	const [lastSavedSynthesis, setLastSavedSynthesis] = useState('');

	// ── Synthesis versioning ──
	const [synthesisVersions, setSynthesisVersions] = useState<SynthesisVersion[]>([]);
	const [selectedVersionId, setSelectedVersionId] = useState<number | null>(null);
	const [showVersionCompare, setShowVersionCompare] = useState(false);

	// ── Next round questions ──
	const [nextRoundQuestions, setNextRoundQuestions] = useState<string[]>([]);
	// Default sidebar closed on mobile, open on desktop
	const [sidebarOpen, setSidebarOpen] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 768);

	// ── WebSocket message handler (synthesis_complete auto-refresh) ──
	const handleWsMessage = useCallback((data: Record<string, unknown>) => {
		if (data.type === 'synthesis_complete' && data.form_id === formId) {
			// Synthesis finished (possibly in background) — reload data
			loadAll().then(() => {
				if (data.round_id && typeof data.round_id === 'number') {
					loadSynthesisVersions(data.round_id);
				}
			});
			toastSuccess('Synthesis complete!');
		}
		if (data.type === 'synthesis_error' && data.form_id === formId) {
			// Background synthesis failed — show error to user
			toastError(
				typeof data.error === 'string'
					? data.error
					: 'Synthesis failed in background'
			);
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
	const availableModels = useMemo(
		() => Array.from(new Set([sanitizeModel(selectedModel), ...MODELS].filter(Boolean))),
		[selectedModel]
	);
	const audienceSourceText = useMemo(() => {
		if (selectedVersion?.synthesis?.trim()) return selectedVersion.synthesis;
		if (displayRound?.synthesis?.trim()) return displayRound.synthesis;
		return buildStructuredSummaryText(structuredSynthesisData as Record<string, any> | null);
	}, [selectedVersion, displayRound, structuredSynthesisData]);

	const synthesisContextNote = useMemo(() => {
		if (!activeRound || activeRound.round_number <= 1) return null;
		const previous = rounds.find(r => r.round_number === activeRound.round_number - 1);
		const currentText = (activeRound.synthesis || '').trim();
		const previousText = (previous?.synthesis || '').trim();
		if (!currentText || !previousText) return null;
		if (currentText !== previousText) return null;
		return `This draft is carried forward from Round ${activeRound.round_number - 1}. Update and save it as the Round ${activeRound.round_number} synthesis.`;
	}, [activeRound, rounds]);

	useEffect(() => {
		if (!editor) return;
		const onEditorUpdate = () => {
			const current = editor.getHTML().trim();
			setIsSynthesisDirty(current !== lastSavedSynthesis.trim());
		};
		editor.on('update', onEditorUpdate);
		return () => {
			editor.off('update', onEditorUpdate);
		};
	}, [editor, lastSavedSynthesis]);

	// ─── Data loading ────────────────────────────────────────────────────────

	useEffect(() => {
		if (!token) return;
		getMe()
			.then(d => setEmail(d?.email || ''))
			.catch(() => {
				// getMe failure is handled by apiClient (401/CF redirect)
				// For other errors, just use stored email
				const stored = localStorage.getItem('email');
				if (stored) setEmail(stored);
			});
	}, [token]);

	useEffect(() => {
		if (!token || !formId) return;
		let cancelled = false;
		loadAll()
			.then(() => { if (!cancelled) return loadResponses(); })
			.catch(() => {
				// Error state is set in loadAll — nothing more to do
			});
		return () => { cancelled = true; };
	}, [token, formId, editor]);

	useEffect(() => {
		api.get<Record<string, string>>('/admin/settings')
			.then(data => {
				if (data?.synthesis_model) setSelectedModel(sanitizeModel(data.synthesis_model));
			})
			.catch(() => {
				// Keep local fallback list when settings load fails.
			});
	}, []);

	async function loadAll() {
		setLoading(true);
		setLoadError(null);
		try {
			const f = await apiFetchForm(formId);
			if (!f) throw new Error('Form not found');
			setForm(f as Form);

			let list: ApiRound[];
			try {
				list = await getRounds(formId);
			} catch {
				// Rounds might fail independently — show form but flag error
				list = [];
			}
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
				loadSynthesisVersions(active.id).catch(() => {});
			}

				if (active && editor) {
					resetEditorToSaved(active.synthesis || '');
					const qs = active.questions?.length ? active.questions : (Array.isArray((f as Form).questions) ? (f as Form).questions : []);
					setNextRoundQuestions((qs || []).map(extractQuestionText));
				} else if (f && Array.isArray((f as Form).questions)) {
					setNextRoundQuestions((f as Form).questions.map(extractQuestionText));
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

	function toggleAiDeliberationTools() {
		setAiToolsOpen(v => !v);
	}

	function resetEditorToSaved(synthesis: string) {
		if (!editor) return;
		editor.commands.setContent(synthesis || '');
		setLastSavedSynthesis((synthesis || '').trim());
		setIsSynthesisDirty(false);
	}

	async function saveSynthesisEdits(): Promise<boolean> {
		const targetRound = selectedRound || activeRound;
		if (!targetRound?.is_active || !editor) return false;
		const nextContent = editor.getHTML().trim();
		if (nextContent === lastSavedSynthesis.trim()) return true;

		setIsSavingSynthesis(true);
		try {
			await apiPushSummary(formId, nextContent);
			const updatedRound = { ...targetRound, synthesis: nextContent };
			setRounds(prev => prev.map(r => (r.id === targetRound.id ? updatedRound : r)));
			if (activeRound?.id === targetRound.id) setActiveRound(updatedRound);
			if (selectedRound?.id === targetRound.id) setSelectedRound(updatedRound);
			setLastSavedSynthesis(nextContent);
			setIsSynthesisDirty(false);
			toastSuccess('Synthesis saved.');
			return true;
		} catch (error) {
			toastError((error as Error).message || 'Failed to save synthesis');
			return false;
		} finally {
			setIsSavingSynthesis(false);
		}
	}

	function revertSynthesisEdits() {
		resetEditorToSaved(lastSavedSynthesis);
		toastInfo('Edits reverted.');
	}

	async function handleSetSynthesisViewMode(mode: 'view' | 'edit') {
		if (mode === 'view' && synthesisViewMode === 'edit' && isSynthesisDirty) {
			const saved = await saveSynthesisEdits();
			if (!saved) return;
		}
		setSynthesisViewMode(mode);
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
			setSelectedRound(null);
		} catch (err) {
			toastError((err as Error).message || 'Failed to start next round');
		} finally {
			setLoading(false);
		}
	}

	async function generateSummary() {
		const targetRound = selectedRound || activeRound;
		const modelToUse = sanitizeModel(selectedModel);
		if (!formId || !modelToUse || !targetRound) return;
		if (modelToUse !== selectedModel) setSelectedModel(modelToUse);
		let baselineVersionCount = 0;
		try {
			const before = await apiGetSynthesisVersions(formId, targetRound.id);
			baselineVersionCount = before.length;
		} catch {
			// Non-fatal: polling can still check for synthesis text changes.
		}

		setIsGenerating(true);
		setSynthesisStage('preparing');
		setSynthesisStep(0);
		try {
			setSynthesisStage('analyzing');
			setSynthesisStep(1);

			const data = await apiGenerateSynthesis(formId, targetRound.id, {
				model: modelToUse,
				strategy: synthesisMode,
				n_analysts: 3,
				mode: 'human_only',
			});

			// ── Async path: synthesis running in the background ──
				if (data.status === 'started') {
					toastSuccess(
						data.message || 'Synthesis running in background — you\u2019ll be notified when complete'
					);
					// Reset UI immediately so the user can navigate away
					setSynthesisStage('preparing');
					setSynthesisStep(0);
					setIsGenerating(false);
					// Fallback polling in case WebSocket completion event is missed.
					(async () => {
						const maxAttempts = 30;
						for (let i = 0; i < maxAttempts; i++) {
							await new Promise(resolve => setTimeout(resolve, 3000));
							try {
								const latest = await apiGetSynthesisVersions(formId, targetRound.id);
								if (latest.length > baselineVersionCount) {
									await loadAll();
									await loadSynthesisVersions(targetRound.id);
									toastSuccess('Synthesis complete!');
									return;
								}
							} catch {
								// Keep polling; transient failures should not stop refresh recovery.
							}
						}
						toastWarning('Synthesis may be complete. Please refresh if results do not appear automatically.');
					})();
					return;
				}

			// ── Sync path: immediate result (mock mode) ──
			setSynthesisStage('synthesising');
			setSynthesisStep(3);

			setSynthesisStage('formatting');
			setSynthesisStep(4);

			const content = data.synthesis || data.summary || '';
			if (editor) resetEditorToSaved(content || '');

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
				const message = (error as Error).message || 'Failed to generate synthesis';
				toastError(`Model "${modelToUse}" failed: ${message}`);
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
		try {
			setSelectedRound(round);
			if (round.is_active && editor) resetEditorToSaved(round.synthesis || '');
			loadSynthesisVersions(round.id).catch((err) => {
				console.error('[handleSelectRound] Failed to load synthesis versions:', err);
				toastError('Failed to load synthesis versions for this round');
			});
		} catch (err) {
			console.error('[handleSelectRound] Error selecting round:', err);
			toastError('Failed to switch to the selected round');
		}
	}

	function handleResponseUpdated(roundId: number, updated: { id: number; answers: Record<string, unknown>; version: number }) {
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
				<div className="text-4xl mb-4"><span aria-hidden="true">⚠️</span></div>
				<h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--foreground)' }}>
					{t('summary.failedToLoad')}
				</h2>
				<p className="text-sm mb-6" style={{ color: 'var(--muted-foreground)' }}>
					{loadError}
				</p>
				<div className="flex gap-3 justify-center">
					<LoadingButton variant="accent" size="md" onClick={() => { loadAll(); loadResponses(); }}>
						{t('common.retry')}
					</LoadingButton>
					<LoadingButton variant="secondary" size="md" onClick={() => navigate('/')}>
						{t('common.backToDashboard')}
					</LoadingButton>
				</div>
			</div>
		</div>
	);
	if (!form) return <SummaryLoadingSkeleton />;

	return (
		<div className="min-h-screen bg-background text-foreground font-sans flex flex-col">
			<a href="#main-content" className="skip-to-main">
				{t('common.skipToMainContent')}
			</a>
			<SummaryHeader email={email} viewers={viewers} onLogout={logout} />

			<main id="main-content" className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6" tabIndex={-1}>
				{/* Navigation breadcrumb */}
				<nav aria-label={t('common.breadcrumb', 'Breadcrumb')} className="mb-4 flex items-center justify-between">
					<button
						onClick={() => navigate('/')}
						className="text-sm font-medium transition-colors"
						style={{ color: 'var(--muted-foreground)', background: 'none', border: 'none', cursor: 'pointer' }}
						onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.color = 'var(--accent)'}
						onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.color = 'var(--muted-foreground)'}
					>
						{t('common.backToDashboard')}
					</button>
					<h2 className="text-sm font-medium truncate max-w-[50vw] sm:max-w-none" style={{ color: 'var(--muted-foreground)' }}>
						{form.title}
					</h2>
				</nav>

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
				<div aria-live="polite">
				<SynthesisProgress
					stage={synthesisStage}
					step={synthesisStep}
					totalSteps={synthesisTotalSteps}
					visible={isGenerating}
				/>
				</div>

				{/* Floating sidebar toggle */}
				<button
					onClick={() => setSidebarOpen(v => !v)}
					className="summary-sidebar-toggle fixed z-50 flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium shadow-lg transition-all min-h-[44px]"
					data-open={sidebarOpen ? 'true' : 'false'}
					aria-expanded={sidebarOpen}
					aria-controls="summary-sidebar"
					aria-label={sidebarOpen ? t('summary.hideSidebar', 'Hide synthesis controls panel') : t('summary.showSidebar', 'Show synthesis controls panel')}
					style={{
						top: '4.75rem',
						background: 'var(--card)',
						border: '1px solid var(--border)',
						color: 'var(--foreground)',
					}}
				>
					{sidebarOpen ? <X size={15} aria-hidden="true" /> : <PanelRight size={15} aria-hidden="true" />}
					<span className="hidden sm:inline">{sidebarOpen ? t('summary.hide') : t('summary.controls')}</span>
				</button>

				{/* Main content — full width */}
				<div className="space-y-4 sm:space-y-6">
						{/* Non-active round card */}
						{selectedRound && !selectedRound.is_active && (
							<SectionErrorBoundary fallbackTitle="Failed to render round details">
								<RoundCard
									round={selectedRound}
									isCurrentRound={false}
								/>
							</SectionErrorBoundary>
						)}

						{/* Inline responses accordion — shown/hidden by controls toggle */}
						{responsesOpen && (
							<ResponsesAccordion
								structuredRounds={structuredRounds}
								rounds={rounds}
								formQuestions={form.questions || []}
								formId={formId}
								token={token}
								onResponseUpdated={handleResponseUpdated}
							/>
						)}

						{/* Synthesis editor (active round only) */}
						{(!selectedRound || selectedRound.is_active) && (
							<SynthesisEditorCard
								activeRound={activeRound}
								contextNote={synthesisContextNote}
								synthesisViewMode={synthesisViewMode}
								onSetViewMode={handleSetSynthesisViewMode}
								editor={editor}
								isDirty={isSynthesisDirty}
								isSaving={isSavingSynthesis}
								onSave={saveSynthesisEdits}
								onRevert={revertSynthesisEdits}
							/>
						)}

						{/* Audience translation should follow the current synthesis view */}
						{displayRound && audienceSourceText && (
							<SectionErrorBoundary fallbackTitle="Failed to render audience translation">
								<div className="card p-4">
									<h2 className="text-base font-semibold mb-2 text-foreground flex items-center gap-2">
										<Globe size={20} style={{ color: 'var(--accent)' }} /> Audience Lens
									</h2>
									<p className="text-sm mb-3" style={{ color: 'var(--muted-foreground)' }}>
										Reframe the current synthesis for a specific audience.
									</p>
									<AudienceTranslation
										formId={formId}
										roundId={displayRound.id}
										synthesisText={audienceSourceText}
									/>
								</div>
							</SectionErrorBoundary>
						)}

						{/* Next round questions should stay close to synthesis actions */}
						<NextRoundQuestionsCard
							questions={nextRoundQuestions}
							onUpdateQuestion={(i, v) => setNextRoundQuestions(prev => { const c = [...prev]; c[i] = v; return c; })}
							onAddQuestion={() => setNextRoundQuestions(prev => [...prev, ''])}
							onRemoveQuestion={i => setNextRoundQuestions(prev => prev.filter((_, idx) => idx !== i))}
						/>

						{/* Structured synthesis data */}
							{structuredSynthesisData && (
								<SectionErrorBoundary fallbackTitle="Failed to render structured analysis">
									<div className="card p-4">
										<div className="flex items-start justify-between gap-4 mb-3 flex-wrap">
											<button
												type="button"
												onClick={() => setStructuredSectionOpen(v => !v)}
												className="w-full flex items-center justify-between text-left"
												style={{ background: 'none', border: 'none', cursor: 'pointer' }}
												aria-expanded={structuredSectionOpen}
												aria-controls="summary-structured-section"
											>
												<h2 className="text-base font-semibold text-foreground flex items-center gap-2 m-0">
													<ChartNoAxesColumn size={20} style={{ color: 'var(--accent)' }} /> {t('summary.structuredAnalysis')}
												</h2>
												{structuredSectionOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
											</button>
										</div>
										{structuredSectionOpen && (
											<div id="summary-structured-section">
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
									</div>
									</SectionErrorBoundary>
								)}

						{/* AI deliberation tools (shown/hidden via Workflow Actions) */}
						{displayRound && aiToolsOpen && (
							<SectionErrorBoundary fallbackTitle="Failed to render AI deliberation tools">
								<div className="card p-4">
									<h2 className="text-base font-semibold text-foreground flex items-center gap-2 m-0 mb-4">
										<Sparkles size={20} style={{ color: 'var(--accent)' }} /> AI Deliberation Tools
									</h2>
									<div id="summary-ai-tools" className="space-y-4">
										{structuredSynthesisData && (
											<SectionErrorBoundary fallbackTitle="Failed to render AI counterpoints">
												<DevilsAdvocate formId={formId} roundId={displayRound.id} />
											</SectionErrorBoundary>
										)}
										<SectionErrorBoundary fallbackTitle="Failed to render AI probing questions">
											<ProbeQuestionsPanel
												formId={formId}
												roundId={displayRound.id}
												synthesisText={audienceSourceText}
											/>
										</SectionErrorBoundary>
									</div>
								</div>
							</SectionErrorBoundary>
						)}

						{/* Cross-matrix */}
						{structuredSynthesisData && (
							<SectionErrorBoundary fallbackTitle="Failed to render cross-analysis">
								<div className="card p-4">
									<h2 className="text-base font-semibold mb-2 text-foreground flex items-center gap-2">
										<Link2 size={20} style={{ color: 'var(--accent)' }} /> {t('summary.expertCrossAnalysis')}
									</h2>
									<CrossMatrix
										structuredData={structuredSynthesisData}
										resolvedExpertLabels={resolvedExpertLabels}
										expertLabelPreset="default"
									/>
								</div>
							</SectionErrorBoundary>
						)}

						{/* Consensus heatmap */}
						{structuredSynthesisData && (
							<SectionErrorBoundary fallbackTitle="Failed to render consensus heatmap">
								<div className="card p-4">
									<h2 className="text-base font-semibold mb-2 text-foreground flex items-center gap-2">
										<MapPin size={20} style={{ color: 'var(--accent)' }} /> {t('summary.consensusHeatmap')}
									</h2>
									<ConsensusHeatmap
										structuredData={structuredSynthesisData}
										resolvedExpertLabels={resolvedExpertLabels}
										questions={displayRound?.questions}
									/>
								</div>
							</SectionErrorBoundary>
						)}

						{/* Emergence highlights */}
						{structuredSynthesisData?.emergent_insights && structuredSynthesisData.emergent_insights.length > 0 && (
							<SectionErrorBoundary fallbackTitle="Failed to render emergent insights">
								<div className="card p-4">
									<h2 className="text-base font-semibold mb-2 text-foreground flex items-center gap-2">
										<Sparkles size={20} style={{ color: 'var(--accent)' }} /> {t('summary.emergentInsights')}
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
							</SectionErrorBoundary>
						)}

					</div>

					{/* ── Mobile sidebar backdrop ── */}
					{sidebarOpen && (
						<div
							className="fixed inset-0 z-30 bg-black/30 md:hidden"
							onClick={() => setSidebarOpen(false)}
							aria-hidden="true"
						/>
					)}

					{/* ── Version compare modal ── */}
					{showVersionCompare && synthesisVersions.length >= 2 && (
						<div className="fixed inset-0 z-[70]">
							<div
								className="absolute inset-0 bg-black/40"
								onClick={() => setShowVersionCompare(false)}
								aria-hidden="true"
							/>
							<div className="relative mx-auto my-4 sm:my-6 w-[min(1200px,96vw)] max-h-[92vh] overflow-auto">
								<SectionErrorBoundary fallbackTitle="Failed to render version comparison">
									<VersionCompare
										versions={synthesisVersions}
										currentVersionId={selectedVersionId}
										onClose={() => setShowVersionCompare(false)}
									/>
								</SectionErrorBoundary>
							</div>
						</div>
					)}

					{/* ── Floating Sidebar ── */}
					<aside
						id="summary-sidebar"
						role="complementary"
						aria-label={t('summary.synthesisControls')}
						className="summary-sidebar"
						style={{
							position: 'fixed',
							right: 0,
							top: '4.5rem',
							height: 'calc(100vh - 4.5rem)',
							overflowY: 'auto',
							zIndex: 40,
							borderLeft: '1px solid var(--border)',
							background: 'var(--background)',
							transform: sidebarOpen ? 'translateX(0)' : 'translateX(100%)',
							transition: 'transform 0.2s ease',
							padding: '0.75rem',
							display: 'flex',
							flexDirection: 'column',
							gap: '0.5rem',
						}}
					>
						{/* Compact form title + round badge */}
						<div
							className="flex items-center justify-between px-1 py-1"
							style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}
						>
							<span className="text-xs font-medium truncate" style={{ color: 'var(--foreground)', maxWidth: '18rem' }}>
								{form.title}
							</span>
							<span
								className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold flex-shrink-0"
								style={{
									backgroundColor: activeRound
										? 'color-mix(in srgb, var(--accent) 12%, transparent)'
										: 'var(--muted)',
									color: activeRound ? 'var(--accent)' : 'var(--muted-foreground)',
								}}
							>
								{activeRound && (
									<span
										className="w-1 h-1 rounded-full"
										style={{ backgroundColor: 'var(--accent)' }}
									/>
								)}
								{activeRound ? `R${activeRound.round_number}` : 'No round'}
							</span>
						</div>

							<ActionsCard
								responsesOpen={responsesOpen}
								aiToolsOpen={aiToolsOpen}
								onToggleResponses={viewAllResponses}
								onToggleAiTools={toggleAiDeliberationTools}
								onStartNextRound={startNextRound}
								loading={loading}
							/>

						<AISynthesisPanel
							synthesisMode={synthesisMode}
							onModeChange={setSynthesisMode}
							selectedModel={selectedModel}
							onModelChange={setSelectedModel}
							models={availableModels}
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
					</aside>
			</main>

			</div>
		);
	}
