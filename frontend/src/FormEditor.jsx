import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { API_BASE_URL } from './config'

export default function FormEditor() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState('')
  const [questions, setQuestions] = useState([])
  const [joinCode, setJoinCode] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      navigate('/')
      return
    }

    fetch(`${API_BASE_URL}/forms/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(form => {
        setTitle(form.title)
        setQuestions(form.questions || [])
        setJoinCode(form.join_code)
        setLoading(false)
      })
  }, [id, navigate])

  async function saveForm() {
    const token = localStorage.getItem('access_token')

    const res = await fetch(`${API_BASE_URL}/forms/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        title,
        questions,
        allow_join: true,
        join_code: joinCode
      })
    })

    if (!res.ok) {
      alert('Failed to save edits')
      return
    }

    navigate('/')
  }

  function updateQuestion(i, value) {
    const updated = [...questions]
    updated[i] = value
    setQuestions(updated)
  }

  function addQuestion() {
    setQuestions(prev => [...prev, ''])
  }

  function removeQuestion(i) {
    const updated = questions.filter((_, idx) => idx !== i)
    setQuestions(updated)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground text-lg">Loading…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border shadow-card">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold tracking-tight text-foreground">{title}</h1>
          <button
            onClick={() => navigate('/')}
            className="text-sm text-accent underline"
          >
            ← Back to Dashboard
          </button>
        </div>
      </header>

      <div className="px-4 sm:px-6 py-6 sm:py-8 max-w-5xl mx-auto">
        <div className="card-lg p-6 sm:p-8 mb-6">
          <h2 className="text-lg font-semibold mb-4 text-foreground">Form Title</h2>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full rounded-lg px-3 py-2.5"
          />
        </div>

        <div className="card-lg p-6 sm:p-8 mb-6">
          <h2 className="text-lg font-semibold mb-4 text-foreground">Questions</h2>
          <div className="space-y-4">
            {questions.map((q, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  value={q}
                  onChange={e => updateQuestion(i, e.target.value)}
                  className="w-full rounded-lg px-3 py-2.5"
                />
                <button
                  className="text-destructive text-sm underline font-medium"
                  type="button"
                  onClick={() => removeQuestion(i)}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={addQuestion}
            type="button"
            className="text-accent underline mt-4 text-sm font-medium"
          >
            + Add question
          </button>
        </div>
        
        <div className="card-lg p-6 sm:p-8 flex justify-end items-center gap-3">
          <button
            onClick={saveForm}
            className="btn btn-accent px-6 py-2"
          >
            Save Edits
          </button>
          <button
            type="button"
            onClick={async () => {
              if (!window.confirm('Are you sure you want to delete this form?')) return
              await fetch(`${API_BASE_URL}/forms/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
              })
              navigate('/')
            }}
            className="btn btn-destructive px-5 py-2"
          >
            Delete Form
          </button>
        </div>
      </div>
    </div>
  )
}
