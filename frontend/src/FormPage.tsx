import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ClipboardList, AlertCircle, ChevronDown } from 'lucide-react'
import { getForm, Form } from './api/forms'
import { getActiveRound, ActiveRound } from './api/rounds'
import { submitResponse, hasSubmitted as checkSubmitted, getMyResponse, saveDraft, getDraft, deleteDraft } from './api/responses'
import { ApiError } from './api/client'
import { LoadingButton, SynthesisDisplay, PresenceIndicator, StructuredInput } from './components'
import Skeleton, { SkeletonCard } from './components/Skeleton'
import { usePresence } from './hooks/usePresence'
import type { StructuredResponse } from './types/structured-input'
import { emptyStructuredResponse, autoSaveKey } from './types/structured-input'
import { extractQuestionOptions, extractQuestionText } from './utils/questions'
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
  const [roundQuestions, setRoundQuestions] = useState<(string | Record<string, unknown>)[]>([])
  const [structuredResponses, setStructuredResponses] = useState<Record<string, StructuredResponse>>({})
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [mode, setMode] = useState('loading') // loading, filling, reviewing, error
  const [loadError, setLoadError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [draftStatus, setDraftStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [draftRestored, setDraftRestored] = useState(false)
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latestResponsesRef = useRef<Record<string, StructuredResponse>>({})

  // Real-time presence
  const { viewers } = usePresence({
    formId,
    page: 'form',
    userEmail: email,
  })

  /** Build initial empty structured responses for a set of questions */
  const buildEmptyResponses = useCallback((questions: (string | Record<string, unknown>)[]) => {
    return Object.fromEntries(
      questions.map((_: string | Record<string, unknown>, i: number) => [`q${i + 1}`, emptyStructuredResponse()])
    ) as Record<string, StructuredResponse>
  }, [])

  /** Convert legacy flat string answers to structured responses */
  const legacyToStructured = useCallback((answers: Record<string, unknown>): Record<string, StructuredResponse> => {
    const result: Record<string, StructuredResponse> = {}
    for (const [key, val] of Object.entries(answers)) {
      if (typeof val === 'string') {
        result[key] = { ...emptyStructuredResponse(), position: val }
      } else if (
        val &&
        typeof val === 'object' &&
        'position' in val &&
        typeof (val as StructuredResponse).position === 'string'
      ) {
        result[key] = { ...emptyStructuredResponse(), ...(val as Partial<StructuredResponse>) }
      } else {
        result[key] = emptyStructuredResponse()
      }
    }
    return result
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
          setMode('reviewing')
          try {
            const myResp = await getMyResponse(Number(id))
            if (myResp.answers) {
              setStructuredResponses(legacyToStructured(myResp.answers))
            }
          } catch {
            setStructuredResponses(buildEmptyResponses(questions))
          }
        } else {
          setHasSubmitted(false)
          setMode('filling')
          // Try to restore server-side draft first
          try {
            const { draft } = await getDraft(Number(id))
            if (draft?.answers) {
              setStructuredResponses(legacyToStructured(draft.answers as Record<string, string | StructuredResponse>))
              setDraftRestored(true)
            } else {
              setStructuredResponses(buildEmptyResponses(questions))
            }
          } catch {
            setStructuredResponses(buildEmptyResponses(questions))
          }
        }
      } catch {
        // If can't check submit status, assume not submitted
        setHasSubmitted(false)
        setMode('filling')
        // Try to restore server-side draft
        try {
          const { draft } = await getDraft(Number(id))
          if (draft?.answers) {
            setStructuredResponses(legacyToStructured(draft.answers as Record<string, string | StructuredResponse>))
            setDraftRestored(true)
          } else {
            setStructuredResponses(buildEmptyResponses(questions))
          }
        } catch {
          setStructuredResponses(buildEmptyResponses(questions))
        }
      }

      setPreviousSynthesis(roundData?.previous_round_synthesis || '')
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

  async function handleSubmit() {
    if (!id) return

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      await submitResponse(Number(id), structuredResponses)

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
        setSubmitError(`Submission failed (HTTP ${err.status}). Your answers are saved locally — please try again.`)
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

  return (
    <div className="min-h-screen bg-background px-4 py-6 sm:py-8">
      <div className="max-w-3xl mx-auto card-lg p-6 sm:p-8">

        <div className="mb-4">
          <button
            onClick={() => navigate('/')}
            className="text-sm text-accent underline"
          >
            ← Back to Dashboard
          </button>
        </div>

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

        {/* Questions section header */}
        <div className="mb-2">
          <h2 className="text-lg font-semibold text-foreground">
            {mode === 'reviewing' ? 'Your Submitted Answers' : 'Questions'}
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {mode === 'reviewing'
              ? 'Review your submitted responses below.'
              : 'Please provide your expert input for each question below.'}
          </p>
        </div>

        {mode === 'reviewing' ? (
          <div>
            {roundQuestions.map((q, i) => {
              const key = `q${i + 1}`
              const options = extractQuestionOptions(q)
              return (
                <div key={key} className="mb-6">
                  <label className="block text-sm font-semibold text-foreground mb-2">{extractQuestionText(q)}</label>
                  <StructuredInput
                    questionIndex={i}
                    formId={id!}
                    value={structuredResponses[key] ?? emptyStructuredResponse()}
                    onChange={() => {}}
                    readOnly
                    showEvidence={options.requireEvidence}
                    showConfidence={options.requireConfidence}
                  />
                </div>
              )
            })}
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
            {roundQuestions.map((q, i) => {
              const key = `q${i + 1}`
              const options = extractQuestionOptions(q)
              return (
                <div key={key} className="mb-6">
                  <label className="block text-sm font-medium mb-2 text-foreground">{extractQuestionText(q)}</label>
                  <StructuredInput
                    questionIndex={i}
                    formId={id!}
                    value={structuredResponses[key] ?? emptyStructuredResponse()}
                    onChange={(val) => {
                      setStructuredResponses(prev => {
                        const next = { ...prev, [key]: val }
                        scheduleDraftSave(next)
                        return next
                      })
                    }}
                    showEvidence={options.requireEvidence}
                    showConfidence={options.requireConfidence}
                  />
                </div>
              )
            })}
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

            {/* Status bar: draft save + keyboard shortcut */}
            <div className="flex items-center justify-between mt-2 px-1">
              <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                {draftStatus === 'saving' && '⏳ Saving draft…'}
                {draftStatus === 'saved' && '✓ Draft saved'}
                {draftStatus === 'error' && '⚠ Draft save failed'}
                {draftStatus === 'idle' && '\u00A0'}
              </span>
              <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                <kbd style={{
                  padding: '1px 5px',
                  borderRadius: '3px',
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--muted)',
                  fontSize: '0.7rem',
                  fontFamily: 'inherit',
                }}>⌘</kbd>+<kbd style={{
                  padding: '1px 5px',
                  borderRadius: '3px',
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--muted)',
                  fontSize: '0.7rem',
                  fontFamily: 'inherit',
                }}>Enter</kbd> to submit
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

        {/* Previous round synthesis — collapsible, secondary to questions */}
        {previousSynthesis && (
          <PreviousSynthesisToggle content={previousSynthesis} />
        )}

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
