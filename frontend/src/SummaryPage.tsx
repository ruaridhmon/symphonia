import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams } from 'react-router-dom';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { saveAs } from 'file-saver';
import { API_BASE_URL } from './config';
import {
	LoadingButton,
	SynthesisDisplay,
	SynthesisProgress,
	RoundTimeline,
	RoundCard,
	StructuredSynthesis,
	CrossMatrix,
	EmergenceHighlights,
	SynthesisModeSelector,
} from './components';
import type { Round } from './components';

// ─── Types ──────────────────────────────────────────────

type StructuredSynthesisData = {
	agreements: any[];
	disagreements: any[];
	nuances: any[];
	confidence_map: Record<string, number>;
	follow_up_probes: any[];
	meta_synthesis_reasoning: string;
	narrative?: string;
	areas_of_agreement?: string[];
	areas_of_disagreement?: string[];
	uncertainties?: string[];
	emergent_insights?: any[];
};

type Form = {
	id: number;
	title: string;
	questions: string[];
	allow_join: boolean;
	join_code: string;
};

type SynthesisMode = 'simple' | 'committee' | 'ttd';

// ─── Component ──────────────────────────────────────────

export default function SummaryPage() {
	const navigate = useNavigate();
	const { id } = useParams();
	const formId = Number(id);

	const token = useMemo(() => localStorage.getItem('access_token') || '', []);
	const authHeaders = useMemo(
		() => ({ Authorization: `Bearer ${token}` }),
		[token]
	);

	const [email, setEmail] = useState('');
	const [form, setForm] = useState<Form | null>(null);
	const [rounds, setRounds] = useState<Round[]>([]);
	const [activeRound, setActiveRound] = useState<Round | null>(null);
	const [loading, setLoading] = useState(false);

	const [responsesOpen, setResponsesOpen] = useState(false);
	const [responsesHTML, setResponsesHTML] = useState('');

	const [nextRoundQuestions, setNextRoundQuestions] = useState<string[]>([]);
	const [hasSavedSynthesis, setHasSavedSynthesis] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [isStartingRound, setIsStartingRound] = useState(false);
	const [isDownloading, setIsDownloading] = useState(false);

	// Synthesis controls
	const [selectedModel, setSelectedModel] = useState('anthropic/claude-sonnet-4');
	const [synthesisMode, setSynthesisMode] = useState<SynthesisMode>('simple');
	const [isGenerating, setIsGenerating] = useState(false);
	const [structuredData, setStructuredData] = useState<StructuredSynthesisData | null>(null);
	const [convergenceScore, setConvergenceScore] = useState<number | undefined>();

	// Progress tracking
	const [progressVisible, setProgressVisible] = useState(false);
	const [progressStage, setProgressStage] = useState('');
	const [progressStep, setProgressStep] = useState(0);
	const [progressTotal, setProgressTotal] = useState(0);

	// View mode for the selected round
	const [viewingRound, setViewingRound] = useState<Round | null>(null);

	// Expert labels
	type ExpertLabelPreset = 'default' | 'temporal' | 'methodological' | 'stakeholder' | 'custom';
	const [expertLabelPreset, setExpertLabelPreset] = useState<ExpertLabelPreset>('default');
	const [customExpertLabels, setCustomExpertLabels] = useState<Record<number, string>>({});
	const [expertLabelsOpen, setExpertLabelsOpen] = useState(false);
	const expertLabelsSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const [expertLabelsLoaded, setExpertLabelsLoaded] = useState(false);

	const temporalPresets: Record<number, string> = {
		1: 'Urðr (Past)',
		2: 'Verðandi (Present)',
		3: 'Skuld (Future)',
	};

	const methodologicalPresets: Record<number, string> = {
		1: 'Quantitative',
		2: 'Qualitative',
		3: 'Mixed Methods',
	};

	const stakeholderPresets: Record<number, string> = {
		1: 'Industry',
		2: 'Academia',
		3: 'Policy',
	};

	const dimensionClassMap: Record<string, Record<number, string>> = {
		temporal: { 1: 'dimension-past', 2: 'dimension-present', 3: 'dimension-future' },
		methodological: { 1: 'dimension-quantitative', 2: 'dimension-qualitative', 3: 'dimension-mixed' },
		stakeholder: { 1: 'dimension-industry', 2: 'dimension-academia', 3: 'dimension-policy' },
	};

	const expertCount = activeRound?.response_count || 3;

	const resolvedExpertLabels: Record<number, string> = useMemo(() => {
		const presetMap: Record<string, Record<number, string>> = {
			temporal: temporalPresets,
			methodological: methodologicalPresets,
			stakeholder: stakeholderPresets,
		};
		const selected = presetMap[expertLabelPreset];
		if (selected) {
			const labels: Record<number, string> = {};
			for (let i = 1; i <= expertCount; i++) {
				labels[i] = selected[i] || `Expert ${i}`;
			}
			return labels;
		}
		if (expertLabelPreset === 'custom') {
			return customExpertLabels;
		}
		return {};
	}, [expertLabelPreset, customExpertLabels, expertCount]);

	// ─── Expert labels persistence ────────────────────────

	const saveExpertLabels = useCallback(
		(preset: ExpertLabelPreset, labels: Record<number, string>) => {
			if (!formId || !token) return;
			fetch(`${API_BASE_URL}/forms/${formId}/expert_labels`, {
				method: 'PUT',
				headers: { ...authHeaders, 'Content-Type': 'application/json' },
				body: JSON.stringify({ preset, custom_labels: labels }),
			}).catch((err) => console.error('Failed to save expert labels:', err));
		},
		[formId, token, authHeaders]
	);

	const debouncedSaveExpertLabels = useCallback(
		(preset: ExpertLabelPreset, labels: Record<number, string>) => {
			if (expertLabelsSaveTimer.current) clearTimeout(expertLabelsSaveTimer.current);
			expertLabelsSaveTimer.current = setTimeout(() => saveExpertLabels(preset, labels), 600);
		},
		[saveExpertLabels]
	);

	// Save when preset or custom labels change (only after initial load)
	useEffect(() => {
		if (!expertLabelsLoaded) return;
		debouncedSaveExpertLabels(expertLabelPreset, customExpertLabels);
	}, [expertLabelPreset, customExpertLabels, expertLabelsLoaded, debouncedSaveExpertLabels]);

	const wsRef = useRef<WebSocket | null>(null);

	const models = [
		'anthropic/claude-opus-4-6',
		'anthropic/claude-sonnet-4',
		'openai/gpt-4o',
		'google/gemini-2.0-flash',
	];

	const editor = useEditor({
		extensions: [
			StarterKit,
			Underline,
			Placeholder.configure({
				placeholder: 'Write the synthesis for this round…',
			}),
		],
		content: '',
		editorProps: {
			attributes: {
				class: 'prose prose-sm max-w-none focus:outline-none',
			},
		},
	});

	// ─── WebSocket for progress updates ───────────────────

	const connectWebSocket = useCallback(() => {
		if (wsRef.current?.readyState === WebSocket.OPEN) return;

		const wsUrl = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${new URL(API_BASE_URL).host}/ws`;
		const ws = new WebSocket(wsUrl);

		ws.onmessage = (e) => {
			try {
				const msg = JSON.parse(e.data);
				if (msg.type === 'synthesis_progress' && msg.form_id === formId) {
					setProgressVisible(true);
					setProgressStage(msg.stage);
					setProgressStep(msg.step);
					setProgressTotal(msg.total_steps);
				}
				if (msg.type === 'synthesis_complete' && msg.form_id === formId) {
					setProgressStage('complete');
					setProgressStep(msg.total_steps || progressTotal);
					setTimeout(() => setProgressVisible(false), 2000);
				}
			} catch (err) {
				console.error('WS parse error:', err);
			}
		};

		ws.onclose = () => {
			wsRef.current = null;
		};

		wsRef.current = ws;
	}, [formId, progressTotal]);

	useEffect(() => {
		connectWebSocket();
		return () => {
			wsRef.current?.close();
		};
	}, [connectWebSocket]);

	// ─── Data loading ─────────────────────────────────────

	useEffect(() => {
		if (!token) return;
		fetch(`${API_BASE_URL}/me`, { headers: authHeaders })
			.then((r) => r.json())
			.then((d) => setEmail(d.email || ''));
	}, [token, authHeaders]);

	useEffect(() => {
		if (!token || !formId) return;
		loadAll();
	}, [token, formId, authHeaders, editor]);

	async function loadAll() {
		setLoading(true);
		try {
			const formRes = await fetch(`${API_BASE_URL}/forms/${formId}`, {
				headers: authHeaders,
			});
			const f = await formRes.json();
			setForm(f);

			// Load expert labels from backend
			try {
				const labelsRes = await fetch(`${API_BASE_URL}/forms/${formId}/expert_labels`, {
					headers: authHeaders,
				});
				if (labelsRes.ok) {
					const labelsData = await labelsRes.json();
					if (labelsData.preset) {
						setExpertLabelPreset(labelsData.preset as ExpertLabelPreset);
					}
					if (labelsData.custom_labels && typeof labelsData.custom_labels === 'object') {
						// Convert string keys back to number keys
						const numericLabels: Record<number, string> = {};
						for (const [k, v] of Object.entries(labelsData.custom_labels)) {
							numericLabels[Number(k)] = v as string;
						}
						setCustomExpertLabels(numericLabels);
					}
					setExpertLabelsLoaded(true);
				}
			} catch (e) {
				console.error('Failed to load expert labels:', e);
				setExpertLabelsLoaded(true);
			}

			const roundsRes = await fetch(
				`${API_BASE_URL}/forms/${formId}/rounds`,
				{ headers: authHeaders }
			);
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

			const active = mapped.find((x) => x.is_active) || null;
			setActiveRound(active);
			setViewingRound(active);

			// If the active round already has structured data, load it
			if (active?.synthesis_json) {
				setStructuredData(active.synthesis_json);
				setConvergenceScore(active.convergence_score ?? undefined);
			}

			if (active && editor) {
				editor.commands.setContent(active.synthesis || '');
				setHasSavedSynthesis(
					!!(active.synthesis && active.synthesis.trim().length > 0)
				);

				if (active.questions && active.questions.length) {
					setNextRoundQuestions(active.questions);
				} else if (Array.isArray(f.questions)) {
					setNextRoundQuestions(f.questions);
				}
			} else if (f && Array.isArray(f.questions)) {
				setNextRoundQuestions(f.questions);
			}
		} finally {
			setLoading(false);
		}
	}

	// ─── Round navigation ─────────────────────────────────

	function handleSelectRound(round: Round) {
		setViewingRound(round);
		if (editor && round.synthesis) {
			editor.commands.setContent(round.synthesis);
		} else if (editor) {
			editor.commands.setContent('');
		}
		// Load structured data if the round has it, otherwise clear
		if (round.synthesis_json) {
			setStructuredData(round.synthesis_json);
			setConvergenceScore(round.convergence_score ?? undefined);
		} else {
			setStructuredData(null);
			setConvergenceScore(undefined);
		}
	}

	// ─── Actions ──────────────────────────────────────────

	function logout() {
		localStorage.clear();
		navigate('/');
	}

	async function loadResponses() {
		try {
			const roundsWithResponses = await fetch(
				`${API_BASE_URL}/forms/${formId}/rounds_with_responses`,
				{ headers: authHeaders }
			).then((r) => r.json());

			let html = '';
			if (!roundsWithResponses || roundsWithResponses.length === 0) {
				html =
					'<p style="color: var(--muted-foreground)">No responses yet for this form.</p>';
			} else {
				for (const round of roundsWithResponses) {
					html += `<div style="margin-bottom: 1.5rem; padding: 1rem; border: 1px solid var(--border); border-radius: 0.5rem; background: var(--muted)">
						<h2 style="font-size: 1.125rem; font-weight: 600; margin-bottom: 0.75rem; color: var(--foreground)">Round ${round.round_number}</h2>`;

					if (round.responses.length === 0) {
						html +=
							'<p style="color: var(--muted-foreground)">No responses for this round.</p></div>';
						continue;
					}

					const questions =
						rounds.find((r) => r.id === round.id)?.questions ||
						form?.questions ||
						[];

					for (let i = 0; i < questions.length; i++) {
						const question = questions[i];
						const questionKey = `q${i + 1}`;
						html += `<div style="margin-bottom: 1.5rem; padding: 0.75rem; border-left: 4px solid var(--accent); background: var(--card); border-radius: 0.375rem; box-shadow: var(--card-shadow)">
							<h3 style="font-size: 1rem; font-weight: 600; margin-bottom: 0.5rem; color: var(--foreground)">${question}</h3>`;

						let hasAnswers = false;
						for (const response of round.responses) {
							const answer = response.answers[questionKey];
							if (answer) {
								hasAnswers = true;
								html += `
									<div style="padding: 0.5rem 1rem; margin: 0.5rem 0; border-top: 1px solid var(--border)">
										<p style="font-size: 0.875rem; color: var(--foreground); line-height: 1.6">${answer}</p>
										<p style="font-size: 0.75rem; color: var(--muted-foreground); margin-top: 0.25rem; font-style: italic">
											– ${response.email || 'Anonymous'}
										</p>
									</div>`;
							}
						}
						if (!hasAnswers) {
							html += `<p style="font-size: 0.875rem; color: var(--muted-foreground); font-style: italic">No responses for this question.</p>`;
						}
						html += `</div>`;
					}
					html += '</div>';
				}
			}
			setResponsesHTML(html);
		} catch (e) {
			console.error('Failed to load responses:', e);
		}
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
		setIsSaving(true);
		try {
			const summary = editor?.getHTML() || '';
			await fetch(`${API_BASE_URL}/forms/${formId}/push_summary`, {
				method: 'POST',
				headers: { ...authHeaders, 'Content-Type': 'application/json' },
				body: JSON.stringify({ summary }),
			});
			setHasSavedSynthesis(true);
		} finally {
			setIsSaving(false);
		}
	}

	function updateNextQuestion(index: number, value: string) {
		setNextRoundQuestions((prev) => {
			const copy = [...prev];
			copy[index] = value;
			return copy;
		});
	}

	function addNextQuestion() {
		setNextRoundQuestions((prev) => [...prev, '']);
	}

	function removeNextQuestion(index: number) {
		setNextRoundQuestions((prev) => prev.filter((_, i) => i !== index));
	}

	async function startNextRound() {
		if (!formId) return;

		const cleaned = nextRoundQuestions
			.map((q) => q.trim())
			.filter((q) => q.length > 0);
		if (!cleaned.length) {
			alert('Add at least one question for the next round.');
			return;
		}

		setIsStartingRound(true);
		try {
			await fetch(`${API_BASE_URL}/forms/${formId}/next_round`, {
				method: 'POST',
				headers: { ...authHeaders, 'Content-Type': 'application/json' },
				body: JSON.stringify({ questions: cleaned }),
			});
			await loadAll();
			setHasSavedSynthesis(false);
		} finally {
			setIsStartingRound(false);
		}
	}

	async function downloadResponses() {
		setIsDownloading(true);
		try {
			const raw = await fetch(
				`${API_BASE_URL}/form/${formId}/responses?all_rounds=true`,
				{ headers: authHeaders }
			).then((r) => r.json());

			if (!Array.isArray(raw) || raw.length === 0) {
				alert('No responses to download');
				return;
			}

			const paragraphs = raw.flatMap((r: any, i: number) => {
				const header = new Paragraph({
					children: [
						new TextRun({ text: `Response ${i + 1}`, bold: true }),
					],
					spacing: { after: 200 },
				});

				const qa = Object.entries(r.answers).flatMap(
					([k, v]: any) => [
						new Paragraph({
							children: [new TextRun({ text: k, bold: true })],
							spacing: { after: 80 },
						}),
						new Paragraph({
							text: String(v ?? ''),
							spacing: { after: 160 },
						}),
					]
				);

				return [header, ...qa, new Paragraph('')];
			});

			const doc = new Document({ sections: [{ children: paragraphs }] });
			const blob = await Packer.toBlob(doc);
			saveAs(blob, 'responses.docx');
		} finally {
			setIsDownloading(false);
		}
	}

	// ─── Synthesis Generation ─────────────────────────────

	async function generateSynthesis() {
		if (!formId || !selectedModel) return;

		setIsGenerating(true);
		setProgressVisible(true);
		setProgressStage('generating');
		setProgressStep(0);
		setProgressTotal(4);
		setStructuredData(null);
		setConvergenceScore(undefined);

		try {
			if (synthesisMode === 'simple') {
				// Simple mode — existing endpoint
				setProgressStage('generating');
				setProgressStep(1);
				setProgressTotal(3);

				const res = await fetch(
					`${API_BASE_URL}/forms/${formId}/generate_summary`,
					{
						method: 'POST',
						headers: {
							...authHeaders,
							'Content-Type': 'application/json',
						},
						body: JSON.stringify({ model: selectedModel }),
					}
				);

				setProgressStage('formatting');
				setProgressStep(2);

				if (!res.ok) {
					const errorData = await res.json();
					throw new Error(
						errorData.detail || 'Failed to generate summary'
					);
				}

				const data = await res.json();
				if (data.summary && editor) {
					editor.commands.setContent(data.summary);
				}

				setProgressStage('complete');
				setProgressStep(3);
			} else {
				// Committee or TTD mode — structured endpoint
				setProgressStage('preparing');
				setProgressStep(1);

				const res = await fetch(
					`${API_BASE_URL}/forms/${formId}/synthesise_committee`,
					{
						method: 'POST',
						headers: {
							...authHeaders,
							'Content-Type': 'application/json',
						},
						body: JSON.stringify({
							model: selectedModel,
							mode: 'ai_assisted',
							n_analysts: synthesisMode === 'ttd' ? 5 : 3,
						}),
					}
				);

				if (!res.ok) {
					const errorData = await res.json();
					throw new Error(
						errorData.detail || 'Failed to run synthesis'
					);
				}

				const data = await res.json();

				// Set structured data for display
				if (data.synthesis) {
					setStructuredData(data.synthesis);
				}
				if (data.convergence_score != null) {
					setConvergenceScore(data.convergence_score);
				}

				// Also put the text synthesis in the editor
				if (data.text_synthesis && editor) {
					editor.commands.setContent(data.text_synthesis);
				}

				setProgressStage('complete');
				setProgressStep(4);
			}

			setTimeout(() => setProgressVisible(false), 2500);
		} catch (error) {
			console.error('Synthesis error:', error);
			alert((error as Error).message);
			setProgressVisible(false);
		} finally {
			setIsGenerating(false);
		}
	}

	// ─── Render ───────────────────────────────────────────

	if (!form) {
		return (
			<div className="min-h-screen bg-background flex items-center justify-center">
				<div className="waiting-orbit">
					<div className="waiting-orbit-dot" />
					<div className="waiting-orbit-dot" />
					<div className="waiting-orbit-dot" />
					<div className="waiting-orbit-dot" />
				</div>
			</div>
		);
	}

	const isViewingActive = viewingRound?.id === activeRound?.id;

	return (
		<div className="min-h-screen bg-background text-foreground font-sans flex flex-col">
			{/* Breadcrumb */}
			<div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-4">
				<button
					onClick={() => navigate('/')}
					className="text-sm text-accent underline hover:text-accent-hover transition-colors"
				>
					← Back to Dashboard
				</button>
			</div>

			<main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4">
				{/* Form Title Bar */}
				<div className="card p-4 mb-6 flex items-center justify-between fade-in">
					<div>
						<h1 className="text-lg font-bold text-foreground">
							{form.title}
						</h1>
						<p className="text-sm text-muted-foreground">
							{rounds.length} round{rounds.length !== 1 ? 's' : ''}{' '}
							· Viewing{' '}
							{viewingRound
								? `Round ${viewingRound.round_number}`
								: 'N/A'}
							{isViewingActive && (
								<span className="ml-2 badge badge-active">
									Active
								</span>
							)}
						</p>
					</div>
					<div className="flex items-center gap-2">
						<LoadingButton
							variant="secondary"
							size="sm"
							onClick={viewAllResponses}
						>
							{responsesOpen ? 'Hide' : 'View'} Responses
						</LoadingButton>
						<LoadingButton
							variant="secondary"
							size="sm"
							loading={isDownloading}
							loadingText="Downloading…"
							onClick={downloadResponses}
						>
							Download .docx
						</LoadingButton>
					</div>
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
					{/* ── Left sidebar: Round Timeline ── */}
					<div className="lg:col-span-2 slide-up">
						<div className="card p-4 sticky top-4">
							<RoundTimeline
								rounds={rounds}
								activeRoundId={activeRound?.id ?? null}
								selectedRoundId={viewingRound?.id ?? null}
								onSelectRound={handleSelectRound}
							/>
						</div>
					</div>

					{/* ── Main content ── */}
					<div className="lg:col-span-7 space-y-5">
						{/* Progress indicator */}
						<SynthesisProgress
							stage={progressStage}
							step={progressStep}
							totalSteps={progressTotal}
							visible={progressVisible}
						/>

						{/* Structured Synthesis Display */}
						{structuredData && (
							<div className="card p-5 bounce-in">
								<h2 className="text-base font-semibold mb-4 text-foreground flex items-center gap-2">
									<span>🔬</span>
									Structured Synthesis
									<span className="badge badge-synthesis ml-auto text-xs">
										{synthesisMode.toUpperCase()}
									</span>
								</h2>
								<StructuredSynthesis
									data={structuredData}
									convergenceScore={convergenceScore}
									expertLabels={resolvedExpertLabels}
								/>
							</div>
						)}

						{/* Emergence Highlights */}
						{structuredData?.emergent_insights && structuredData.emergent_insights.length > 0 && (
							<div className="card p-5 bounce-in">
								<EmergenceHighlights
									insights={structuredData.emergent_insights}
									expertLabels={resolvedExpertLabels}
								/>
							</div>
						)}

						{/* Cross-Matrix Visualization */}
						{structuredData &&
							expertLabelPreset !== 'default' &&
							Object.keys(resolvedExpertLabels).length >= 2 && (
							<div className="card p-5 bounce-in">
								<CrossMatrix
									structuredData={structuredData}
									resolvedExpertLabels={resolvedExpertLabels}
									expertLabelPreset={expertLabelPreset}
								/>
							</div>
						)}

						{/* Synthesis Editor */}
						<div className="card p-5 fade-in">
							<h2 className="text-base font-semibold mb-3 text-foreground">
								{structuredData
									? 'Text Synthesis (editable)'
									: `Synthesis for Round ${viewingRound?.round_number || ''}`}
							</h2>
							<div className="prose max-w-none rounded-lg border border-border p-1 min-h-[180px] lg:min-h-[250px]">
								<EditorContent editor={editor} />
							</div>
							{isViewingActive && (
								<div className="flex gap-2 mt-3">
									<LoadingButton
										variant="success"
										size="sm"
										loading={isSaving}
										loadingText="Saving…"
										onClick={saveSynthesis}
									>
										{hasSavedSynthesis
											? '✓ Save Synthesis'
											: 'Save Synthesis'}
									</LoadingButton>
								</div>
							)}
						</div>

						{/* Past round detail card */}
						{viewingRound && !isViewingActive && (
							<div className="slide-up" key={`round-card-${viewingRound.id}`}>
								<RoundCard
									round={viewingRound}
									isCurrentRound={false}
									expertLabels={resolvedExpertLabels}
								/>
							</div>
						)}

						{/* Next Round Questions (only when viewing active round) */}
						{isViewingActive && (
							<div className="card p-5 fade-in">
								<h2 className="text-base font-semibold text-foreground">
									Next Round Questions
								</h2>
								<div className="space-y-3 mt-3">
									{nextRoundQuestions.map((q, index) => (
										<div
											key={index}
											className="flex gap-2 items-center"
										>
											<span className="text-xs text-muted-foreground font-mono w-6 text-right flex-shrink-0">
												{index + 1}.
											</span>
											<input
												type="text"
												className="flex-1 rounded-lg px-3 py-2 text-sm"
												value={q}
												onChange={(e) =>
													updateNextQuestion(
														index,
														e.target.value
													)
												}
												placeholder={`Question ${index + 1}`}
											/>
											<LoadingButton
												variant="destructive"
												size="sm"
												onClick={() =>
													removeNextQuestion(index)
												}
											>
												×
											</LoadingButton>
										</div>
									))}
								</div>
								<div className="flex gap-2 mt-4">
									<LoadingButton
										variant="ghost"
										size="sm"
										onClick={addNextQuestion}
									>
										+ Add Question
									</LoadingButton>
									<LoadingButton
										variant="accent"
										size="md"
										loading={isStartingRound}
										loadingText="Starting…"
										onClick={startNextRound}
										disabled={loading}
									>
										Start Next Round →
									</LoadingButton>
								</div>
							</div>
						)}
					</div>

					{/* ── Right sidebar: Synthesis Controls ── */}
					<div className="lg:col-span-3 space-y-5">
						{/* Synthesis Mode */}
						{isViewingActive && (
							<div className="card p-4 slide-up">
								<h3 className="text-sm font-semibold mb-3 text-foreground uppercase tracking-wider">
									Synthesis Mode
								</h3>
								<SynthesisModeSelector
									mode={synthesisMode}
									onModeChange={setSynthesisMode}
								/>
							</div>
						)}

						{/* Model & Generate */}
						{isViewingActive && (
							<div className="card p-4 slide-up">
								<h3 className="text-sm font-semibold mb-3 text-foreground uppercase tracking-wider">
									AI Model
								</h3>
								<select
									className="w-full rounded-lg px-3 py-2 text-sm mb-3"
									value={selectedModel}
									onChange={(e) =>
										setSelectedModel(e.target.value)
									}
								>
									{models.map((model) => (
										<option key={model} value={model}>
											{model.split('/')[1] || model}
										</option>
									))}
								</select>

								<LoadingButton
									variant="purple"
									size="lg"
									loading={isGenerating}
									loadingText={
										synthesisMode === 'simple'
											? 'Generating…'
											: 'Synthesising…'
									}
									onClick={generateSynthesis}
									className="w-full"
								>
									{synthesisMode === 'simple'
										? '⚡ Generate Summary'
										: synthesisMode === 'committee'
											? '👥 Run Committee'
											: '🔬 Run TTD'}
								</LoadingButton>

								{synthesisMode !== 'simple' && (
									<p className="text-xs text-muted-foreground mt-2">
										Uses {synthesisMode === 'committee' ? '3' : '3'} independent
										analysts for structured consensus.
									</p>
								)}
							</div>
						)}

						{/* Expert Labels */}
						<div className="card p-4 fade-in">
							<button
								className="w-full flex items-center justify-between text-sm font-semibold text-foreground uppercase tracking-wider"
								onClick={() => setExpertLabelsOpen(!expertLabelsOpen)}
							>
								<span>Expert Labels</span>
								<span style={{ transform: expertLabelsOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>▸</span>
							</button>
							{expertLabelsOpen && (
								<div className="mt-3 space-y-3 slide-down">
									<div className="flex gap-1 flex-wrap">
										{(['default', 'temporal', 'methodological', 'stakeholder', 'custom'] as const).map(preset => {
											const label: Record<string, string> = {
												default: 'Default',
												temporal: 'Temporal',
												methodological: 'Methodological',
												stakeholder: 'Stakeholder',
												custom: 'Custom',
											};
											return (
												<button
													key={preset}
													className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
														expertLabelPreset === preset
															? 'bg-accent text-white border-accent'
															: 'border-border text-muted-foreground hover:border-accent'
													}`}
													onClick={() => setExpertLabelPreset(preset)}
												>
													{label[preset]}
												</button>
											);
										})}
									</div>
									{(['temporal', 'methodological', 'stakeholder'] as const).includes(expertLabelPreset as any) && (
										<div className="space-y-1.5">
											{Array.from({ length: expertCount }, (_, i) => i + 1).map(id => {
												const dimClasses = dimensionClassMap[expertLabelPreset] || {};
												return (
													<div key={id} className="flex items-center gap-2 text-xs">
														<span className={`expert-chip ${dimClasses[id] || ''}`}>
															{resolvedExpertLabels[id] || `Expert ${id}`}
														</span>
													</div>
												);
											})}
										</div>
									)}
									{expertLabelPreset === 'custom' && (
										<div className="space-y-1.5">
											{Array.from({ length: expertCount }, (_, i) => i + 1).map(id => (
												<div key={id} className="flex items-center gap-2">
													<span className="text-xs text-muted-foreground font-mono w-5 text-right flex-shrink-0">
														{id}
													</span>
													<input
														type="text"
														className="flex-1 rounded-lg px-2 py-1 text-xs"
														placeholder={`Expert ${id}`}
														value={customExpertLabels[id] || ''}
														onChange={(e) =>
															setCustomExpertLabels(prev => ({
																...prev,
																[id]: e.target.value,
															}))
														}
													/>
												</div>
											))}
										</div>
									)}
									{expertLabelPreset === 'default' && (
										<p className="text-xs text-muted-foreground">
											Showing default E1, E2, E3… labels.
										</p>
									)}
								</div>
							)}
						</div>

						{/* Quick Info */}
						<div className="card p-4 fade-in">
							<h3 className="text-sm font-semibold mb-2 text-foreground uppercase tracking-wider">
								Form Info
							</h3>
							<div className="text-sm space-y-1.5">
								<div className="flex justify-between">
									<span className="text-muted-foreground">
										Rounds
									</span>
									<span className="font-medium text-foreground">
										{rounds.length}
									</span>
								</div>
								<div className="flex justify-between">
									<span className="text-muted-foreground">
										Active
									</span>
									<span className="font-medium text-foreground">
										{activeRound
											? `Round ${activeRound.round_number}`
											: 'None'}
									</span>
								</div>
								<div className="flex justify-between">
									<span className="text-muted-foreground">
										Questions
									</span>
									<span className="font-medium text-foreground">
										{viewingRound?.questions?.length || 0}
									</span>
								</div>
							</div>
						</div>
					</div>
				</div>
			</main>

			{/* ── Responses Modal ── */}
			{responsesOpen &&
				createPortal(
					<div
						className="fixed inset-0 z-50 flex items-center justify-center p-4 fade-in"
						style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
						onClick={(e) => {
							if (e.target === e.currentTarget)
								setResponsesOpen(false);
						}}
					>
						<div
							className="card max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 text-left bounce-in"
							style={{
								boxShadow:
									'0 25px 50px -12px rgba(0,0,0,0.35)',
							}}
						>
							<div className="flex items-center justify-between mb-4">
								<h3 className="text-xl font-semibold text-foreground">
									All Responses
								</h3>
								<button
									className="text-muted-foreground hover:text-foreground text-2xl leading-none transition-colors"
									onClick={() => setResponsesOpen(false)}
								>
									×
								</button>
							</div>
							<div
								className="prose prose-sm max-w-none"
								dangerouslySetInnerHTML={{
									__html: responsesHTML,
								}}
							/>
						</div>
					</div>,
					document.body
				)}
		</div>
	);
}
