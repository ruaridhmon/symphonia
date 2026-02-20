import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { API_BASE_URL } from './config'
import { LoadingButton, SynthesisDisplay } from './components'

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



  const [form, setForm] = useState<Form | null>(null)

  const [activeRound, setActiveRound] = useState<ActiveRound | null>(null)

  const [previousSynthesis, setPreviousSynthesis] = useState('')

  const [roundQuestions, setRoundQuestions] = useState<string[]>([])

  const [responses, setResponses] = useState<Record<string, string>>({})

  const [hasSubmitted, setHasSubmitted] = useState(false)

  const [isSubmitting, setIsSubmitting] = useState(false)

  const [mode, setMode] = useState('loading') // loading, filling, reviewing



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

        setResponses(

          Object.fromEntries(

            fallbackQuestions.map((_: any, i: number) => [`q${i + 1}`, ''])

          )

        )

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

          setResponses(myResponseData.answers)

        }

      } else {

        setHasSubmitted(false)

        setMode('filling')

        setResponses(

          Object.fromEntries(questions.map((_: any, i: number) => [`q${i + 1}`, '']))

        )

      }



      setPreviousSynthesis(roundData.previous_round_synthesis || '')

    }



    load()

  }, [id])



  function autoResize(e: React.ChangeEvent<HTMLTextAreaElement>) {

    e.target.style.height = 'auto'

    e.target.style.height = `${e.target.scrollHeight}px`

  }



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

          answers: JSON.stringify(responses)

        })

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

        <h1 className="text-2xl font-bold mb-1 text-foreground">{form.title}</h1>



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

                  <div className="w-full rounded-lg px-4 py-3 bg-muted min-h-[4rem] whitespace-pre-wrap text-foreground border border-border">

                    {responses[key] || <span className="text-muted-foreground">No answer provided</span>}

                  </div>

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

                  <textarea

                    rows={2}

                    className="w-full rounded-lg px-4 py-2.5 resize-none overflow-hidden bg-muted"

                    onInput={autoResize}

                    value={responses[key] || ''}

                    onChange={e =>

                      setResponses(prev => ({

                        ...prev,

                        [key]: e.target.value

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
