import { supabase } from './supabase'

// Today's calendar date as YYYY-MM-DD in the man's local timezone. Used for
// checkin_date so it lines up with the local-midnight entry resolution below.
export function localDateISO(now: Date = new Date()): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export type Entry = {
  id: string
  week: number | null
  day: number | null
  title: string | null
  body_text: string | null
  audio_url: string | null
  sort_index: number | null
  reflection_prompt: string | null
}

// Resolve which entry the man should see today from his start_date.
// Day 1 of the journey (start_date itself) maps to sort_index 1.
// Returns null when start_date is null or still in the future — the Today
// screen renders a calm "your journey starts soon" state in that case, never
// an error. Compares calendar dates (local), so the entry flips at midnight.
export function resolveSortIndex(startDate: string | null, now: Date = new Date()): number | null {
  if (!startDate) return null

  const start = new Date(`${startDate}T00:00:00`)
  if (Number.isNaN(start.getTime())) return null

  const startMidnight = new Date(start.getFullYear(), start.getMonth(), start.getDate())
  const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  const msPerDay = 24 * 60 * 60 * 1000
  const daysElapsed = Math.floor((nowMidnight.getTime() - startMidnight.getTime()) / msPerDay)
  if (daysElapsed < 0) return null

  return daysElapsed + 1
}

export type TodayState =
  | { kind: 'not_started' }
  | { kind: 'caught_up'; lastSortIndex: number }
  | { kind: 'entry'; entry: Entry }

// Load today's entry for a man whose profile carries `startDate`. If the
// resolved sort_index runs past the last seeded entry, he's caught up.
export async function loadToday(startDate: string | null, now: Date = new Date()): Promise<TodayState> {
  const sortIndex = resolveSortIndex(startDate, now)
  if (sortIndex === null) return { kind: 'not_started' }

  const { data, error } = await supabase
    .from('entries')
    .select('id, week, day, title, body_text, audio_url, sort_index, reflection_prompt')
    .eq('sort_index', sortIndex)
    .maybeSingle()

  if (error) throw error

  if (!data) {
    const { data: last } = await supabase
      .from('entries')
      .select('sort_index')
      .order('sort_index', { ascending: false })
      .limit(1)
      .maybeSingle()
    return { kind: 'caught_up', lastSortIndex: last?.sort_index ?? sortIndex - 1 }
  }

  return { kind: 'entry', entry: data as Entry }
}

// Every entry the man has reached so far (day 1 .. his current day), full data,
// most-recent first — for the "previous days" list and re-reading. Future days
// are excluded (no spoilers). Empty if his journey hasn't started.
export async function loadReachedEntries(startDate: string | null, now: Date = new Date()): Promise<Entry[]> {
  const current = resolveSortIndex(startDate, now)
  if (current === null) return []

  const { data, error } = await supabase
    .from('entries')
    .select('id, week, day, title, body_text, audio_url, sort_index, reflection_prompt')
    .gte('sort_index', 1)
    .lte('sort_index', current)
    .order('sort_index', { ascending: false })
  if (error) throw error
  return (data as Entry[]) ?? []
}
