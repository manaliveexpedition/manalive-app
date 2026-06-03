import { useEffect, useRef, useState } from 'react'
import { type Entry as EntryRow } from '../lib/today'
import { logEvent } from '../lib/events'
import { EntryBody, AudioPlayer, CheckInCard } from './entryParts'

// A list of days + a detail view of one day, with browser-history-aware back:
// the device/browser Back button (and the in-app back link) unwind day -> list,
// and list -> onExit() (e.g. back to today). When onExit is omitted the list is
// the base screen (e.g. a nav tab), so only the day level uses history.
//   feedback = true  -> the detail shows the check-in/feedback box (the man).
//   feedback = false -> read-only (the admin library).
export function DayBrowser({ title, loadEntries, feedback, onExit }: {
  title: string
  loadEntries: () => Promise<EntryRow[]>
  feedback: boolean
  onExit?: () => void
}) {
  const [entries, setEntries] = useState<EntryRow[] | null>(null)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<EntryRow | null>(null)

  const selRef = useRef<EntryRow | null>(null); selRef.current = selected
  const onExitRef = useRef(onExit); onExitRef.current = onExit
  const loadRef = useRef(loadEntries); loadRef.current = loadEntries

  useEffect(() => {
    let cancelled = false
    loadRef.current()
      .then((e) => { if (!cancelled) setEntries(e) })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load the days.') })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (onExitRef.current) window.history.pushState({ ml: 'list' }, '')
    function onPop() {
      if (selRef.current) setSelected(null)
      else if (onExitRef.current) onExitRef.current()
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  function openDay(e: EntryRow) {
    setSelected(e)
    window.history.pushState({ ml: 'day' }, '')
  }
  const back = () => window.history.back()

  if (selected) return <DayDetail entry={selected} feedback={feedback} onBack={back} />

  return (
    <section className="card">
      {onExit && <button type="button" className="link back-link" onClick={back}>‹ Back</button>}
      <h1>{title}</h1>
      {error && <p className="error">{error}</p>}
      {!error && !entries && <p className="muted">Loading…</p>}
      {entries && entries.length === 0 && <p className="muted">Nothing here yet.</p>}
      {entries && entries.length > 0 && (
        <ul className="day-list">
          {entries.map((e) => (
            <li key={e.id}>
              <button type="button" className="day-item" onClick={() => openDay(e)}>
                <span className="eyebrow">{e.week != null ? `Week ${e.week} · Day ${e.day}` : `Day ${e.sort_index}`}</span>
                <span className="day-title">{e.title}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function DayDetail({ entry, feedback, onBack }: { entry: EntryRow; feedback: boolean; onBack: () => void }) {
  const [played, setPlayed] = useState(false)
  useEffect(() => { logEvent('opened_entry', entry.id) }, [entry.id])

  return (
    <>
      <article className="card entry">
        <button type="button" className="link back-link" onClick={onBack}>‹ Back</button>
        {(entry.week != null && entry.day != null) && (
          <p className="eyebrow">Week {entry.week} · Day {entry.day}</p>
        )}
        <h1>{entry.title}</h1>
        <EntryBody entry={entry} />
        {entry.audio_url && (
          <AudioPlayer entryId={entry.id} path={entry.audio_url} onPlay={() => setPlayed(true)} />
        )}
      </article>
      {feedback && (
        <CheckInCard entryId={entry.id} played={played} prompt={entry.reflection_prompt} heading="Check-In" />
      )}
    </>
  )
}
