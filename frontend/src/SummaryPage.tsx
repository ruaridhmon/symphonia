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

type Round = {
	id: number;
	round_number: number;
	synthesis: string;
	is_active: boolean;
	questions: string[];
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
					is_active: !!x.is_active,
					questions: Array.isArray(x.questions) ? x.questions : []
				})
			);
			console.log('[SummaryPage] mapped rounds:', mapped);
			setRounds(mapped);

			const active = mapped.find(x => x.is_active) || null;
			console.log('[SummaryPage] active round:', active);
			setActiveRound(active || null);

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

		console.log('[SummaryPage] Fetching rounds_with_responses for modal...');
		const roundsWithResponses = await fetch(
			`${API_BASE_URL}/forms/${formId}/rounds_with_responses`,
			{ headers: authHeaders }
		).then(r => r.json());

		let html = '';
		if (!roundsWithResponses || roundsWithResponses.length === 0) {
			html = '<p style="color: var(--muted-foreground)">No responses yet for this form.</p>';
		} else {
			for (const round of roundsWithResponses) {
				html += `<div style="margin-bottom: 2rem; padding: 1rem; border: 1px solid var(--border); border-radius: 0.5rem; background: var(--muted)">
                            <h2 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 0.75rem; color: var(--foreground)">Round ${round.round_number}</h2>`;

				if (round.responses.length === 0) {
					html += '<p style="color: var(--muted-foreground)">No responses for this round.</p>';
					html += `</div>`;
					continue;
				}

				const questions =
					rounds.find(r => r.id === round.id)?.questions ||
					form?.questions ||
					[];

				// Group responses by question for better readability
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
                                </div>
                            `;
						}
					}
					if (!hasAnswers) {
						html += `<p style="font-size: 0.875rem; color: var(--muted-foreground); font-style: italic">No responses for this question.</p>`;
					}
					html += `</div>`;
				}
				html += `</div>`;
			}
		}

		setResponsesHTML(html);
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
		console.log('[SummaryPage] generateSummary() called, formId:', formId, 'model:', selectedModel);
		if (!formId || !selectedModel) {
			console.log('[SummaryPage] generateSummary() skipped - missing formId or model');
			return;
		}

		setIsGenerating(true);
		try {
			console.log('[SummaryPage] Posting to generate_summary...');
			const res = await fetch(
				`${API_BASE_URL}/forms/${formId}/generate_summary`,
				{
					method: 'POST',
					headers: { ...authHeaders, 'Content-Type': 'application/json' },
					body: JSON.stringify({ model: selectedModel })
				}
			);
			console.log('[SummaryPage] generate_summary response status:', res.status);

			if (!res.ok) {
				const errorData = await res.json();
				console.error('[SummaryPage] generate_summary error response:', errorData);
				throw new Error(errorData.detail || 'Failed to generate summary');
			}

			const data = await res.json();
			console.log('[SummaryPage] generate_summary data:', data);
			if (data.summary && editor) {
				console.log('[SummaryPage] Setting editor content from generated summary');
				editor.commands.setContent(data.summary);
			}
		} catch (error) {
			console.error('[SummaryPage] generateSummary() error:', error);
			alert((error as Error).message);
		} finally {
			console.log('[SummaryPage] generateSummary() finally - setting isGenerating=false');
			setIsGenerating(false);
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
					<div>
						<h1 className="text-xl font-bold tracking-tight text-foreground">Admin Workspace</h1>
						<p className="text-sm text-muted-foreground mt-0.5">
							Logged in as <strong className="text-foreground">{email}</strong>
						</p>
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

				<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
					{/* Main Content */}
					<div className="lg:col-span-2 space-y-6">
						<div className="card p-6 min-h-[200px] lg:min-h-[300px]">
							<h2 className="text-lg font-semibold mb-3 text-foreground">
								Synthesis for Round {activeRound?.round_number || ''}
							</h2>
							<div className="prose max-w-none">
								<EditorContent editor={editor} />
							</div>
						</div>

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
										<button
											className="btn btn-destructive px-3 py-2 text-sm opacity-80"
											onClick={() => removeNextQuestion(index)}
										>
											Remove
										</button>
									</div>
								))}
							</div>
							<button
								onClick={addNextQuestion}
								className="btn btn-secondary mt-4 text-sm"
							>
								Add Question
							</button>
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
								<button
									onClick={viewAllResponses}
									className="btn btn-accent w-full text-left justify-start"
								>
									{responsesOpen ? 'Hide Responses' : 'View All Responses'}
								</button>
								<button
									onClick={downloadResponses}
									className="btn btn-secondary w-full text-left justify-start"
								>
									Download Responses
								</button>
								<button
									className="btn btn-success w-full text-left justify-start"
									onClick={saveSynthesis}
								>
									Save Synthesis
								</button>
								<div className="pt-2">
									<button
										onClick={startNextRound}
										className="btn btn-accent w-full font-semibold"
										style={{ backgroundColor: 'var(--accent-hover)' }}
										disabled={loading}
									>
										Start Next Round
									</button>
								</div>
							</div>
						</div>

						<div className="card p-4">
							<h3 className="text-base font-semibold mb-3 text-foreground">AI-Powered Synthesis</h3>
							<div className="space-y-3">
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
								<button
									onClick={generateSummary}
									className="btn w-full font-semibold text-sm"
									style={{
										backgroundColor: '#7c3aed',
										color: '#ffffff',
									}}
									disabled={isGenerating}
								>
									{isGenerating ? 'Generating…' : 'Generate Summary'}
								</button>
							</div>
						</div>

						{rounds.length > 0 && (
							<div className="card p-4">
								<h3 className="text-base font-semibold mb-2 text-foreground">Round History</h3>
								<ul className="text-sm space-y-1">
									{rounds.map(r => (
										<li
											key={r.id}
											className="flex justify-between items-center border-b border-border last:border-b-0 py-1.5"
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
							<div
								className="prose prose-sm max-w-none"
								dangerouslySetInnerHTML={{ __html: responsesHTML }}
							/>
							<button
								className="btn btn-accent mt-6"
								onClick={() => setResponsesOpen(false)}
							>
								Close
							</button>
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
