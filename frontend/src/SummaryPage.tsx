import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { saveAs } from 'file-saver';
import { API_BASE_URL } from './config';
import { useDocumentTitle } from './hooks/useDocumentTitle';

import {
	RoundTimeline,
	RoundCard,
	SynthesisProgress,
	StructuredSynthesis,
	CrossMatrix,
	EmergenceHighlights,
	MarkdownRenderer,
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
	RoundHistoryCard,
	SummaryLoadingSkeleton,
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
	'google/gemini-2.0-flash',
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

	const token = useMemo(() => localStorage.getItem('access_token') || '', []);
	const authHeaders = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

	// ── Core state ──
	const [email, setEmail] = useState('');
	const [form, setForm] = useState<Form | null>(null);
	const [rounds, setRounds] = useState<Round[]>([]);
	const [activeRound, setActiveRound] = useState<Round | null>(null);
	const [loading, setLoading] = useState(false);

	// ── Responses modal ──
	const [responsesOpen, setResponsesOpen] = useState(true);
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
	const [isGeneratingVersion, setIsGeneratingVersion] = useState(false);

	// ── Next round questions ──
	const [nextRoundQuestions, setNextRoundQuestions] = useState<string[]>([]);
	const [hasSavedSynthesis, setHasSavedSynthesis] = useState(false);

	// ── Presence ──
	const { viewers } = usePresence({
		formId: formId || null,
		page: 'summary',
		userEmail: email,
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
		fetch(`${API_BASE_URL}/me`, { headers: authHeaders })
			.then(r => r.json())
			.then(d => setEmail(d.email || ''))
			.catch(() => {});
	}, [token, authHeaders]);

	useEffect(() => {
		if (!token || !formId) return;
		loadAll().then(() => loadResponses()).catch(() => {});
	}, [token, formId, authHeaders, editor]);

	async function loadAll() {
		setLoading(true);
		try {
			const formRes = await fetch(`${API_BASE_URL}/forms/${formId}`, { headers: authHeaders });
			const f = await formRes.json();
			setForm(f);

			const roundsRes = await fetch(`${API_BASE_URL}/forms/${formId}/rounds`, { headers: authHeaders });
			const list = await roundsRes.json();

			const mapped: Round[] = (Array.isArray(list) ? list : []).map((x: any) => ({
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
		} finally {
			setLoading(false);
		}
	}

	async function loadResponses() {
		try {
			const response = await fetch(
				`${API_BASE_URL}/forms/${formId}/rounds_with_responses`,
				{ headers: authHeaders }
			);
			const data = await response.json();
			if (Array.isArray(data)) {
				setStructuredRounds(
					data.map((r: any) => ({
						id: r.id,
						round_number: r.round_number,
						synthesis: r.synthesis || '',
						is_active: !!r.is_active,
						responses: (r.responses || []).map((resp: any) => ({
							id: resp.id,
							answers: typeof resp.answers === 'string' ? JSON.parse(resp.answers) : resp.answers || {},
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
			const res = await fetch(
				`${API_BASE_URL}/forms/${formId}/rounds/${roundId}/synthesis_versions`,
				{ headers: authHeaders }
			);
			if (res.ok) {
				const versions: SynthesisVersion[] = await res.json();
				setSynthesisVersions(versions);
				const active = versions.find(v => v.is_active);
				setSelectedVersionId(active?.id || (versions.length > 0 ? versions[versions.length - 1].id : null));
			} else {
				setSynthesisVersions([]);
				setSelectedVersionId(null);
			}
		} catch {
			setSynthesisVersions([]);
			setSelectedVersionId(null);
		}
	}

	// ─── Actions ─────────────────────────────────────────────────────────────

	function logout() {
		localStorage.clear();
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
			const res = await fetch(`${API_BASE_URL}/forms/${formId}/push_summary`, {
				method: 'POST',
				headers: { ...authHeaders, 'Content-Type': 'application/json' },
				body: JSON.stringify({ summary }),
			});
			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				throw new Error(err.detail || `Failed to save synthesis (HTTP ${res.status})`);
			}
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
			const res = await fetch(`${API_BASE_URL}/forms/${formId}/next_round`, {
				method: 'POST',
				headers: { ...authHeaders, 'Content-Type': 'application/json' },
				body: JSON.stringify({ questions: cleaned }),
			});
			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				throw new Error(err.detail || `Failed to advance round (HTTP ${res.status})`);
			}
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
		const raw = await fetch(
			`${API_BASE_URL}/form/${formId}/responses?all_rounds=true`,
			{ headers: authHeaders }
		).then(r => r.json());

		if (!Array.isArray(raw) || raw.length === 0) {
			toastWarning('No responses to download');
			return;
		}

		const paragraphs = raw.flatMap((r: any, i: number) => {
			const header = new Paragraph({
				children: [new TextRun({ text: `Response ${i + 1}`, bold: true })],
				spacing: { after: 200 },
			});
			const qa = Object.entries(r.answers).flatMap(([k, v]: any) => [
				new Paragraph({ children: [new TextRun({ text: k, bold: true })], spacing: { after: 80 } }),
				new Paragraph({ text: String(v ?? ''), spacing: { after: 160 } }),
			]);
			return [header, ...qa, new Paragraph('')];
		});

		const doc = new Document({ sections: [{ children: paragraphs }] });
		const blob = await Packer.toBlob(doc);
		saveAs(blob, 'responses.docx');
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

			const res = await fetch(
				`${API_BASE_URL}/forms/${formId}/rounds/${targetRound.id}/generate_synthesis`,
				{
					method: 'POST',
					headers: { ...authHeaders, 'Content-Type': 'application/json' },
					body: JSON.stringify({
						model: selectedModel,
						strategy: synthesisMode,
						n_analysts: 3,
						mode: 'human_only',
					}),
				}
			);

			setSynthesisStage('synthesising');
			setSynthesisStep(3);

			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				throw new Error(err.detail || 'Failed to generate summary');
			}

			const data = await res.json();
			setSynthesisStage('formatting');
			setSynthesisStep(4);

			const content = data.synthesis || data.summary || '';
			if (content && editor) editor.commands.setContent(content);

			setSynthesisViewMode('view');
			await loadAll();

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

	async function generateNewVersion() {
		if (!displayRound || !formId) return;
		setIsGeneratingVersion(true);
		try {
			const res = await fetch(
				`${API_BASE_URL}/forms/${formId}/rounds/${displayRound.id}/generate_synthesis`,
				{
					method: 'POST',
					headers: { ...authHeaders, 'Content-Type': 'application/json' },
					body: JSON.stringify({ model: selectedModel, strategy: synthesisMode, n_analysts: 3, mode: 'human_only' }),
				}
			);
			if (!res.ok) {
				const err = await res.json();
				throw new Error(err.detail || 'Failed to generate synthesis version');
			}
			await loadSynthesisVersions(displayRound.id);
		} catch (error) {
			toastError((error as Error).message || 'Failed to generate version');
		} finally {
			setIsGeneratingVersion(false);
		}
	}

	async function activateVersion(versionId: number) {
		try {
			const res = await fetch(`${API_BASE_URL}/synthesis_versions/${versionId}/activate`, {
				method: 'PUT',
				headers: { ...authHeaders, 'Content-Type': 'application/json' },
			});
			if (!res.ok) {
				const err = await res.json();
				throw new Error(err.detail || 'Failed to activate version');
			}
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

				{/* Main grid — stacks on mobile */}
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
					{/* ── Main Content (2/3) ── */}
					<div className="lg:col-span-2 space-y-4 sm:space-y-6">
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
								<h2 className="text-lg font-semibold mb-3 text-foreground flex items-center gap-2">
									<span>📊</span> Structured Analysis
								</h2>
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

						{/* Cross-matrix */}
						{structuredSynthesisData && (
							<div className="card p-4 sm:p-6">
								<h2 className="text-lg font-semibold mb-3 text-foreground flex items-center gap-2">
									<span>🔗</span> Expert Cross-Analysis
								</h2>
								<CrossMatrix
									structuredData={structuredSynthesisData}
									resolvedExpertLabels={resolvedExpertLabels}
									expertLabelPreset="default"
								/>
							</div>
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
						{structuredSynthesisData?.emergent_insights?.length > 0 && (
							<div className="card p-4 sm:p-6">
								<h2 className="text-lg font-semibold mb-3 text-foreground flex items-center gap-2">
									<span>✨</span> Emergent Insights
								</h2>
								<EmergenceHighlights
									insights={structuredSynthesisData.emergent_insights}
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

					{/* ── Sidebar (1/3) ── */}
					<div
						className="lg:col-span-1 space-y-4 sm:space-y-4 lg:sticky lg:top-[4.5rem] lg:self-start lg:max-h-[calc(100vh-5.5rem)] lg:overflow-y-auto"
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
							isGeneratingVersion={isGeneratingVersion}
							onGenerateNewVersion={generateNewVersion}
							resolvedExpertLabels={resolvedExpertLabels}
							formId={formId}
							token={token}
							currentUserEmail={email}
						/>

						<RoundHistoryCard
							rounds={rounds}
							selectedRoundId={selectedRound?.id || null}
							onSelectRound={handleSelectRound}
						/>
					</div>
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
