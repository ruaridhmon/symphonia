import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ClipboardList, AlertCircle, ChevronDown } from 'lucide-react'
import { getForm, Form, acceptFormConsent } from './api/forms'
import { getActiveRound, ActiveRound } from './api/rounds'
import { submitResponse, hasSubmitted as checkSubmitted, getMyResponse, saveDraft, getDraft, deleteDraft } from './api/responses'
import { ApiError, getApiErrorDetail } from './api/client'
import { BackLink, LoadingButton, SynthesisDisplay, PresenceIndicator, StructuredInput } from './components'
import ConsentGate from './components/ConsentGate'
import DocumentTemplateResponse from './components/DocumentTemplateResponse'
import SurveyQuestionList from './components/SurveyQuestionList'
import Skeleton, { SkeletonCard } from './components/Skeleton'
import OwnResponseCard from './components/OwnResponseCard'
import { PreviousRoundStatisticsPanel, RoundIntroCard, type PreviousRoundStatistics } from './components/RoundIntroCard'
import { usePresence } from './hooks/usePresence'
import type { StructuredResponse } from './types/structured-input'
import { emptyStructuredResponse, autoSaveKey } from './types/structured-input'
import { normalizeAnswerRecord } from './utils/answers'
import { isResponseAnswered, validateDocumentTemplateResponses, validateQuestionResponses } from './utils/responseValidation'
import {
  buildInitialDocumentTemplateResponses,
  isDocumentTemplate,
  isEditableDocumentTemplate,
  isRichFillableDocumentTemplate,
  remapRichFillableAnswersToQuestionOrder,
} from './utils/documentTemplate'
import { useDocumentTitle } from './hooks/useDocumentTitle'

export default function FormPage() {
  useDocumentTitle('Submit Response')
  const { id } = useParams()
  const navigate = useNavigate()

  const formId = id ? Number(id) : null

  const [email] = useState(() => localStorage.getItem('email') || '')

  const [form, setForm] = useState<Form | null>(null)
  const [activeRound, setActiveRound] = useState<ActiveRound | null>(null)
  const [previousSynthesis, setPreviousSynthesis] = useState('')
  const [previousRoundQuestions, setPreviousRoundQuestions] = useState<(string | Record<string, unknown>)[]>([])
  const [previousStatistics, setPreviousStatistics] = useState<PreviousRoundStatistics | null>(null)
  const [previousOwnResponse, setPreviousOwnResponse] = useState<Record<string, unknown> | null>(null)
  const [roundQuestions, setRoundQuestions] = useState<(string | Record<string, unknown>)[]>([])
  const [structuredResponses, setStructuredResponses] = useState<Record<string, StructuredResponse>>({})
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [mode, setMode] = useState('loading') // loading, filling, reviewing, error
  const [loadError, setLoadError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [consentChecked, setConsentChecked] = useState(false)
  const [consentError, setConsentError] = useState<string | null>(null)
  const [isAcceptingConsent, setIsAcceptingConsent] = useState(false)
  const [draftStatus, setDraftStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [draftRestored, setDraftRestored] = useState(false)
  const [highlightedQuestionKey, setHighlightedQuestionKey] = useState<string | null>(null)
  const [templatePagination, setTemplatePagination] = useState({ currentPage: 1, totalPages: 1, isLastPage: true })
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latestResponsesRef = useRef<Record<string, StructuredResponse>>({})

  // Real-time presence
  const { viewers } = usePresence({
    formId,
    page: 'form',
    userEmail: email,
  })

  /** Build initial empty structured responses for a set of questions */
  const buildEmptyResponses = useCallback((questions: (string | Record<string, unknown>)[], documentTemplate?: string | null) => {
    const base = Object.fromEntries(
      questions.map((_: string | Record<string, unknown>, i: number) => [`q${i + 1}`, emptyStructuredResponse()])
    ) as Record<string, StructuredResponse>
    if (documentTemplate && isEditableDocumentTemplate(documentTemplate)) {
      return {
        ...base,
        ...buildInitialDocumentTemplateResponses(documentTemplate),
      }
    }
    return base
  }, [])

  /** Convert legacy flat string answers to structured responses */
  const legacyToStructured = useCallback((answers: Record<string, unknown>): Record<string, StructuredResponse> => {
    return normalizeAnswerRecord(answers)
  }, [])

  /** Debounced server-side draft save (2s after last keystroke) */
  const scheduleDraftSave = useCallback((answers: Record<string, StructuredResponse>) => {
    if (!formId) return
    latestResponsesRef.current = answers
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current)
    draftTimerRef.current = setTimeout(async () => {
      try {
        setDraftStatus('saving')
        await saveDraft(formId, latestResponsesRef.current)
        setDraftStatus('saved')
        // Reset status after 3s
        setTimeout(() => setDraftStatus((s) => s === 'saved' ? 'idle' : s), 3000)
      } catch {
        setDraftStatus('error')
      }
    }, 2000)
  }, [formId])

  const saveDraftNow = useCallback(async () => {
    if (!formId) return
    if (draftTimerRef.current) {
      clearTimeout(draftTimerRef.current)
      draftTimerRef.current = null
    }
    try {
      setDraftStatus('saving')
      await saveDraft(formId, latestResponsesRef.current)
      setDraftStatus('saved')
      setTimeout(() => setDraftStatus((s) => s === 'saved' ? 'idle' : s), 3000)
    } catch {
      setDraftStatus('error')
      throw new Error('Draft save failed')
    }
  }, [formId])

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (draftTimerRef.current) clearTimeout(draftTimerRef.current)
    }
  }, [])

  const loadForm = useCallback(async () => {
    if (!id) return

    setLoadError(null)
    setMode('loading')
    setDraftRestored(false)

    try {
      const formData = await getForm(Number(id))
      setForm(formData as Form)

      let roundData: ActiveRound | null = null
      try {
        roundData = await getActiveRound(Number(id))
      } catch (err) {
        // No active round — fall back to form questions
        if (!(err instanceof ApiError) || err.status !== 404) throw err
      }

      const questions =
        roundData && Array.isArray(roundData.questions) && roundData.questions.length > 0
          ? roundData.questions
          : (formData as Form).questions || []

      setActiveRound(roundData)
      setRoundQuestions(questions)

      // Check if user has already submitted
      try {
        const submitStatus = await checkSubmitted(Number(id))
        if (submitStatus.submitted) {
          setHasSubmitted(true)
          let nextResponses = buildEmptyResponses(questions, formData.document_template)
          try {
            const myResp = await getMyResponse(Number(id))
            if (myResp.answers) {
              nextResponses = legacyToStructured(myResp.answers)
            }
          } catch {
            // Fall back to empty structured responses when the submitted payload
            // is unavailable.
          }
          if (isRichFillableDocumentTemplate(formData.document_template)) {
            nextResponses = remapRichFillableAnswersToQuestionOrder(
              formData.document_template ?? '',
              questions,
              nextResponses,
            )
          }
          setStructuredResponses(nextResponses)
          setMode('reviewing')
        } else {
          setHasSubmitted(false)
          let nextResponses = buildEmptyResponses(questions, formData.document_template)
          let restoredDraft = false
          // Try to restore server-side draft first
          try {
            const { draft } = await getDraft(Number(id))
            if (draft?.answers) {
              nextResponses = legacyToStructured(draft.answers as Record<string, string | StructuredResponse>)
              restoredDraft = true
            }
          } catch {
            // Fall back to empty structured responses when no draft exists.
          }
          if (isRichFillableDocumentTemplate(formData.document_template)) {
            nextResponses = remapRichFillableAnswersToQuestionOrder(
              formData.document_template ?? '',
              questions,
              nextResponses,
            )
          }
          setStructuredResponses(nextResponses)
          setDraftRestored(restoredDraft)
          setMode('filling')
        }
      } catch {
        // If can't check submit status, assume not submitted
        setHasSubmitted(false)
        let nextResponses = buildEmptyResponses(questions, formData.document_template)
        let restoredDraft = false
        // Try to restore server-side draft
        try {
          const { draft } = await getDraft(Number(id))
          if (draft?.answers) {
            nextResponses = legacyToStructured(draft.answers as Record<string, string | StructuredResponse>)
            restoredDraft = true
          }
        } catch {
          // Fall back to empty structured responses when no draft exists.
        }
        if (isRichFillableDocumentTemplate(formData.document_template)) {
          nextResponses = remapRichFillableAnswersToQuestionOrder(
            formData.document_template ?? '',
            questions,
            nextResponses,
          )
        }
        setStructuredResponses(nextResponses)
        setDraftRestored(restoredDraft)
        setMode('filling')
      }

      setPreviousSynthesis(roundData?.previous_round_synthesis || '')
      setPreviousRoundQuestions(roundData?.previous_round_questions || [])
      setPreviousStatistics(roundData?.previous_round_statistics || null)
      setPreviousOwnResponse(roundData?.previous_round_own_response || null)
    } catch (err) {
      if (err instanceof ApiError) {
        // Status 0 or 401 = handled by apiClient (CF redirect / session expiry)
        if (err.status === 0 || err.status === 401) return;
        setLoadError(`Failed to load form (HTTP ${err.status})`)
      } else if (err instanceof TypeError) {
        setLoadError('Network error. Please check your connection and try again.')
      } else {
        setLoadError(err instanceof Error ? err.message : 'Failed to load form. Please try again.')
      }
      setMode('error')
    }
  }, [id, buildEmptyResponses, legacyToStructured])

  useEffect(() => {
    loadForm()
  }, [loadForm])

  useEffect(() => {
    if (!submitError || !highlightedQuestionKey) return
    if (!isResponseAnswered(structuredResponses[highlightedQuestionKey])) return
    setSubmitError(null)
    setHighlightedQuestionKey(null)
  }, [highlightedQuestionKey, structuredResponses, submitError])

  async function handleAcceptConsent() {
    if (!formId || !form?.consent_required) return
    if (!consentChecked) {
      setConsentError('Please confirm consent before continuing.')
      return
    }

    setIsAcceptingConsent(true)
    setConsentError(null)
    try {
      await acceptFormConsent(formId)
      setForm((current) => current ? { ...current, consent_completed: true } : current)
    } catch (err) {
      setConsentError(getApiErrorDetail(err) || 'Could not save consent right now.')
    } finally {
      setIsAcceptingConsent(false)
    }
  }

  function validateResponses() {
    const result = isRichFillableDocumentTemplate(form?.document_template)
      ? validateQuestionResponses(roundQuestions, structuredResponses)
      : isDocumentMode && form?.document_template
      ? validateDocumentTemplateResponses(form.document_template, structuredResponses)
      : validateQuestionResponses(roundQuestions, structuredResponses)

    if (!result.ok) {
      setHighlightedQuestionKey(result.key)
      setSubmitError(result.message)
      requestAnimationFrame(() => {
        const element = document.querySelector<HTMLElement>(`[data-question-key="${result.key}"]`)
        element?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      })
      return false
    }

    setHighlightedQuestionKey(null)
    return true
  }

  function clearResolvedValidationError(key: string, value: StructuredResponse) {
    if (highlightedQuestionKey !== key) return
    if (!isResponseAnswered(value)) return
    setHighlightedQuestionKey(null)
    setSubmitError(null)
  }

  async function handleSubmit() {
    if (!id) return

    if (!validateResponses()) return

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      await submitResponse(Number(id), normalizeAnswerRecord(structuredResponses))
      localStorage.setItem('last_result_form_id', id)
      if (form?.title) localStorage.setItem('last_result_form_title', form.title)

      // Clear auto-save data on successful submit (local + server)
      roundQuestions.forEach((_, i) => {
        try {
          localStorage.removeItem(autoSaveKey(id, i))
        } catch { /* ignore */ }
      })
      try { await deleteDraft(Number(id)) } catch { /* ignore */ }

      navigate('/waiting', {
        state: {
          formId: id,
          formTitle: form?.title,
          roundNumber: activeRound?.round_number,
        },
      })
    } catch (err) {
      if (err instanceof ApiError) {
        const detail = getApiErrorDetail(err)
        setSubmitError(detail || `Submission failed (HTTP ${err.status}). Your answers are saved locally — please try again.`)
      } else {
        setSubmitError('Submission failed. Your answers are saved locally — please try again.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // Ctrl+Enter / ⌘+Enter keyboard shortcut to submit
  useEffect(() => {
    if (mode !== 'filling') return

    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        handleSubmit()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, structuredResponses, id])

  if (mode === 'error') {
    const friendlyError = loadError?.includes('fetch')
      ? 'Check your internet connection and try again.'
      : loadError

    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="card-lg p-8 sm:p-10 max-w-md w-full text-center space-y-5">
          <div style={{ margin: '0 auto', width: '48px', height: '48px' }}>
            <AlertCircle size={48} style={{ color: 'var(--destructive)' }} />
          </div>
          <h2 className="text-xl font-semibold text-foreground">Unable to load form</h2>
          <p className="text-sm text-muted-foreground" role="alert">{friendlyError}</p>
          <div className="flex gap-4 justify-center">
            <LoadingButton variant="accent" size="md" onClick={loadForm} style={{ minWidth: '120px' }}>
              Try Again
            </LoadingButton>
            <button
              onClick={() => navigate('/')}
              className="text-sm font-medium"
              style={{ color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', minWidth: '120px' }}
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!form || mode === 'loading') {
    return (
      <div className="min-h-screen bg-background px-4 py-6 sm:py-8">
        <div className="max-w-3xl mx-auto card-lg p-6 sm:p-8 space-y-6">
          <Skeleton variant="text" width="140px" height="0.875rem" />
          <Skeleton variant="text" width="70%" height="1.75rem" />
          <Skeleton variant="text" width="80px" height="1rem" />
          <div className="space-y-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="space-y-2">
                <Skeleton variant="text" width={`${50 + i * 10}%`} height="0.875rem" />
                <Skeleton variant="card" height="6rem" />
              </div>
            ))}
          </div>
          <Skeleton variant="button" width="100%" height="2.75rem" />
        </div>
      </div>
    )
  }

  const isDocumentMode = isDocumentTemplate(form.document_template)
  const showPreviousRoundExtras = !isDocumentMode
  const needsConsent = Boolean(form.consent_required && !form.consent_completed && !hasSubmitted)

  if (needsConsent) {
    return (
      <div className="min-h-screen bg-background px-4 py-6 sm:py-8">
        <div className="max-w-3xl mx-auto">
          <BackLink to="/" label="Dashboard" className="mb-4" />
          <ConsentGate
            title={form.title}
            description="Please review this information before entering the form."
            consentText={form.consent_text || ''}
            consentDocument={form.consent_document}
            checked={consentChecked}
            onCheckedChange={(value) => {
              setConsentChecked(value)
              if (value) setConsentError(null)
            }}
            onContinue={handleAcceptConsent}
            loading={isAcceptingConsent}
            continueLabel="Continue to form"
            error={consentError}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background px-4 py-6 sm:py-8">
      <div className="max-w-3xl mx-auto">
        <BackLink to="/" label="Dashboard" className="mb-4" />

        <div className="card-lg p-6 sm:p-8">

        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-1">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">{form.title}</h1>
          <PresenceIndicator viewers={viewers} currentUserEmail={email} />
        </div>

        {activeRound && (
          <p className="text-muted-foreground mb-4">
            Round {activeRound.round_number}
          </p>
        )}

        {/* Draft restored banner */}
        {draftRestored && (
          <div
            className="rounded-lg p-3 mb-4 flex items-center justify-between text-sm fade-in"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--accent) 8%, transparent)',
              border: '1px solid color-mix(in srgb, var(--accent) 30%, transparent)',
              color: 'var(--accent)',
            }}
          >
            <span>📝 Your previous draft has been restored.</span>
            <button
              onClick={() => setDraftRestored(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', fontSize: '1rem' }}
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        )}

        <RoundIntroCard
          title={activeRound?.context_settings?.intro_title}
          body={activeRound?.context_settings?.intro_body}
        />

        {showPreviousRoundExtras && previousStatistics && (
          <PreviousRoundStatisticsPanel statistics={previousStatistics} />
        )}

        {previousSynthesis && (
          <PreviousSynthesisToggle content={previousSynthesis} />
        )}
        {showPreviousRoundExtras && previousOwnResponse && (
          <OwnResponseCard
            answers={previousOwnResponse}
            questions={previousRoundQuestions}
            title="Your previous response"
            subtitle="Compare your earlier view with the anonymous group feedback before re-rating."
          />
        )}

        {/* Questions section header */}
        <div className="mb-2">
          <h2 className="text-lg font-semibold text-foreground">
            {mode === 'reviewing'
              ? (isDocumentMode ? 'Your Submitted Document' : 'Your Submitted Answers')
              : (isDocumentMode ? 'Round 2 briefing and questions' : 'Questions')}
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {mode === 'reviewing'
              ? (isDocumentMode
                ? 'Review the completed template below.'
                : 'Review your submitted responses below.')
              : (isDocumentMode
                ? 'Review the Round 2 summary and recommendations, then complete the questions.'
                : 'Please provide your expert input for each question below.')}
          </p>
        </div>

        {mode === 'reviewing' ? (
          <div>
            {isDocumentMode && form.document_template ? (
              <DocumentTemplateResponse
                template={form.document_template}
                questions={roundQuestions}
                answers={structuredResponses}
                highlightedQuestionKey={highlightedQuestionKey}
                readOnly
                paginate
                onPaginationChange={setTemplatePagination}
              />
            ) : (
              <SurveyQuestionList
                questions={roundQuestions}
                formId={id!}
                responses={structuredResponses}
                onChange={() => {}}
                readOnly
                persistDraft={false}
              />
            )}
            <LoadingButton
              variant="success"
              size="lg"
              className="w-full"
              onClick={() => setMode('filling')}
            >
              Edit Response
            </LoadingButton>
          </div>
        ) : (
          <>
            {isDocumentMode && form.document_template ? (
              <DocumentTemplateResponse
                template={form.document_template}
                questions={roundQuestions}
                answers={structuredResponses}
                highlightedQuestionKey={highlightedQuestionKey}
                paginate
                onBeforePageChange={saveDraftNow}
                onPaginationChange={setTemplatePagination}
                onChange={(key, val) => {
                  clearResolvedValidationError(key, val)
                  setStructuredResponses(prev => {
                    const next = { ...prev, [key]: val }
                    scheduleDraftSave(next)
                    return next
                  })
                }}
              />
            ) : (
              <SurveyQuestionList
                questions={roundQuestions}
                formId={id!}
                responses={structuredResponses}
                onChange={(key, val) => {
                  clearResolvedValidationError(key, val)
                  setStructuredResponses(prev => {
                    const next = { ...prev, [key]: val }
                    scheduleDraftSave(next)
                    return next
                  })
                }}
                highlightedQuestionKey={highlightedQuestionKey}
              />
            )}
            {isDocumentMode && !templatePagination.isLastPage ? null : (
              <LoadingButton
                variant="accent"
                size="lg"
                className="w-full"
                loading={isSubmitting}
                loadingText="Submitting…"
                onClick={handleSubmit}
              >
                {hasSubmitted ? 'Update Response' : 'Submit'}
              </LoadingButton>
            )}

            <div className="mt-2 px-1">
              <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                {draftStatus === 'saving' && '⏳ Saving draft…'}
                {draftStatus === 'saved' && '✓ Draft saved'}
                {draftStatus === 'error' && '⚠ Draft save failed'}
                {draftStatus === 'idle' && '\u00A0'}
              </span>
            </div>

            <div aria-live="polite" aria-atomic="true">
              {submitError && (
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
              )}
            </div>
          </>
        )}

        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Collapsible previous synthesis component                           */
/* ------------------------------------------------------------------ */
function PreviousSynthesisToggle({ content }: { content: string }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div
      className="mb-5 rounded-lg overflow-hidden transition-all"
      style={{
        border: '1px solid var(--border)',
        backgroundColor: 'var(--muted)',
      }}
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 text-left transition-colors"
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontFamily: 'inherit',
        }}
        aria-expanded={isOpen}
        aria-label="Previous Round Synthesis"
      >
        <div className="flex items-center gap-2">
          <ClipboardList size={16} style={{ color: 'var(--accent)' }} />
          <span
            className="text-sm font-semibold"
            style={{ color: 'var(--foreground)' }}
          >
            Previous Round Synthesis
          </span>
          <span
            className="text-xs px-2 py-0.5 rounded-full"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--accent) 12%, transparent)',
              color: 'var(--accent)',
            }}
          >
            Optional
          </span>
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
      {isOpen && (
        <div
          className="px-4 pb-4 fade-in"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          <SynthesisDisplay
            content={content}
            title="Synthesis from the previous round"
            subtitle="Review what emerged from the last round before submitting."
          />
        </div>
      )}
    </div>
  )
}
