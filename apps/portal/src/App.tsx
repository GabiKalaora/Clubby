import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import { Portal } from './Portal'
import './App.css'

type AuthState =
  | { status: 'loading' }
  | { status: 'unauthenticated' }
  | { status: 'authenticated'; userId: string; email: string }

export default function App() {
  const [auth, setAuth] = useState<AuthState>({ status: 'loading' })
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setAuth({ status: 'authenticated', userId: session.user.id, email: session.user.email! })
      else setAuth({ status: 'unauthenticated' })
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      if (session) setAuth({ status: 'authenticated', userId: session.user.id, email: session.user.email! })
      else setAuth({ status: 'unauthenticated' })
    })
    return () => subscription.unsubscribe()
  }, [])

  if (auth.status === 'loading') {
    return (
      <div className="page">
        <div className="spinner" />
      </div>
    )
  }

  if (auth.status === 'authenticated') {
    return <Portal userId={auth.userId} email={auth.email} />
  }

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(), password,
    })

    if (signInError) {
      if (signInError.message.toLowerCase().includes('invalid login credentials') ||
          signInError.message.toLowerCase().includes('email not confirmed')) {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(), password,
        })
        setLoading(false)
        if (signUpError) { setError(signUpError.message); return }
        if (signUpData.session) {
          setAuth({ status: 'authenticated', userId: signUpData.session.user.id, email: email.trim() })
        } else {
          setError('Account created. Please sign in.')
        }
      } else {
        setLoading(false)
        setError(signInError.message)
      }
      return
    }

    setLoading(false)
    if (signInData.session) {
      setAuth({ status: 'authenticated', userId: signInData.session.user.id, email: email.trim() })
    }
  }

  return (
    <div className="login-page">
      <div className="login-container">

        {/* Brand hero */}
        <div className="login-hero">
          <div className="login-hero-icon">🛍️</div>
          <div className="login-hero-name">Clubby</div>
          <div className="login-hero-tagline">Business Portal</div>
          <div className="login-hero-features">
            <span className="login-feature-pill">📊 Analytics</span>
            <span className="login-feature-pill">🎁 Promotions</span>
            <span className="login-feature-pill">👥 Members</span>
          </div>
        </div>

        {/* Form card */}
        <div className="login-form-card">
          <h2 className="login-form-title">Welcome</h2>
          <p className="login-form-sub">Sign in or create your business account</p>

          <form onSubmit={handleAuth} className="login-form">
            <div className="login-input-group">
              <span className="login-input-icon">✉️</span>
              <input
                type="email"
                placeholder="owner@yourbusiness.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
                className="login-input"
              />
            </div>
            <div className="login-input-group">
              <span className="login-input-icon">🔒</span>
              <input
                type="password"
                placeholder="Password (min 6 chars)"
                value={password}
                onChange={e => setPassword(e.target.value)}
                minLength={6}
                required
                className="login-input"
              />
            </div>
            <button type="submit" className="login-btn" disabled={loading || !email || password.length < 6}>
              {loading ? 'Signing in…' : 'Sign in / Create account'}
            </button>
          </form>

          {error && <p className="error" style={{ marginTop: 12 }}>{error}</p>}

          <p className="login-hint">New here? An account is created automatically on first sign-in.</p>
        </div>

      </div>
    </div>
  )
}
