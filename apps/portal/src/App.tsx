import { useState } from 'react'
import { supabase } from './lib/supabase'
import { BusinessForm } from './components/BusinessForm'
import { QRDisplay } from './components/QRDisplay'
import './App.css'

type AppState =
  | { step: 'login' }
  | { step: 'form'; ownerId: string; email: string }
  | { step: 'qr'; ownerId: string; email: string; businessName: string; token: string }

export default function App() {
  const [state, setState] = useState<AppState>({ step: 'login' })
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Try sign-in first; if user not found, auto sign-up
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (signInError) {
      if (signInError.message.toLowerCase().includes('invalid login credentials') ||
          signInError.message.toLowerCase().includes('email not confirmed')) {
        // User likely doesn't exist — sign up
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        })
        setLoading(false)
        if (signUpError) { setError(signUpError.message); return }
        if (signUpData.session) {
          setState({ step: 'form', ownerId: signUpData.session.user.id, email: email.trim() })
        } else {
          // No session means confirmation email needed — but we have it disabled locally
          setError('Account created. Please try signing in.')
        }
      } else {
        setLoading(false)
        setError(signInError.message)
      }
      return
    }

    setLoading(false)
    if (signInData.session) {
      setState({ step: 'form', ownerId: signInData.session.user.id, email: email.trim() })
    }
  }

  if (state.step === 'login') {
    return (
      <div className="page">
        <div className="card login-card">
          <div className="logo-icon">🏪</div>
          <h1>Clubby Business Portal</h1>
          <p className="subtitle">Register your business and generate a QR code</p>
          <form onSubmit={handleAuth}>
            <input
              type="email"
              placeholder="owner@yourbusiness.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
            />
            <input
              type="password"
              placeholder="Password (min 6 chars)"
              value={password}
              onChange={e => setPassword(e.target.value)}
              minLength={6}
              required
            />
            <button type="submit" disabled={loading || !email || password.length < 6}>
              {loading ? 'Signing in…' : 'Sign in / Create account'}
            </button>
          </form>
          {error && <p className="error">{error}</p>}
        </div>
      </div>
    )
  }

  if (state.step === 'form') {
    return (
      <BusinessForm
        ownerId={state.ownerId}
        onCreated={(businessName, token) =>
          setState({ step: 'qr', ownerId: state.ownerId, email: state.email, businessName, token })
        }
      />
    )
  }

  return (
    <QRDisplay
      businessName={state.businessName}
      token={state.token}
      onCreateAnother={() => setState({ step: 'form', ownerId: state.ownerId, email: state.email })}
    />
  )
}
