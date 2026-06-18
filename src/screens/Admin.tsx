import { useEffect, useMemo, useState } from 'react'
import { loadAdminData, type AdminData, type ManRow, type EntryStat, type GroupStat, type DayFeedback } from '../lib/admin'

type SortKey = 'name' | 'lastActive' | 'daysEngaged' | 'revisits' | 'audioPlays' | 'alumniClicks' | 'onTimeRate' | 'weekReached' | 'checkinsLogged' | 'listenCount'

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

      <h2 className="section-head">Men</h2>
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
              <Th label="Group" k="alumniClicks" {...{ sortKey, sortDir, toggleSort }} />
              <Th label="On-time" k="onTimeRate" {...{ sortKey, sortDir, toggleSort }} />
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
                  <div className="man-name">{m.name || '-'}</div>
                  <div className="man-email">{m.email}</div>
                </td>
                <td>{m.lastActive ?? '-'}</td>
                <td>{m.daysEngaged}</td>
                <td>{m.revisits}</td>
                <td>{m.audioPlays}</td>
                <td>{m.alumniClicks}</td>
                <td title={`${m.onTimeOpens}/${m.onTimeTotal} opened on their day`}>
                  {m.onTimeRate == null ? '-' : `${Math.round(m.onTimeRate * 100)}%`}
                </td>
                <td>{m.weekReached ?? '-'}</td>
                <td>{m.checkinsLogged}</td>
                <td>{m.readCount} / {m.listenCount}</td>
                <td><Week8Badge row={m} /></td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={11} className="muted">No men match this filter.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <FeedbackByDay days={data.feedbackByDay} />
      <DropOff entries={data.entryStats} />

      <div className="group-rollups">
        <GroupTable title="By format" hint="Opened = of the men who reached a shape's days, the share who opened it. Apples-to-apples, best first." groups={data.formatStats} />
        <GroupTable title="By phase" hint="Opened = share of men who opened, among days they've reached. In journey order." groups={data.phaseStats} />
      </div>

      {/* Full per-day scorecard last — it's the longest table. */}
      <Scorecard entries={data.entryStats} />
    </section>
  )
}

// ---------------------------------------------------------------- per-entry
type EntrySortKey = 'sortIndex' | 'reach' | 'revisits' | 'reflections' | 'listens' | 'clicks'

function Scorecard({ entries }: { entries: EntryStat[] }) {
  const [key, setKey] = useState<EntrySortKey>('reach')
  const [dir, setDir] = useState<'asc' | 'desc'>('desc')
  const sorted = useMemo(() => {
    return [...entries].sort((a, b) => (((a[key] ?? 0) as number) - ((b[key] ?? 0) as number)) * (dir === 'asc' ? 1 : -1))
  }, [entries, key, dir])
  function sort(k: EntrySortKey) {
    if (k === key) setDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setKey(k); setDir('desc') }
  }
  const EH = ({ label, k }: { label: string; k: EntrySortKey }) => (
    <th>
      <button type="button" className={key === k ? 'sort on' : 'sort'} onClick={() => sort(k)}>
        {label}{key === k ? (dir === 'asc' ? ' ▲' : ' ▼') : ''}
      </button>
    </th>
  )

  return (
    <>
      <h2 className="section-head">Content scorecard</h2>
      <p className="rollup-hint">One row per day. Reach = distinct men who opened it. Sort to see what landed.</p>
      <div className="table-wrap">
        <table className="men">
          <thead>
            <tr>
              <EH label="Day" k="sortIndex" />
              <th>Entry</th>
              <th>Format</th>
              <EH label="Reach" k="reach" />
              <EH label="Revisits" k="revisits" />
              <EH label="Reflections" k="reflections" />
              <EH label="Listens" k="listens" />
              <EH label="Clicks" k="clicks" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((e) => (
              <tr key={e.entryId}>
                <td className="nowrap">{e.week != null ? `Wk ${e.week}·D${e.day}` : '-'}</td>
                <td className="man-name">{e.title ?? '-'}</td>
                <td>{e.format ? <span className="tag">{e.format}</span> : '-'}</td>
                <td>{e.reach}</td>
                <td>{e.revisits}</td>
                <td>{e.reflections}</td>
                <td>{e.listens}</td>
                <td>{e.clicks}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

// ----------------------------------------------------------- beta feedback
function FeedbackByDay({ days }: { days: DayFeedback[] }) {
  return (
    <>
      <h2 className="section-head">Beta feedback by day</h2>
      <p className="rollup-hint">What testers said landed and didn't, grouped by day. Your "what to change" list.</p>
      {days.length === 0 ? (
        <p className="muted">No feedback yet.</p>
      ) : (
        <div className="feedback-days">
          {days.map((d) => (
            <div className="feedback-day" key={d.entryId}>
              <h3 className="feedback-day-head">
                {d.week != null ? `Wk ${d.week} · Day ${d.day}` : `Day ${d.sortIndex}`}: {d.title ?? ''}
              </h3>
              {d.landed.length > 0 && (
                <div className="fb-group">
                  <p className="fb-label">What landed</p>
                  <ul>{d.landed.map((t, i) => <li key={i}>{t}</li>)}</ul>
                </div>
              )}
              {d.didnt.length > 0 && (
                <div className="fb-group">
                  <p className="fb-label">What didn't</p>
                  <ul>{d.didnt.map((t, i) => <li key={i}>{t}</li>)}</ul>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  )
}

// ------------------------------------------------------------------ drop-off
function DropOff({ entries }: { entries: EntryStat[] }) {
  const max = Math.max(1, ...entries.map((e) => e.reach))
  const anyOpens = entries.some((e) => e.reach > 0)
  return (
    <>
      <h2 className="section-head">Drop-off by day</h2>
      <p className="rollup-hint">Reach per journey day. Watch where the bars fall off. That's where men disengage.</p>
      {!anyOpens ? (
        <p className="muted">No opens yet.</p>
      ) : (
        <div className="dropoff">
          {entries.map((e) => (
            <div className="dropoff-row" key={e.entryId}>
              <span className="dropoff-day">D{e.sortIndex}</span>
              <div className="dropoff-track">
                <div className="dropoff-bar" style={{ width: `${(e.reach / max) * 100}%` }} />
              </div>
              <span className="dropoff-val">{e.reach}</span>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

// ------------------------------------------------------------- format/phase
function GroupTable({ title, hint, groups }: { title: string; hint: string; groups: GroupStat[] }) {
  return (
    <div className="group-block">
      <h2 className="section-head">{title}</h2>
      <p className="rollup-hint">{hint}</p>
      <div className="table-wrap">
        <table className="men">
          <thead>
            <tr>
              <th>Tag</th>
              <th>Entries</th>
              <th>Opened</th>
              <th>Revisits</th>
              <th>Listens</th>
              <th>Reflections</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => (
              <tr key={g.key}>
                <td><span className="tag">{g.key}</span></td>
                <td>{g.entries}</td>
                <td>{g.reachedEntries > 0 ? `${Math.round(g.openRate * 100)}%` : '-'}</td>
                <td>{g.revisits}</td>
                <td>{g.listens}</td>
                <td>{g.reflections}</td>
              </tr>
            ))}
            {groups.length === 0 && <tr><td colSpan={6} className="muted">No data yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ----------------------------------------------------------------- helpers
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
  if (!row.reachedWeek8) return <span className="muted">-</span>
  return row.activeAtWeek8
    ? <span className="badge on">active</span>
    : <span className="badge off">quiet</span>
}

function Rollup({ label, value, hint }: { label: string; value: number | null; hint: string }) {
  return (
    <div className="rollup">
      <span className="rollup-num">{value === null ? '-' : `${Math.round(value * 100)}%`}</span>
      <span className="rollup-label">{label}</span>
      <span className="rollup-hint">{hint}</span>
    </div>
  )
}
