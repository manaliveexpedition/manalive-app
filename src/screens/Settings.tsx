import { useEffect, useState } from 'react'
import { isStandalone, isIOS } from '../lib/install'
import { InstallLink } from './InstallBanner'
import { fetchMyProfile, saveName } from '../lib/profile'
import {
  pushSupported,
  notificationPermission,
  enablePush,
  loadPrefs,
  savePrefs,
  defaultPrefs,
  type NotificationPrefs,
} from '../lib/push'

// 12-hour label for an 'HH:MM' value, e.g. '08:30' -> '8:30 AM'.
function label12(value: string): string {
  const [hStr, mStr] = value.split(':')
  const h = Number(hStr)
  const ampm = h < 12 ? 'AM' : 'PM'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${mStr} ${ampm}`
}

// Half-hour options for the reminder dropdown, plus the man's current value if
// it happens to fall off the grid (e.g. set earlier with the old picker).
function buildTimeOptions(current: string): { value: string; label: string }[] {
  const values = new Set<string>()
  for (let h = 0; h < 24; h++) {
    for (const m of [0, 30]) {
      values.add(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    }
  }
  if (current) values.add(current)
  return [...values].sort().map((v) => ({ value: v, label: label12(v) }))
}

function NameCard() {
  const [name, setName] = useState('')
  const [lastName, setLastName] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetchMyProfile()
      .then((p) => { if (!cancelled) { setName(p.name ?? ''); setLastName(p.last_name ?? '') } })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoaded(true) })
    return () => { cancelled = true }
  }, [])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setSaved(false)
    try {
      await saveName(name, lastName)
      setSaved(true)
    } catch {
      /* leave the form as-is; he can retry */
    }
    setBusy(false)
  }

  if (!loaded) return null

  return (
    <section className="card entry settings">
      <h1>Your name</h1>
      <form onSubmit={save} className="form">
        <label htmlFor="sname">What you go by</label>
        <input id="sname" value={name} onChange={(e) => { setName(e.target.value); setSaved(false) }} />
        <label htmlFor="slast">Last name <span className="optional">(optional)</span></label>
        <input id="slast" value={lastName} onChange={(e) => { setLastName(e.target.value); setSaved(false) }} />
        <div className="notes-actions">
          <button type="submit" disabled={busy || !name.trim()}>{busy ? 'Saving…' : 'Save name'}</button>
          {saved && <span className="muted notes-saved">Saved</span>}
        </div>
      </form>
    </section>
  )
}

export function Settings() {
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    let cancelled = false
    loadPrefs()
      .then((p) => { if (!cancelled) setPrefs(p) })
      .catch(() => { if (!cancelled) setPrefs(defaultPrefs()) })
    return () => { cancelled = true }
  }, [])

  async function persist(next: NotificationPrefs) {
    setBusy(true)
    try {
      await savePrefs(next)
    } catch {
      setMsg('Could not save that. Please try again.')
    }
    setBusy(false)
  }

  async function toggleReminder(value: boolean) {
    if (!prefs) return
    setMsg('')
    if (value) {
      setBusy(true)
      const res = await enablePush()
      setBusy(false)
      if (!res.ok) {
        setMsg(
          res.reason === 'denied'
            ? 'Notifications are blocked for ManAlive. Turn them on for this app in your phone settings, then try again.'
            : 'Notifications are not available here yet.',
        )
        return
      }
    }
    const next = { ...prefs, reminder_enabled: value }
    setPrefs(next)
    await persist(next)
  }

  async function setReminderTime(time: string) {
    if (!prefs || !time) return
    const next = { ...prefs, reminder_time: time }
    setPrefs(next)
    await persist(next)
  }

  if (!prefs) return <p className="muted">Loading…</p>

  // Decide what to show: notifications only work from the installed app, with
  // permission granted. Each state gets clear, visible guidance.
  const mode = !isStandalone()
    ? 'install'
    : !pushSupported()
      ? 'unsupported'
      : notificationPermission() === 'denied'
        ? 'denied'
        : 'ok'

  return (
    <>
    <section className="card entry settings">
      <h1>Notifications</h1>

      {mode === 'install' && (
        <>
          <p className="muted">
            To get reminders and the new-day dot, add ManAlive to your home screen first.
            Notifications only work from the installed app.
          </p>
          <p className="settings-note">
            {isIOS() ? (
              <>In Safari, tap the Share button, then <strong>Add to Home Screen</strong>. Open ManAlive
                from your home screen, then come back here.</>
            ) : (
              <>Install below, then open ManAlive from your home screen and come back here.</>
            )}
          </p>
          <InstallLink />
        </>
      )}

      {mode === 'unsupported' && (
        <p className="settings-note">
          This device or browser does not support notifications yet. Try opening the installed app.
        </p>
      )}

      {mode === 'denied' && (
        <>
          <p className="muted">Notifications are currently blocked for ManAlive.</p>
          <p className="settings-note">
            To turn them on, open your phone's settings for ManAlive, allow Notifications, then come
            back and switch the reminder on.
          </p>
        </>
      )}

      {mode === 'ok' && (
        <>
          {msg && <p className="error settings-msg">{msg}</p>}

          {notificationPermission() === 'default' && !prefs.reminder_enabled && (
            <p className="settings-note">
              Heads up: when you switch this on, your phone will ask to allow notifications.
              Tap <strong>Allow</strong>.
            </p>
          )}

          <div className="toggle-row">
            <span className="toggle-text">
              <strong>Daily reminder</strong>
              <span className="muted">{prefs.reminder_enabled ? 'On' : 'Off'}</span>
            </span>
            <label className="switch">
              <input
                type="checkbox"
                aria-label="Daily reminder"
                checked={prefs.reminder_enabled}
                disabled={busy}
                onChange={(e) => toggleReminder(e.target.checked)}
              />
              <span className="track"><span className="thumb" /></span>
            </label>
          </div>

          {prefs.reminder_enabled && (
            <div className="reminder-status">
              <p className="reminder-on">Reminder on</p>
              <div className="reminder-time">
                <span>Each day at</span>
                <select
                  className="time-select"
                  value={prefs.reminder_time.slice(0, 5)}
                  disabled={busy}
                  onChange={(e) => setReminderTime(e.target.value)}
                >
                  {buildTimeOptions(prefs.reminder_time.slice(0, 5)).map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <p className="muted reminder-note">
                We will nudge you only on days you have not opened yet. Change the time above, or
                switch it off anytime.
              </p>
            </div>
          )}
        </>
      )}
    </section>
    <NameCard />
    </>
  )
}
