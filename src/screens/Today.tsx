import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { fetchMyProfile, type Profile } from '../lib/profile'
import { loadToday, localDateISO, type Entry as EntryRow, type TodayState } from '../lib/today'
import { logEvent } from '../lib/events'
import { fetchCheckin, submitCheckin, BETA_FEEDBACK, type Checkin } from '../lib/checkins'

export function Today() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [state, setState] = useState<TodayState | null>(null)
  const [error, setError] = useState('')

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
    }
  }, [state])

  return (
    <>
      {error && <p className="error">{error}</p>}

      {!error && !state && <p className="muted">Loading today…</p>}

      {!error && state?.kind === 'not_started' && (
        <section className="card calm">
          <h1>Your journey starts soon</h1>
          <p className="muted">
            {profile?.name ? `${profile.name}, your` : 'Your'} first daily will be
            here when it begins. There's nothing you need to do yet.
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

        {entry.body_text && (
          <div className="body">
            {entry.body_text.split('\n\n').map((para, i) => {
              // A paragraph that is just a markdown link, e.g.
              // [ManAlive Alumni](https://…), renders as a CTA button.
              const cta = para.trim().match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/)
              if (cta) {
                return (
                  <a
                    key={i}
                    className="cta"
                    href={cta[2]}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => logEvent('clicked_link', entry.id)}
                  >
                    {cta[1]}
                  </a>
                )
              }
              return <p key={i}>{linkify(para)}</p>
            })}
          </div>
        )}

        {/* John's spoken commentary on the reading — comes after the text and is
            framed as a separate "word from John", not a re-read. */}
        {entry.audio_url && (
          <AudioPlayer
            entryId={entry.id}
            path={entry.audio_url}
            onPlay={() => setPlayed(true)}
          />
        )}
      </article>

      <CheckInCard entryId={entry.id} played={played} prompt={entry.reflection_prompt} />
    </>
  )
}

// Turn bare URLs in entry copy into tappable links (e.g. the alumni group on
// Day 9). The body is author-controlled content, so this is plain rendering,
// not user input. Links open in a new tab.
const URL_RE = /(https?:\/\/[^\s]+)/g
function linkify(text: string) {
  return text.split(URL_RE).map((part, i) =>
    /^https?:\/\//.test(part) ? (
      <a key={i} href={part} target="_blank" rel="noopener noreferrer">
        {part}
      </a>
    ) : (
      part
    ),
  )
}

const AUDIO_BUCKET = 'daily-audio'

// The bucket is private, so we mint a short-lived signed URL at play time
// (not getPublicUrl). createSignedUrl is authorized by the storage SELECT
// policy for the signed-in user; an anonymous caller is rejected.
function AudioPlayer({ entryId, path, onPlay }: { entryId: string; path: string; onPlay: () => void }) {
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

function CheckInCard({ entryId, played, prompt }: { entryId: string; played: boolean; prompt: string | null }) {
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
        const c = await fetchCheckin(entryId, date)
        if (!cancelled) setExisting(c)
      } catch {
        /* a failed lookup just shows the form; the insert is the source of truth */
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [entryId, date])

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
      {/* Box 1: the check-in prompt / instruction — stands alone, always shown. */}
      <section className="card checkin">
        <h2>Today's Check-In</h2>
        {prompt && <p className="prompt">{prompt}</p>}
      </section>

      {/* Box 2: BETA-ONLY feedback for John (not private; not part of the real
          post-camp experience — see BETA_FEEDBACK). */}
      {BETA_FEEDBACK && (existing ? (
        <section className="card checkin done">
          <p className="eyebrow">Beta feedback</p>
          <p className="muted">Thanks. Your notes are in, you can close this for today.</p>
        </section>
      ) : (
        <section className="card checkin">
          <p className="eyebrow">Beta feedback</p>
          <p className="muted feedback-note">Just for the beta. These go to John to help shape The Journey.</p>
          <form onSubmit={submit} className="form">
            <label htmlFor="landed">What landed? <span className="optional">(optional)</span></label>
            <textarea
              id="landed"
              rows={3}
              value={whatLanded}
              onChange={(e) => setWhatLanded(e.target.value)}
              placeholder="What worked, hit home, or stuck with you?"
            />

            <label htmlFor="didnt">What didn't? <span className="optional">(optional)</span></label>
            <textarea
              id="didnt"
              rows={3}
              value={whatDidnt}
              onChange={(e) => setWhatDidnt(e.target.value)}
              placeholder="What missed, confused, or fell flat?"
            />

            <button type="submit" disabled={busy}>
              {busy ? 'Sending…' : 'Send feedback'}
            </button>
            {error && <p className="error">{error}</p>}
          </form>
        </section>
      ))}
    </>
  )
}
