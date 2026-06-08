import { useEffect, useState } from 'react'
import { isStandalone, isIOS } from '../lib/install'
import { InstallLink } from './InstallBanner'
import {
  pushSupported,
  notificationPermission,
  enablePush,
  loadPrefs,
  savePrefs,
  defaultPrefs,
  type NotificationPrefs,
} from '../lib/push'

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
          <p className="muted">
            A gentle daily nudge, only on days you have not opened yet. You will also get a quiet dot
            on the app icon when a new day is ready. Off by default. No counts, no pressure.
          </p>

          {msg && <p className="error settings-msg">{msg}</p>}

          <label className="toggle-row">
            <span className="toggle-text">
              <strong>Daily reminder</strong>
              <span className="muted">A nudge at a time you choose.</span>
            </span>
            <input
              type="checkbox"
              checked={prefs.reminder_enabled}
              disabled={busy}
              onChange={(e) => toggleReminder(e.target.checked)}
            />
          </label>

          {prefs.reminder_enabled && (
            <label className="time-row">
              <span>Remind me at</span>
              <input
                type="time"
                value={prefs.reminder_time.slice(0, 5)}
                disabled={busy}
                onChange={(e) => setReminderTime(e.target.value)}
              />
            </label>
          )}
        </>
      )}
    </section>
  )
}
