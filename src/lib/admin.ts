import { supabase } from './supabase'
import { resolveSortIndex } from './today'
import { TOTAL_WEEKS } from './progress'

// ADMIN ENGAGEMENT — METADATA ONLY.
//
// HARD RULE: what_landed / what_didnt (the reflection text) are NEVER selected
// here and never surfaced anywhere in the admin view. The checkins query below
// pulls only metadata columns on purpose. Do not add reflection columns to it.
//
// Cross-user reads are authorized by the is_admin() branch in the RLS policies;
// a non-admin running these queries sees only his own row, which is why the UI
// also gates the Admin tab on role === 'admin'.

const WEEK8_START_OFFSET = 49 // start_date + 49 days = day 50 (week 8 begins)
const WEEK8_END_OFFSET = 55 // start_date + 55 days = day 56 (week 8 ends, inclusive)

export type ManRow = {
  userId: string
  email: string | null
  name: string | null
  cohort: string | null
  startDate: string | null
  weekReached: number | null
  lastActive: string | null // YYYY-MM-DD
  daysEngaged: number
  revisits: number // times he RE-opened a day's entry (opens beyond the first per entry)
  audioPlays: number // total audio plays (played_audio) — did he listen
  alumniClicks: number // taps on an entry CTA link (the alumni group)
  onTimeOpens: number // entries he first opened on their scheduled day
  onTimeTotal: number // entries he opened at all (basis for the rate)
  onTimeRate: number | null // onTimeOpens / onTimeTotal — habit/rhythm, null if none
  checkinsLogged: number
  readCount: number
  listenCount: number
  reachedWeek8: boolean
  activeAtWeek8: boolean | null // null when he hasn't reached week 8 yet
}

// Per-entry engagement scorecard (members only). One row per day's entry.
export type EntryStat = {
  entryId: string
  sortIndex: number | null
  week: number | null
  day: number | null
  title: string | null
  format: string | null
  phase: string | null
  reach: number // distinct men who opened it
  opens: number // total opens
  revisits: number // opens beyond the first, summed across men
  reflections: number // check-ins logged for it
  listens: number // distinct men who played its audio
  clicks: number // link clicks from it
}

// Engagement rolled up by a content tag (Format or Phase).
export type GroupStat = {
  key: string
  entries: number // # entries in the group
  reach: number // total distinct-man opens across its entries
  avgReach: number // reach / entries — fair comparison across groups of different size
  revisits: number
  listens: number
  reflections: number
}

export type AdminData = {
  men: ManRow[]
  cohortSize: number
  entryStats: EntryStat[] // per-entry scorecard, in journey order
  formatStats: GroupStat[] // which delivery shapes land (best avg reach first)
  phaseStats: GroupStat[] // engagement by journey phase, in journey order
  // Engagement = opening the day's reading (opened_entry), matching the
  // man-facing Progress screen so the two views never disagree:
  week1Activation: number | null // share of STARTED men who opened the wk1 entry
  week8Retention: number | null // share of men who REACHED wk8 and opened during it
}

function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00`)
  d.setDate(d.getDate() + days)
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

export async function loadAdminData(now: Date = new Date()): Promise<AdminData> {
  const [profilesRes, checkinsRes, eventsRes, entriesRes] = await Promise.all([
    supabase.from('profiles').select('id, email, name, cohort, start_date, role'),
    // METADATA ONLY — no what_landed / what_didnt. entry_id + user_id only, to
    // count reflections per man and per entry. Never the reflection text.
    supabase.from('checkins').select('user_id, entry_id, created_at'),
    supabase.from('events').select('user_id, entry_id, event_type, created_at'),
    supabase.from('entries').select('id, week, day, title, format, phase, sort_index'),
  ])
  const err = profilesRes.error || checkinsRes.error || eventsRes.error || entriesRes.error
  if (err) throw err

  const profiles = profilesRes.data ?? []
  const checkins = checkinsRes.data ?? []
  const events = eventsRes.data ?? []
  const entries = entriesRes.data ?? []

  const week1Entries = new Set(entries.filter((e) => e.week === 1).map((e) => e.id))
  const entrySortById = new Map(entries.map((e) => [e.id, e.sort_index]))
  const members = profiles.filter((p) => p.role !== 'admin')

  const men: ManRow[] = members.map((p) => {
    const myCheckins = checkins.filter((c) => c.user_id === p.id)
    const myEvents = events.filter((e) => e.user_id === p.id)

    // Engaged days = distinct days he OPENED the reading. Within those, a day on
    // which he also played the audio counts as "listen", otherwise "read", so
    // readCount + listenCount = daysEngaged.
    const openDates = new Set(
      myEvents.filter((e) => e.event_type === 'opened_entry')
        .map((e) => e.created_at).filter(Boolean).map((ts: string) => ts.slice(0, 10)),
    )
    const listenDates = new Set(
      myEvents.filter((e) => e.event_type === 'played_audio')
        .map((e) => e.created_at).filter(Boolean).map((ts: string) => ts.slice(0, 10)),
    )
    const listenCount = [...openDates].filter((d) => listenDates.has(d)).length
    const readCount = openDates.size - listenCount

    // Revisits = re-opens of a day's entry (every open of an entry beyond the
    // first). Listen signal = total audio plays.
    const myEntryOpens = new Map<string, number>()
    myEvents.filter((e) => e.event_type === 'opened_entry' && e.entry_id)
      .forEach((e) => myEntryOpens.set(e.entry_id!, (myEntryOpens.get(e.entry_id!) ?? 0) + 1))
    const revisits = [...myEntryOpens.values()].reduce((s, n) => s + Math.max(0, n - 1), 0)
    const audioPlays = myEvents.filter((e) => e.event_type === 'played_audio').length
    const alumniClicks = myEvents.filter((e) => e.event_type === 'clicked_link').length

    // Habit: of the entries he opened, how many he FIRST opened on their
    // scheduled day (start_date + sortIndex-1) vs late. Daily-rhythm signal.
    const firstOpenByEntry = new Map<string, string>()
    myEvents.filter((e) => e.event_type === 'opened_entry' && e.entry_id && e.created_at)
      .forEach((e) => {
        const d = (e.created_at as string).slice(0, 10)
        const cur = firstOpenByEntry.get(e.entry_id!)
        if (!cur || d < cur) firstOpenByEntry.set(e.entry_id!, d)
      })
    let onTimeOpens = 0
    let onTimeTotal = 0
    if (p.start_date) {
      for (const [eid, d] of firstOpenByEntry) {
        const si = entrySortById.get(eid)
        if (si == null) continue
        onTimeTotal++
        if (d === addDays(p.start_date, si - 1)) onTimeOpens++
      }
    }
    const onTimeRate = onTimeTotal ? onTimeOpens / onTimeTotal : null

    // Last active = most recent activity of any kind (every action emits an event).
    const activityDates = myEvents.map((e) => e.created_at).filter(Boolean).map((ts: string) => ts.slice(0, 10))
    const lastActive = activityDates.length ? activityDates.sort().at(-1)! : null

    const sortIndex = resolveSortIndex(p.start_date, now)
    const weekReached = sortIndex === null ? null : Math.min(Math.ceil(sortIndex / 7), TOTAL_WEEKS)
    const reachedWeek8 = sortIndex !== null && sortIndex >= WEEK8_START_OFFSET + 1

    // Active at week 8 = at least one OPEN within week 8 specifically (days
    // 50-56: start_date + 49 .. + 55 inclusive). Bounded window, open-based.
    let activeAtWeek8: boolean | null = null
    if (reachedWeek8 && p.start_date) {
      const w8Start = addDays(p.start_date, WEEK8_START_OFFSET)
      const w8End = addDays(p.start_date, WEEK8_END_OFFSET)
      activeAtWeek8 = [...openDates].some((d) => d >= w8Start && d <= w8End)
    }

    return {
      userId: p.id,
      email: p.email,
      name: p.name,
      cohort: p.cohort,
      startDate: p.start_date,
      weekReached,
      lastActive,
      daysEngaged: openDates.size,
      revisits,
      audioPlays,
      alumniClicks,
      onTimeOpens,
      onTimeTotal,
      onTimeRate,
      checkinsLogged: myCheckins.length,
      readCount,
      listenCount,
      reachedWeek8,
      activeAtWeek8,
    }
  })

  // Week-1 activation: opened a week-1 entry. Denominator = men who have STARTED
  // (those still waiting don't count). No longer requires a check-in — the open
  // is the engagement.
  const started = men.filter((m) => m.weekReached !== null)
  const activated = started.filter((m) => {
    const myEvents = events.filter((e) => e.user_id === m.userId)
    return myEvents.some((e) => e.event_type === 'opened_entry' && e.entry_id && week1Entries.has(e.entry_id))
  })
  const week1Activation = started.length ? activated.length / started.length : null

  // Week-8 retention: among men who REACHED week 8, the share still active then.
  const reached8 = men.filter((m) => m.reachedWeek8)
  const retained8 = reached8.filter((m) => m.activeAtWeek8)
  const week8Retention = reached8.length ? retained8.length / reached8.length : null

  // Per-entry scorecard (members only). Aggregate engagement against each entry.
  const memberIds = new Set(members.map((m) => m.id))
  const perEntry = new Map<string, { opensByMan: Map<string, number>; listenMen: Set<string>; clicks: number }>()
  for (const e of events) {
    if (!e.entry_id || !memberIds.has(e.user_id)) continue
    let a = perEntry.get(e.entry_id)
    if (!a) { a = { opensByMan: new Map(), listenMen: new Set(), clicks: 0 }; perEntry.set(e.entry_id, a) }
    if (e.event_type === 'opened_entry') a.opensByMan.set(e.user_id, (a.opensByMan.get(e.user_id) ?? 0) + 1)
    else if (e.event_type === 'played_audio') a.listenMen.add(e.user_id)
    else if (e.event_type === 'clicked_link') a.clicks++
  }
  const reflByEntry = new Map<string, number>()
  for (const c of checkins) {
    if (c.entry_id && memberIds.has(c.user_id)) reflByEntry.set(c.entry_id, (reflByEntry.get(c.entry_id) ?? 0) + 1)
  }

  const entryStats: EntryStat[] = entries
    .map((en) => {
      const a = perEntry.get(en.id)
      const opensByMan = a?.opensByMan ?? new Map<string, number>()
      const counts = [...opensByMan.values()]
      return {
        entryId: en.id,
        sortIndex: en.sort_index,
        week: en.week,
        day: en.day,
        title: en.title,
        format: en.format ?? null,
        phase: en.phase ?? null,
        reach: opensByMan.size,
        opens: counts.reduce((s, n) => s + n, 0),
        revisits: counts.reduce((s, n) => s + Math.max(0, n - 1), 0),
        reflections: reflByEntry.get(en.id) ?? 0,
        listens: a?.listenMen.size ?? 0,
        clicks: a?.clicks ?? 0,
      }
    })
    .sort((a, b) => (a.sortIndex ?? 0) - (b.sortIndex ?? 0))

  // Roll the scorecard up by a content tag (Format or Phase). avgReach lets us
  // compare groups of different sizes fairly.
  function groupBy(keyFn: (s: EntryStat) => string | null) {
    const m = new Map<string, GroupStat & { minSort: number }>()
    for (const s of entryStats) {
      const k = keyFn(s)
      if (!k) continue
      const g = m.get(k) ?? { key: k, entries: 0, reach: 0, avgReach: 0, revisits: 0, listens: 0, reflections: 0, minSort: Infinity }
      g.entries++
      g.reach += s.reach
      g.revisits += s.revisits
      g.listens += s.listens
      g.reflections += s.reflections
      g.minSort = Math.min(g.minSort, s.sortIndex ?? Infinity)
      m.set(k, g)
    }
    return [...m.values()].map((g) => ({ ...g, avgReach: g.entries ? g.reach / g.entries : 0 }))
  }
  const formatStats: GroupStat[] = groupBy((s) => s.format)
    .map(({ minSort: _omit, ...g }) => g)
    .sort((a, b) => b.avgReach - a.avgReach) // which shapes land best
  const phaseStats: GroupStat[] = groupBy((s) => s.phase)
    .sort((a, b) => a.minSort - b.minSort) // journey order
    .map(({ minSort: _omit, ...g }) => g)

  return { men, cohortSize: members.length, entryStats, formatStats, phaseStats, week1Activation, week8Retention }
}
