import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Trash2, Plus, Save, ChevronUp, ChevronDown, Copy, Ticket } from 'lucide-react';
import { api, getApiErrorDetail } from './api/client';
import { BackLink, LoadingButton } from './components';
import DocumentTemplateEditor from './components/DocumentTemplateEditor';
import DocumentTemplateResponse from './components/DocumentTemplateResponse';
import ConsentSettings from './components/ConsentSettings';
import PublicShareSettings from './components/PublicShareSettings';
import QuestionModeToggle from './components/QuestionModeToggle';
import QuestionnaireImporter from './components/QuestionnaireImporter';
import SurveyQuestionConfigurator from './components/SurveyQuestionConfigurator';
import StructuredInput from './components/StructuredInput';
import SurveyQuestionList from './components/SurveyQuestionList';
import { ToggleSwitch } from './components/ToggleSwitch';
import { useToast } from './components/Toast';
import { useDocumentTitle } from './hooks/useDocumentTitle';
import { emptyStructuredResponse, type StructuredResponse } from './types/structured-input';
import { isSurveyQuestion, normalizeQuestion, type ConfigurableQuestion, type QuestionInput } from './utils/questions';
import {
  buildInitialDocumentTemplateResponses,
  getEditableDocumentQuestion,
  isDocumentTemplate,
  isEditableDocumentTemplate,
  parseDocumentTemplateFields,
} from './utils/documentTemplate';
import type { QuestionnaireImportResult } from './utils/questionnaireImport';

function toQuestionInputs(questions: ConfigurableQuestion[]): QuestionInput[] {
  return questions as unknown as QuestionInput[];
}

interface FormData {
  title: string;
  questions: QuestionInput[];
  document_template?: string | null;
  join_code: string;
  allow_public_responses?: boolean;
  consent_required?: boolean;
  consent_text?: string | null;
  consent_document?: string | null;
  public_require_consent?: boolean;
  public_consent_text?: string | null;
  public_require_upload?: boolean;
  public_upload_prompt?: string | null;
}

function createBlankQuestion(): ConfigurableQuestion {
  return {
    label: '',
    requireEvidence: true,
    requireCounterarguments: true,
    requireConfidence: true,
  };
}

function createBlankSurveyQuestion(): ConfigurableQuestion {
  return {
    label: '',
    requireEvidence: false,
    requireCounterarguments: false,
    requireConfidence: false,
    inputType: 'textarea',
    rows: 4,
    placeholder: 'Write your response here',
  };
}

export default function FormEditor() {
  const { id } = useParams();
  useDocumentTitle('Edit Consultation');
  const navigate = useNavigate();
  const { toastError, toastSuccess } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState<ConfigurableQuestion[]>([createBlankQuestion()]);
  const [documentTemplate, setDocumentTemplate] = useState('');
  const documentTemplateRef = useRef('');
  const [importSummary, setImportSummary] = useState<QuestionnaireImportResult | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [previewResponses, setPreviewResponses] = useState<Record<string, StructuredResponse>>({});
  const [allowPublicResponses, setAllowPublicResponses] = useState(false);
  const [requireConsent, setRequireConsent] = useState(false);
  const [consentText, setConsentText] = useState(
    'I confirm that I understand the purpose of this form and consent to my response being used within this consultation.',
  );
  const [consentDocument, setConsentDocument] = useState('');
  const validQuestions = questions.filter((question) => question.label.trim() !== '');
  const editableDocumentQuestion = useMemo(() => getEditableDocumentQuestion(documentTemplate), [documentTemplate]);
  const documentQuestions = useMemo<ConfigurableQuestion[]>(() => (
    (editableDocumentQuestion ? [editableDocumentQuestion] : parseDocumentTemplateFields(documentTemplate)).map((field) => ({
      label: field.label,
      requireEvidence: false,
      requireCounterarguments: false,
      requireConfidence: false,
      optional: field.optional,
      fieldType: field.fieldType === 'short' || field.fieldType === 'long' ? field.fieldType : null,
      inputType: field.inputType === 'document' ? null : field.inputType,
      rows: field.rows,
      placeholder: field.placeholder,
      options: field.options,
      minValue: field.minValue,
      maxValue: field.maxValue,
      minLabel: field.minLabel,
      midLabel: field.midLabel,
      maxLabel: field.maxLabel,
      allowUnsure: field.allowUnsure,
    }))
  ), [documentTemplate, editableDocumentQuestion]);
  const isDocumentMode = isDocumentTemplate(documentTemplate);
  const previewQuestions: ConfigurableQuestion[] = isDocumentMode ? documentQuestions : questions;
  const validPreviewQuestions = previewQuestions.filter((question) => question.label.trim() !== '');
  const isSurveyMode =
    questions.length > 0 &&
    questions.every((question) => isSurveyQuestion(question));
  const questionModeLabel = isDocumentMode ? 'Document template' : (isSurveyMode ? 'Survey' : 'Consensus');
  const consultationHeading = title.trim() || 'Untitled Consultation';

  function updateDocumentTemplate(nextValue: string) {
    documentTemplateRef.current = nextValue;
    setDocumentTemplate(nextValue);
  }

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      navigate('/');
      return;
    }

    api.get<FormData>(`/forms/${id}`)
      .then((form) => {
        setTitle(form.title);
        setQuestions(
          Array.isArray(form.questions) && form.questions.length > 0
            ? form.questions.map((question) => normalizeQuestion(question))
            : [createBlankQuestion()],
        );
        updateDocumentTemplate(form.document_template ?? '');
        setJoinCode(form.join_code);
        setAllowPublicResponses(Boolean(form.allow_public_responses));
        setRequireConsent(Boolean(form.consent_required ?? form.public_require_consent));
        setConsentText(
          form.consent_text?.trim()
            || form.public_consent_text?.trim()
            || 'I confirm that I understand the purpose of this form and consent to my response being used within this consultation.',
        );
        setConsentDocument(form.consent_document ?? '');
        setLoading(false);
      })
      .catch(() => {
        toastError('Failed to load form');
        setLoading(false);
      });
  }, [id, navigate, toastError]);

  useEffect(() => {
    setPreviewResponses((prev) => {
      const next: Record<string, StructuredResponse> = {};
      previewQuestions.forEach((_, index) => {
        const key = `q${index + 1}`;
        next[key] = prev[key] ?? emptyStructuredResponse();
      });
      if (isEditableDocumentTemplate(documentTemplate)) {
        const initial = buildInitialDocumentTemplateResponses(documentTemplate);
        return {
          ...next,
          q1: prev.q1 && prev.q1.position ? prev.q1 : initial.q1,
        };
      }
      return next;
    });
  }, [documentTemplate, previewQuestions]);

  function setResponseStyle(mode: 'consensus' | 'information') {
    setImportSummary(null);
    setQuestions((prev) =>
      prev.map((question) => ({
        ...question,
        requireEvidence: mode === 'consensus',
        requireCounterarguments: mode === 'consensus',
        requireConfidence: mode === 'consensus',
      })),
    );
  }

  async function saveForm() {
    if (!title.trim()) {
      toastError('Please enter a title');
      return;
    }

    const validQuestions = questions.filter((q) => q.label.trim() !== '');
    const trimmedDocumentTemplate = documentTemplateRef.current.trim();

    if (!trimmedDocumentTemplate && validQuestions.length === 0) {
      toastError('Please add at least one question');
      return;
    }
    setSaving(true);

    try {
      await api.put(`/forms/${id}`, {
        title: title.trim(),
        questions: validQuestions,
        document_template: trimmedDocumentTemplate || null,
        allow_public_responses: allowPublicResponses,
        require_consent: requireConsent,
        consent_text: requireConsent ? consentText.trim() : null,
        consent_document: requireConsent && consentDocument.trim() ? consentDocument.trim() : null,
        public_require_consent: false,
        public_consent_text: null,
        public_require_upload: false,
        public_upload_prompt: null,
      });
      toastSuccess('Consultation saved');
    } catch (error) {
      toastError(getApiErrorDetail(error) || 'Failed to save edits');
    } finally {
      setSaving(false);
    }
  }

  async function deleteForm() {
    if (
      !window.confirm(
        'Are you sure you want to delete this consultation? This action cannot be undone.',
      )
    ) {
      return;
    }

    setDeleting(true);
    try {
      await api.delete(`/forms/${id}/delete`);
      toastSuccess('Consultation deleted');
      navigate('/');
    } catch {
      toastError('Failed to delete consultation');
    } finally {
      setDeleting(false);
    }
  }

  function updateQuestion(i: number, value: string) {
    const updated = [...questions];
    updated[i] = { ...updated[i], label: value };
    setQuestions(updated);
  }

  function patchQuestion(i: number, nextQuestion: ConfigurableQuestion) {
    setQuestions((prev) => prev.map((question, index) => (index === i ? nextQuestion : question)));
  }

  function addQuestion() {
    setQuestions((prev) => [
      ...prev,
      isSurveyMode
        ? createBlankSurveyQuestion()
        : createBlankQuestion(),
    ]);
  }

  function switchToQuestionMode() {
    updateDocumentTemplate('');
    if (questions.length === 0) {
      setQuestions([createBlankQuestion()]);
    }
  }

  function switchToDocumentMode() {
    setImportSummary(null);
    if (!documentTemplateRef.current.trim()) {
      updateDocumentTemplate('Title\n{{long:Executive summary}}\n');
    }
  }

  function swapQuestions(a: number, b: number) {
    setQuestions((prev) => {
      const updated = [...prev];
      [updated[a], updated[b]] = [updated[b], updated[a]];
      return updated;
    });
  }

  function removeQuestion(i: number) {
    setQuestions((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function copyJoinCode() {
    try {
      await navigator.clipboard.writeText(joinCode);
      toastSuccess('Join code copied');
    } catch {
      toastError('Failed to copy join code');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: '60vh' }}>
        <p className="text-muted-foreground text-lg">Loading…</p>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 py-6 sm:py-8 max-w-7xl mx-auto">
      <BackLink to="/" label="Dashboard" className="mb-6" />

      <section className="card-lg p-5 sm:p-6 mb-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1 max-w-4xl">
            <div
              className="rounded-2xl px-4 py-3 sm:px-5 sm:py-4"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--foreground) 2%, var(--card))',
                border: '1px solid color-mix(in srgb, var(--border) 60%, transparent)',
              }}
            >
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Untitled Consultation"
                aria-label="Consultation title"
                className="w-full bg-transparent border-none p-0"
                style={{
                  color: 'var(--foreground)',
                  fontSize: 'clamp(1.75rem, 3vw, 2.35rem)',
                  fontWeight: 650,
                  letterSpacing: '-0.045em',
                  lineHeight: 1.08,
                  outline: 'none',
                }}
              />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <span
                className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium"
                style={{ backgroundColor: 'var(--muted)', color: 'var(--foreground)' }}
              >
                {validPreviewQuestions.length} field{validPreviewQuestions.length === 1 ? '' : 's'}
              </span>
              <span
                className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium"
                style={{ backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)' }}
              >
                {questionModeLabel}
              </span>
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
                style={{ backgroundColor: 'var(--muted)', color: 'var(--foreground)' }}
              >
                <Ticket size={12} />
                {joinCode}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <LoadingButton
              variant="ghost"
              onClick={copyJoinCode}
              className="px-4 py-2.5"
            >
              <Copy size={16} className="mr-2" />
              Copy code
            </LoadingButton>
            <LoadingButton
              variant="accent"
              loading={saving}
              onClick={saveForm}
              className="px-5 py-2.5"
            >
              <Save size={16} className="mr-2" />
              Save changes
            </LoadingButton>
          </div>
        </div>
      </section>

      <section className="mb-6">
        <PublicShareSettings
          enabled={allowPublicResponses}
          onEnabledChange={setAllowPublicResponses}
        />
        <ConsentSettings
          enabled={requireConsent}
          onEnabledChange={setRequireConsent}
          consentText={consentText}
          onConsentTextChange={setConsentText}
          consentDocument={consentDocument}
          onConsentDocumentChange={setConsentDocument}
        />
      </section>

      <div className={isDocumentMode && !isEditableDocumentTemplate(documentTemplate) ? 'grid gap-6' : 'grid gap-6 xl:grid-cols-[minmax(0,1fr)_28rem]'}>
        <div className="space-y-6 min-w-0">
          <div className="card-lg p-6">
            <div className="mb-6 space-y-4">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={switchToQuestionMode}
                  className="rounded-lg px-3 py-2 text-sm font-medium"
                  style={{
                    backgroundColor: !isDocumentMode ? 'color-mix(in srgb, var(--accent) 12%, transparent)' : 'var(--background)',
                    color: !isDocumentMode ? 'var(--accent)' : 'var(--muted-foreground)',
                    border: '1px solid var(--border)',
                  }}
                >
                  Question form
                </button>
                <button
                  type="button"
                  onClick={switchToDocumentMode}
                  className="rounded-lg px-3 py-2 text-sm font-medium"
                  style={{
                    backgroundColor: isDocumentMode ? 'color-mix(in srgb, var(--accent) 12%, transparent)' : 'var(--background)',
                    color: isDocumentMode ? 'var(--accent)' : 'var(--muted-foreground)',
                    border: '1px solid var(--border)',
                  }}
                >
                  Document template
                </button>
              </div>
              {!isDocumentMode && (
                <>
                  <QuestionModeToggle
                    isSurveyMode={isSurveyMode}
                    onSelectSurvey={() => setResponseStyle('information')}
                    onSelectConsensus={() => setResponseStyle('consensus')}
                  />
                  {isSurveyMode ? (
                    <>
                      <QuestionnaireImporter
                        onQuestionsImported={(importedQuestions) => {
                          setQuestions(importedQuestions);
                          updateDocumentTemplate('');
                        }}
                        onImported={(result) => setImportSummary(result)}
                      />
                      {importSummary ? (
                        <div
                          className="rounded-xl p-4"
                          style={{
                            backgroundColor: 'var(--background)',
                            border: '1px solid var(--border)',
                          }}
                        >
                          <div className="text-sm font-semibold text-foreground">
                            Imported {importSummary.questions.length} question{importSummary.questions.length === 1 ? '' : 's'}
                            {importSummary.importedRoundLabel ? ` from ${importSummary.importedRoundLabel}` : ''}
                          </div>
                          <div className="mt-2 space-y-1 text-xs" style={{ color: 'var(--muted-foreground)' }}>
                            {importSummary.warnings.length > 0 ? (
                              importSummary.warnings.map((warning) => <div key={warning}>{warning}</div>)
                            ) : (
                              <div>Question types, options, and slider scales were imported successfully.</div>
                            )}
                          </div>
                        </div>
                      ) : null}
                    </>
                  ) : null}
                </>
              )}
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-foreground">
                  {isDocumentMode ? 'Template' : 'Questions'}
                </h2>
              </div>
            </div>
            {isDocumentMode ? (
              <DocumentTemplateEditor
                value={documentTemplate}
                onChange={updateDocumentTemplate}
                previewAnswers={previewResponses}
                onPreviewChange={(key, value) =>
                  setPreviewResponses((prev) => ({ ...prev, [key]: value }))
                }
              />
            ) : (
            <>
            <div className="space-y-4">
              {questions.map((q, i) => (
                <div
                  key={i}
                  className="rounded-2xl p-4 sm:p-5"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--foreground) 2%, var(--card))',
                    border: '1px solid color-mix(in srgb, var(--border) 62%, transparent)',
                  }}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className="inline-flex h-8 items-center justify-center rounded-full px-2 text-xs font-semibold shrink-0"
                      style={{
                        minWidth: '2rem',
                        backgroundColor: 'var(--muted)',
                        color: 'var(--muted-foreground)',
                      }}
                    >
                      {i + 1}
                    </span>
                    <div
                      className="flex flex-col shrink-0"
                      style={{ width: 18, gap: 2, marginTop: 8 }}
                    >
                      {i > 0 ? (
                        <button
                          type="button"
                          onClick={() => swapQuestions(i, i - 1)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: 0,
                            color: 'var(--muted-foreground)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            lineHeight: 1,
                          }}
                          title="Move up"
                          aria-label={`Move question ${i + 1} up`}
                        >
                          <ChevronUp size={14} aria-hidden="true" />
                        </button>
                      ) : (
                        <span style={{ height: 14 }} />
                      )}
                      {i < questions.length - 1 ? (
                        <button
                          type="button"
                          onClick={() => swapQuestions(i, i + 1)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: 0,
                            color: 'var(--muted-foreground)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            lineHeight: 1,
                          }}
                          title="Move down"
                          aria-label={`Move question ${i + 1} down`}
                        >
                          <ChevronDown size={14} aria-hidden="true" />
                        </button>
                      ) : (
                        <span style={{ height: 14 }} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <input
                        value={q.label}
                        onChange={(e) => updateQuestion(i, e.target.value)}
                        className="w-full min-w-0 rounded-xl px-3.5 py-3 border border-border bg-card text-foreground"
                        placeholder={`Question ${i + 1}`}
                      />
                      {isSurveyMode ? (
                        <>
                          {q.importedFromQuestionnaire ? (
                            <div
                              className="mt-3 rounded-xl px-3 py-2.5 text-xs"
                              style={{
                                backgroundColor:
                                  'color-mix(in srgb, var(--foreground) 3%, transparent)',
                                border: '1px solid var(--border)',
                                color: 'var(--muted-foreground)',
                              }}
                            >
                              Imported as <strong>{q.inputType?.replace('_', ' ') ?? 'survey field'}</strong>
                              {Array.isArray(q.options) && q.options.length > 0 ? ` with ${q.options.length} option${q.options.length === 1 ? '' : 's'}` : ''}
                              {q.maxSelections ? `, up to ${q.maxSelections} selections` : ''}.
                              {q.sectionTitle ? ` Section: ${q.sectionTitle}.` : ''}
                              {q.helpText ? ` ${q.helpText}` : ''}
                            </div>
                          ) : null}
                          <SurveyQuestionConfigurator
                            question={q}
                            index={i}
                            onChange={(nextQuestion) => patchQuestion(i, nextQuestion)}
                          />
                        </>
                      ) : (
                        <div
                          className="mt-3 grid gap-3 rounded-xl px-3 py-3 sm:grid-cols-3"
                          style={{
                            backgroundColor:
                              'color-mix(in srgb, var(--foreground) 3%, transparent)',
                            border: '1px solid var(--border)',
                          }}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <label
                                htmlFor={`question-${i + 1}-evidence`}
                                className="block text-sm font-medium"
                                style={{ color: 'var(--foreground)' }}
                              >
                                Evidence
                              </label>
                            </div>
                            <ToggleSwitch
                              id={`question-${i + 1}-evidence`}
                              checked={q.requireEvidence}
                              onChange={(checked) => {
                                const updated = [...questions];
                                updated[i] = { ...updated[i], requireEvidence: checked };
                                setQuestions(updated);
                              }}
                            />
                          </div>

                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <label
                                htmlFor={`question-${i + 1}-counterarguments`}
                                className="block text-sm font-medium"
                                style={{ color: 'var(--foreground)' }}
                              >
                                Counterarguments
                              </label>
                            </div>
                            <ToggleSwitch
                              id={`question-${i + 1}-counterarguments`}
                              checked={q.requireCounterarguments}
                              onChange={(checked) => {
                                const updated = [...questions];
                                updated[i] = { ...updated[i], requireCounterarguments: checked };
                                setQuestions(updated);
                              }}
                            />
                          </div>

                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <label
                                htmlFor={`question-${i + 1}-confidence`}
                                className="block text-sm font-medium"
                                style={{ color: 'var(--foreground)' }}
                              >
                                Confidence
                              </label>
                            </div>
                            <ToggleSwitch
                              id={`question-${i + 1}-confidence`}
                              checked={q.requireConfidence}
                              onChange={(checked) => {
                                const updated = [...questions];
                                updated[i] = { ...updated[i], requireConfidence: checked };
                                setQuestions(updated);
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                    {questions.length > 1 && (
                      <button
                        className="shrink-0 p-2 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                        style={{ color: 'var(--destructive)' }}
                        type="button"
                        onClick={() => removeQuestion(i)}
                        title="Remove question"
                        aria-label={`Remove question ${i + 1}`}
                      >
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={addQuestion}
              type="button"
              className="inline-flex items-center gap-1.5 mt-4 text-sm font-medium"
              style={{ color: 'var(--accent)' }}
            >
              <Plus size={16} />
              Add question
            </button>
            </>
            )}

        </div>
        </div>

        {!(isDocumentMode && !isEditableDocumentTemplate(documentTemplate)) ? (
        <aside className="xl:sticky xl:top-24 self-start space-y-6">
          <div className="card-lg p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-foreground">Preview</h2>
              {validPreviewQuestions.length > 0 && (
                <span
                  className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium"
                  style={{ backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)' }}
                >
                  Expert view
                </span>
              )}
            </div>
            <div
              className="rounded-2xl p-4 sm:p-5 mt-4"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--foreground) 2%, var(--card))',
                border: '1px solid color-mix(in srgb, var(--border) 60%, transparent)',
              }}
            >
              <div
                className="rounded-xl px-4 py-3 mb-4"
                style={{
                  backgroundColor: 'var(--card)',
                  border: '1px solid color-mix(in srgb, var(--border) 55%, transparent)',
                }}
              >
                <div className="text-sm font-semibold text-foreground">{consultationHeading}</div>
                <div className="mt-1 text-xs" style={{ color: 'var(--muted-foreground)' }}>
                  {validPreviewQuestions.length} field{validPreviewQuestions.length === 1 ? '' : 's'}
                </div>
              </div>
              {isDocumentMode && !isEditableDocumentTemplate(documentTemplate) ? (
                <div
                  className="rounded-xl px-4 py-5 text-sm"
                  style={{
                    backgroundColor: 'var(--background)',
                    border: '1px dashed var(--border)',
                    color: 'var(--muted-foreground)',
                    lineHeight: 1.7,
                  }}
                >
                  Fillable document preview is now embedded directly in the editor so the document and participant view stay linked while you edit the template.
                </div>
              ) : validPreviewQuestions.length === 0 ? (
                <div
                  className="rounded-xl px-4 py-5 text-sm"
                  style={{
                    backgroundColor: 'var(--background)',
                    border: '1px dashed var(--border)',
                    color: 'var(--muted-foreground)',
                  }}
                >
                  {isDocumentMode
                    ? 'Add at least one {{placeholder}} to preview the document form.'
                    : 'Add at least one question to preview the expert form.'}
                </div>
              ) : (
                isDocumentMode ? (
                  <DocumentTemplateResponse
                    template={documentTemplate}
                    answers={previewResponses}
                    onChange={(key, value) =>
                      setPreviewResponses((prev) => ({ ...prev, [key]: value }))
                    }
                  />
                ) : (
                  <SurveyQuestionList
                    questions={toQuestionInputs(questions)}
                    formId={`edit-preview-${id ?? 'form'}`}
                    responses={previewResponses}
                    onChange={(key, value) =>
                      setPreviewResponses((prev) => ({ ...prev, [key]: value }))
                    }
                    persistDraft={false}
                  />
                )
              )}
            </div>
          </div>

          <div
            className="card-lg p-5"
            style={{
              borderColor: 'color-mix(in srgb, var(--destructive) 22%, var(--border))',
            }}
          >
            <h2 className="text-sm font-semibold text-foreground">Delete consultation</h2>
            <p className="mt-2 text-sm" style={{ color: 'var(--muted-foreground)' }}>
              This permanently removes the consultation and its responses.
            </p>
            <LoadingButton
              variant="destructive"
              loading={deleting}
              onClick={deleteForm}
              className="mt-4 w-full justify-center px-5 py-2.5"
            >
              <Trash2 size={16} className="mr-2" />
              Delete consultation
            </LoadingButton>
          </div>
        </aside>
        ) : null}
      </div>
    </div>
  );
}
