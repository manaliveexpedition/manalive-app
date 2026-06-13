import { useEffect, useRef, useState } from 'react'
import { fetchMyProfile, type Profile } from '../lib/profile'
import { loadToday, loadReachedEntries, formatStartDate, type Entry as EntryRow, type TodayState } from '../lib/today'
import { logEvent } from '../lib/events'
import { clearBadge } from '../lib/push'
import { EntryBody, AudioPlayer, CheckInCard, NotesCard } from './entryParts'
import { DayBrowser } from './DayBrowser'
import { InstallLink } from './InstallBanner'

export function Today() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [state, setState] = useState<TodayState | null>(null)
  const [error, setError] = useState('')
  const [showHistory, setShowHistory] = useState(false)

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
        // Deep link from the weekly email: #days opens the previous-days view
        // (after the profile loads, so the list has his start_date to work from).
        if (window.location.hash.toLowerCase() === '#days') {
          setShowHistory(true)
          window.history.replaceState(null, '', window.location.pathname + window.location.search)
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Something went wrong.')
      }
    })()
    return () => { cancelled = true }
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
        feedback
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

      {!error && state?.kind === 'entry' && (
        <EntryView entry={state.entry} />
      )}

      {!error && hasPrevious && (
        <button type="button" className="secondary previous-days-btn" onClick={() => setShowHistory(true)}>
          View previous days
        </button>
      )}

      {/* Beta-only install nudge: while waiting to start, and during week one. */}
      {!error && (state?.kind === 'not_started' || (state?.kind === 'entry' && (state.entry.sort_index ?? 99) <= 7)) && <InstallLink />}
    </>
  )
}

function EntryView({ entry }: { entry: EntryRow }) {
  const [played, setPlayed] = useState(false)

  return (
    <>
      <article className="card entry">
        {(entry.week != null && entry.day != null) && (
          <p className="eyebrow">Week {entry.week} · Day {entry.day}</p>
        )}
        <h1>{entry.title}</h1>

        <EntryBody entry={entry} />

        {/* John's spoken commentary on the reading, after the text. */}
        {entry.audio_url && (
          <AudioPlayer
            entryId={entry.id}
            path={entry.audio_url}
            onPlay={() => setPlayed(true)}
          />
        )}
      </article>

      <NotesCard entryId={entry.id} />

      <CheckInCard entryId={entry.id} played={played} prompt={entry.reflection_prompt} />
    </>
  )
}
