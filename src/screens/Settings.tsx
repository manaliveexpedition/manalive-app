import { useEffect, useState } from 'react'
import { isIOS, isStandalone } from '../lib/install'
import {
  pushSupported,
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

  const iosNeedsInstall = isIOS() && !isStandalone()
  const supported = pushSupported()

  async function applyToggle(which: 'dot_enabled' | 'reminder_enabled', value: boolean) {
    if (!prefs) return
    setMsg('')
    // Turning a toggle ON needs notification permission + a push subscription.
    if (value) {
      setBusy(true)
      const res = await enablePush()
      setBusy(false)
      if (!res.ok) {
        setMsg(
          res.reason === 'denied'
            ? 'Notifications are turned off for ManAlive. You can switch them on in your phone settings, then try again.'
            : 'Notifications are not available on this device yet.',
        )
        return
      }
    }
    const next = { ...prefs, [which]: value }
    setPrefs(next)
    await persist(next)
  }

  async function setReminderTime(time: string) {
    if (!prefs || !time) return
    const next = { ...prefs, reminder_time: time }
    setPrefs(next)
    await persist(next)
  }

  async function persist(next: NotificationPrefs) {
    setBusy(true)
    try {
      await savePrefs(next)
    } catch {
      setMsg('Could not save that. Please try again.')
    }
    setBusy(false)
  }

  if (!prefs) return <p className="muted">Loading…</p>

  const togglesDisabled = busy || (!supported && !iosNeedsInstall)

  return (
    <section className="card entry settings">
      <h1>Notifications</h1>
      <p className="muted">
        Optional, and off by default. Choose how you want to be nudged. No counts, no pressure.
      </p>

      {iosNeedsInstall && (
        <p className="muted settings-note">
          On iPhone, add ManAlive to your home screen first: tap the Share button, then
          "Add to Home Screen." Then come back here to turn these on.
        </p>
      )}
      {!iosNeedsInstall && !supported && (
        <p className="muted settings-note">
          This browser does not support notifications yet. Try the installed app.
        </p>
      )}

      <label className="toggle-row">
        <span className="toggle-text">
          <strong>New-day dot</strong>
          <span className="muted">A quiet dot on the app icon when a new day is ready.</span>
        </span>
        <input
          type="checkbox"
          checked={prefs.dot_enabled}
          disabled={togglesDisabled && !prefs.dot_enabled}
          onChange={(e) => applyToggle('dot_enabled', e.target.checked)}
        />
      </label>

      <label className="toggle-row">
        <span className="toggle-text">
          <strong>Daily reminder</strong>
          <span className="muted">
            A gentle nudge at a time you choose, only on days you have not opened yet.
          </span>
        </span>
        <input
          type="checkbox"
          checked={prefs.reminder_enabled}
          disabled={togglesDisabled && !prefs.reminder_enabled}
          onChange={(e) => applyToggle('reminder_enabled', e.target.checked)}
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

      {msg && <p className="error settings-msg">{msg}</p>}
    </section>
  )
}
