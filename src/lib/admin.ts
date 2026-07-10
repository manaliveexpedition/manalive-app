import { supabase } from './supabase'
import { resolveSortIndex } from './today'
import { TOTAL_WEEKS } from './progress'

// ADMIN ENGAGEMENT.
//
// NOTE on what_landed / what_didnt: during the BETA these two are explicitly
// feedback FOR the team (John), not a private reflection — so the admin view
// reads them and aggregates them by day. They are gated client-side by
// BETA_FEEDBACK and are not part of the real post-camp experience. Peer privacy
// still holds: one member can never read another's rows (RLS); only the admin
// (is_admin()) can read across the cohort, which is why the UI also gates the
// Admin tab on role === 'admin'.

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
  reach: number // distinct men who engaged with it (open / audio / link / check-in), robust to lost open pings
  opens: number // total opened_entry pings (can undercount on flaky connections)
  revisits: number // opens beyond the first, summed across men
  reflections: number // check-ins logged for it
  listens: number // distinct men who played its audio
  clicks: number // link clicks from it
  menReached: number // members whose journey has reached this day (the fair denominator)
}

// Engagement rolled up by a content tag (Format or Phase).
export type GroupStat = {
  key: string
  entries: number // # entries in the group
  reach: number // total distinct-man opens across its entries
  avgReach: number // reach / entries — biased by journey position; prefer openRate
  reachedEntries: number // entries at least one man has reached
  openRate: number // 0..1: distinct-man opens / men-reached-opportunities, over reached entries (apples-to-apples)
  revisits: number
  listens: number
  reflections: number
}

// One tester's beta feedback for a day. The admin feed is flat and newest-first
// (latest note on top) and names who left it, so John can see who said what.
export type FeedbackItem = {
  checkinId: string
  who: string // first name + last initial, e.g. "Trey M."
  sortIndex: number | null
  week: number | null
  day: number | null
  title: string | null
  landed: string | null
  didnt: string | null
  createdAt: string
}

export type AdminData = {
  men: ManRow[]
  cohortSize: number
  feedback: FeedbackItem[] // beta feedback, flat and newest-first, with author
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

// "Trey M." — first name + last initial for feedback attribution. Falls back to
// the email local part, then a generic label, so a note is never orphaned.
function displayName(p: { name: string | null; last_name: string | null; email: string | null }): string {
  const first = (p.name || '').trim()
  const last = (p.last_name || '').trim()
  if (first) return last ? `${first} ${last[0].toUpperCase()}.` : first
  const local = (p.email || '').split('@')[0]
  return local || 'Someone'
}

// PostgREST caps a single response at 1000 rows. events (and eventually
// checkins) grow past that, so we page through with .range() until a short
// page comes back — otherwise the newest rows silently vanish and every
// recent-day stat (drop-off, retention, on-time) reads far too low. Order by
// created_at so paging is deterministic across requests.
async function fetchAllRows<T>(table: string, cols: string): Promise<T[]> {
  const PAGE = 1000
  const rows: T[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from(table)
      .select(cols)
      .order('created_at', { ascending: true })
      .range(from, from + PAGE - 1)
    if (error) throw error
    const batch = (data ?? []) as T[]
    rows.push(...batch)
    if (batch.length < PAGE) break
  }
  return rows
}

export async function loadAdminData(now: Date = new Date()): Promise<AdminData> {
  const [profilesRes, entriesRes, checkins, events] = await Promise.all([
    supabase.from('profiles').select('id, email, name, last_name, cohort, start_date, role'),
    supabase.from('entries').select('id, week, day, title, format, phase, sort_index'),
    // Beta feedback: what_landed / what_didnt are read here on purpose (see the
    // header note) so John can see per-day comments. RLS still blocks peers.
    // Both events and checkins are paged so the newest rows are never dropped.
    fetchAllRows<{ id: string; user_id: string; entry_id: string | null; created_at: string; what_landed: string | null; what_didnt: string | null }>('checkins', 'id, user_id, entry_id, created_at, what_landed, what_didnt'),
    fetchAllRows<{ user_id: string; entry_id: string | null; event_type: string; created_at: string }>('events', 'user_id, entry_id, event_type, created_at'),
  ])
  const err = profilesRes.error || entriesRes.error
  if (err) throw err

  const profiles = profilesRes.data ?? []
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
  // engagedMen = distinct men with ANY footprint on the day (open / audio / link /
  // check-in). The opened_entry "ping" is fire-and-forget and gets dropped on flaky
  // connections (content filters / offline), so it alone undercounts; a check-in or
  // audio play proves the man was on the day even when his open ping was lost.
  const memberIds = new Set(members.map((m) => m.id))
  type EntryAgg = { opensByMan: Map<string, number>; listenMen: Set<string>; clicks: number; engagedMen: Set<string> }
  const perEntry = new Map<string, EntryAgg>()
  const ensureEntry = (eid: string) => {
    let a = perEntry.get(eid)
    if (!a) { a = { opensByMan: new Map(), listenMen: new Set(), clicks: 0, engagedMen: new Set() }; perEntry.set(eid, a) }
    return a
  }
  for (const e of events) {
    if (!e.entry_id || !memberIds.has(e.user_id)) continue
    const a = ensureEntry(e.entry_id)
    if (e.event_type === 'opened_entry') { a.opensByMan.set(e.user_id, (a.opensByMan.get(e.user_id) ?? 0) + 1); a.engagedMen.add(e.user_id) }
    else if (e.event_type === 'played_audio') { a.listenMen.add(e.user_id); a.engagedMen.add(e.user_id) }
    else if (e.event_type === 'clicked_link') { a.clicks++; a.engagedMen.add(e.user_id) }
  }
  const reflByEntry = new Map<string, number>()
  for (const c of checkins) {
    if (c.entry_id && memberIds.has(c.user_id)) {
      reflByEntry.set(c.entry_id, (reflByEntry.get(c.entry_id) ?? 0) + 1)
      ensureEntry(c.entry_id).engagedMen.add(c.user_id) // a check-in proves he opened the day
    }
  }

  // Each member's current day, so we know which entries they've actually reached
  // (an entry no one has reached yet is not a fair miss, it's just future).
  const memberSortIndexes = members
    .map((p) => resolveSortIndex(p.start_date, now))
    .filter((x): x is number => x != null)

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
        reach: a?.engagedMen.size ?? 0,
        opens: counts.reduce((s, n) => s + n, 0),
        revisits: counts.reduce((s, n) => s + Math.max(0, n - 1), 0),
        reflections: reflByEntry.get(en.id) ?? 0,
        listens: a?.listenMen.size ?? 0,
        clicks: a?.clicks ?? 0,
        menReached: memberSortIndexes.filter((x) => x >= (en.sort_index ?? Infinity)).length,
      }
    })
    .sort((a, b) => (a.sortIndex ?? 0) - (b.sortIndex ?? 0))

  // Roll the scorecard up by a content tag (Format or Phase). avgReach lets us
  // compare groups of different sizes fairly.
  function groupBy(keyFn: (s: EntryStat) => string | null) {
    type Acc = GroupStat & { minSort: number; opensReached: number; opps: number }
    const m = new Map<string, Acc>()
    for (const s of entryStats) {
      const k = keyFn(s)
      if (!k) continue
      const g = m.get(k) ?? { key: k, entries: 0, reach: 0, avgReach: 0, reachedEntries: 0, openRate: 0, revisits: 0, listens: 0, reflections: 0, minSort: Infinity, opensReached: 0, opps: 0 }
      g.entries++
      g.reach += s.reach
      g.revisits += s.revisits
      g.listens += s.listens
      g.reflections += s.reflections
      g.minSort = Math.min(g.minSort, s.sortIndex ?? Infinity)
      if (s.menReached > 0) { g.reachedEntries++; g.opensReached += s.reach; g.opps += s.menReached } // only days men have reached
      m.set(k, g)
    }
    return [...m.values()].map(({ opensReached, opps, ...g }) => ({
      ...g,
      avgReach: g.entries ? g.reach / g.entries : 0,
      openRate: opps ? opensReached / opps : 0,
    }))
  }
  const formatStats: GroupStat[] = groupBy((s) => s.format)
    .map(({ minSort: _omit, ...g }) => g)
    .sort((a, b) => b.openRate - a.openRate) // which shapes land best (fair, reached-only)
  const phaseStats: GroupStat[] = groupBy((s) => s.phase)
    .sort((a, b) => a.minSort - b.minSort) // journey order
    .map(({ minSort: _omit, ...g }) => g)

  // Beta feedback as a flat, newest-first feed (members only). One item per
  // check-in that carries a comment, tagged with who left it and which day it
  // was about, so John sees the latest on top and knows the source.
  const nameById = new Map(members.map((p) => [p.id, displayName(p)]))
  const entryById = new Map(entries.map((e) => [e.id, e]))
  const feedback: FeedbackItem[] = checkins
    .map((c) => {
      if (!memberIds.has(c.user_id)) return null
      const landed = (c.what_landed || '').trim()
      const didnt = (c.what_didnt || '').trim()
      if (!landed && !didnt) return null
      const en = c.entry_id ? entryById.get(c.entry_id) : undefined
      return {
        checkinId: c.id,
        who: nameById.get(c.user_id) ?? 'Someone',
        sortIndex: en?.sort_index ?? null,
        week: en?.week ?? null,
        day: en?.day ?? null,
        title: en?.title ?? null,
        landed: landed || null,
        didnt: didnt || null,
        createdAt: c.created_at,
      }
    })
    .filter((x): x is FeedbackItem => x !== null)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0)) // newest first

  return { men, cohortSize: members.length, feedback, entryStats, formatStats, phaseStats, week1Activation, week8Retention }
}
