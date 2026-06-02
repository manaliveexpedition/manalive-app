import { useEffect, useMemo, useState } from 'react'
import { loadAdminData, type AdminData, type ManRow } from '../lib/admin'

type SortKey = 'name' | 'lastActive' | 'daysEngaged' | 'revisits' | 'audioPlays' | 'weekReached' | 'checkinsLogged' | 'listenCount'

export function Admin() {
  const [data, setData] = useState<AdminData | null>(null)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('')
  const [week8Only, setWeek8Only] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>('lastActive')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const d = await loadAdminData()
        if (!cancelled) setData(d)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Something went wrong.')
      }
    })()
    return () => { cancelled = true }
  }, [])

  const rows = useMemo(() => {
    if (!data) return []
    const q = filter.trim().toLowerCase()
    let list = data.men
    if (q) list = list.filter((m) => (m.name ?? '').toLowerCase().includes(q) || (m.email ?? '').toLowerCase().includes(q))
    if (week8Only) list = list.filter((m) => m.reachedWeek8)
    return [...list].sort((a, b) => cmp(a, b, sortKey) * (sortDir === 'asc' ? 1 : -1))
  }, [data, filter, week8Only, sortKey, sortDir])

  function toggleSort(key: SortKey) {
    if (key === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('desc') }
  }

  if (error) return <p className="error">{error}</p>
  if (!data) return <p className="muted">Loading…</p>

  return (
    <section className="card admin">
      <h1>Engagement</h1>

      <div className="rollups">
        <Rollup label="Week-1 activation" value={data.week1Activation} hint="opened the wk1 entry" />
        <Rollup label="Week-8 retention" value={data.week8Retention} hint="still active at wk8" />
        <div className="rollup">
          <span className="rollup-num">{data.cohortSize}</span>
          <span className="rollup-label">men in cohort</span>
        </div>
      </div>

      <div className="admin-controls">
        <input
          type="search"
          placeholder="Filter by name or email"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <label className="checkbox">
          <input type="checkbox" checked={week8Only} onChange={(e) => setWeek8Only(e.target.checked)} />
          Reached week 8
        </label>
      </div>

      <div className="table-wrap">
        <table className="men">
          <thead>
            <tr>
              <Th label="Man" k="name" {...{ sortKey, sortDir, toggleSort }} />
              <Th label="Last active" k="lastActive" {...{ sortKey, sortDir, toggleSort }} />
              <Th label="Days" k="daysEngaged" {...{ sortKey, sortDir, toggleSort }} />
              <Th label="Revisits" k="revisits" {...{ sortKey, sortDir, toggleSort }} />
              <Th label="Listens" k="audioPlays" {...{ sortKey, sortDir, toggleSort }} />
              <Th label="Week" k="weekReached" {...{ sortKey, sortDir, toggleSort }} />
              <Th label="Reflections" k="checkinsLogged" {...{ sortKey, sortDir, toggleSort }} />
              <th>Read / Listen</th>
              <Th label="Wk8" k="listenCount" hideSort {...{ sortKey, sortDir, toggleSort }} />
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => (
              <tr key={m.userId}>
                <td>
                  <div className="man-name">{m.name || '—'}</div>
                  <div className="man-email">{m.email}</div>
                </td>
                <td>{m.lastActive ?? '—'}</td>
                <td>{m.daysEngaged}</td>
                <td>{m.revisits}</td>
                <td>{m.audioPlays}</td>
                <td>{m.weekReached ?? '—'}</td>
                <td>{m.checkinsLogged}</td>
                <td>{m.readCount} / {m.listenCount}</td>
                <td><Week8Badge row={m} /></td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={9} className="muted">No men match this filter.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="revisited">
        <h2>Most revisited</h2>
        <p className="rollup-hint">Days men went back to — a re-open beyond their first read. The posts that pulled them back.</p>
        {data.revisitedEntries.length === 0 ? (
          <p className="muted">No revisits yet.</p>
        ) : (
          <ol className="revisit-list">
            {data.revisitedEntries.slice(0, 10).map((e) => (
              <li key={e.entryId}>
                <span className="revisit-day">{e.week != null ? `Wk ${e.week} · Day ${e.day}` : '—'}</span>
                <span className="revisit-title">{e.title ?? '—'}</span>
                <span className="revisit-count">
                  {e.revisits} revisit{e.revisits === 1 ? '' : 's'} · {e.men} {e.men === 1 ? 'man' : 'men'}
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  )
}

function cmp(a: ManRow, b: ManRow, key: SortKey): number {
  if (key === 'name') return (a.name ?? a.email ?? '').localeCompare(b.name ?? b.email ?? '')
  if (key === 'lastActive') return (a.lastActive ?? '').localeCompare(b.lastActive ?? '')
  const an = (a[key] as number | null) ?? -1
  const bn = (b[key] as number | null) ?? -1
  return an - bn
}

function Th({ label, k, sortKey, sortDir, toggleSort, hideSort }: {
  label: string; k: SortKey; sortKey: SortKey; sortDir: 'asc' | 'desc'; toggleSort: (k: SortKey) => void; hideSort?: boolean
}) {
  if (hideSort) return <th>{label}</th>
  const active = sortKey === k
  return (
    <th>
      <button type="button" className={active ? 'sort on' : 'sort'} onClick={() => toggleSort(k)}>
        {label}{active ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
      </button>
    </th>
  )
}

function Week8Badge({ row }: { row: ManRow }) {
  if (!row.reachedWeek8) return <span className="muted">—</span>
  return row.activeAtWeek8
    ? <span className="badge on">active</span>
    : <span className="badge off">quiet</span>
}

function Rollup({ label, value, hint }: { label: string; value: number | null; hint: string }) {
  return (
    <div className="rollup">
      <span className="rollup-num">{value === null ? '—' : `${Math.round(value * 100)}%`}</span>
      <span className="rollup-label">{label}</span>
      <span className="rollup-hint">{hint}</span>
    </div>
  )
}
