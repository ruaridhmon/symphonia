import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_BASE_URL } from './config'

export default function ThankYouPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')

  useEffect(() => {
    const fetchMe = async () => {
      const token = localStorage.getItem('access_token')
      if (!token) return

      try {
        const res = await fetch(`${API_BASE_URL}/me`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (res.ok) {
          const data = await res.json()
          setEmail(data.email || '')
        }
      } catch {}
    }

    fetchMe()
  }, [])

  function logout() {
    localStorage.clear()
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex flex-col">
      <header className="bg-card border-b border-border shadow-card">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-col items-center justify-center text-center">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-2 text-foreground">
            SAC Collaborative Consensus
          </h1>
          <div className="text-sm text-muted-foreground mb-1">
            Logged in as <strong className="text-foreground">{email}</strong>
          </div>
          <button onClick={logout} className="text-sm text-destructive underline">
            Log out
          </button>
        </div>
      </header>

      <main className="flex-grow px-4 py-6 sm:py-8 max-w-6xl mx-auto flex justify-center items-center">
        <div className="card-lg p-8 sm:p-10 max-w-3xl w-full text-center space-y-4">
          <h2 className="text-2xl font-semibold text-foreground">Thank you for your submission</h2>
          <p className="text-lg text-muted-foreground max-w-md mx-auto">
            Your reflections have been recorded successfully.
          </p>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            We appreciate your contribution to this collaborative process.
          </p>
        </div>
      </main>

      <footer className="bg-card border-t border-border text-center py-4 text-sm text-muted-foreground">
        © {new Date().getFullYear()} – Feedback complete
      </footer>
    </div>
  )
}
