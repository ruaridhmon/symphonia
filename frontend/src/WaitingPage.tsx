import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_BASE_URL } from './config'

export default function WaitingPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) return

    const fetchMeAndCheckSummary = async () => {
      try {
        // get user info
        const res = await fetch(`${API_BASE_URL}/me`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (res.ok) {
          const data = await res.json()
          setEmail(data.email || '')
        }
      } catch (err) {
        console.error('[WaitingPage] ❌ Fetch error:', err)
      }

      // only open websocket if still waiting
      const wsUrl = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${new URL(API_BASE_URL).host}/ws`

      const ws = new WebSocket(wsUrl)

      ws.onopen = () => {
        console.log('[WaitingPage] ✅ WebSocket connected')
      }

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data)
          if (msg.type === 'summary_updated') {
            console.log('[WaitingPage] 🟢 Summary update received — navigating to /result')
            navigate('/result', { replace: true })
          }
        } catch (err) {
          console.error('[WaitingPage] ❌ Failed to parse message:', err)
        }
      }

      ws.onerror = (err) => {
        console.error('[WaitingPage] ❌ WebSocket error:', err)
      }

      ws.onclose = () => {
        console.log('[WaitingPage] 🔌 WebSocket closed')
      }

      return () => {
        ws.close()
      }
    }

    fetchMeAndCheckSummary()
  }, [navigate])

  function logout() {
    localStorage.clear()
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex flex-col">
      <header className="bg-card border-b border-border shadow-card">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Collaborative Consensus
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Logged in as <strong className="text-foreground">{email}</strong>
            </p>
          </div>
          <button onClick={logout} className="text-sm text-destructive underline">
            Log out
          </button>
        </div>
      </header>

      <main className="flex-grow px-4 py-6 sm:py-8 max-w-6xl mx-auto flex justify-center items-center">
        <div className="card-lg p-8 sm:p-10 max-w-3xl w-full text-center space-y-6">
          <h2 className="text-2xl font-semibold text-foreground">Thank you for your submission</h2>
          <p className="text-lg text-muted-foreground max-w-md mx-auto">
            Your response has been recorded. You will be notified when the next round begins.
          </p>
          <button
            onClick={() => navigate('/')}
            className="mt-4 text-sm text-accent underline"
          >
            ← Back to Dashboard
          </button>
        </div>
      </main>

      <footer className="bg-card border-t border-border text-center py-4 text-sm text-muted-foreground">
        © {new Date().getFullYear()} – Waiting for next round…
      </footer>
    </div>
  )
}
