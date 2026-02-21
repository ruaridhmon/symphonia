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
	console.log('[SummaryPage] Component render started');
	const navigate = useNavigate();
	const { id } = useParams();
	const formId = Number(id);
	console.log('[SummaryPage] formId:', formId, 'raw id param:', id);

	const token = useMemo(() => {
		const t = localStorage.getItem('access_token') || '';
		console.log('[SummaryPage] Token from localStorage:', t ? `${t.slice(0, 20)}...` : 'EMPTY');
		return t;
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
		console.log('[SummaryPage] useEffect[/me] triggered - token:', !!token);
		if (!token) {
			console.log('[SummaryPage] useEffect[/me] skipped - no token');
			return;
		}
		console.log('[SummaryPage] Fetching /me...');
		fetch(`${API_BASE_URL}/me`, { headers: authHeaders })
			.then(r => {
				console.log('[SummaryPage] /me response status:', r.status);
				return r.json();
			})
			.then(d => {
				console.log('[SummaryPage] /me data:', d);
				setEmail(d.email || '');
			})
			.catch(err => console.error('[SummaryPage] /me fetch error:', err));
	}, [token, authHeaders]);

	useEffect(() => {
		console.log('[SummaryPage] useEffect[loadAll] triggered - token:', !!token, 'formId:', formId, 'editor:', !!editor);
		if (!token || !formId) {
			console.log('[SummaryPage] useEffect[loadAll] skipped - missing token or formId');
			return;
		}
		console.log('[SummaryPage] Calling loadAll()...');
		loadAll()
			.then(() => {
				console.log('[SummaryPage] loadAll() completed, now calling loadResponses()...');
				return loadResponses();
			})
			.then(() => {
				console.log('[SummaryPage] loadResponses() completed');
			})
			.catch(err => console.error('[SummaryPage] loadAll/loadResponses chain error:', err));
	}, [token, formId, authHeaders, editor]);

	async function loadResponses() {
		console.log('[SummaryPage] loadResponses() started');
		try {
			console.log('[SummaryPage] Fetching rounds_with_responses...');
			const response = await fetch(
				`${API_BASE_URL}/forms/${formId}/rounds_with_responses`,
				{ headers: authHeaders }
			);
			console.log('[SummaryPage] rounds_with_responses status:', response.status);
			const roundsWithResponses = await response.json();
			console.log('[SummaryPage] rounds_with_responses data:', roundsWithResponses);

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
			console.error('[SummaryPage] loadResponses() error:', e);
		}
		console.log('[SummaryPage] loadResponses() finished');
	}

	async function loadAll() {
		console.log('[SummaryPage] loadAll() started');
		setLoading(true);
		try {
			console.log('[SummaryPage] Fetching form data...');
			const formRes = await fetch(`${API_BASE_URL}/forms/${formId}`, {
				headers: authHeaders
			});
			console.log('[SummaryPage] form response status:', formRes.status);
			const f = await formRes.json();
			console.log('[SummaryPage] form data:', f);
			setForm(f);

			console.log('[SummaryPage] Fetching rounds...');
			const roundsRes = await fetch(`${API_BASE_URL}/forms/${formId}/rounds`, {
				headers: authHeaders
			});
			console.log('[SummaryPage] rounds response status:', roundsRes.status);
			const list = await roundsRes.json();
			console.log('[SummaryPage] rounds data:', list);

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
			console.log('[SummaryPage] mapped rounds:', mapped);
			setRounds(mapped);

			const active = mapped.find(x => x.is_active) || null;
			console.log('[SummaryPage] active round:', active);
			setActiveRound(active || null);

			// Auto-select the active round for RoundTimeline
			if (active && !selectedRound) {
				setSelectedRound(active);
			}

			if (active && editor) {
				console.log('[SummaryPage] Setting editor content from active round synthesis');
				editor.commands.setContent(active.synthesis || '');
				setHasSavedSynthesis(
					!!(active.synthesis && active.synthesis.trim().length > 0)
				);

				if (active.questions && active.questions.length) {
					console.log('[SummaryPage] Setting nextRoundQuestions from active.questions');
					setNextRoundQuestions(active.questions);
				} else if (Array.isArray(f.questions)) {
					console.log('[SummaryPage] Setting nextRoundQuestions from form.questions');
					setNextRoundQuestions(f.questions);
				}
			} else if (f && Array.isArray(f.questions)) {
				console.log('[SummaryPage] No active round, setting nextRoundQuestions from form.questions');
				setNextRoundQuestions(f.questions);
			}
			console.log('[SummaryPage] loadAll() try block completed successfully');
		} catch (err) {
			console.error('[SummaryPage] loadAll() error:', err);
		} finally {
			console.log('[SummaryPage] loadAll() finally - setting loading=false');
			setLoading(false);
		}
	}

	function logout() {
		console.log('[SummaryPage] logout() called');
		localStorage.clear();
		navigate('/');
	}

	async function viewAllResponses() {
		console.log('[SummaryPage] viewAllResponses() called, responsesOpen:', responsesOpen);
		if (responsesOpen) {
			setResponsesOpen(false);
			return;
		}

		// Reload structured data for modal
		console.log('[SummaryPage] Fetching rounds_with_responses for modal...');
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
			console.error('[SummaryPage] viewAllResponses fetch error:', e);
		}

		setResponsesOpen(true);
	}

	async function saveSynthesis() {
		console.log('[SummaryPage] saveSynthesis() called');
		if (!activeRound || !formId) {
			console.log('[SummaryPage] saveSynthesis() skipped - no activeRound or formId');
			return;
		}
		const summary = editor?.getHTML() || '';
		console.log('[SummaryPage] Saving synthesis, length:', summary.length);

		try {
			const res = await fetch(`${API_BASE_URL}/forms/${formId}/push_summary`, {
				method: 'POST',
				headers: { ...authHeaders, 'Content-Type': 'application/json' },
				body: JSON.stringify({ summary })
			});
			console.log('[SummaryPage] push_summary response status:', res.status);
			setHasSavedSynthesis(true);
		} catch (err) {
			console.error('[SummaryPage] saveSynthesis() error:', err);
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
		console.log('[SummaryPage] startNextRound() called');
		if (!formId) {
			console.log('[SummaryPage] startNextRound() skipped - no formId');
			return;
		}

		const cleaned = nextRoundQuestions
			.map(q => q.trim())
			.filter(q => q.length > 0);
		console.log('[SummaryPage] cleaned questions:', cleaned);
		if (!cleaned.length) {
			alert('Add at least one question for the next round.');
			return;
		}

		try {
			console.log('[SummaryPage] Posting to next_round...');
			const res = await fetch(`${API_BASE_URL}/forms/${formId}/next_round`, {
				method: 'POST',
				headers: { ...authHeaders, 'Content-Type': 'application/json' },
				body: JSON.stringify({ questions: cleaned })
			});
			console.log('[SummaryPage] next_round response status:', res.status);

			console.log('[SummaryPage] Reloading all data...');
			await loadAll();
			setHasSavedSynthesis(false);
			console.log('[SummaryPage] startNextRound() completed');
		} catch (err) {
			console.error('[SummaryPage] startNextRound() error:', err);
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
		console.log('[SummaryPage] generateSummary() called, formId:', formId, 'model:', selectedModel, 'mode:', synthesisMode);
		if (!formId || !selectedModel) {
			console.log('[SummaryPage] generateSummary() skipped - missing formId or model');
			return;
		}

		setIsGenerating(true);
		// Phase 1: Show synthesis progress
		setSynthesisStage('preparing');
		setSynthesisStep(0);
		setSynthesisTotalSteps(5);

		try {
			// Simulate progress stages
			setSynthesisStage('analyzing');
			setSynthesisStep(1);

			console.log('[SummaryPage] Posting to generate_summary...');
			const res = await fetch(
				`${API_BASE_URL}/forms/${formId}/generate_summary`,
				{
					method: 'POST',
					headers: { ...authHeaders, 'Content-Type': 'application/json' },
					body: JSON.stringify({ model: selectedModel, mode: synthesisMode })
				}
			);
			console.log('[SummaryPage] generate_summary response status:', res.status);

			setSynthesisStage('synthesising');
			setSynthesisStep(3);

			if (!res.ok) {
				const errorData = await res.json();
				console.error('[SummaryPage] generate_summary error response:', errorData);
				throw new Error(errorData.detail || 'Failed to generate summary');
			}

			const data = await res.json();
			console.log('[SummaryPage] generate_summary data:', data);

			setSynthesisStage('formatting');
			setSynthesisStep(4);

			if (data.summary && editor) {
				console.log('[SummaryPage] Setting editor content from generated summary');
				editor.commands.setContent(data.summary);
			}

			setSynthesisStage('complete');
			setSynthesisStep(5);

			// Auto-hide progress after 2s
			setTimeout(() => {
				setSynthesisStage('preparing');
				setSynthesisStep(0);
			}, 2000);
		} catch (error) {
			console.error('[SummaryPage] generateSummary() error:', error);
			alert((error as Error).message);
			setSynthesisStage('preparing');
			setSynthesisStep(0);
		} finally {
			console.log('[SummaryPage] generateSummary() finally - setting isGenerating=false');
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
	}

	if (!form) {
		console.log('[SummaryPage] Rendering loading state (form is null)');
		return (
			<div className="min-h-screen bg-background flex items-center justify-center">
				<p className="text-muted-foreground text-lg">Loading…</p>
			</div>
		);
	}

	console.log('[SummaryPage] Rendering main content, form:', form.title, 'activeRound:', activeRound?.round_number);
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

						{/* Synthesis editor (for the active round) */}
						{(!selectedRound || selectedRound.is_active) && (
							<div className="card p-6 min-h-[200px] lg:min-h-[300px]">
								<h2 className="text-lg font-semibold mb-3 text-foreground">
									Synthesis for Round {activeRound?.round_number || ''}
								</h2>
								<div className="prose max-w-none">
									<EditorContent editor={editor} />
								</div>
							</div>
						)}

						{/* Phase 1: MarkdownRenderer — read-only synthesis view for non-active selected rounds */}
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

			<footer className="bg-card border-t border-border text-center py-4 text-sm text-muted-foreground mt-8">
				© {new Date().getFullYear()} – Summary workspace
			</footer>
		</div>
	);
}
