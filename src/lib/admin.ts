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
  checkinsLogged: number
  readCount: number
  listenCount: number
  reachedWeek8: boolean
  activeAtWeek8: boolean | null // null when he hasn't reached week 8 yet
}

export type AdminData = {
  men: ManRow[]
  cohortSize: number
  // Same definitions as the Five-Number Dashboard so we don't fork metrics:
  week1Activation: number | null // share of STARTED men who opened wk1 + checked in
  week8Retention: number | null // share of men who REACHED wk8 and are still active
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
    // METADATA ONLY — no what_landed / what_didnt.
    supabase.from('checkins').select('user_id, entry_id, checkin_date, consumed_as, created_at'),
    supabase.from('events').select('user_id, entry_id, event_type, created_at'),
    supabase.from('entries').select('id, week'),
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

    const checkinDates = new Set(myCheckins.map((c) => c.checkin_date).filter(Boolean) as string[])
    const readCount = myCheckins.filter((c) => c.consumed_as === 'read').length
    const listenCount = myCheckins.filter((c) => c.consumed_as === 'listen').length

    const activityDates = [
      ...myCheckins.map((c) => c.created_at),
      ...myEvents.map((e) => e.created_at),
    ].filter(Boolean).map((ts: string) => ts.slice(0, 10))
    const lastActive = activityDates.length ? activityDates.sort().at(-1)! : null

    const sortIndex = resolveSortIndex(p.start_date, now)
    const weekReached = sortIndex === null ? null : Math.min(Math.ceil(sortIndex / 7), TOTAL_WEEKS)
    const reachedWeek8 = sortIndex !== null && sortIndex >= WEEK8_START_OFFSET + 1

    // Active at week 8 = at least one CHECK-IN within week 8 specifically
    // (days 50-56: start_date + 49 .. + 55 inclusive). Matches the Five-Number
    // Dashboard's bounded window, not an open-ended "day 50 onward".
    let activeAtWeek8: boolean | null = null
    if (reachedWeek8 && p.start_date) {
      const w8Start = addDays(p.start_date, WEEK8_START_OFFSET)
      const w8End = addDays(p.start_date, WEEK8_END_OFFSET)
      activeAtWeek8 = [...checkinDates].some((d) => d >= w8Start && d <= w8End)
    }

    return {
      userId: p.id,
      email: p.email,
      name: p.name,
      cohort: p.cohort,
      startDate: p.start_date,
      weekReached,
      lastActive,
      daysEngaged: checkinDates.size,
      checkinsLogged: myCheckins.length,
      readCount,
      listenCount,
      reachedWeek8,
      activeAtWeek8,
    }
  })

  // Week-1 activation: opened a week-1 entry AND logged a check-in (on a week-1
  // entry). Denominator = men who have STARTED (those still waiting don't count).
  const started = men.filter((m) => m.weekReached !== null)
  const activated = started.filter((m) => {
    const myEvents = events.filter((e) => e.user_id === m.userId)
    const myCheckins = checkins.filter((c) => c.user_id === m.userId)
    const openedW1 = myEvents.some((e) => e.event_type === 'opened_entry' && e.entry_id && week1Entries.has(e.entry_id))
    const checkedW1 = myCheckins.some((c) => c.entry_id && week1Entries.has(c.entry_id))
    return openedW1 && checkedW1
  })
  const week1Activation = started.length ? activated.length / started.length : null

  // Week-8 retention: among men who REACHED week 8, the share still active then.
  const reached8 = men.filter((m) => m.reachedWeek8)
  const retained8 = reached8.filter((m) => m.activeAtWeek8)
  const week8Retention = reached8.length ? retained8.length / reached8.length : null

  return { men, cohortSize: members.length, week1Activation, week8Retention }
}
