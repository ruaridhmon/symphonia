import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { API_BASE_URL } from './config'
import { LoadingButton, SynthesisDisplay, PresenceIndicator, StructuredInput } from './components'
import { usePresence } from './hooks/usePresence'
import type { StructuredResponse } from './types/structured-input'
import { emptyStructuredResponse, autoSaveKey } from './types/structured-input'

type Form = {
  id: number
  title: string
  questions: string[]
  allow_join: boolean
  join_code: string
}

type ActiveRound = {
  id: number
  round_number: number
  synthesis: string
  is_active: boolean
  questions: string[]
}

export default function FormPage() {

  const { id } = useParams()

  const navigate = useNavigate()



  const formId = id ? Number(id) : null

  const [email] = useState(() => localStorage.getItem('email') || '')

  const [form, setForm] = useState<Form | null>(null)

  const [activeRound, setActiveRound] = useState<ActiveRound | null>(null)

  const [previousSynthesis, setPreviousSynthesis] = useState('')

  const [roundQuestions, setRoundQuestions] = useState<string[]>([])

  const [structuredResponses, setStructuredResponses] = useState<Record<string, StructuredResponse>>({})

  const [hasSubmitted, setHasSubmitted] = useState(false)

  const [isSubmitting, setIsSubmitting] = useState(false)

  const [mode, setMode] = useState('loading') // loading, filling, reviewing

  // Real-time presence
  const { viewers } = usePresence({
    formId,
    page: 'form',
    userEmail: email,
  })

  /** Build initial empty structured responses for a set of questions */
  const buildEmptyResponses = useCallback((questions: string[]) => {
    return Object.fromEntries(
      questions.map((_: string, i: number) => [`q${i + 1}`, emptyStructuredResponse()])
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


  useEffect(() => {

    const token = localStorage.getItem('access_token')

    if (!token || !id) return



    const headers = { Authorization: `Bearer ${token}` }



    async function load() {

      const formRes = await fetch(`${API_BASE_URL}/forms/${id}`, { headers })

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

    }



    load()

  }, [id, buildEmptyResponses, legacyToStructured])



  async function submitForm() {

    const token = localStorage.getItem('access_token')

    if (!token || !id) return



    setIsSubmitting(true)

    try {

      await fetch(`${API_BASE_URL}/submit`, {

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

      // Clear auto-save data on successful submit
      roundQuestions.forEach((_, i) => {
        try {
          localStorage.removeItem(autoSaveKey(id, i))
        } catch { /* ignore */ }
      })

      navigate('/waiting')

    } finally {

      setIsSubmitting(false)

    }

  }



  if (!form || mode === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="waiting-orbit">
          <div className="waiting-orbit-dot" />
          <div className="waiting-orbit-dot" />
          <div className="waiting-orbit-dot" />
          <div className="waiting-orbit-dot" />
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

        <div className="flex items-center gap-4 mb-1">
          <h1 className="text-2xl font-bold text-foreground">{form.title}</h1>
          <PresenceIndicator viewers={viewers} currentUserEmail={email} />
        </div>



        {activeRound && (

          <p className="text-muted-foreground mb-4">

            Round {activeRound.round_number}

          </p>

        )}



        {previousSynthesis && (

          <div className="mb-6 fade-in">

            <SynthesisDisplay

              content={previousSynthesis}

              title="Synthesis from the previous round"

            />

          </div>

        )}



        {mode === 'reviewing' ? (

          <div>

            <h2 className="text-lg font-semibold mb-4 border-b border-border pb-2 text-foreground">
              Your Submitted Answers
            </h2>

            {roundQuestions.map((q, i) => {

              const key = `q${i + 1}`

              return (

                <div key={key} className="mb-6">

                  <label className="block text-sm font-semibold text-foreground mb-2">{q}</label>

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

                  <label className="block text-sm font-medium mb-2 text-foreground">{q}</label>

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

          </>

        )}

      </div>

    </div>

  )

}
