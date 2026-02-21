import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { API_BASE_URL } from './config'
import { LoadingButton, SynthesisDisplay, PresenceIndicator, StructuredInput } from './components'
import Skeleton, { SkeletonCard } from './components/Skeleton'
import { usePresence } from './hooks/usePresence'
import type { StructuredResponse } from './types/structured-input'
import { emptyStructuredResponse, autoSaveKey } from './types/structured-input'
import { extractQuestionText } from './utils/questions'
import { useDocumentTitle } from './hooks/useDocumentTitle'

type Form = {
  id: number
  title: string
  questions: (string | Record<string, unknown>)[]
  allow_join: boolean
  join_code: string
}

type ActiveRound = {
  id: number
  round_number: number
  synthesis: string
  is_active: boolean
  questions: (string | Record<string, unknown>)[]
}

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
  const legacyToStructured = useCallback((answers: Record<string, string | StructuredResponse>): Record<string, StructuredResponse> => {
    const result: Record<string, StructuredResponse> = {}
    for (const [key, val] of Object.entries(answers)) {
      if (typeof val === 'string') {
        // Legacy: plain text → put it in the position field
        result[key] = { ...emptyStructuredResponse(), position: val }
      } else if (val && typeof val === 'object' && 'position' in val) {
        // Already structured
        result[key] = val as StructuredResponse
      } else {
        result[key] = emptyStructuredResponse()
      }
    }
    return result
  }, [])


  const loadForm = useCallback(async () => {
    const token = localStorage.getItem('access_token')
    if (!token || !id) return

    setLoadError(null)
    setMode('loading')

    const headers = { Authorization: `Bearer ${token}` }

    try {
      const formRes = await fetch(`${API_BASE_URL}/forms/${id}`, { headers })
      if (!formRes.ok) throw new Error(`Failed to load form (HTTP ${formRes.status})`)
      const formData = await formRes.json()
      setForm(formData)

      const roundRes = await fetch(`${API_BASE_URL}/forms/${id}/active_round`, {
        headers
      })

      if (!roundRes.ok) {
        const fallbackQuestions = Array.isArray(formData.questions)
          ? formData.questions
          : []

        setRoundQuestions(fallbackQuestions)
        setStructuredResponses(buildEmptyResponses(fallbackQuestions))
        setMode('filling');
        return
      }

      const roundData = await roundRes.json()

      const questions =
        Array.isArray(roundData.questions) && roundData.questions.length > 0
          ? roundData.questions
          : formData.questions || []

      setActiveRound(roundData)
      setRoundQuestions(questions)

      // Check if user has already submitted
      const hasSubmittedRes = await fetch(`${API_BASE_URL}/has_submitted?form_id=${id}`, { headers })
      const hasSubmittedData = await hasSubmittedRes.json()

      if (hasSubmittedData.submitted) {
        setHasSubmitted(true)
        setMode('reviewing')
        const myResponseRes = await fetch(`${API_BASE_URL}/form/${id}/my_response`, { headers })
        const myResponseData = await myResponseRes.json()
        if (myResponseData.answers) {
          setStructuredResponses(legacyToStructured(myResponseData.answers))
        }
      } else {
        setHasSubmitted(false)
        setMode('filling')
        setStructuredResponses(buildEmptyResponses(questions))
      }

      setPreviousSynthesis(roundData.previous_round_synthesis || '')
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load form. Please try again.')
      setMode('error')
    }
  }, [id, buildEmptyResponses, legacyToStructured])

  useEffect(() => {
    loadForm()
  }, [loadForm])



  async function submitForm() {

    const token = localStorage.getItem('access_token')

    if (!token || !id) return



    setIsSubmitting(true)
    setSubmitError(null)

    try {

      const res = await fetch(`${API_BASE_URL}/submit`, {

        method: 'POST',

        headers: {

          'Content-Type': 'application/x-www-form-urlencoded',

          Authorization: `Bearer ${token}`

        },

        body: new URLSearchParams({

          form_id: id,

          answers: JSON.stringify(structuredResponses)

        })

      })

      if (!res.ok) throw new Error(`Submission failed (HTTP ${res.status})`)

      // Clear auto-save data on successful submit
      roundQuestions.forEach((_, i) => {
        try {
          localStorage.removeItem(autoSaveKey(id, i))
        } catch { /* ignore */ }
      })

      navigate('/waiting', {
        state: {
          formId: id,
          formTitle: form?.title,
          roundNumber: activeRound?.round_number,
        },
      })

    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Submission failed. Your answers are saved locally — please try again.')
    } finally {

      setIsSubmitting(false)

    }

  }


  if (mode === 'error') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="card-lg p-8 sm:p-10 max-w-md w-full text-center space-y-5">
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: 'var(--destructive)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: '24px',
              fontWeight: 'bold',
              margin: '0 auto',
            }}
          >
            !
          </div>
          <h2 className="text-xl font-semibold text-foreground">Unable to load form</h2>
          <p className="text-sm text-muted-foreground" role="alert" aria-live="polite">{loadError}</p>
          <div className="flex gap-3 justify-center">
            <LoadingButton variant="accent" size="md" onClick={loadForm}>
              Try Again
            </LoadingButton>
            <LoadingButton variant="ghost" size="md" onClick={() => navigate('/')}>
              Back to Dashboard
            </LoadingButton>
          </div>
        </div>
      </div>
    )
  }

  if (!form || mode === 'loading') {
    return (
      <div className="min-h-screen bg-background px-4 py-6 sm:py-8">
        <div className="max-w-3xl mx-auto card-lg p-6 sm:p-8 space-y-6">
          {/* Back button skeleton */}
          <Skeleton variant="text" width="140px" height="0.875rem" />
          {/* Title skeleton */}
          <Skeleton variant="text" width="70%" height="1.75rem" />
          {/* Round label */}
          <Skeleton variant="text" width="80px" height="1rem" />
          {/* Question skeletons */}
          <div className="space-y-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="space-y-2">
                <Skeleton variant="text" width={`${50 + i * 10}%`} height="0.875rem" />
                <Skeleton variant="card" height="6rem" />
              </div>
            ))}
          </div>
          {/* Submit button skeleton */}
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



        {/* Questions section header — primary focus */}
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

              return (

                <div key={key} className="mb-6">

                  <label className="block text-sm font-semibold text-foreground mb-2">{extractQuestionText(q)}</label>

                  <StructuredInput
                    questionIndex={i}
                    formId={id!}
                    value={structuredResponses[key] ?? emptyStructuredResponse()}
                    onChange={() => {}}
                    readOnly
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

              return (

                <div key={key} className="mb-6">

                  <label className="block text-sm font-medium mb-2 text-foreground">{extractQuestionText(q)}</label>

                  <StructuredInput
                    questionIndex={i}
                    formId={id!}
                    value={structuredResponses[key] ?? emptyStructuredResponse()}
                    onChange={(val) =>
                      setStructuredResponses(prev => ({
                        ...prev,
                        [key]: val,
                      }))
                    }
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

              onClick={submitForm}

            >

              {hasSubmitted ? 'Update Response' : 'Submit'}

            </LoadingButton>

            <div aria-live="polite" aria-atomic="true">
              {submitError && (
                <div
                  className="rounded-lg p-3 text-sm text-center"
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
      >
        <div className="flex items-center gap-2">
          <span
            className="text-sm font-semibold"
            style={{ color: 'var(--foreground)' }}
          >
            📋 Previous Round Synthesis
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
        <span
          className="text-sm transition-transform"
          style={{
            color: 'var(--muted-foreground)',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        >
          ▾
        </span>
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
