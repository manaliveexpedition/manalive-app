import { useEffect, useState } from 'react'
import { fetchMyProfile } from '../lib/profile'
import { loadProgress, SHOW_STREAK, type Progress as ProgressData } from '../lib/progress'

export function Progress() {
  const [data, setData] = useState<ProgressData | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const p = await fetchMyProfile()
        const prog = await loadProgress(p.start_date)
        if (!cancelled) setData(prog)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Something went wrong.')
      }
    })()
    return () => { cancelled = true }
  }, [])

  if (error) return <p className="error">{error}</p>
  if (!data) return <p className="muted">Loading…</p>

  if (!data.started) {
    return (
      <section className="card calm">
        <h1>Your journey starts soon</h1>
        <p className="muted">Your progress will show here once you've begun.</p>
      </section>
    )
  }

  return (
    <section className="card progress">
      <h1>Your journey</h1>

      <div className="stats">
        <div className="stat">
          <span className="stat-num">{data.daysEngaged}</span>
          <span className="stat-label">{data.daysEngaged === 1 ? 'day engaged' : 'days engaged'}</span>
        </div>
        <div className="stat">
          <span className="stat-num">Week {data.weekOf}</span>
          <span className="stat-label">of {data.totalWeeks}</span>
        </div>
      </div>

      {SHOW_STREAK && <StreakNote streak={data.currentStreak} />}
    </section>
  )
}

// Quiet, never punishing. A zero streak is an invitation, not a failure — no
// "you lost your streak" language, no fanfare about resetting.
function StreakNote({ streak }: { streak: number }) {
  if (streak <= 0) {
    return (
      <p className="streak muted">
        Whenever you're ready, pick back up today.
      </p>
    )
  }
  return (
    <p className="streak muted">
      {streak === 1 ? 'Checked in today.' : `${streak} days in a row.`}
    </p>
  )
}
