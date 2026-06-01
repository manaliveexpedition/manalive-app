import { supabase } from './supabase'
import { localDateISO, resolveSortIndex } from './today'

export const TOTAL_WEEKS = 26

// Single flag to hide the streak entirely later. The beta will tell us whether
// the streak helps or hurts; flipping this to false removes it from the UI with
// no other change. Days-engaged and week-of-26 always stay.
export const SHOW_STREAK = true

export type Progress = {
  started: boolean
  weekOf: number | null // 1..26
  totalWeeks: number
  daysEngaged: number
  currentStreak: number
}

// Everything here is computed from HIS OWN rows only (RLS scopes the query).
// No cohort, no comparison, no ranking.
//
// Engagement = opening the day's reading. We count the distinct local days he
// opened an entry (opened_entry events). Opening the day IS the engagement — a
// man who reads every day is credited even if he never taps the optional
// reflection. (We intentionally do NOT key this off check-ins.)
export async function loadProgress(startDate: string | null, now: Date = new Date()): Promise<Progress> {
  // Scope to his own events explicitly. RLS returns ALL events to an admin
  // (is_admin()), so without this filter an admin would see cohort-wide numbers.
  const { data: { session } } = await supabase.auth.getSession()
  const uid = session?.user?.id ?? ''

  const { data, error } = await supabase
    .from('events')
    .select('created_at')
    .eq('user_id', uid)
    .eq('event_type', 'opened_entry')
  if (error) throw error

  const dates = new Set(
    (data ?? [])
      .map((r) => r.created_at)
      .filter((t): t is string => !!t)
      .map((t) => localDateISO(new Date(t))),
  )

  const sortIndex = resolveSortIndex(startDate, now)
  const started = sortIndex !== null
  const weekOf = sortIndex === null ? null : Math.min(Math.ceil(sortIndex / 7), TOTAL_WEEKS)

  return {
    started,
    weekOf,
    totalWeeks: TOTAL_WEEKS,
    daysEngaged: dates.size,
    currentStreak: currentStreak(dates, now),
  }
}

// Consecutive days ending today, with a one-day grace: a man who checked in
// yesterday but not yet today still has a "current" streak — he can pick it up
// today. Two-plus days gap returns 0, which the UI frames calmly, never as loss.
function currentStreak(dates: Set<string>, now: Date): number {
  const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (!dates.has(localDateISO(cursor))) cursor.setDate(cursor.getDate() - 1)

  let streak = 0
  while (dates.has(localDateISO(cursor))) {
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}
