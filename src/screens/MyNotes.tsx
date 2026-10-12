import { useEffect, useState } from 'react'
import { loadNotesWithDays, saveNote, type NoteWithDay } from '../lib/notes'
import { NoteContext } from './entryParts'

// Every note he has written, grouped by week (newest week first), each with the
// day it came from. Private: his rows only. He can go back and add to any of
// them; there is still exactly one note per day.
export function MyNotes() {
  const [notes, setNotes] = useState<NoteWithDay[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    loadNotesWithDays()
      .then((n) => { if (!cancelled) setNotes(n) })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load your notes.') })
    return () => { cancelled = true }
  }, [])

  function updated(entryId: string, body: string) {
    setNotes((prev) => (prev ?? [])
      .map((n) => (n.entryId === entryId ? { ...n, body } : n))
      .filter((n) => n.body.trim()))
  }

  const weeks = groupByWeek(notes ?? [])

  return (
    <section className="card my-notes">
      <h1>My Notes</h1>
      <p className="muted">Everything you've written on the Journey. Only you can see these.</p>
      {error && <p className="error">{error}</p>}
      {!error && notes === null && <p className="muted">Loading…</p>}
      {notes && notes.length === 0 && (
        <p className="week-notes-empty">No notes yet. Each day has a notes box at the bottom. Whatever you write shows up here.</p>
      )}
      {weeks.map(([week, items]) => (
        <div key={week} className="notes-week">
          <h2 className="notes-week-head">{week > 0 ? `Week ${week}` : 'Notes'}</h2>
          <ul className="note-list">
            {items.map((n) => <NoteItem key={n.entryId} n={n} onSaved={updated} />)}
          </ul>
        </div>
      ))}
    </section>
  )
}

function groupByWeek(notes: NoteWithDay[]): [number, NoteWithDay[]][] {
  const by = new Map<number, NoteWithDay[]>()
  for (const n of notes) {
    const w = n.week ?? Math.ceil(n.sortIndex / 7)
    by.set(w, [...(by.get(w) ?? []), n])
  }
  return [...by.entries()].sort((a, b) => b[0] - a[0])
}

function NoteItem({ n, onSaved }: { n: NoteWithDay; onSaved: (entryId: string, body: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(n.body)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function save() {
    setBusy(true)
    setError('')
    try {
      await saveNote(n.entryId, draft)
      onSaved(n.entryId, draft.trim())
      setEditing(false)
    } catch {
      setError('Could not save. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <li className="note-item">
      <NoteContext n={n} />
      {editing ? (
        <>
          <textarea className="notes-input" rows={5} value={draft} autoFocus
            onChange={(e) => setDraft(e.target.value)} />
          <div className="notes-actions">
            <button type="button" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
            <button type="button" className="link" onClick={() => { setDraft(n.body); setEditing(false) }}>Cancel</button>
          </div>
          {error && <p className="error">{error}</p>}
        </>
      ) : (
        <>
          <p className="note-body">{n.body}</p>
          <button type="button" className="link add-to-note" onClick={() => { setDraft(n.body); setEditing(true) }}>
            Add to this note
          </button>
        </>
      )}
    </li>
  )
}
