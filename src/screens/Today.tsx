import { useEffect, useRef, useState } from 'react'
import { fetchMyProfile, type Profile } from '../lib/profile'
import { loadToday, loadReachedEntries, loadMissedDays, formatStartDate, type TodayState } from '../lib/today'
import { logEvent } from '../lib/events'
import { clearBadge } from '../lib/push'
import { consumeDeepLink, isHistoryLink, dayFromLink } from '../lib/deeplink'
import { DayContent } from './entryParts'
import { DayBrowser } from './DayBrowser'
import { InstallLink } from './InstallBanner'

// "Day 1", "Days 1 and 2", "Days 1 to 4", or "4 earlier days" when not a run.
function missedLabel(days: number[]): string {
  if (days.length === 1) return `Day ${days[0]}`
  const contiguous = days.every((d, i) => i === 0 || d === days[i - 1] + 1)
  if (!contiguous) return `${days.length} earlier days`
  return days.length === 2 ? `Days ${days[0]} and ${days[1]}` : `Days ${days[0]} to ${days.at(-1)}`
}

export function Today() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [state, setState] = useState<TodayState | null>(null)
  const [error, setError] = useState('')
  const [showHistory, setShowHistory] = useState(false)
  const [historyDay, setHistoryDay] = useState<number | undefined>(undefined)
  const [missed, setMissed] = useState<number[]>([])

  // A late joiner sees which earlier days are waiting for him. Re-checked each
  // time he comes back from the previous days, so the note clears as he reads.
  const todayIndex = state?.kind === 'entry' ? state.entry.sort_index ?? null : null
  useEffect(() => {
    if (showHistory || todayIndex === null) return
    let cancelled = false
    loadMissedDays(profile?.start_date ?? null, todayIndex)
      .then((m) => { if (!cancelled) setMissed(m) })
      .catch(() => { /* the note is a nicety; never block today */ })
    return () => { cancelled = true }
  }, [showHistory, todayIndex, profile?.start_date])

  useEffect(() => {
    let cancelled = false
    logEvent('opened_app')
    ;(async () => {
      try {
        const p = await fetchMyProfile()
        if (cancelled) return
        setProfile(p)
        const s = await loadToday(p.start_date)
        if (cancelled) return
        setState(s)
        // Deep links from the weekly email (after the profile loads so the list
        // has his start_date): #days opens the previous-days list; #day/N opens
        // straight to that day's reading. Consumes a stash too (post-login).
        const target = consumeDeepLink(isHistoryLink)
        if (target) {
          setHistoryDay(dayFromLink(target))
          setShowHistory(true)
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Something went wrong.')
      }
    })()
    return () => { cancelled = true }
  }, [])

  // React to email deep links (#days / #day/N) even when the app is already open
  // (a hashchange does not remount Today, so the load-time parse above misses it).
  useEffect(() => {
    function routeHistory() {
      const target = consumeDeepLink(isHistoryLink)
      if (target) {
        setHistoryDay(dayFromLink(target))
        setShowHistory(true)
      }
    }
    window.addEventListener('hashchange', routeHistory)
    return () => window.removeEventListener('hashchange', routeHistory)
  }, [])

  // Log opened_entry once, when an actual entry resolves.
  const loggedEntryId = useRef<string | null>(null)
  useEffect(() => {
    if (state?.kind === 'entry' && loggedEntryId.current !== state.entry.id) {
      loggedEntryId.current = state.entry.id
      logEvent('opened_entry', state.entry.id)
      // He has seen today's day, so clear the new-day badge dot.
      clearBadge()
    }
  }, [state])

  // Show the history button only when there's at least one earlier day to revisit.
  const hasPrevious = (state?.kind === 'entry' && (state.entry.sort_index ?? 0) > 1)
    || state?.kind === 'caught_up'

  if (showHistory) {
    return (
      <DayBrowser
        title="Your days so far"
        loadEntries={() => loadReachedEntries(profile?.start_date ?? null)}
        interactive
        initialDay={historyDay}
        onExit={() => setShowHistory(false)}
      />
    )
  }

  return (
    <>
      {error && <p className="error">{error}</p>}

      {!error && !state && <p className="muted">Loading today…</p>}

      {!error && state?.kind === 'not_started' && (
        <section className="card calm">
          <h1>Your journey starts soon</h1>
          <p className="muted">
            {profile?.name ? `${profile.name}, your` : 'Your'} first daily will be
            here {formatStartDate(profile?.start_date ?? null)
              ? `on ${formatStartDate(profile?.start_date ?? null)}`
              : 'when it begins'}. There's nothing you need to do yet.
          </p>
        </section>
      )}

      {!error && state?.kind === 'caught_up' && (
        <section className="card calm">
          <h1>You're all caught up</h1>
          <p className="muted">
            You've reached the end of what's been shared so far. Come back tomorrow.
          </p>
        </section>
      )}

      {!error && state?.kind === 'entry' && missed.length > 0 && (
        <section className="card catch-up">
          <p className="catch-up-text">
            You joined a few days in. {missedLabel(missed)} {missed.length === 1 ? 'is' : 'are'} waiting
            for you whenever you're ready. Start with today, or go back first. Either is fine.
          </p>
          <button type="button" className="secondary" onClick={() => { setHistoryDay(missed[0]); setShowHistory(true) }}>
            Go to Day {missed[0]}
          </button>
        </section>
      )}

      {!error && state?.kind === 'entry' && (
        <DayContent entry={state.entry} interactive />
      )}

      {!error && hasPrevious && (
        <button type="button" className="secondary previous-days-btn" onClick={() => { setHistoryDay(undefined); setShowHistory(true) }}>
          View previous days
        </button>
      )}

      {/* Beta-only install nudge: while waiting to start, and during week one. */}
      {!error && (state?.kind === 'not_started' || (state?.kind === 'entry' && (state.entry.sort_index ?? 99) <= 7)) && <InstallLink />}
    </>
  )
}
