import { useEffect, useRef, useState } from 'react'
import { type Entry as EntryRow } from '../lib/today'
import { logEvent } from '../lib/events'
import { DayContent } from './entryParts'

// A list of days + a detail view of one day, with browser-history-aware back:
// the device/browser Back button (and the in-app back link) unwind day -> list,
// and list -> onExit() (e.g. back to today). When onExit is omitted the list is
// the base screen (e.g. a nav tab), so only the day level uses history.
//   interactive = true  -> the man's own view: timer, share, notes, Day 7 notes.
//   interactive = false -> read-only (the admin library).
export function DayBrowser({ title, loadEntries, interactive, onExit, initialDay }: {
  title: string
  loadEntries: () => Promise<EntryRow[]>
  interactive: boolean
  onExit?: () => void
  initialDay?: number // sort_index to open straight to (e.g. from an email link)
}) {
  const [entries, setEntries] = useState<EntryRow[] | null>(null)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<EntryRow | null>(null)

  const selRef = useRef<EntryRow | null>(null); selRef.current = selected
  const onExitRef = useRef(onExit); onExitRef.current = onExit
  const loadRef = useRef(loadEntries); loadRef.current = loadEntries
  const initialDayRef = useRef(initialDay); initialDayRef.current = initialDay

  useEffect(() => {
    let cancelled = false
    loadRef.current()
      .then((e) => {
        if (cancelled) return
        setEntries(e)
        // Deep link (email "Reread Day N"): open straight to that day once loaded.
        // Only reached days are in the list, so future days are unreachable here.
        const target = initialDayRef.current != null
          ? e.find((x) => x.sort_index === initialDayRef.current)
          : null
        if (target) {
          setSelected(target)
          window.history.pushState({ ml: 'day' }, '')
        }
      })
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

  if (selected) return <DayDetail entry={selected} interactive={interactive} onBack={back} />

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

function DayDetail({ entry, interactive, onBack }: { entry: EntryRow; interactive: boolean; onBack: () => void }) {
  useEffect(() => { logEvent('opened_entry', entry.id) }, [entry.id])

  return (
    <DayContent
      entry={entry}
      interactive={interactive}
      top={<button type="button" className="link back-link" onClick={onBack}>‹ Back</button>}
    />
  )
}