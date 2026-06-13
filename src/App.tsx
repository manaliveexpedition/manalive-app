import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import { Today } from './screens/Today'
import { Progress } from './screens/Progress'
import { Admin } from './screens/Admin'
import { Library } from './screens/Library'
import { Settings } from './screens/Settings'
import { fetchMyProfile, saveName, type Profile } from './lib/profile'
import './App.css'

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <main className="screen">
        <p className="muted">Loading…</p>
      </main>
    )
  }

  return (
    <main className="screen">
      {session ? <Shell /> : <SignIn />}
    </main>
  )
}

type View = 'today' | 'progress' | 'settings' | 'admin' | 'library'

function Shell() {
  const [view, setView] = useState<View>('today')
  const [profile, setProfile] = useState<Profile | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchMyProfile()
      .then((p) => { if (!cancelled) setProfile(p) })
      .catch(() => { /* non-fatal: just no admin tab + no name gate */ })
    return () => { cancelled = true }
  }, [])

  const isAdmin = profile?.role === 'admin'

  // Tapping a push notification asks the app to jump to Today (the new day).
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    const handler = (e: MessageEvent) => {
      const data = e.data as { type?: string; view?: View } | null
      if (data?.type === 'navigate' && data.view) setView(data.view)
    }
    navigator.serviceWorker.addEventListener('message', handler)
    return () => navigator.serviceWorker.removeEventListener('message', handler)
  }, [])

  // Deep link from the weekly email: open straight to Settings.
  useEffect(() => {
    if (window.location.hash.toLowerCase() === '#settings') {
      setView('settings')
      window.history.replaceState(null, '', window.location.pathname + window.location.search)
    }
  }, [])

  // First run: ask every man what he goes by before showing the app.
  if (profile && !profile.name_confirmed) {
    return <NameSetup profile={profile} onDone={(p) => setProfile(p)} />
  }

  return (
    <div className="shell">
      <header className="topbar">
        <img className="topbar-logo" src="/manalive-expedition-logo-cream.svg" alt="ManAlive Expedition" />
        <span className="topbar-sub">The Journey</span>
        <button type="button" className="link" onClick={() => supabase.auth.signOut()}>
          Sign out
        </button>
      </header>

      <nav className="nav">
        <button type="button" className={view === 'today' ? 'on' : ''} onClick={() => setView('today')}>
          Today
        </button>
        <button type="button" className={view === 'progress' ? 'on' : ''} onClick={() => setView('progress')}>
          Progress
        </button>
        <button type="button" className={view === 'settings' ? 'on' : ''} onClick={() => setView('settings')}>
          Settings
        </button>
        {isAdmin && (
          <button type="button" className={view === 'admin' ? 'on' : ''} onClick={() => setView('admin')}>
            Admin
          </button>
        )}
        {isAdmin && (
          <button type="button" className={view === 'library' ? 'on' : ''} onClick={() => setView('library')}>
            Library
          </button>
        )}
      </nav>

      {view === 'today' && <Today />}
      {view === 'progress' && <Progress />}
      {view === 'settings' && <Settings />}
      {view === 'admin' && isAdmin && <Admin />}
      {view === 'library' && isAdmin && <Library />}
    </div>
  )
}

function SignIn() {
  const [step, setStep] = useState<'request' | 'verify'>('request')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [logoFailed, setLogoFailed] = useState(false)

  async function continueWithGoogle() {
    setBusy(true)
    setError('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    // On success the browser redirects to Google; only reaches here on error.
    if (error) {
      setError(error.message)
      setBusy(false)
    }
  }

  async function sendCode(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    })
    setBusy(false)
    if (error) {
      setError(error.message)
    } else {
      setStep('verify')
    }
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code.trim(),
      type: 'email',
    })
    if (error) {
      setError(error.message)
      setBusy(false)
    }
    // On success, onAuthStateChange swaps to the signed-in view.
  }

  return (
    <div className="card signin">
      <div className="brand-lockup">
        {logoFailed ? (
          <h1>ManAlive</h1>
        ) : (
          <img
            className="login-logo"
            src="/manalive-expedition-logo-cream.svg"
            alt="ManAlive Expedition"
            onError={() => setLogoFailed(true)}
          />
        )}
        <p className="login-sub">The Journey</p>
      </div>

      {step === 'request' ? (
        <>
          <p className="muted">Sign in to begin.</p>

          <button type="button" className="google" onClick={continueWithGoogle} disabled={busy}>
            <GoogleIcon />
            Continue with Google
          </button>

          <div className="divider"><span>or</span></div>

          <form onSubmit={sendCode} className="form">
            <label htmlFor="email">Email me a 6-digit code</label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button type="submit" className="secondary" disabled={busy}>
              {busy ? 'Sending…' : 'Send code'}
            </button>
          </form>
        </>
      ) : (
        <form onSubmit={verifyCode} className="form">
          <p className="muted">
            Enter the 6-digit code sent to <strong>{email}</strong>.
          </p>
          <label htmlFor="code">6-digit code</label>
          <input
            id="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={6}
            required
            placeholder="123456"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <button type="submit" disabled={busy}>
            {busy ? 'Verifying…' : 'Verify'}
          </button>
          <button
            type="button"
            className="link"
            onClick={() => {
              setStep('request')
              setCode('')
              setError('')
            }}
          >
            Use a different method
          </button>
        </form>
      )}

      {error && <p className="error">{error}</p>}
    </div>
  )
}

function NameSetup({ profile, onDone }: { profile: Profile; onDone: (p: Profile) => void }) {
  const [name, setName] = useState(profile.name ?? '')
  const [lastName, setLastName] = useState(profile.last_name ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setError('Just your first name, or whatever you go by.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const updated = await saveName(name, lastName)
      onDone(updated)
    } catch {
      setError('Could not save that. Please try again.')
      setBusy(false)
    }
  }

  return (
    <div className="card signin name-setup">
      <h1>What do you go by?</h1>
      <p className="muted">Just so we know what to call you. You can change it anytime in Settings.</p>
      <form onSubmit={submit} className="form">
        <label htmlFor="pref">What you go by</label>
        <input id="pref" autoFocus autoComplete="given-name" value={name}
          onChange={(e) => setName(e.target.value)} placeholder="e.g. Hershey" />
        <label htmlFor="last">Last name <span className="optional">(optional)</span></label>
        <input id="last" autoComplete="family-name" value={lastName}
          onChange={(e) => setLastName(e.target.value)} placeholder="e.g. Hershberger" />
        <button type="submit" disabled={busy}>{busy ? 'Saving…' : "That's me"}</button>
        {error && <p className="error">{error}</p>}
      </form>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.71-1.57 2.68-3.89 2.68-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.41 5.41 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"
      />
    </svg>
  )
}

export default App
