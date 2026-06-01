import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { fetchMyProfile, type Profile } from '../lib/profile'
import { loadToday, localDateISO, type Entry as EntryRow, type TodayState } from '../lib/today'
import { logEvent } from '../lib/events'
import { fetchCheckin, submitCheckin, type Checkin } from '../lib/checkins'

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

        {entry.audio_url && (
          <AudioPlayer
            entryId={entry.id}
            path={entry.audio_url}
            onPlay={() => setPlayed(true)}
          />
        )}

        {entry.body_text && (
          <div className="body">
            {entry.body_text.split('\n\n').map((para, i) => (
              <p key={i}>{linkify(para)}</p>
            ))}
          </div>
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
      <button type="button" className="secondary" onClick={start} disabled={loading}>
        {loading ? 'Loading…' : '▶ Listen'}
      </button>
      {error && <p className="error">{error}</p>}
    </div>
  )
}

function CheckInCard({ entryId, played, prompt }: { entryId: string; played: boolean; prompt: string | null }) {
  const date = localDateISO()
  const [existing, setExisting] = useState<Checkin | null>(null)
  const [loading, setLoading] = useState(true)

  const [satWithIt, setSatWithIt] = useState<boolean | null>(null)
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
    if (satWithIt === null) { setError('Let us know whether you sat with it.'); return }
    setBusy(true)
    setError('')
    try {
      const saved = await submitCheckin({
        entryId,
        date,
        satWithIt,
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

  if (existing) {
    return (
      <section className="card checkin done">
        <h2>Check-In Saved</h2>
        <p className="muted">
          {existing.sat_with_it ? 'You sat with it today.' : 'Logged for today.'} You're done here.
        </p>
      </section>
    )
  }

  return (
    <section className="card checkin">
      <h2>Today's Check-In</h2>
      {prompt && <p className="prompt">{prompt}</p>}
      <form onSubmit={submit} className="form">
        <fieldset className="choice">
          <legend>Did you sit with it?</legend>
          <div className="choices">
            <button
              type="button"
              className={satWithIt === true ? 'chip on' : 'chip'}
              onClick={() => setSatWithIt(true)}
            >
              Yes
            </button>
            <button
              type="button"
              className={satWithIt === false ? 'chip on' : 'chip'}
              onClick={() => setSatWithIt(false)}
            >
              Not yet
            </button>
          </div>
        </fieldset>

        <label htmlFor="landed">What landed? <span className="optional">(optional)</span></label>
        <textarea
          id="landed"
          rows={3}
          value={whatLanded}
          onChange={(e) => setWhatLanded(e.target.value)}
          placeholder="Just for you — kept private."
        />

        <label htmlFor="didnt">What didn't? <span className="optional">(optional)</span></label>
        <textarea
          id="didnt"
          rows={3}
          value={whatDidnt}
          onChange={(e) => setWhatDidnt(e.target.value)}
          placeholder="Anything that sat wrong, or nothing at all."
        />

        <button type="submit" disabled={busy}>
          {busy ? 'Saving…' : 'Save check-in'}
        </button>
        {error && <p className="error">{error}</p>}
      </form>
    </section>
  )
}
