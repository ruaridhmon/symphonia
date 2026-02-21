import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams } from 'react-router-dom';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { saveAs } from 'file-saver';
import { API_BASE_URL } from './config';

// Phase 1 + 2 + 3 components
import {
	ExportPanel,
	PresenceIndicator,
	ResponseEditor,
	LoadingButton,
	MarkdownRenderer,
	RoundTimeline,
	RoundCard,
	SynthesisProgress,
	SynthesisModeSelector,
	StructuredSynthesis,
	CrossMatrix,
	EmergenceHighlights,
	Skeleton,
	SkeletonCard,
} from './components';

// Phase 4 hook (already wired)
import { usePresence } from './hooks/usePresence';

// Extended Round type to support all component props
type Round = {
	id: number;
	round_number: number;
	synthesis: string;
	synthesis_json?: any;
	is_active: boolean;
	questions: string[];
	convergence_score?: number | null;
	response_count?: number;
};

type Form = {
	id: number;
	title: string;
	questions: string[];
	allow_join: boolean;
	join_code: string;
};

export default function SummaryPage() {
	const navigate = useNavigate();
	const { id } = useParams();
	const formId = Number(id);

	const token = useMemo(() => {
		return localStorage.getItem('access_token') || '';
	}, []);
	const authHeaders = useMemo(
		() => ({ Authorization: `Bearer ${token}` }),
		[token]
	);

	const [email, setEmail] = useState('');
	const [form, setForm] = useState<Form | null>(null);
	const [rounds, setRounds] = useState<Round[]>([]);
	const [activeRound, setActiveRound] = useState<Round | null>(null);
	const [loading, setLoading] = useState(false);

	const [responsesOpen, setResponsesOpen] = useState(true);
	const [responsesHTML, setResponsesHTML] = useState('');

	// Phase 1: Selected round for RoundTimeline/RoundCard navigation
	const [selectedRound, setSelectedRound] = useState<Round | null>(null);

	// Phase 1: Synthesis progress tracking
	const [synthesisStage, setSynthesisStage] = useState('preparing');
	const [synthesisStep, setSynthesisStep] = useState(0);
	const [synthesisTotalSteps, setSynthesisTotalSteps] = useState(5);

	// Phase 2: Synthesis mode selector
	const [synthesisMode, setSynthesisMode] = useState<'simple' | 'committee' | 'ttd'>('simple');

	// Phase 3: Expert label preset for CrossMatrix
	const [expertLabelPreset] = useState('default');

	// P0: View/Edit mode toggle for synthesis
	const [synthesisViewMode, setSynthesisViewMode] = useState<'view' | 'edit'>('view');

	// Phase 5: Synthesis versioning
	type SynthesisVersionType = {
		id: number;
		round_id: number;
		version: number;
		synthesis: string | null;
		synthesis_json: any;
		model_used: string | null;
		strategy: string | null;
		created_at: string | null;
		is_active: boolean;
	};
	const [synthesisVersions, setSynthesisVersions] = useState<SynthesisVersionType[]>([]);
	const [selectedVersionId, setSelectedVersionId] = useState<number | null>(null);
	const [isGeneratingVersion, setIsGeneratingVersion] = useState(false);

	// Structured response data for ResponseEditor integration
	type StructuredResponse = {
		id: number;
		answers: Record<string, string>;
		email: string | null;
		timestamp: string;
		version: number;
		round_id: number;
	};
	type RoundWithResponses = {
		id: number;
		round_number: number;
		synthesis: string;
		is_active: boolean;
		responses: StructuredResponse[];
	};
	const [structuredRounds, setStructuredRounds] = useState<RoundWithResponses[]>([]);

	const [nextRoundQuestions, setNextRoundQuestions] = useState<string[]>([]);
	const [hasSavedSynthesis, setHasSavedSynthesis] = useState(false);

	const [selectedModel, setSelectedModel] = useState('anthropic/claude-opus-4-6');
	const [isGenerating, setIsGenerating] = useState(false);

	const models = [
		'anthropic/claude-opus-4-6',
		'anthropic/claude-sonnet-4',
		'openai/gpt-4o',
		'google/gemini-2.0-flash',
	];

	// Phase 4: Real-time presence (already wired)
	const { viewers } = usePresence({
		formId: formId || null,
		page: 'summary',
		userEmail: email,
	});

	const editor = useEditor({
		extensions: [
			StarterKit,
			Underline,
			Placeholder.configure({
				placeholder: 'Write the synthesis for this round…'
			})
		],
		content: '',
		editorProps: {
			attributes: {
				class: 'prose prose-sm max-w-none focus:outline-none'
			}
		}
	});

	// Derive structured synthesis data and expert labels from the selected/active round
	const displayRound = selectedRound || activeRound;
	const structuredSynthesisData = displayRound?.synthesis_json || null;

	// Build expert labels from synthesis_json if available
	const resolvedExpertLabels: Record<number, string> = useMemo(() => {
		if (!structuredSynthesisData) return {};
		const labels: Record<number, string> = {};
		// Extract from agreements' supporting_experts
		const allExperts = new Set<number>();
		for (const a of structuredSynthesisData.agreements || []) {
			for (const e of a.supporting_experts || []) allExperts.add(e);
		}
		for (const d of structuredSynthesisData.disagreements || []) {
			for (const p of d.positions || []) {
				for (const e of p.experts || []) allExperts.add(e);
			}
		}
		for (const id of allExperts) {
			labels[id] = `Expert ${id}`;
		}
		return labels;
	}, [structuredSynthesisData]);

	useEffect(() => {
		if (!token) return;
		fetch(`${API_BASE_URL}/me`, { headers: authHeaders })
			.then(r => r.json())
			.then(d => setEmail(d.email || ''))
			.catch(err => console.error('[SummaryPage] /me fetch error:', err));
	}, [token, authHeaders]);

	useEffect(() => {
		if (!token || !formId) return;
		loadAll()
			.then(() => loadResponses())
			.catch(err => console.error('[SummaryPage] loadAll/loadResponses error:', err));
	}, [token, formId, authHeaders, editor]);

	async function loadResponses() {
		try {
			const response = await fetch(
				`${API_BASE_URL}/forms/${formId}/rounds_with_responses`,
				{ headers: authHeaders }
			);
			const roundsWithResponses = await response.json();

			// Store structured data for ResponseEditor
			if (Array.isArray(roundsWithResponses)) {
				setStructuredRounds(
					roundsWithResponses.map((r: any) => ({
						id: r.id,
						round_number: r.round_number,
						synthesis: r.synthesis || '',
						is_active: !!r.is_active,
						responses: (r.responses || []).map((resp: any) => ({
							id: resp.id,
							answers:
								typeof resp.answers === 'string'
									? JSON.parse(resp.answers)
									: resp.answers || {},
							email: resp.email || null,
							timestamp: resp.timestamp,
							version: resp.version ?? 1,
							round_id: r.id,
						})),
					}))
				);
			}

			let html = '';
			if (!roundsWithResponses || roundsWithResponses.length === 0) {
				html = '<p style="color: var(--muted-foreground)">No responses yet for this form.</p>';
			} else {
				for (const round of roundsWithResponses) {
					html += `<div style="margin-bottom: 1.5rem; padding: 1rem; border: 1px solid var(--border); border-radius: 0.5rem; background: var(--muted)">
						<h2 style="font-size: 1.125rem; font-weight: 600; margin-bottom: 0.75rem; color: var(--foreground)">Round ${round.round_number}</h2>`;

					if (round.responses.length === 0) {
						html += '<p style="color: var(--muted-foreground)">No responses for this round.</p></div>';
						continue;
					}

					for (const response of round.responses) {
						let answers;
						try {
							answers = typeof response.answers === 'string' ? JSON.parse(response.answers) : response.answers;
						} catch { answers = response.answers; }
						
						html += `<div style="padding: 0.75rem; margin-bottom: 0.5rem; background: var(--card); border-radius: 0.375rem; border: 1px solid var(--border)">
							<div style="font-size: 0.75rem; color: var(--muted-foreground); margin-bottom: 0.5rem">${response.email}</div>`;
						
						for (const [key, value] of Object.entries(answers || {})) {
							html += `<div style="margin-bottom: 0.5rem; color: var(--foreground)"><strong>${key}:</strong> ${value}</div>`;
						}
						html += '</div>';
					}
					html += '</div>';
				}
			}
			setResponsesHTML(html);
		} catch (e) {
			console.error('[SummaryPage] loadResponses error:', e);
		}
	}

	async function loadAll() {
		setLoading(true);
		try {
			const formRes = await fetch(`${API_BASE_URL}/forms/${formId}`, {
				headers: authHeaders
			});
			const f = await formRes.json();
			setForm(f);

			const roundsRes = await fetch(`${API_BASE_URL}/forms/${formId}/rounds`, {
				headers: authHeaders
			});
			const list = await roundsRes.json();

			const mapped: Round[] = (Array.isArray(list) ? list : []).map(
				(x: any) => ({
					id: x.id,
					round_number: x.round_number,
					synthesis: x.synthesis || '',
					synthesis_json: x.synthesis_json || null,
					is_active: !!x.is_active,
					questions: Array.isArray(x.questions) ? x.questions : [],
					convergence_score: x.convergence_score ?? null,
					response_count: x.response_count ?? 0,
				})
			);
			setRounds(mapped);

			const active = mapped.find(x => x.is_active) || null;
			setActiveRound(active || null);

			// Auto-select the active round for RoundTimeline
			if (active && !selectedRound) {
				setSelectedRound(active);
				// Phase 5: Load synthesis versions for the active round
				loadSynthesisVersions(active.id);
			}

			if (active && editor) {
				editor.commands.setContent(active.synthesis || '');
				setHasSavedSynthesis(
					!!(active.synthesis && active.synthesis.trim().length > 0)
				);

				// Extract question text - questions can be strings OR objects with text/label
				const extractQuestionText = (q: unknown): string => {
					if (typeof q === 'string') return q;
					if (q && typeof q === 'object') {
						const obj = q as Record<string, unknown>;
						return String(obj.text || obj.label || obj.question || '');
					}
					return '';
				};

				if (active.questions && active.questions.length) {
					setNextRoundQuestions(active.questions.map(extractQuestionText));
				} else if (Array.isArray(f.questions)) {
					setNextRoundQuestions(f.questions.map(extractQuestionText));
				}
			} else if (f && Array.isArray(f.questions)) {
				// Extract question text - questions can be strings OR objects with text/label
				const extractQuestionText = (q: unknown): string => {
					if (typeof q === 'string') return q;
					if (q && typeof q === 'object') {
						const obj = q as Record<string, unknown>;
						return String(obj.text || obj.label || obj.question || '');
					}
					return '';
				};
				setNextRoundQuestions(f.questions.map(extractQuestionText));
			}
		} catch (err) {
			console.error('[SummaryPage] loadAll error:', err);
		} finally {
			setLoading(false);
		}
	}

	function logout() {
		localStorage.clear();
		navigate('/');
	}

	async function viewAllResponses() {
		if (responsesOpen) {
			setResponsesOpen(false);
			return;
		}

		try {
			const res = await fetch(
				`${API_BASE_URL}/forms/${formId}/rounds_with_responses`,
				{ headers: authHeaders }
			);
			const roundsWithResponses = await res.json();

			if (Array.isArray(roundsWithResponses)) {
				setStructuredRounds(
					roundsWithResponses.map((r: any) => ({
						id: r.id,
						round_number: r.round_number,
						synthesis: r.synthesis || '',
						is_active: !!r.is_active,
						responses: (r.responses || []).map((resp: any) => ({
							id: resp.id,
							answers:
								typeof resp.answers === 'string'
									? JSON.parse(resp.answers)
									: resp.answers || {},
							email: resp.email || null,
							timestamp: resp.timestamp,
							version: resp.version ?? 1,
							round_id: r.id,
						})),
					}))
				);
			}
		} catch (e) {
			console.error('[SummaryPage] Failed to load responses:', e);
		}

		setResponsesOpen(true);
	}

	async function saveSynthesis() {
		if (!activeRound || !formId) return;
		const summary = editor?.getHTML() || '';

		try {
			const res = await fetch(`${API_BASE_URL}/forms/${formId}/push_summary`, {
				method: 'POST',
				headers: { ...authHeaders, 'Content-Type': 'application/json' },
				body: JSON.stringify({ summary })
			});
			if (!res.ok) {
				const errData = await res.json().catch(() => ({}));
				throw new Error(errData.detail || `Failed to save synthesis (HTTP ${res.status})`);
			}
			setHasSavedSynthesis(true);
		} catch (err) {
			console.error('[SummaryPage] saveSynthesis error:', err);
			alert((err as Error).message || 'Failed to save synthesis');
		}
	}

	function updateNextQuestion(index: number, value: string) {
		setNextRoundQuestions(prev => {
			const copy = [...prev];
			copy[index] = value;
			return copy;
		});
	}

	function addNextQuestion() {
		setNextRoundQuestions(prev => [...prev, '']);
	}

	function removeNextQuestion(index: number) {
		setNextRoundQuestions(prev => prev.filter((_, i) => i !== index));
	}

	async function startNextRound() {
		if (!formId) return;

		const cleaned = nextRoundQuestions
			.map(q => q.trim())
			.filter(q => q.length > 0);
		if (!cleaned.length) {
			alert('Add at least one question for the next round.');
			return;
		}

		setLoading(true);
		try {
			const res = await fetch(`${API_BASE_URL}/forms/${formId}/next_round`, {
				method: 'POST',
				headers: { ...authHeaders, 'Content-Type': 'application/json' },
				body: JSON.stringify({ questions: cleaned })
			});

			if (!res.ok) {
				const errData = await res.json().catch(() => ({}));
				throw new Error(errData.detail || `Failed to advance round (HTTP ${res.status})`);
			}

			await loadAll();
			await loadResponses();
			setHasSavedSynthesis(false);
			setSelectedRound(null);
		} catch (err) {
			console.error('[SummaryPage] startNextRound error:', err);
			alert((err as Error).message || 'Failed to start next round');
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
			alert('No responses to download');
			return;
		}

		const paragraphs = raw.flatMap((r: any, i: number) => {
			const header = new Paragraph({
				children: [new TextRun({ text: `Response ${i + 1}`, bold: true })],
				spacing: { after: 200 }
			});

			const qa = Object.entries(r.answers).flatMap(([k, v]: any) => [
				new Paragraph({
					children: [new TextRun({ text: k, bold: true })],
					spacing: { after: 80 }
				}),
				new Paragraph({
					text: String(v ?? ''),
					spacing: { after: 160 }
				})
			]);

			return [header, ...qa, new Paragraph('')];
		});

		const doc = new Document({ sections: [{ children: paragraphs }] });
		const blob = await Packer.toBlob(doc);
		saveAs(blob, 'responses.docx');
	}

	async function generateSummary() {
		// Use displayRound (selectedRound or activeRound) to support generating for any round
		const targetRound = selectedRound || activeRound;
		if (!formId || !selectedModel || !targetRound) return;

		setIsGenerating(true);
		setSynthesisStage('preparing');
		setSynthesisStep(0);
		setSynthesisTotalSteps(5);

		try {
			setSynthesisStage('analyzing');
			setSynthesisStep(1);

			// Use the round-specific endpoint that supports generating synthesis for ANY round
			const res = await fetch(
				`${API_BASE_URL}/forms/${formId}/rounds/${targetRound.id}/generate_synthesis`,
				{
					method: 'POST',
					headers: { ...authHeaders, 'Content-Type': 'application/json' },
					body: JSON.stringify({
						model: selectedModel,
						strategy: synthesisMode,  // "simple" | "committee" | "ttd"
						n_analysts: 3,
						mode: 'human_only'
					})
				}
			);

			setSynthesisStage('synthesising');
			setSynthesisStep(3);

			if (!res.ok) {
				const errorData = await res.json().catch(() => ({}));
				throw new Error(errorData.detail || 'Failed to generate summary');
			}

			const data = await res.json();

			setSynthesisStage('formatting');
			setSynthesisStep(4);

			// The new endpoint returns 'synthesis', old returned 'summary'
			const synthesisContent = data.synthesis || data.summary || '';
			if (synthesisContent && editor) {
				editor.commands.setContent(synthesisContent);
			}

			// Auto-switch to View mode to show the rendered result
			setSynthesisViewMode('view');

			// Reload rounds to show the new synthesis version
			await loadAll();

			setSynthesisStage('complete');
			setSynthesisStep(5);

			setTimeout(() => {
				setSynthesisStage('preparing');
				setSynthesisStep(0);
			}, 2000);
		} catch (error) {
			console.error('[SummaryPage] generateSummary error:', error);
			alert((error as Error).message);
			setSynthesisStage('preparing');
			setSynthesisStep(0);
		} finally {
			setIsGenerating(false);
		}
	}

	// Phase 1: Handle round selection from RoundTimeline
	function handleSelectRound(round: Round) {
		setSelectedRound(round);
		// If selecting the active round, load its content into the editor
		if (round.is_active && editor) {
			editor.commands.setContent(round.synthesis || '');
		}
		// Phase 5: Load synthesis versions for the selected round
		loadSynthesisVersions(round.id);
	}

	// Phase 5: Load synthesis versions for a round
	async function loadSynthesisVersions(roundId: number) {
		try {
			const res = await fetch(
				`${API_BASE_URL}/forms/${formId}/rounds/${roundId}/synthesis_versions`,
				{ headers: authHeaders }
			);
			if (res.ok) {
				const versions: SynthesisVersionType[] = await res.json();
				setSynthesisVersions(versions);
				// Auto-select the active version, or the latest one
				const active = versions.find(v => v.is_active);
				setSelectedVersionId(active?.id || (versions.length > 0 ? versions[versions.length - 1].id : null));
			} else {
				setSynthesisVersions([]);
				setSelectedVersionId(null);
			}
		} catch (e) {
			console.error('[SummaryPage] loadSynthesisVersions error:', e);
			setSynthesisVersions([]);
			setSelectedVersionId(null);
		}
	}

	// Phase 5: Generate a new synthesis version for the currently displayed round
	async function generateNewVersion() {
		const targetRound = displayRound;
		if (!targetRound || !formId) return;

		setIsGeneratingVersion(true);
		try {
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

			if (!res.ok) {
				const err = await res.json();
				throw new Error(err.detail || 'Failed to generate synthesis version');
			}

			// Reload versions
			await loadSynthesisVersions(targetRound.id);
		} catch (error) {
			console.error('[SummaryPage] generateNewVersion error:', error);
			alert((error as Error).message);
		} finally {
			setIsGeneratingVersion(false);
		}
	}

	// Phase 5: Activate a specific synthesis version
	async function activateVersion(versionId: number) {
		try {
			const res = await fetch(
				`${API_BASE_URL}/synthesis_versions/${versionId}/activate`,
				{
					method: 'PUT',
					headers: { ...authHeaders, 'Content-Type': 'application/json' },
				}
			);

			if (!res.ok) {
				const err = await res.json();
				throw new Error(err.detail || 'Failed to activate version');
			}

			// Reload versions and rounds
			const targetRound = displayRound;
			if (targetRound) {
				await loadSynthesisVersions(targetRound.id);
			}
			await loadAll();
		} catch (error) {
			console.error('[SummaryPage] activateVersion error:', error);
			alert((error as Error).message);
		}
	}

	// Phase 5: Get the currently selected version object
	const selectedVersion = useMemo(
		() => synthesisVersions.find(v => v.id === selectedVersionId) || null,
		[synthesisVersions, selectedVersionId]
	);

	if (!form) {
		return (
			<div className="min-h-screen bg-background text-foreground font-sans flex flex-col">
				<header className="bg-card border-b border-border shadow-card">
					<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
						<div className="flex items-center gap-4">
							<div>
								<Skeleton variant="text" width="12rem" height="1.5rem" />
								<Skeleton variant="text" width="10rem" height="1rem" style={{ marginTop: '0.25rem' }} />
							</div>
						</div>
						<Skeleton variant="button" width="5rem" height="2rem" />
					</div>
				</header>

				<main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
					<Skeleton variant="text" width="10rem" style={{ marginBottom: '1.5rem' }} />

					{/* Round timeline skeleton */}
					<div className="mb-6 flex gap-4">
						<Skeleton variant="avatar" width="3rem" height="3rem" />
						<Skeleton variant="avatar" width="3rem" height="3rem" />
						<Skeleton variant="avatar" width="3rem" height="3rem" />
					</div>

					<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
						{/* Main content skeleton */}
						<div className="lg:col-span-2 space-y-6">
							<SkeletonCard />
							<SkeletonCard />
						</div>

						{/* Sidebar skeleton */}
						<div className="lg:col-span-1 space-y-6">
							<SkeletonCard />
							<SkeletonCard />
							<SkeletonCard />
						</div>
					</div>
				</main>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-background text-foreground font-sans flex flex-col">
			<header className="bg-card border-b border-border shadow-card">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
					<div className="flex items-center gap-4">
						<div>
							<h1 className="text-xl font-bold tracking-tight text-foreground">Admin Workspace</h1>
							<p className="text-sm text-muted-foreground mt-0.5">
								Logged in as <strong className="text-foreground">{email}</strong>
							</p>
						</div>
						{/* Phase 4: PresenceIndicator (already wired) */}
						<PresenceIndicator viewers={viewers} currentUserEmail={email} />
					</div>
					<button onClick={logout} className="text-sm text-destructive underline">
						Log out
					</button>
				</div>
			</header>

			<main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
				<div className="mb-4">
					<button
						onClick={() => navigate('/')}
						className="text-sm text-accent underline"
					>
						← Back to Dashboard
					</button>
				</div>

				{/* Phase 1: RoundTimeline — horizontal round navigation */}
				{rounds.length > 0 && (
					<div className="mb-6">
						<RoundTimeline
							rounds={rounds}
							activeRoundId={activeRound?.id || null}
							selectedRoundId={selectedRound?.id || null}
							onSelectRound={handleSelectRound}
						/>
					</div>
				)}

				{/* Phase 1: SynthesisProgress — shown during AI generation */}
				<SynthesisProgress
					stage={synthesisStage}
					step={synthesisStep}
					totalSteps={synthesisTotalSteps}
					visible={isGenerating}
				/>

				<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
					{/* Main Content */}
					<div className="lg:col-span-2 space-y-6">
						{/* Phase 1: RoundCard — show details for the selected round (non-active) */}
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

						{/* Synthesis with View/Edit toggle */}
						{(!selectedRound || selectedRound.is_active) && (
							<div className="card p-6 min-h-[200px] lg:min-h-[300px]">
								<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
									<h2 className="text-lg font-semibold text-foreground" style={{ margin: 0 }}>
										Synthesis for Round {activeRound?.round_number || ''}
									</h2>
									<div style={{
										display: 'inline-flex',
										borderRadius: '0.5rem',
										overflow: 'hidden',
										border: '1px solid var(--border)',
										fontSize: '0.8125rem',
									}}>
										<button
											onClick={() => setSynthesisViewMode('view')}
											style={{
												padding: '0.375rem 0.75rem',
												cursor: 'pointer',
												border: 'none',
												fontWeight: synthesisViewMode === 'view' ? 600 : 400,
												backgroundColor: synthesisViewMode === 'view' ? 'var(--accent)' : 'var(--card)',
												color: synthesisViewMode === 'view' ? 'white' : 'var(--muted-foreground)',
												transition: 'all 0.15s ease',
											}}
										>
											View
										</button>
										<button
											onClick={() => setSynthesisViewMode('edit')}
											style={{
												padding: '0.375rem 0.75rem',
												cursor: 'pointer',
												border: 'none',
												borderLeft: '1px solid var(--border)',
												fontWeight: synthesisViewMode === 'edit' ? 600 : 400,
												backgroundColor: synthesisViewMode === 'edit' ? 'var(--accent)' : 'var(--card)',
												color: synthesisViewMode === 'edit' ? 'white' : 'var(--muted-foreground)',
												transition: 'all 0.15s ease',
											}}
										>
											Edit
										</button>
									</div>
								</div>
								{synthesisViewMode === 'edit' ? (
									<div className="prose max-w-none">
										<EditorContent editor={editor} />
									</div>
								) : (
									<div>
										{activeRound?.synthesis ? (
											<MarkdownRenderer content={activeRound.synthesis} />
										) : (
											<p style={{ color: 'var(--muted-foreground)', fontStyle: 'italic' }}>
												No synthesis yet. Generate one using the AI panel, or switch to Edit mode to write manually.
											</p>
										)}
									</div>
								)}
							</div>
						)}

						{/* Read-only synthesis view for non-active selected rounds */}
						{selectedRound && !selectedRound.is_active && selectedRound.synthesis && (
							<div className="card p-6">
								<h2 className="text-lg font-semibold mb-3 text-foreground">
									Synthesis (Round {selectedRound.round_number})
								</h2>
								<MarkdownRenderer content={selectedRound.synthesis} />
							</div>
						)}

						{/* Phase 2: StructuredSynthesis — render structured synthesis data when available */}
						{structuredSynthesisData && (
							<div className="card p-6">
								<h2 className="text-lg font-semibold mb-3 text-foreground">Structured Analysis</h2>
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

						{/* Phase 3: CrossMatrix — dimensional visualization */}
						{structuredSynthesisData && (
							<div className="card p-6">
								<h2 className="text-lg font-semibold mb-3 text-foreground">Expert Cross-Analysis</h2>
								<CrossMatrix
									structuredData={structuredSynthesisData}
									resolvedExpertLabels={resolvedExpertLabels}
									expertLabelPreset={expertLabelPreset}
								/>
							</div>
						)}

						{/* Phase 5: Show selected version synthesis (when viewing a specific version) */}
						{selectedVersion && selectedVersion.synthesis && (
							<div className="card p-6">
								<div className="flex items-center justify-between mb-3">
									<h2 className="text-lg font-semibold text-foreground">
										Synthesis v{selectedVersion.version}
										{selectedVersion.is_active && (
											<span className="ml-2 text-xs font-normal px-2 py-0.5 rounded-full bg-success/10 text-success">
												active
											</span>
										)}
									</h2>
									<span className="text-xs text-muted-foreground">
										{selectedVersion.model_used || ''} · {selectedVersion.strategy || ''}
										{selectedVersion.created_at &&
											` · ${new Date(selectedVersion.created_at).toLocaleString()}`}
									</span>
								</div>
								<MarkdownRenderer content={selectedVersion.synthesis} />
							</div>
						)}

						{/* Phase 5: Show structured data from selected version if available */}
						{selectedVersion?.synthesis_json && (
							<div className="card p-6">
								<h2 className="text-lg font-semibold mb-3 text-foreground">
									Structured Analysis (v{selectedVersion.version})
								</h2>
								<StructuredSynthesis
									data={selectedVersion.synthesis_json}
									convergenceScore={displayRound?.convergence_score ?? undefined}
									expertLabels={resolvedExpertLabels}
									formId={formId}
									roundId={displayRound?.id}
									token={token}
									currentUserEmail={email}
								/>
							</div>
						)}

						{/* Phase 3: EmergenceHighlights — emergent insights */}
						{structuredSynthesisData?.emergent_insights && structuredSynthesisData.emergent_insights.length > 0 && (
							<div className="card p-6">
								<h2 className="text-lg font-semibold mb-3 text-foreground">Emergent Insights</h2>
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

						<div className="card p-6">
							<h2 className="text-lg font-semibold text-foreground">Next Round Questions</h2>
							<div className="space-y-3 mt-3">
								{nextRoundQuestions.map((q, index) => (
									<div key={index} className="flex gap-2 items-center">
										<input
											type="text"
											className="flex-1 rounded-lg px-3 py-2 text-sm"
											value={q}
											onChange={e => updateNextQuestion(index, e.target.value)}
											placeholder={`Question ${index + 1}`}
										/>
										{/* Phase 1: LoadingButton replaces plain Remove button */}
										<LoadingButton
											variant="destructive"
											size="sm"
											onClick={() => removeNextQuestion(index)}
										>
											Remove
										</LoadingButton>
									</div>
								))}
							</div>
							{/* Phase 1: LoadingButton replaces plain Add Question button */}
							<LoadingButton
								variant="secondary"
								size="sm"
								onClick={addNextQuestion}
								className="mt-4"
							>
								Add Question
							</LoadingButton>
						</div>
					</div>

					{/* Sidebar */}
					<div className="lg:col-span-1 space-y-6">
						<div className="card p-4">
							<h3 className="text-base font-semibold mb-2 text-foreground">Form Info</h3>
							<div className="text-sm space-y-1">
								<div className="text-foreground">
									<strong>Form:</strong> {form.title}
								</div>
								<div className="text-muted-foreground">
									<strong className="text-foreground">Active round:</strong>{' '}
									{activeRound ? `Round ${activeRound.round_number}` : 'None'}
								</div>
							</div>
						</div>

						<div className="card p-4">
							<h3 className="text-base font-semibold mb-3 text-foreground">Actions</h3>
							<div className="flex flex-col space-y-2">
								{/* Phase 1: LoadingButton replaces plain action buttons */}
								<LoadingButton
									variant="accent"
									size="md"
									onClick={viewAllResponses}
									className="w-full text-left justify-start"
								>
									{responsesOpen ? 'Hide Responses' : 'View All Responses'}
								</LoadingButton>
								<LoadingButton
									variant="secondary"
									size="md"
									onClick={downloadResponses}
									className="w-full text-left justify-start"
								>
									Download Responses
								</LoadingButton>
								<LoadingButton
									variant="success"
									size="md"
									onClick={saveSynthesis}
									className="w-full text-left justify-start"
								>
									Save Synthesis
								</LoadingButton>
								<ExportPanel
									formTitle={form?.title || 'Untitled Form'}
									rounds={rounds}
									structuredSynthesisData={structuredSynthesisData}
									expertLabels={resolvedExpertLabels}
								/>
								<div className="pt-2">
									{/* Phase 1: LoadingButton with loading state for Start Next Round */}
									<LoadingButton
										variant="accent"
										size="md"
										onClick={startNextRound}
										loading={loading}
										loadingText="Starting…"
										className="w-full font-semibold"
										style={{ backgroundColor: 'var(--accent-hover)' }}
									>
										Start Next Round
									</LoadingButton>
								</div>
							</div>
						</div>

						<div className="card p-4">
							<h3 className="text-base font-semibold mb-3 text-foreground">AI-Powered Synthesis</h3>
							<div className="space-y-3">
								{/* Phase 2: SynthesisModeSelector — choose synthesis mode */}
								<SynthesisModeSelector
									mode={synthesisMode}
									onModeChange={setSynthesisMode}
								/>

								<div>
									<label htmlFor="model-select" className="block text-sm font-medium text-muted-foreground mb-1.5">
										Choose a model
									</label>
									<select
										id="model-select"
										className="w-full rounded-lg px-3 py-2 text-sm"
										value={selectedModel}
										onChange={e => setSelectedModel(e.target.value)}
									>
										{models.map(model => (
											<option key={model} value={model}>
												{model}
											</option>
										))}
									</select>
								</div>
								{/* Phase 1: LoadingButton replaces plain Generate Summary button */}
								<LoadingButton
									variant="purple"
									size="md"
									loading={isGenerating}
									loadingText="Generating…"
									onClick={generateSummary}
									className="w-full font-semibold"
								>
									Generate Summary
								</LoadingButton>
							</div>
						</div>

						{/* Phase 5: Synthesis Versioning */}
						{displayRound && (
							<div className="card p-4">
								<h3 className="text-base font-semibold mb-3 text-foreground">
									Synthesis Versions
									<span className="text-xs font-normal text-muted-foreground ml-2">
										Round {displayRound.round_number}
									</span>
								</h3>

								{synthesisVersions.length === 0 ? (
									<p className="text-sm text-muted-foreground mb-3">
										No versions yet. Generate one below.
									</p>
								) : (
									<div className="space-y-2 mb-3">
										<label htmlFor="version-select" className="block text-sm font-medium text-muted-foreground mb-1">
											Select version
										</label>
										<select
											id="version-select"
											className="w-full rounded-lg px-3 py-2 text-sm"
											value={selectedVersionId ?? ''}
											onChange={e => {
												const vid = Number(e.target.value);
												setSelectedVersionId(vid);
											}}
										>
											{synthesisVersions.map(v => (
												<option key={v.id} value={v.id}>
													v{v.version}
													{v.is_active ? ' ★ active' : ''}
													{v.strategy ? ` (${v.strategy})` : ''}
													{v.created_at
														? ` — ${new Date(v.created_at).toLocaleString(undefined, {
																month: 'short',
																day: 'numeric',
																hour: '2-digit',
																minute: '2-digit',
														  })}`
														: ''}
												</option>
											))}
										</select>

										{/* Version details */}
										{selectedVersion && (
											<div className="text-xs text-muted-foreground space-y-1 mt-2 p-2 rounded-lg" style={{ background: 'var(--muted)' }}>
												<div>
													<strong>Model:</strong> {selectedVersion.model_used || 'N/A'}
												</div>
												<div>
													<strong>Strategy:</strong> {selectedVersion.strategy || 'N/A'}
												</div>
												<div>
													<strong>Status:</strong>{' '}
													{selectedVersion.is_active ? (
														<span className="text-success font-semibold">Active (published)</span>
													) : (
														<span>Draft</span>
													)}
												</div>
											</div>
										)}

										{/* Activate button — only if not already active */}
										{selectedVersion && !selectedVersion.is_active && (
											<LoadingButton
												variant="success"
												size="sm"
												onClick={() => activateVersion(selectedVersion.id)}
												className="w-full mt-1"
											>
												Publish v{selectedVersion.version}
											</LoadingButton>
										)}
									</div>
								)}

								{/* Generate new version */}
								<LoadingButton
									variant="accent"
									size="sm"
									loading={isGeneratingVersion}
									loadingText="Generating…"
									onClick={generateNewVersion}
									className="w-full"
								>
									Generate New Version
								</LoadingButton>
							</div>
						)}

						{/* Phase 1: RoundTimeline replaces the old Round History list in sidebar */}
						{rounds.length > 0 && (
							<div className="card p-4">
								<h3 className="text-base font-semibold mb-2 text-foreground">Round History</h3>
								<ul className="text-sm space-y-1">
									{rounds.map(r => (
										<li
											key={r.id}
											className={`flex justify-between items-center border-b border-border last:border-b-0 py-1.5 cursor-pointer hover:bg-muted/50 rounded px-1 ${
												selectedRound?.id === r.id ? 'bg-accent/10' : ''
											}`}
											onClick={() => handleSelectRound(r)}
										>
											<span className="text-foreground">
												Round {r.round_number}{' '}
												{r.is_active && (
													<span className="text-success font-semibold">
														(active)
													</span>
												)}
											</span>
											<span
												className={`text-xs px-2 py-0.5 rounded-full ${
													r.synthesis
														? 'bg-success/10 text-success'
														: 'bg-muted text-muted-foreground'
												}`}
											>
												{r.synthesis ? 'Synthesis' : 'No Synthesis'}
											</span>
										</li>
									))}
								</ul>
							</div>
						)}
					</div>
				</div>
			</main>

			{responsesOpen &&
				createPortal(
					<div className="fixed inset-0 z-50 flex items-center justify-center p-4"
						style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
					>
						<div className="card max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 text-left"
							style={{ boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}
						>
							<h3 className="text-xl font-semibold mb-4 text-foreground">All Responses</h3>

							{structuredRounds.length === 0 ? (
								<p style={{ color: 'var(--muted-foreground)' }}>
									No responses yet for this form.
								</p>
							) : (
								structuredRounds.map(round => {
									const roundQuestions =
										rounds.find(r => r.id === round.id)?.questions ||
										form?.questions ||
										[];
									return (
										<div
											key={round.id}
											className="mb-6 p-4 rounded-lg"
											style={{
												backgroundColor: 'var(--muted)',
												border: '1px solid var(--border)',
											}}
										>
											<h4 className="text-lg font-semibold mb-3 text-foreground">
												Round {round.round_number}
											</h4>
											{round.responses.length === 0 ? (
												<p style={{ color: 'var(--muted-foreground)' }}>
													No responses for this round.
												</p>
											) : (
												<div className="space-y-3">
													{round.responses.map(resp => (
														<ResponseEditor
															key={resp.id}
															response={resp}
															questions={roundQuestions}
															token={token}
															onUpdated={updated => {
																setStructuredRounds(prev =>
																	prev.map(r =>
																		r.id === round.id
																			? {
																					...r,
																					responses: r.responses.map(
																						rr =>
																							rr.id === updated.id
																								? {
																										...rr,
																										answers: updated.answers,
																										version: updated.version,
																								  }
																								: rr
																					),
																			  }
																			: r
																	)
																);
															}}
														/>
													))}
												</div>
											)}
										</div>
									);
								})
							)}

							{/* Phase 1: LoadingButton replaces plain Close button */}
							<LoadingButton
								variant="accent"
								size="md"
								onClick={() => setResponsesOpen(false)}
								className="mt-6"
							>
								Close
							</LoadingButton>
						</div>
					</div>,
					document.body
				)}

		</div>
	);
}
