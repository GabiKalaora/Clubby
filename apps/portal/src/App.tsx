import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from './lib/supabase'
import { Portal } from './Portal'
import './App.css'

const THEME_KEY = 'clubby_theme'
type Theme = 'auto' | 'light' | 'dark'

export function applyTheme(theme: Theme) {
  const root = document.documentElement
  if (theme === 'dark') {
    root.setAttribute('data-theme', 'dark')
  } else if (theme === 'light') {
    root.setAttribute('data-theme', 'light')
  } else {
    root.removeAttribute('data-theme')
  }
  localStorage.setItem(THEME_KEY, theme)
}

export function getStoredTheme(): Theme {
  return (localStorage.getItem(THEME_KEY) as Theme) ?? 'auto'
}

type AuthState =
  | { status: 'loading' }
  | { status: 'unauthenticated' }
  | { status: 'authenticated'; userId: string; email: string }

export default function App() {
  const { t } = useTranslation()
  const [auth, setAuth] = useState<AuthState>({ status: 'loading' })
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Apply stored theme on mount
  useEffect(() => { applyTheme(getStoredTheme()) }, [])

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
          <img src="/wordmark.png" alt="Clubby" style={{ height: 48, objectFit: 'contain', marginBottom: 8 }} />
          <div className="login-hero-tagline">Business Portal</div>
          <div className="login-hero-features">
            <span className="login-feature-pill">📊 Analytics</span>
            <span className="login-feature-pill">🎁 Promotions</span>
            <span className="login-feature-pill">👥 Members</span>
          </div>
        </div>

        {/* Form card */}
        <div className="login-form-card">
          <h2 className="login-form-title">{t('auth.welcome')}</h2>
          <p className="login-form-sub">{t('auth.subtitle')}</p>

          <form onSubmit={handleAuth} className="login-form">
            <div className="login-input-group">
              <span className="login-input-icon">✉️</span>
              <input
                type="email"
                placeholder={t('auth.emailPlaceholder')}
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
                placeholder={t('auth.passwordPlaceholder')}
                value={password}
                onChange={e => setPassword(e.target.value)}
                minLength={6}
                required
                className="login-input"
              />
            </div>
            <button type="submit" className="login-btn" disabled={loading || !email || password.length < 6}>
              {loading ? 'Signing in…' : t('auth.signIn')}
            </button>
          </form>

          {error && <p className="error" style={{ marginTop: 12 }}>{error}</p>}

          <p className="login-hint">{t('auth.newHere')}</p>
        </div>

      </div>
    </div>
  )
}
