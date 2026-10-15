import { useEffect, useRef, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { type Entry as EntryRow } from '../lib/today'
import { logEvent } from '../lib/events'
import { loadNote, saveNote, loadNotesWithDays, type NoteWithDay } from '../lib/notes'
import { navigateTo, ALUMNI_GROUP_URL } from '../lib/nav'
import { richText } from '../lib/richText'

// One day's reading body: paragraphs, with standalone markdown CTA links.
export function EntryBody({ entry }: { entry: EntryRow }) {
  if (!entry.body_text) return null
  return (
    <div className="body">
      {entry.body_text.split('\n\n').map((para, i) => {
        const cta = para.trim().match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/)
        if (cta) {
          return (
            <a key={i} className="cta" href={cta[2]} target="_blank" rel="noopener noreferrer"
               onClick={() => logEvent('clicked_link', entry.id)}>
              {cta[1]}
            </a>
          )
        }
        return <p key={i}>{richText(para)}</p>
      })}
    </div>
  )
}

// The one line he carries all day ("Whip or well?").
export function CarryThis({ line }: { line: string }) {
  return (
    <div className="carry">
      <p className="eyebrow">Carry this</p>
      <p className="carry-line">{line}</p>
    </div>
  )
}

const AUDIO_BUCKET = 'daily-audio'

// The bucket is private, so we mint a short-lived signed URL at play time
// (not getPublicUrl). createSignedUrl is authorized by the storage SELECT
// policy for the signed-in user; an anonymous caller is rejected.
export function AudioPlayer({ entryId, path }: { entryId: string; path: string }) {
  const [url, setUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function start() {
    setLoading(true)
    setError('')
    const { data, error } = await supabase.storage.from(AUDIO_BUCKET).createSignedUrl(path, 3600)
    setLoading(false)
    if (error || !data?.signedUrl) {
      setError('Audio is unavailable right now.')
      return
    }
    setUrl(data.signedUrl)
    logEvent('played_audio', entryId)
  }

  return (
    <div className="audio-launch">
      <p className="eyebrow">From John</p>
      {/* Men assumed the audio was the reading out loud. It isn't. */}
      <p className="audio-note">Not the reading out loud. It takes today further. Do both when you can.</p>
      {url ? (
        <audio className="audio" controls autoPlay src={url} />
      ) : (
        <button type="button" className="secondary" onClick={start} disabled={loading}>
          {loading ? 'Loading…' : '▶ Listen'}
        </button>
      )}
      {error && <p className="error">{error}</p>}
    </div>
  )
}

// ------------------------------------------------------------- With Dad
const DEFAULT_WITH_DAD_MINUTES = 3

function mmss(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

// Two soft rising notes. Created from the Start tap so iOS lets it play later.
function playSoftTone(ctx: AudioContext) {
  const now = ctx.currentTime
  ;[528, 660].forEach((freq, i) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = freq
    const t = now + i * 0.6
    gain.gain.setValueAtTime(0, t)
    gain.gain.linearRampToValueAtTime(0.15, t + 0.08)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.2)
    osc.connect(gain).connect(ctx.destination)
    osc.start(t)
    osc.stop(t + 1.25)
  })
}

// The center of the day: one question for the Father, then quiet. The timer is
// optional and calm: a countdown, then a soft tone and a buzz. He can ignore it.
export function WithDadCard({ entryId, prompt, minutes }: {
  entryId: string; prompt: string; minutes: number | null
}) {
  const mins = minutes && minutes > 0 ? minutes : DEFAULT_WITH_DAD_MINUTES
  const [endAt, setEndAt] = useState<number | null>(null)
  const [remaining, setRemaining] = useState(mins * 60_000)
  const [done, setDone] = useState(false)
  const audioCtx = useRef<AudioContext | null>(null)
  const wakeLock = useRef<WakeLockSentinel | null>(null)

  function releaseWakeLock() {
    wakeLock.current?.release().catch(() => { /* already released */ })
    wakeLock.current = null
  }

  useEffect(() => {
    if (endAt === null) return
    const id = window.setInterval(() => {
      const left = endAt - Date.now()
      setRemaining(left)
      if (left <= 0) {
        window.clearInterval(id)
        setEndAt(null)
        setDone(true)
        releaseWakeLock()
        if (audioCtx.current) playSoftTone(audioCtx.current)
        navigator.vibrate?.([200, 120, 200])
      }
    }, 250)
    return () => window.clearInterval(id)
  }, [endAt])

  useEffect(() => () => { releaseWakeLock(); audioCtx.current?.close().catch(() => {}) }, [])

  async function start() {
    setDone(false)
    setRemaining(mins * 60_000)
    setEndAt(Date.now() + mins * 60_000)
    logEvent('started_with_dad', entryId)
    try {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (Ctx && !audioCtx.current) audioCtx.current = new Ctx()
      await audioCtx.current?.resume()
    } catch { /* no tone, the buzz and the screen still tell him */ }
    try { wakeLock.current = await navigator.wakeLock?.request('screen') ?? null } catch { /* screen may dim, fine */ }
  }

  function stop() {
    setEndAt(null)
    setDone(false)
    setRemaining(mins * 60_000)
    releaseWakeLock()
  }

  return (
    <section className="card with-dad">
      <p className="eyebrow">With Dad · {mins} minute{mins === 1 ? '' : 's'}</p>
      <p className="with-dad-prompt">{richText(prompt)}</p>
      {(
        endAt !== null ? (
          <div className="timer running" role="timer" aria-live="off">
            <span className="timer-clock">{mmss(remaining)}</span>
            <button type="button" className="link" onClick={stop}>Stop</button>
          </div>
        ) : done ? (
          <div className="timer done">
            <p className="timer-done">Time's up. Stay as long as you want.</p>
            <button type="button" className="link" onClick={start}>Start again</button>
          </div>
        ) : (
          <button type="button" className="secondary timer-start" onClick={start}>
            Start {mins} minute{mins === 1 ? '' : 's'}
          </button>
        )
      )}
    </section>
  )
}

// Old content (before the rebuild) carries a plain daily prompt instead of a
// With Dad question. Show it as it always was, minus the retired beta feedback.
export function PromptCard({ prompt }: { prompt: string }) {
  return (
    <section className="card checkin">
      <h2>Today's Check-In</h2>
      <p className="prompt">{richText(prompt)}</p>
    </section>
  )
}

// ---------------------------------------------------------------- Share
// Facebook won't let an app write the post, so: copy his words, open the group,
// he pastes. Both start inside the tap so the browser allows them.
// Shown the same in the admin library as in a man's day, so John previews
// exactly what the men get.
export function ShareCard({ entry }: { entry: EntryRow }) {
  const [thought, setThought] = useState('')
  const [status, setStatus] = useState<'idle' | 'copied' | 'opened' | 'manual'>('idle')
  const prompt = entry.share_prompt ?? ''

  // Copy only his own words; a man posts his message, not an app label.
  function share() {
    const text = thought.trim()
    const copy = text ? navigator.clipboard?.writeText(text) : undefined
    window.open(ALUMNI_GROUP_URL, '_blank', 'noopener,noreferrer')
    logEvent('shared_to_group', entry.id)
    if (!text) setStatus('opened')
    else if (copy) copy.then(() => setStatus('copied'), () => setStatus('manual'))
    else setStatus('manual')
  }

  return (
    <section className="card share">
      <p className="eyebrow">Share with the guys</p>
      <p className="share-prompt">{richText(prompt)}</p>
      <textarea className="notes-input" rows={3} value={thought}
        onChange={(e) => { setThought(e.target.value); setStatus('idle') }}
        placeholder="Your thought (optional)" />
      <button type="button" className="share-btn" onClick={share}>Share in the group</button>
      {status === 'idle' && <p className="muted share-note">We'll copy what you wrote and open the alumni group. Paste it into a new post.</p>}
      {status === 'copied' && <p className="muted share-note">Copied. Paste it into a new post in the group.</p>}
      {status === 'opened' && <p className="muted share-note">The group is open. Write your post there.</p>}
      {status === 'manual' && (
        <div className="share-manual">
          <p className="muted share-note">Copy this, then paste it into a new post in the group:</p>
          <textarea className="notes-input" rows={4} readOnly value={thought.trim()}
            onFocus={(e) => e.currentTarget.select()} />
        </div>
      )}
      {/* Joining or just looking doesn't need a post. */}
      <a className="open-group" href={ALUMNI_GROUP_URL} target="_blank" rel="noopener noreferrer"
         onClick={() => logEvent('clicked_link', entry.id)}>
        Open the alumni group ›
      </a>
    </section>
  )
}

// ---------------------------------------------------------------- Notes
// One saved note with the day it came from. Shared by Day 7 and My Notes.
export function NoteContext({ n }: { n: NoteWithDay }) {
  return (
    <>
      <p className="eyebrow note-day">
        {n.week != null && n.day != null ? `Week ${n.week} · Day ${n.day}` : `Day ${n.sortIndex}`}
        {n.title ? ` · ${n.title}` : ''}
      </p>
      {n.carryLine && <p className="note-ctx"><span>Carry this</span> {n.carryLine}</p>}
      {n.withDadPrompt && <p className="note-ctx"><span>With Dad</span> {richText(n.withDadPrompt)}</p>}
    </>
  )
}

// Day 7 (14, 21, ...): his own notes from the week, right where he rests and
// looks back. Only days he wrote show up. Private: his rows only.
export function WeekNotes({ entry }: { entry: EntryRow }) {
  const [notes, setNotes] = useState<NoteWithDay[] | null>(null)
  const last = entry.sort_index ?? 7

  useEffect(() => {
    let cancelled = false
    loadNotesWithDays({ from: Math.max(1, last - 6), to: last })
      .then((n) => { if (!cancelled) setNotes(n) })
      .catch(() => { if (!cancelled) setNotes([]) })
    return () => { cancelled = true }
  }, [last])

  if (notes === null) return null

  return (
    <section className="card week-notes">
      <h2>Your week</h2>
      <p className="muted">Only you can see these.</p>
      {notes.length === 0 ? (
        <p className="week-notes-empty">No notes this week. That's okay. Tomorrow's a good day to start.</p>
      ) : (
        <ul className="note-list">
          {notes.map((n) => (
            <li key={n.entryId} className="note-item">
              <NoteContext n={n} />
              <p className="note-body">{n.body}</p>
            </li>
          ))}
        </ul>
      )}
      <button type="button" className="link see-all-notes" onClick={() => navigateTo('notes')}>See all your notes ›</button>
    </section>
  )
}

// A man's PRIVATE notes for the day (reading + audio). Not seen by John or anyone
// else, that's the whole point. Loads any saved note, saves on blur and on the
// Save button.
export function NotesCard({ entryId }: { entryId: string }) {
  const [body, setBody] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle')

  useEffect(() => {
    let cancelled = false
    loadNote(entryId)
      .then((b) => { if (!cancelled) { setBody(b); setLoaded(true) } })
      .catch(() => { if (!cancelled) setLoaded(true) })
    return () => { cancelled = true }
  }, [entryId])

  async function save() {
    if (status === 'saving') return
    setStatus('saving')
    try {
      await saveNote(entryId, body)
      setStatus('saved')
    } catch {
      setStatus('idle')
    }
  }

  if (!loaded) return null

  return (
    <section className="card notes">
      <h2>Your notes</h2>
      <p className="muted">Private to you. You'll see them again on Day 7 and in My Notes.</p>
      <textarea
        className="notes-input"
        rows={5}
        value={body}
        onChange={(e) => { setBody(e.target.value); if (status === 'saved') setStatus('idle') }}
        onBlur={save}
        placeholder="Write whatever stood out today…"
      />
      <div className="notes-actions">
        <button type="button" onClick={save} disabled={status === 'saving'}>
          {status === 'saving' ? 'Saving…' : 'Save notes'}
        </button>
        {status === 'saved' && <span className="muted notes-saved">Saved</span>}
      </div>
    </section>
  )
}

// ------------------------------------------------------------ the whole day
// Reading, Carry this, Audio, With Dad, Share, (Day 7: your week), Notes.
// interactive = the man's own view; false = the admin library, which shows the
// day exactly as men see it (timer, share) minus the private notes.
// Every rebuild field is optional, so the original 49 days still render.
export function DayContent({ entry, interactive, top }: { entry: EntryRow; interactive: boolean; top?: ReactNode }) {
  return (
    <>
      <article className="card entry">
        {top}
        {(entry.week != null && entry.day != null) && (
          <p className="eyebrow">Week {entry.week} · Day {entry.day}</p>
        )}
        <h1>{entry.title}</h1>
        <EntryBody entry={entry} />
        {entry.carry_line && <CarryThis line={entry.carry_line} />}
        {entry.audio_url && <AudioPlayer entryId={entry.id} path={entry.audio_url} />}
      </article>

      {entry.with_dad_prompt ? (
        <WithDadCard entryId={entry.id} prompt={entry.with_dad_prompt} minutes={entry.with_dad_minutes} />
      ) : entry.reflection_prompt ? (
        <PromptCard prompt={entry.reflection_prompt} />
      ) : null}

      {entry.share_prompt && <ShareCard entry={entry} />}

      {interactive && entry.day === 7 && <WeekNotes entry={entry} />}

      {interactive && <NotesCard entryId={entry.id} />}
    </>
  )
}
