import { Component, useCallback, useEffect, useMemo, useState } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import { ChartNoAxesColumn, ChevronDown, ChevronRight, Download, FileText, Globe, Link2, MapPin, MessageSquareText, Sparkles } from 'lucide-react';
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
	estimateSynthesisDurationSeconds,
	formatSynthesisDurationEstimate,
	generateSynthesis as apiGenerateSynthesis,
	getSynthesisJobStatus as apiGetSynthesisJobStatus,
	pushSummary as apiPushSummary,
} from './api/synthesis';

import {
	RoundCard,
	SynthesisProgress,
	StructuredSynthesis,
	CrossMatrix,
	ConsensusHeatmap,
	EmergenceHighlights,
	MarkdownRenderer,
	DevilsAdvocate,
	AudienceTranslation,
	BackLink,
	ProbeQuestionsPanel,
	LoadingButton,
	useToast,
	DownloadSheet,
} from './components';

import {
	SummaryHeader,
	SynthesisEditorCard,
	AISynthesisPanel,
	SynthesisVersionPanel,
	NextRoundQuestionsCard,
	ResponsesAccordion,
	RoundHistoryCard,
	SummaryLoadingSkeleton,
	VersionCompare,
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
const SYNTHESIS_ANALYSTS = 3;
const SYNTHESIS_RUN_TTL_MS = 30 * 60 * 1000;
const SUMMARY_COMPOSITION_DEFAULTS = {
	narrative: true,
	agreements: true,
	disagreements: true,
	nuances: true,
	consensusMap: false,
	probes: false,
};

interface StoredSynthesisRun {
	formId: number;
	roundId: number;
	jobId: string | null;
	mode: 'simple' | 'committee' | 'ttd';
	model: string;
	stage: string;
	step: number;
	totalSteps: number;
	startedAtMs: number;
	estimateSeconds: number | null;
	baselineVersionCount: number;
}

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
	const [searchParams, setSearchParams] = useSearchParams();
	const formId = Number(id);
	const { toastError, toastWarning, toastSuccess, toastInfo } = useToast();

	const { token: rawToken, logout: authLogout, role } = useAuth();
	const token = rawToken ?? '';

	// ── Core state ──
	const [email, setEmail] = useState('');
	const [form, setForm] = useState<Form | null>(null);
	const [rounds, setRounds] = useState<Round[]>([]);
	const [activeRound, setActiveRound] = useState<Round | null>(null);
	const [loading, setLoading] = useState(false);
	const [loadError, setLoadError] = useState<string | null>(null);

	// ── Workspace tabs ──
	const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<'synthesis' | 'responses' | 'analysis'>('synthesis');
	const [structuredRounds, setStructuredRounds] = useState<RoundWithResponses[]>([]);

	// ── Round selection ──
	const [selectedRound, setSelectedRound] = useState<Round | null>(null);

	// ── Synthesis generation UI ──
	const [synthesisStage, setSynthesisStage] = useState('preparing');
	const [synthesisStep, setSynthesisStep] = useState(0);
	const [synthesisTotalSteps, setSynthesisTotalSteps] = useState(4);
	const [synthesisMode, setSynthesisMode] = useState<'simple' | 'committee' | 'ttd'>('simple');
	const [synthesisStartedAtMs, setSynthesisStartedAtMs] = useState<number | null>(null);
	const [synthesisElapsedSeconds, setSynthesisElapsedSeconds] = useState(0);
	const [synthesisEstimateSeconds, setSynthesisEstimateSeconds] = useState<number | null>(null);
	const [synthesisViewMode, setSynthesisViewMode] = useState<'view' | 'edit'>('view');
	const [structuredSectionOpen, setStructuredSectionOpen] = useState(true);
	const [advancedAnalysisOpen, setAdvancedAnalysisOpen] = useState(false);
	const [aiToolsOpen, setAiToolsOpen] = useState(false);
	const [summaryComposition, setSummaryComposition] = useState(SUMMARY_COMPOSITION_DEFAULTS);
	const [selectedModel, setSelectedModel] = useState(MODELS[0]);
	const [isGenerating, setIsGenerating] = useState(false);
	const [generationRun, setGenerationRun] = useState<StoredSynthesisRun | null>(null);
	const [isSavingSynthesis, setIsSavingSynthesis] = useState(false);
	const [isSynthesisDirty, setIsSynthesisDirty] = useState(false);
	const [lastSavedSynthesis, setLastSavedSynthesis] = useState('');

	// ── Synthesis versioning ──
	const [synthesisVersions, setSynthesisVersions] = useState<SynthesisVersion[]>([]);
	const [selectedVersionId, setSelectedVersionId] = useState<number | null>(null);
	const [showVersionCompare, setShowVersionCompare] = useState(false);
	const [downloadSheetOpen, setDownloadSheetOpen] = useState(false);

	// ── Next round questions ──
	const [nextRoundQuestions, setNextRoundQuestions] = useState<string[]>([]);
	const synthesisRunStorageKey = useMemo(
		() => `summary:synthesis-run:${formId}`,
		[formId]
	);

	// ── WebSocket message handler (synthesis_complete auto-refresh) ──
	const clearSynthesisRunState = useCallback(() => {
		setIsGenerating(false);
		setGenerationRun(null);
		setSynthesisStartedAtMs(null);
		setSynthesisElapsedSeconds(0);
		setSynthesisEstimateSeconds(null);
		try {
			sessionStorage.removeItem(synthesisRunStorageKey);
		} catch {
			// Ignore storage failures.
		}
	}, [synthesisRunStorageKey]);

	const markSynthesisComplete = useCallback((showToast = true) => {
		setSynthesisStage('complete');
		setSynthesisStep(synthesisTotalSteps);
		clearSynthesisRunState();
		if (showToast) toastSuccess('Synthesis complete!');
		window.setTimeout(() => {
			setSynthesisStage('preparing');
			setSynthesisStep(0);
		}, 2000);
	}, [clearSynthesisRunState, synthesisTotalSteps, toastSuccess]);

	const handleWsMessage = useCallback((data: Record<string, unknown>) => {
		if (data.type === 'synthesis_progress' && data.form_id === formId) {
			setIsGenerating(true);
			const progressRoundId = typeof data.round_id === 'number'
				? data.round_id
				: selectedRound?.id ?? activeRound?.id;
			if (synthesisStartedAtMs == null) {
				setSynthesisStartedAtMs(Date.now());
			}
			if (typeof data.stage === 'string') {
				setSynthesisStage(data.stage);
			}
			if (typeof data.step === 'number') {
				setSynthesisStep(data.step);
			}
			if (typeof data.total_steps === 'number' && data.total_steps > 0) {
				setSynthesisTotalSteps(data.total_steps);
			}
			setGenerationRun(prev => {
				if (!progressRoundId) return prev;
				if (!prev) {
					return {
						formId,
						roundId: progressRoundId,
						jobId: null,
						mode: synthesisMode,
						model: selectedModel,
						stage: typeof data.stage === 'string' ? data.stage : 'preparing',
						step: typeof data.step === 'number' ? data.step : 1,
						totalSteps: typeof data.total_steps === 'number' && data.total_steps > 0
							? data.total_steps
							: 4,
						startedAtMs: synthesisStartedAtMs ?? Date.now(),
						estimateSeconds: synthesisEstimateSeconds,
						baselineVersionCount: synthesisVersions.length,
					};
				}
				return {
					...prev,
					stage: typeof data.stage === 'string' ? data.stage : prev.stage,
					step: typeof data.step === 'number' ? data.step : prev.step,
					totalSteps: typeof data.total_steps === 'number' && data.total_steps > 0
						? data.total_steps
						: prev.totalSteps,
				};
			});
			return;
		}
		if (data.type === 'synthesis_complete' && data.form_id === formId) {
			// Synthesis finished (possibly in background) — reload data
			loadAll().then(() => {
				if (data.round_id && typeof data.round_id === 'number') {
					loadSynthesisVersions(data.round_id);
				}
			});
			markSynthesisComplete();
		}
		if (data.type === 'synthesis_error' && data.form_id === formId) {
			// Background synthesis failed — show error to user
			clearSynthesisRunState();
			setSynthesisStage('preparing');
			setSynthesisStep(0);
			toastError(
				typeof data.error === 'string'
					? data.error
					: 'Synthesis failed in background'
			);
		}
	}, [
		clearSynthesisRunState,
		formId,
		loadAll,
		loadSynthesisVersions,
		markSynthesisComplete,
		selectedModel,
		synthesisEstimateSeconds,
		synthesisMode,
		synthesisStartedAtMs,
		synthesisVersions.length,
		selectedRound?.id,
		activeRound?.id,
		toastError,
	]);

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
	const requestedRoundId = useMemo(() => {
		const raw = searchParams.get('round');
		if (!raw) return null;
		const parsed = Number(raw);
		return Number.isFinite(parsed) ? parsed : null;
	}, [searchParams]);
	const displayRound = selectedRound || activeRound;
	const targetRoundForGeneration = selectedRound || activeRound;
	const structuredSynthesisData = displayRound?.synthesis_json || null;
	const responseCountForDisplay = targetRoundForGeneration?.response_count ?? 0;

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
	const synthesisEstimateLabel = useMemo(() => {
		if (!targetRoundForGeneration?.response_count) return null;
		const seconds = estimateSynthesisDurationSeconds(
			synthesisMode,
			targetRoundForGeneration.response_count,
			SYNTHESIS_ANALYSTS,
			selectedModel,
		);
		return formatSynthesisDurationEstimate(seconds);
	}, [selectedModel, synthesisMode, targetRoundForGeneration]);
	const audienceSourceText = useMemo(() => {
		if (selectedVersion?.synthesis?.trim()) return selectedVersion.synthesis;
		if (displayRound?.synthesis?.trim()) return displayRound.synthesis;
		return buildStructuredSummaryText(structuredSynthesisData as Record<string, any> | null);
	}, [selectedVersion, displayRound, structuredSynthesisData]);
	const showSynthesisHeatmap = Boolean(
		structuredSynthesisData?.summary_options?.consensusMap
		|| summaryComposition.consensusMap
	);
	const synthesisContextNote = useMemo(() => {
		if (!activeRound || activeRound.round_number <= 1) return null;
		const previous = rounds.find(r => r.round_number === activeRound.round_number - 1);
		const currentText = (activeRound.synthesis || '').trim();
		const previousText = (previous?.synthesis || '').trim();
		if (!currentText || !previousText) return null;
		if (currentText !== previousText) return null;
		return `This draft is carried forward from Round ${activeRound.round_number - 1}. Update and save it as the Round ${activeRound.round_number} synthesis.`;
	}, [activeRound, rounds]);
	const workspaceTabs = [
		{
			id: 'synthesis' as const,
			label: 'Synthesis',
			description: 'Draft, review, and publish the round summary.',
			icon: FileText,
		},
		{
			id: 'responses' as const,
			label: 'Responses',
			description: 'Inspect and edit expert responses by round.',
			icon: MessageSquareText,
		},
		{
			id: 'analysis' as const,
			label: 'Analysis',
			description: 'Explore structure, comparisons, and AI-assisted views.',
			icon: ChartNoAxesColumn,
		},
	];

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

	useEffect(() => {
		if (!isGenerating || synthesisStartedAtMs == null) return;
		const tick = () => {
			setSynthesisElapsedSeconds(
				Math.max(0, Math.floor((Date.now() - synthesisStartedAtMs) / 1000))
			);
		};
		tick();
		const intervalId = window.setInterval(tick, 1000);
		return () => window.clearInterval(intervalId);
	}, [isGenerating, synthesisStartedAtMs]);

	useEffect(() => {
		if (!generationRun) return;
		try {
			sessionStorage.setItem(synthesisRunStorageKey, JSON.stringify(generationRun));
		} catch {
			// Ignore storage failures.
		}
	}, [generationRun, synthesisRunStorageKey]);

	useEffect(() => {
		if (!formId || generationRun || rounds.length === 0) return;
		let restored: StoredSynthesisRun | null = null;
		try {
			const raw = sessionStorage.getItem(synthesisRunStorageKey);
			if (!raw) return;
			const parsed = JSON.parse(raw) as Partial<StoredSynthesisRun>;
			if (
				parsed.formId !== formId
				|| typeof parsed.roundId !== 'number'
				|| typeof parsed.startedAtMs !== 'number'
				|| Date.now() - parsed.startedAtMs > SYNTHESIS_RUN_TTL_MS
			) {
				sessionStorage.removeItem(synthesisRunStorageKey);
				return;
			}
			restored = {
				formId,
				roundId: parsed.roundId,
				mode: (parsed.mode as StoredSynthesisRun['mode']) || 'simple',
				jobId: typeof parsed.jobId === 'string' ? parsed.jobId : null,
				model: typeof parsed.model === 'string' ? parsed.model : MODELS[0],
				stage: typeof parsed.stage === 'string' ? parsed.stage : 'preparing',
				step: typeof parsed.step === 'number' ? parsed.step : 1,
				totalSteps: typeof parsed.totalSteps === 'number' ? parsed.totalSteps : 4,
				startedAtMs: parsed.startedAtMs,
				estimateSeconds: typeof parsed.estimateSeconds === 'number' ? parsed.estimateSeconds : null,
				baselineVersionCount: typeof parsed.baselineVersionCount === 'number' ? parsed.baselineVersionCount : 0,
			};
		} catch {
			return;
		}

		if (!restored) return;
		const matchingRound = rounds.find(r => r.id === restored?.roundId);
		if (!matchingRound) {
			clearSynthesisRunState();
			return;
		}

		setGenerationRun(restored);
		setIsGenerating(true);
		setSynthesisMode(restored.mode);
		setSelectedModel(sanitizeModel(restored.model));
		setSynthesisStage(restored.stage);
		setSynthesisStep(restored.step);
		setSynthesisTotalSteps(restored.totalSteps);
		setSynthesisStartedAtMs(restored.startedAtMs);
		setSynthesisEstimateSeconds(restored.estimateSeconds);
		setSynthesisElapsedSeconds(Math.max(0, Math.floor((Date.now() - restored.startedAtMs) / 1000)));
		setSelectedRound(matchingRound);
		setSearchParams(prev => {
			const next = new URLSearchParams(prev);
			next.set('round', String(restored!.roundId));
			return next;
		}, { replace: true });
		loadSynthesisVersions(restored.roundId).catch(() => {});
	}, [
		clearSynthesisRunState,
		formId,
		generationRun,
		rounds,
		setSearchParams,
		synthesisRunStorageKey,
	]);

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
			const persistedRound = requestedRoundId != null
				? mapped.find(x => x.id === requestedRoundId) || null
				: null;
			const currentSelection = selectedRound
				? mapped.find(x => x.id === selectedRound.id) || null
				: null;
			const resolvedSelection = persistedRound || currentSelection || active;

			if (requestedRoundId != null && !persistedRound) {
				setSearchParams(prev => {
					const next = new URLSearchParams(prev);
					next.delete('round');
					return next;
				}, { replace: true });
			}

			setSelectedRound(resolvedSelection || null);
			if (resolvedSelection) {
				loadSynthesisVersions(resolvedSelection.id).catch(() => {});
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

	useEffect(() => {
		if (!formId || !generationRun || !isGenerating) return;
		let cancelled = false;

		const poll = async () => {
			try {
				if (generationRun.jobId) {
					const job = await apiGetSynthesisJobStatus(formId, generationRun.roundId);
					if (cancelled) return;
					if (job.status === 'running' || job.status === 'queued' || job.status === 'started') {
						if (typeof job.stage === 'string') {
							setSynthesisStage(job.stage);
						}
						if (typeof job.step === 'number') {
							setSynthesisStep(job.step);
						}
						if (typeof job.total_steps === 'number' && job.total_steps > 0) {
							setSynthesisTotalSteps(job.total_steps);
						}
						if (typeof job.estimate_seconds === 'number') {
							setSynthesisEstimateSeconds(job.estimate_seconds);
						}
						setGenerationRun(prev => prev ? ({
							...prev,
							stage: typeof job.stage === 'string' ? job.stage : prev.stage,
							step: typeof job.step === 'number' ? job.step : prev.step,
							totalSteps: typeof job.total_steps === 'number' && job.total_steps > 0
								? job.total_steps
								: prev.totalSteps,
							estimateSeconds: typeof job.estimate_seconds === 'number'
								? job.estimate_seconds
								: prev.estimateSeconds,
						}) : prev);
					}
					if (job.status === 'completed') {
						await loadAll();
						await loadSynthesisVersions(generationRun.roundId);
						markSynthesisComplete(false);
						return;
					}
					if (job.status === 'failed') {
						clearSynthesisRunState();
						setSynthesisStage('preparing');
						setSynthesisStep(0);
						toastError(job.error || job.message || 'Synthesis failed in background');
						return;
					}
				}

				const latest = await apiGetSynthesisVersions(formId, generationRun.roundId);
				if (cancelled) return;
				const baseline = generationRun.baselineVersionCount;
				const hasNewVersion = latest.length > baseline;
				if (hasNewVersion) {
					await loadAll();
					await loadSynthesisVersions(generationRun.roundId);
					markSynthesisComplete(false);
				}
			} catch {
				// Keep polling; transient failures should not stop recovery.
			}
		};

		poll();
		const intervalId = window.setInterval(poll, 3000);
		return () => {
			cancelled = true;
			window.clearInterval(intervalId);
		};
	}, [
		clearSynthesisRunState,
		formId,
		generationRun,
		isGenerating,
		loadAll,
		loadSynthesisVersions,
		markSynthesisComplete,
		toastError,
	]);

	// ─── Actions ─────────────────────────────────────────────────────────────

	function logout() {
		authLogout();
		navigate('/');
	}

	async function viewAllResponses() {
		if (activeWorkspaceTab === 'responses') {
			setActiveWorkspaceTab('synthesis');
			return;
		}
		await loadResponses();
		setActiveWorkspaceTab('responses');
	}

	function toggleAiDeliberationTools() {
		setAiToolsOpen(v => !v);
	}

	function toggleSummaryCompositionOption(option: string) {
		if (!(option in SUMMARY_COMPOSITION_DEFAULTS)) return;
		setSummaryComposition(prev => ({ ...prev, [option]: !prev[option] }));
	}

	async function handleWorkspaceTabChange(tab: 'synthesis' | 'responses' | 'analysis') {
		if (tab === 'responses') {
			await loadResponses();
		}
		setActiveWorkspaceTab(tab);
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
			setSearchParams(prev => {
				const next = new URLSearchParams(prev);
				next.delete('round');
				return next;
			}, { replace: true });
		} catch (err) {
			toastError((err as Error).message || 'Failed to start next round');
		} finally {
			setLoading(false);
		}
	}

	async function generateSummary() {
		const targetRound = targetRoundForGeneration;
		const modelToUse = sanitizeModel(selectedModel);
		if (!formId || !modelToUse || !targetRound) return;
		if (modelToUse !== selectedModel) setSelectedModel(modelToUse);
		let backgroundStarted = false;
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
		setSynthesisTotalSteps(4);
		setSynthesisStartedAtMs(Date.now());
		setSynthesisElapsedSeconds(0);
		setSynthesisEstimateSeconds(null);
		try {
			const data = await apiGenerateSynthesis(formId, targetRound.id, {
				model: modelToUse,
				strategy: synthesisMode,
				n_analysts: SYNTHESIS_ANALYSTS,
				mode: 'human_only',
				summary_options: summaryComposition,
			});

			// ── Async path: synthesis running in the background ──
			if (data.status === 'started') {
				backgroundStarted = true;
				const estimateSeconds = data.estimate_seconds
					?? estimateSynthesisDurationSeconds(
						synthesisMode,
						targetRound.response_count ?? 0,
						SYNTHESIS_ANALYSTS,
						modelToUse,
					);
				setSynthesisStage('preparing');
				setSynthesisStep(1);
				setSynthesisEstimateSeconds(estimateSeconds);
				setGenerationRun({
					formId,
					roundId: targetRound.id,
					mode: synthesisMode,
					jobId: data.job_id ?? null,
					model: modelToUse,
					stage: 'preparing',
					step: 1,
					totalSteps: 4,
					startedAtMs: Date.now(),
					estimateSeconds,
					baselineVersionCount,
				});
				toastSuccess(
					data.message || 'Synthesis running in background — you’ll be notified when complete'
				);
				return;
			}

			// ── Sync path: immediate result (mock mode) ──
			setSynthesisStage('synthesising');
			setSynthesisStep(2);

			setSynthesisStage('formatting');
			setSynthesisStep(3);

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
			setSynthesisStep(4);
			clearSynthesisRunState();
			setTimeout(() => { setSynthesisStage('preparing'); setSynthesisStep(0); }, 2000);
			} catch (error) {
				const message = (error as Error).message || 'Failed to generate synthesis';
				toastError(`Model "${modelToUse}" failed: ${message}`);
				clearSynthesisRunState();
				setSynthesisStage('preparing');
				setSynthesisStep(0);
			} finally {
				if (!backgroundStarted) {
					setIsGenerating(false);
				}
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
			setSearchParams(prev => {
				const next = new URLSearchParams(prev);
				next.set('round', String(round.id));
				return next;
			}, { replace: true });
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
					<BackLink to="/" label={t('common.backToDashboard')} />
				</div>
			</div>
		</div>
	);
	if (!form) return <SummaryLoadingSkeleton />;

		return (
		<div className="min-h-screen bg-background text-foreground font-sans flex flex-col">
			<DownloadSheet
				open={downloadSheetOpen}
				onClose={() => setDownloadSheetOpen(false)}
				form={form}
				rounds={rounds}
				structuredRounds={structuredRounds}
			/>
			<a href="#main-content" className="skip-to-main">
				{t('common.skipToMainContent')}
			</a>
			<SummaryHeader
				email={email}
				viewers={viewers}
				onLogout={logout}
				showAdminLinks={role === 'platform_admin'}
			/>

			<main id="main-content" className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6" tabIndex={-1}>
				<div>
				<BackLink to="/" label={t('common.backToDashboard')} className="mb-4 sm:mb-5" />
				<section className="card mb-4 sm:mb-6 p-5 sm:p-6">
					<div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
						<div className="min-w-0 max-w-3xl">
							<div className="text-xs font-medium" style={{ color: 'var(--muted-foreground)' }}>
								Summary
							</div>
							<h2 className="mt-1.5 text-2xl font-bold tracking-tight" style={{ color: 'var(--foreground)' }}>
								{form.title}
							</h2>
							<div className="mt-3 flex flex-wrap gap-2">
								<span
									className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium"
									style={{
										backgroundColor: 'var(--muted)',
										color: 'var(--foreground)',
									}}
								>
									{displayRound ? `Round ${displayRound.round_number}` : 'No round selected'}
								</span>
								{displayRound?.is_active && (
									<span
										className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium"
										style={{
											backgroundColor: 'color-mix(in srgb, var(--success) 12%, transparent)',
											color: 'var(--success)',
										}}
									>
										Live
									</span>
								)}
							</div>
						</div>

						<div className="w-full max-w-xl space-y-3 lg:max-w-sm">
							<RoundHistoryCard
								rounds={rounds}
								selectedRoundId={selectedRound?.id || null}
								onSelectRound={handleSelectRound}
							/>
						</div>
					</div>
				</section>

				<section className="mb-4 sm:mb-6">
					<div
						className="flex flex-wrap gap-2 rounded-2xl p-1.5"
						style={{
							backgroundColor: 'color-mix(in srgb, var(--muted) 34%, transparent)',
							border: '1px solid color-mix(in srgb, var(--border) 55%, transparent)',
						}}
					>
						{workspaceTabs.map(tab => {
							const Icon = tab.icon;
							const isActive = activeWorkspaceTab === tab.id;
							return (
								<button
									key={tab.id}
									type="button"
									onClick={() => { void handleWorkspaceTabChange(tab.id); }}
									className="flex min-w-[9rem] flex-1 items-center gap-2 rounded-xl px-3 py-2 text-left transition-colors"
									style={{
										backgroundColor: isActive
											? 'var(--card)'
											: 'transparent',
										border: isActive
											? '1px solid color-mix(in srgb, var(--border) 62%, transparent)'
											: '1px solid transparent',
										boxShadow: isActive ? '0 6px 18px rgba(15, 23, 42, 0.06)' : 'none',
										cursor: 'pointer',
									}}
									aria-pressed={isActive}
								>
									<Icon size={16} style={{ color: isActive ? 'var(--accent)' : 'var(--muted-foreground)' }} />
									<span
										className="text-sm font-semibold"
										style={{ color: isActive ? 'var(--foreground)' : 'var(--muted-foreground)' }}
									>
										{tab.label}
									</span>
								</button>
							);
						})}
					</div>
				</section>

				{/* Synthesis progress bar */}
				<div aria-live="polite">
				<SynthesisProgress
					stage={synthesisStage}
					step={synthesisStep}
					totalSteps={synthesisTotalSteps}
					visible={isGenerating || synthesisStage === 'complete'}
					elapsedSeconds={synthesisElapsedSeconds}
					estimateSeconds={synthesisEstimateSeconds}
				/>
				</div>

				<div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_21rem]">
					<div className="space-y-4 sm:space-y-6 min-w-0">
						{activeWorkspaceTab === 'synthesis' && (
							<>
								{selectedRound && !selectedRound.is_active && (
									<SectionErrorBoundary fallbackTitle="Failed to render round details">
										<RoundCard
											round={selectedRound}
											isCurrentRound={false}
										/>
									</SectionErrorBoundary>
								)}

								{(!selectedRound || selectedRound.is_active) && (
									<SynthesisEditorCard
										activeRound={activeRound}
										contextNote={synthesisContextNote}
										synthesisViewMode={synthesisViewMode}
										onSetViewMode={handleSetSynthesisViewMode}
										canGenerate={responseCountForDisplay > 0}
										onGenerate={generateSummary}
										editor={editor}
										isDirty={isSynthesisDirty}
										isSaving={isSavingSynthesis}
										onSave={saveSynthesisEdits}
										onRevert={revertSynthesisEdits}
									/>
								)}

								{showSynthesisHeatmap && structuredSynthesisData && (
									<SectionErrorBoundary fallbackTitle="Failed to render consensus heatmap">
										<div className="card p-4">
											<h3 className="text-base font-semibold mb-2 text-foreground flex items-center gap-2">
												<MapPin size={18} style={{ color: 'var(--accent)' }} /> Consensus heatmap
											</h3>
											<ConsensusHeatmap
												structuredData={structuredSynthesisData}
												resolvedExpertLabels={resolvedExpertLabels}
												questions={displayRound?.questions}
											/>
										</div>
									</SectionErrorBoundary>
								)}

								{displayRound?.is_active && (
									<NextRoundQuestionsCard
										questions={nextRoundQuestions}
										onUpdateQuestion={(i, v) => setNextRoundQuestions(prev => { const c = [...prev]; c[i] = v; return c; })}
										onAddQuestion={() => setNextRoundQuestions(prev => [...prev, ''])}
										onRemoveQuestion={i => setNextRoundQuestions(prev => prev.filter((_, idx) => idx !== i))}
										onStartNextRound={startNextRound}
										loading={loading}
									/>
								)}
							</>
						)}

						{activeWorkspaceTab === 'responses' && (
							<SectionErrorBoundary fallbackTitle="Failed to render responses">
								<ResponsesAccordion
									structuredRounds={structuredRounds}
									rounds={rounds}
									formQuestions={form.questions || []}
									token={token}
									onResponseUpdated={handleResponseUpdated}
								/>
							</SectionErrorBoundary>
						)}

						{activeWorkspaceTab === 'analysis' && (
							<>
								{structuredSynthesisData ? (
									<>
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
									</>
								) : (
									<div className="card p-5">
										<h2 className="text-base font-semibold text-foreground m-0">Analysis</h2>
										<p className="mt-2 text-sm" style={{ color: 'var(--muted-foreground)', marginBottom: 0 }}>
											Generate or load a structured synthesis to unlock detailed analysis views for this round.
										</p>
									</div>
								)}

								{displayRound && audienceSourceText && (
									<SectionErrorBoundary fallbackTitle="Failed to render advanced analysis">
										<div className="card p-4">
											<button
												type="button"
												onClick={() => setAdvancedAnalysisOpen(v => !v)}
												className="w-full flex items-center justify-between text-left"
												style={{ background: 'none', border: 'none', cursor: 'pointer' }}
												aria-expanded={advancedAnalysisOpen}
												aria-controls="summary-advanced-analysis"
											>
												<div>
													<h2 className="text-base font-semibold text-foreground flex items-center gap-2 m-0">
														<Globe size={18} style={{ color: 'var(--accent)' }} /> Analysis tools
													</h2>
													<p className="mt-1 text-sm" style={{ color: 'var(--muted-foreground)', marginBottom: 0 }}>
														Optional views for translation, challenge, and comparison.
													</p>
												</div>
												{advancedAnalysisOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
											</button>

											{advancedAnalysisOpen && (
												<div id="summary-advanced-analysis" className="space-y-4 mt-4">
													<div className="card p-4">
														<h3 className="text-base font-semibold mb-2 text-foreground flex items-center gap-2">
															<Globe size={18} style={{ color: 'var(--accent)' }} /> Audience Lens
														</h3>
														<AudienceTranslation
															formId={formId}
															roundId={displayRound.id}
															synthesisText={audienceSourceText}
														/>
													</div>

													<div
														className="rounded-xl px-4 py-3"
														style={{
															backgroundColor: 'var(--muted)',
															border: '1px solid var(--border)',
														}}
													>
														<div className="flex items-center justify-between gap-3 flex-wrap">
															<div>
																<div className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
																	Challenge tools
																</div>
																<p className="mt-1 text-xs" style={{ color: 'var(--muted-foreground)', marginBottom: 0 }}>
																	Test the synthesis with counterpoints and probing questions.
																</p>
															</div>
															<button
																type="button"
																onClick={toggleAiDeliberationTools}
																className="rounded-lg px-3 py-2 text-xs font-medium transition-colors"
																style={{
																	backgroundColor: aiToolsOpen ? 'color-mix(in srgb, var(--accent) 12%, var(--card))' : 'var(--card)',
																	color: aiToolsOpen ? 'var(--accent)' : 'var(--foreground)',
																	border: aiToolsOpen ? '1px solid var(--accent)' : '1px solid var(--border)',
																	cursor: 'pointer',
																}}
															>
																{aiToolsOpen ? 'Hide challenge tools' : 'Show challenge tools'}
															</button>
														</div>
													</div>

													{aiToolsOpen && (
														<div className="card p-4">
															<h3 className="text-base font-semibold text-foreground flex items-center gap-2 m-0 mb-4">
																<Sparkles size={18} style={{ color: 'var(--accent)' }} /> Challenge tools
															</h3>
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
													)}

													{structuredSynthesisData && (
														<div className="card p-4">
															<h3 className="text-base font-semibold mb-2 text-foreground flex items-center gap-2">
																<Link2 size={18} style={{ color: 'var(--accent)' }} /> {t('summary.expertCrossAnalysis')}
															</h3>
															<CrossMatrix
																structuredData={structuredSynthesisData}
																resolvedExpertLabels={resolvedExpertLabels}
																expertLabelPreset="default"
															/>
														</div>
													)}

													{structuredSynthesisData && (
														<div className="card p-4">
															<h3 className="text-base font-semibold mb-2 text-foreground flex items-center gap-2">
																<MapPin size={18} style={{ color: 'var(--accent)' }} /> {t('summary.consensusHeatmap')}
															</h3>
															<ConsensusHeatmap
																structuredData={structuredSynthesisData}
																resolvedExpertLabels={resolvedExpertLabels}
																questions={displayRound?.questions}
															/>
														</div>
													)}

													{structuredSynthesisData?.emergent_insights && structuredSynthesisData.emergent_insights.length > 0 && (
														<div className="card p-4">
															<h3 className="text-base font-semibold mb-2 text-foreground flex items-center gap-2">
																<Sparkles size={18} style={{ color: 'var(--accent)' }} /> {t('summary.emergentInsights')}
															</h3>
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
												</div>
											)}
										</div>
									</SectionErrorBoundary>
								)}
							</>
						)}

					</div>

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

					<aside
						role="complementary"
						aria-label={t('summary.synthesisControls')}
						className="space-y-3 xl:sticky xl:top-24 self-start"
					>
						<AISynthesisPanel
							synthesisMode={synthesisMode}
							onModeChange={setSynthesisMode}
							selectedModel={selectedModel}
							onModelChange={setSelectedModel}
							models={availableModels}
							estimateLabel={synthesisEstimateLabel}
							responseCount={responseCountForDisplay}
							isGenerating={isGenerating}
							onGenerate={generateSummary}
							summaryOptions={summaryComposition}
							onSummaryOptionChange={toggleSummaryCompositionOption}
						/>

						<div className="card p-3">
							<button
								type="button"
								onClick={() => setDownloadSheetOpen(true)}
								className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left transition-colors"
								style={{
									backgroundColor: 'var(--background)',
									border: '1px solid color-mix(in srgb, var(--border) 72%, transparent)',
								}}
							>
								<Download size={16} style={{ color: 'var(--accent)' }} />
								<div className="min-w-0 flex-1">
									<div className="text-sm font-semibold text-foreground">Download</div>
									<div className="mt-0.5 text-xs" style={{ color: 'var(--muted-foreground)' }}>
										Export the consultation, the summary, or the responses.
									</div>
								</div>
							</button>
						</div>

						{activeWorkspaceTab !== 'responses' && synthesisVersions.length > 0 && (
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
						)}

					</aside>
				</div>
				</div>
			</main>

			</div>
		);
	}
