import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { localDateISO, type Entry as EntryRow } from '../lib/today'
import { logEvent } from '../lib/events'
import { fetchCheckin, submitCheckin, BETA_FEEDBACK, type Checkin } from '../lib/checkins'
import { loadNote, saveNote } from '../lib/notes'

// Turn bare URLs in entry copy into tappable links (e.g. the alumni group on
// Day 9). Author-controlled content, so this is plain rendering, not user input.
const URL_RE = /(https?:\/\/[^\s]+)/g
export function linkify(text: string) {
  return text.split(URL_RE).map((part, i) =>
    /^https?:\/\//.test(part) ? (
      <a key={i} href={part} target="_blank" rel="noopener noreferrer">{part}</a>
    ) : (
      part
    ),
  )
}

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
        return <p key={i}>{linkify(para)}</p>
      })}
    </div>
  )
}

const AUDIO_BUCKET = 'daily-audio'

// The bucket is private, so we mint a short-lived signed URL at play time
// (not getPublicUrl). createSignedUrl is authorized by the storage SELECT
// policy for the signed-in user; an anonymous caller is rejected.
export function AudioPlayer({ entryId, path, onPlay }: { entryId: string; path: string; onPlay: () => void }) {
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
    onPlay()
    logEvent('played_audio', entryId)
  }

  if (url) {
    return <audio className="audio" controls autoPlay src={url} />
  }

  return (
    <div className="audio-launch">
      <p className="audio-note">From John, on today’s reading:</p>
      <button type="button" className="secondary" onClick={start} disabled={loading}>
        {loading ? 'Loading…' : '▶ John’s thoughts'}
      </button>
      {error && <p className="error">{error}</p>}
    </div>
  )
}

// The day's prompt + the BETA-ONLY "what landed / what didn't" feedback for John.
export function CheckInCard({ entryId, played, prompt, heading = "Today's Check-In" }: { entryId: string; played: boolean; prompt: string | null; heading?: string }) {
  const date = localDateISO()
  const [existing, setExisting] = useState<Checkin | null>(null)
  const [loading, setLoading] = useState(true)

  const [whatLanded, setWhatLanded] = useState('')
  const [whatDidnt, setWhatDidnt] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const c = await fetchCheckin(entryId)
        if (!cancelled) setExisting(c)
      } catch {
        /* a failed lookup just shows the form; the insert is the source of truth */
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [entryId])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const saved = await submitCheckin({
        entryId,
        date,
        whatLanded,
        whatDidnt,
        consumedAs: played ? 'listen' : 'read',
      })
      await logEvent('submitted_checkin', entryId)
      setExisting(saved)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your check-in.')
    } finally {
      setBusy(false)
    }
  }

  if (loading) return null

  return (
    <>
      {/* Box 1: the check-in prompt / instruction, stands alone, always shown. */}
      <section className="card checkin">
        <h2>{heading}</h2>
        {prompt && <p className="prompt">{prompt}</p>}
      </section>

      {/* Box 2: BETA-ONLY feedback for John (not private; not part of the real
          post-camp experience, see BETA_FEEDBACK). */}
      {BETA_FEEDBACK && (existing ? (
        <section className="card checkin done">
          <p className="eyebrow">Beta feedback</p>
          <p className="muted">Thanks. Your notes are in, you can close this for today.</p>
        </section>
      ) : (
        <section className="card checkin">
          <p className="eyebrow">Beta feedback</p>
          <p className="muted feedback-note">Feedback on the beta itself, not today's reflection. It goes to John to help shape The Journey.</p>
          <form onSubmit={submit} className="form">
            <label htmlFor="landed">What worked about today's reading? <span className="optional">(optional)</span></label>
            <textarea id="landed" rows={3} value={whatLanded}
              onChange={(e) => setWhatLanded(e.target.value)}
              placeholder="What was clear, hit home, or felt right?" />

            <label htmlFor="didnt">What was confusing or fell flat? <span className="optional">(optional)</span></label>
            <textarea id="didnt" rows={3} value={whatDidnt}
              onChange={(e) => setWhatDidnt(e.target.value)}
              placeholder="Anything unclear, clunky, or that missed?" />

            <button type="submit" disabled={busy}>{busy ? 'Sending…' : 'Send feedback'}</button>
            {error && <p className="error">{error}</p>}
          </form>
        </section>
      ))}
    </>
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
      <p className="muted">Private to you. Capture anything you want to remember from the reading or the audio.</p>
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
