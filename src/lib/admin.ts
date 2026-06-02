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
  checkinsLogged: number
  readCount: number
  listenCount: number
  reachedWeek8: boolean
  activeAtWeek8: boolean | null // null when he hasn't reached week 8 yet
}

// A day's entry that men went back to, ranked so the most-revisited (likely
// most-valuable) content surfaces. Counts members only, not admins.
export type RevisitedEntry = {
  entryId: string
  week: number | null
  day: number | null
  title: string | null
  revisits: number // total re-opens across men (opens beyond the first, per man)
  men: number // distinct men who re-opened it
}

export type AdminData = {
  men: ManRow[]
  cohortSize: number
  revisitedEntries: RevisitedEntry[] // which posts men went back to, most first
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
    // METADATA ONLY — no what_landed / what_didnt. Only used to count reflections
    // logged; engagement/read-listen now come from events.
    supabase.from('checkins').select('user_id, created_at'),
    supabase.from('events').select('user_id, entry_id, event_type, created_at'),
    supabase.from('entries').select('id, week, day, title'),
  ])
  const err = profilesRes.error || checkinsRes.error || eventsRes.error || entriesRes.error
  if (err) throw err

  const profiles = profilesRes.data ?? []
  const checkins = checkinsRes.data ?? []
  const events = eventsRes.data ?? []
  const entries = entriesRes.data ?? []

  const week1Entries = new Set(entries.filter((e) => e.week === 1).map((e) => e.id))
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

  // Which day's entries men went back to (members only). Count opens per
  // (member, entry); any open beyond the first is a revisit of that entry.
  const memberIds = new Set(members.map((m) => m.id))
  const entryById = new Map(entries.map((e) => [e.id, e]))
  const perUserEntry = new Map<string, number>()
  for (const e of events) {
    if (e.event_type === 'opened_entry' && e.entry_id && memberIds.has(e.user_id)) {
      const k = `${e.user_id}|${e.entry_id}`
      perUserEntry.set(k, (perUserEntry.get(k) ?? 0) + 1)
    }
  }
  const agg = new Map<string, { revisits: number; men: number }>()
  for (const [k, count] of perUserEntry) {
    if (count > 1) {
      const entryId = k.slice(k.indexOf('|') + 1)
      const a = agg.get(entryId) ?? { revisits: 0, men: 0 }
      a.revisits += count - 1
      a.men += 1
      agg.set(entryId, a)
    }
  }
  const revisitedEntries: RevisitedEntry[] = [...agg.entries()]
    .map(([entryId, a]) => {
      const e = entryById.get(entryId)
      return { entryId, week: e?.week ?? null, day: e?.day ?? null, title: e?.title ?? null, revisits: a.revisits, men: a.men }
    })
    .sort((a, b) => b.revisits - a.revisits || b.men - a.men)

  return { men, cohortSize: members.length, revisitedEntries, week1Activation, week8Retention }
}
