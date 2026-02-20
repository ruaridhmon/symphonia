import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { API_BASE_URL } from './config'

export default function AdminFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [form, setForm] = useState(null)
  const [rounds, setRounds] = useState([])
  const token = localStorage.getItem('access_token')

  useEffect(() => {
    loadForm()
    loadRounds()
  }, [id])

  async function loadForm() {
    const r = await fetch(`${API_BASE_URL}/forms/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    const data = await r.json()
    setForm(data)
  }

  async function loadRounds() {
    const r = await fetch(`${API_BASE_URL}/forms/${id}/rounds`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    const d = await r.json()
    setRounds(d)
  }

  async function closeRound() {
    await fetch(`${API_BASE_URL}/forms/${id}/close_round`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    })
    loadRounds()
  }

  async function nextRound() {
    await fetch(`${API_BASE_URL}/forms/${id}/next_round`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    })
    loadRounds()
  }

  if (!form) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground text-lg">Loading…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background px-4 sm:px-6 py-6 sm:py-8">
      <div className="max-w-5xl mx-auto">
        <button onClick={() => navigate('/')} className="text-accent underline text-sm">
          ← Back
        </button>

        <h1 className="text-2xl font-bold my-4 text-foreground">{form.title}</h1>

        <h2 className="text-lg font-semibold mb-3 text-foreground">Rounds</h2>

        {rounds.map(r => (
          <div key={r.id} className="card p-4 mb-2">
            <p className="text-foreground font-medium">Round {r.round_number}</p>
            <p className={r.is_active ? 'text-success font-medium' : 'text-muted-foreground'}>
              {r.is_active ? 'Active' : 'Closed'}
            </p>
          </div>
        ))}

        <div className="mt-6 flex gap-3">
          <button
            onClick={closeRound}
            className="btn btn-destructive px-5 py-2"
          >
            Close Current Round
          </button>

          <button
            onClick={nextRound}
            className="btn btn-accent px-5 py-2"
          >
            Open Next Round
          </button>
        </div>

        <div className="mt-8">
          <a
            href={`/admin/form/${id}/summary`}
            className="text-accent underline text-sm"
          >
            Open Summary Page
          </a>
        </div>
      </div>
    </div>
  )
}
