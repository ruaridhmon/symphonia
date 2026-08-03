import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, ChevronDown, ClipboardList } from 'lucide-react';
import { ApiError, getApiErrorDetail } from './api/client';
import {
  getPublicFormSession,
  savePublicDraft,
  submitPublicResponse,
  type PublicSessionDetail,
} from './api/publicForms';
import { BackLink, LoadingButton, SynthesisDisplay } from './components';
import DocumentTemplateResponse from './components/DocumentTemplateResponse';
import SurveyQuestionList from './components/SurveyQuestionList';
import Skeleton from './components/Skeleton';
import type { StructuredResponse } from './types/structured-input';
import { emptyStructuredResponse } from './types/structured-input';
import { normalizeAnswerRecord } from './utils/answers';
import {
  isResponseAnswered,
  validateDocumentTemplateResponses,
  validateQuestionResponses,
} from './utils/responseValidation';
import {
  buildInitialDocumentTemplateResponses,
  isDocumentTemplate,
  isEditableDocumentTemplate,
  isRichFillableDocumentTemplate,
  remapRichFillableAnswersToQuestionOrder,
} from './utils/documentTemplate';
import { useDocumentTitle } from './hooks/useDocumentTitle';
import { normalizeQuestion } from './utils/questions';

function PreviousSynthesisToggle({ content }: { content: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      className="mt-6 rounded-lg overflow-hidden transition-all"
      style={{
        border: '1px solid var(--border)',
        backgroundColor: 'var(--muted)',
      }}
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 text-left transition-colors"
        style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2">
          <ClipboardList size={16} style={{ color: 'var(--accent)' }} />
          <span className="text-sm font-semibold text-foreground">Previous Round Synthesis</span>
        </div>
        <ChevronDown
          size={16}
          style={{
            color: 'var(--muted-foreground)',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
          }}
        />
      </button>
      {isOpen ? (
        <div className="px-4 pb-4" style={{ borderTop: '1px solid var(--border)' }}>
          <SynthesisDisplay
            content={content}
            title="Synthesis from the previous round"
            subtitle="Review what emerged from the last round before submitting."
          />
        </div>
      ) : null}
    </div>
  );
}

function isDiagnosticLikertDemo(session: PublicSessionDetail | null): boolean {
  return session?.form.join_code === 'SYM-LKRT-2026' || session?.form.title === 'Likert Demo: Digital Wellbeing Diagnostic';
}

function publicQuestionIndexKey(sessionToken: string): string {
  return `symphonia-public-session-question:${sessionToken}`;
}

export default function PublicFormPage() {
  useDocumentTitle('Public Form');
  const { sessionToken } = useParams<{ sessionToken: string }>();
  const navigate = useNavigate();

  const [session, setSession] = useState<PublicSessionDetail | null>(null);
  const [structuredResponses, setStructuredResponses] = useState<Record<string, StructuredResponse>>({});
  const [participantName, setParticipantName] = useState('');
  const [mode, setMode] = useState<'loading' | 'filling' | 'submitted' | 'error'>('loading');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [draftStatus, setDraftStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [highlightedQuestionKey, setHighlightedQuestionKey] = useState<string | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestResponsesRef = useRef<Record<string, StructuredResponse>>({});
  const latestParticipantNameRef = useRef('');

  const buildEmptyResponses = useCallback((questions: Array<string | Record<string, unknown>>, documentTemplate?: string | null) => {
    const base = Object.fromEntries(
      questions.map((_, index) => [`q${index + 1}`, emptyStructuredResponse()]),
    ) as Record<string, StructuredResponse>;
    if (documentTemplate && isEditableDocumentTemplate(documentTemplate)) {
      return {
        ...base,
        ...buildInitialDocumentTemplateResponses(documentTemplate),
      };
    }
    return base;
  }, []);

  const legacyToStructured = useCallback((answers: Record<string, unknown>): Record<string, StructuredResponse> => {
    return normalizeAnswerRecord(answers);
  }, []);

  const scheduleDraftSave = useCallback((answers: Record<string, StructuredResponse>, name: string) => {
    if (!sessionToken) return;
    latestResponsesRef.current = answers;
    latestParticipantNameRef.current = name;
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    draftTimerRef.current = setTimeout(async () => {
      try {
        setDraftStatus('saving');
        await savePublicDraft(sessionToken, {
          participant_name: latestParticipantNameRef.current,
          answers: normalizeAnswerRecord(latestResponsesRef.current),
        });
        setDraftStatus('saved');
        setTimeout(() => setDraftStatus((current) => (current === 'saved' ? 'idle' : current)), 3000);
      } catch {
        setDraftStatus('error');
      }
    }, 1500);
  }, [sessionToken]);

  useEffect(() => {
    return () => {
      if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    };
  }, []);

  const loadSession = useCallback(async () => {
    if (!sessionToken) return;
    setMode('loading');
    setLoadError(null);
    try {
      const data = await getPublicFormSession(sessionToken);
      setSession(data);
      setParticipantName(data.participant_name);
      const loadedResponses = data.draft?.answers
        ? legacyToStructured(data.draft.answers)
        : buildEmptyResponses(data.form.questions, data.form.document_template);
      setStructuredResponses(
        isRichFillableDocumentTemplate(data.form.document_template)
          ? remapRichFillableAnswersToQuestionOrder(
              data.form.document_template ?? '',
              data.form.questions,
              loadedResponses,
            )
          : loadedResponses,
      );
      if (isDiagnosticLikertDemo(data) && !data.submitted) {
        const storedIndex = Number(window.localStorage.getItem(publicQuestionIndexKey(sessionToken)));
        const maxIndex = data.form.questions
          .map((question) => normalizeQuestion(question))
          .filter((question) => question.label.trim()).length - 1;
        if (Number.isFinite(storedIndex) && storedIndex >= 0) {
          setCurrentQuestionIndex(Math.min(storedIndex, Math.max(0, maxIndex)));
        }
      }
      setMode(data.submitted ? 'submitted' : 'filling');
    } catch (err) {
      const detail = getApiErrorDetail(err);
      setLoadError(detail || 'Failed to load this public form.');
      setMode('error');
    }
  }, [buildEmptyResponses, legacyToStructured, sessionToken]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  useEffect(() => {
    if (!sessionToken || !isDiagnosticLikertDemo(session) || mode !== 'filling') return;
    try {
      window.localStorage.setItem(publicQuestionIndexKey(sessionToken), String(currentQuestionIndex));
    } catch {
      // Ignore storage failures; the survey remains usable without refresh restore.
    }
  }, [currentQuestionIndex, mode, session, sessionToken]);

  useEffect(() => {
    if (!submitError) return;
    if (submitError === 'Please enter your name before submitting.' && participantName.trim()) {
      setSubmitError(null);
      return;
    }
    if (!highlightedQuestionKey) return;
    if (!isResponseAnswered(structuredResponses[highlightedQuestionKey])) return;
    setSubmitError(null);
    setHighlightedQuestionKey(null);
  }, [highlightedQuestionKey, participantName, structuredResponses, submitError]);

  function validateResponses() {
    if (!session) return false;
    const result = isRichFillableDocumentTemplate(session.form.document_template)
      ? validateQuestionResponses(session.form.questions, structuredResponses)
      : isDocumentTemplate(session.form.document_template)
      ? validateDocumentTemplateResponses(session.form.document_template ?? '', structuredResponses)
      : validateQuestionResponses(session.form.questions, structuredResponses);

    if (!participantName.trim()) {
      setSubmitError('Please enter your name before submitting.');
      return false;
    }

    if (!result.ok) {
      setHighlightedQuestionKey(result.key);
      setSubmitError(result.message);
      requestAnimationFrame(() => {
        const element = document.querySelector<HTMLElement>(`[data-question-key="${result.key}"]`);
        element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
      return false;
    }

    setHighlightedQuestionKey(null);
    return true;
  }

  function clearResolvedValidationError(key: string, value: StructuredResponse) {
    if (highlightedQuestionKey !== key) return;
    if (!isResponseAnswered(value)) return;
    setHighlightedQuestionKey(null);
    setSubmitError(null);
  }

  async function handleSubmit() {
    if (!sessionToken || !validateResponses()) return;

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await submitPublicResponse(sessionToken, {
        participant_name: participantName.trim(),
        answers: normalizeAnswerRecord(structuredResponses),
      });
      try {
        window.localStorage.removeItem(publicQuestionIndexKey(sessionToken));
      } catch {
        // Ignore storage failures during submit cleanup.
      }
      setMode('submitted');
    } catch (err) {
      const detail = getApiErrorDetail(err);
      setSubmitError(detail || (err instanceof ApiError ? `Submission failed (HTTP ${err.status}).` : 'Submission failed.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (mode === 'error') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="card-lg p-8 sm:p-10 max-w-md w-full text-center space-y-5">
          <div style={{ margin: '0 auto', width: '48px', height: '48px' }}>
            <AlertCircle size={48} style={{ color: 'var(--destructive)' }} />
          </div>
          <h2 className="text-xl font-semibold text-foreground">Unable to load form</h2>
          <p className="text-sm text-muted-foreground" role="alert">{loadError}</p>
          <LoadingButton variant="accent" size="md" onClick={loadSession}>Try Again</LoadingButton>
        </div>
      </div>
    );
  }

  if (!session || mode === 'loading') {
    return (
      <div className="min-h-screen bg-background px-4 py-6 sm:py-8">
        <div className="max-w-3xl mx-auto card-lg p-6 sm:p-8 space-y-6">
          <Skeleton variant="text" width="140px" height="0.875rem" />
          <Skeleton variant="text" width="70%" height="1.75rem" />
          <Skeleton variant="card" height="6rem" />
        </div>
      </div>
    );
  }

  const isDocumentMode = isDocumentTemplate(session.form.document_template);
  const isDiagnosticLikert = isDiagnosticLikertDemo(session);

  if (mode === 'submitted') {
    return (
      <div className="min-h-screen bg-background px-4 py-6 sm:py-8">
        <div className="max-w-2xl mx-auto card-lg p-6 sm:p-8 text-center space-y-4">
          <h1 className="text-2xl font-semibold text-foreground">Response submitted</h1>
          <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
            Your response for {session.form.title} has been recorded.
          </p>
          <LoadingButton variant="accent" size="md" onClick={() => navigate(`/share/${session.form.join_code}`)}>
            Return to share page
          </LoadingButton>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-background py-4 sm:py-8 ${isDiagnosticLikert ? 'px-2 sm:px-4' : 'px-4'}`}>
      <div className={`${isDiagnosticLikert ? 'max-w-4xl' : 'max-w-3xl'} mx-auto`}>
        <BackLink to={`/share/${session.form.join_code}`} label="Share Page" className="mb-4" />

        <div className={`card-lg ${isDiagnosticLikert ? 'p-3 sm:p-7' : 'p-6 sm:p-8'}`}>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">{session.form.title}</h1>
          {isDiagnosticLikert && session.form.selected_round_number ? (
            <div
              className="mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--accent) 10%, transparent)',
                color: 'var(--accent)',
              }}
            >
              Round {session.form.selected_round_number}
            </div>
          ) : null}
          {session.form.description ? (
            <p className="mt-2 text-sm" style={{ color: 'var(--muted-foreground)' }}>
              {session.form.description}
            </p>
          ) : null}

          <div className="mt-5 mb-6">
            <label htmlFor="public-participant-name" className="block text-sm font-medium text-foreground">
              Your name
            </label>
            <input
              id="public-participant-name"
              type="text"
              value={participantName}
              onChange={(event) => {
                const nextName = event.target.value;
                setParticipantName(nextName);
                scheduleDraftSave(structuredResponses, nextName);
              }}
              className="mt-2 w-full rounded-lg px-4 py-3 text-sm"
              style={{
                border: '1px solid var(--input)',
                backgroundColor: 'var(--background)',
                color: 'var(--foreground)',
              }}
              placeholder="Enter your name"
            />
            {session.upload_filename ? (
              <p className="mt-2 text-xs" style={{ color: 'var(--muted-foreground)' }}>
                Uploaded file: {session.upload_filename}
              </p>
            ) : null}
          </div>

          {!isDiagnosticLikert ? (
          <div className="mb-2">
            <h2 className="text-lg font-semibold text-foreground">
              {isDocumentMode ? 'Document Template' : 'Questions'}
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {isDocumentMode
                ? 'Complete each marked section in the template below.'
                : 'Please complete each required question before submitting.'}
            </p>
          </div>
          ) : null}

          {isDocumentMode && session.form.document_template ? (
            <DocumentTemplateResponse
              template={session.form.document_template}
              questions={session.form.questions}
              answers={structuredResponses}
              highlightedQuestionKey={highlightedQuestionKey}
              onChange={(key, val) => {
                clearResolvedValidationError(key, val);
                setStructuredResponses((prev) => {
                  const next = { ...prev, [key]: val };
                  scheduleDraftSave(next, participantName);
                  return next;
                });
              }}
            />
          ) : (
            <SurveyQuestionList
              questions={session.form.questions}
              formId={`public-${session.form.id}`}
              responses={structuredResponses}
              onChange={(key, val) => {
                clearResolvedValidationError(key, val);
                setStructuredResponses((prev) => {
                  const next = { ...prev, [key]: val };
                  scheduleDraftSave(next, participantName);
                  return next;
                });
              }}
              highlightedQuestionKey={highlightedQuestionKey}
              presentation={isDiagnosticLikert ? 'diagnosticLikert' : 'default'}
              diagnosticMode={isDiagnosticLikert ? 'single' : undefined}
              currentQuestionIndex={isDiagnosticLikert ? currentQuestionIndex : undefined}
              onQuestionIndexChange={isDiagnosticLikert ? setCurrentQuestionIndex : undefined}
              onSubmit={isDiagnosticLikert ? handleSubmit : undefined}
              submitLoading={isSubmitting}
              submitLoadingLabel="Submitting..."
            />
          )}

          {isDiagnosticLikert ? null : (
          <LoadingButton
            variant="accent"
            size="lg"
            className="w-full"
            loading={isSubmitting}
            loadingText="Submitting…"
            onClick={handleSubmit}
          >
            Submit
          </LoadingButton>
          )}

          <div className="mt-2 px-1">
            <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
              {draftStatus === 'saving' && 'Saving draft…'}
              {draftStatus === 'saved' && 'Draft saved'}
              {draftStatus === 'error' && 'Draft save failed'}
              {draftStatus === 'idle' && '\u00A0'}
            </span>
          </div>

          {submitError ? (
            <div
              className="rounded-lg p-3 mt-3 text-sm text-center"
              role="alert"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--destructive) 10%, transparent)',
                border: '1px solid var(--destructive)',
                color: 'var(--destructive)',
              }}
            >
              {submitError}
            </div>
          ) : null}

          {session.form.previous_round_synthesis ? (
            <PreviousSynthesisToggle content={session.form.previous_round_synthesis} />
          ) : null}
        </div>
      </div>
    </div>
  );
}
