import { supabase } from './supabase'

// "What landed / What didn't" are BETA-ONLY feedback for John (the team), not
// part of the real post-camp experience and NOT private to the man. Flip this
// to false after the beta to remove the feedback box entirely.
export const BETA_FEEDBACK = true

export type ConsumedAs = 'read' | 'listen'

export type Checkin = {
  id: string
  entry_id: string | null
  checkin_date: string | null
  sat_with_it: boolean | null
  what_landed: string | null
  what_didnt: string | null
  consumed_as: string | null
}

// Today's check-in for this entry, if he's already logged one. RLS scopes this
// to his own rows, so no user_id filter is needed.
export async function fetchCheckin(entryId: string, date: string): Promise<Checkin | null> {
  // Scope to his own row explicitly: RLS returns all men's check-ins to an
  // admin, so without this an admin could match several rows and 406.
  const { data: { session } } = await supabase.auth.getSession()
  const uid = session?.user?.id ?? ''

  const { data, error } = await supabase
    .from('checkins')
    .select('id, entry_id, checkin_date, sat_with_it, what_landed, what_didnt, consumed_as')
    .eq('user_id', uid)
    .eq('entry_id', entryId)
    .eq('checkin_date', date)
    .maybeSingle()
  if (error) throw error
  return (data as Checkin) ?? null
}

export type CheckinInput = {
  entryId: string
  date: string
  whatLanded: string
  whatDidnt: string
  consumedAs: ConsumedAs
}

// Write his check-in: the optional reflection/feedback for the day. Engagement
// is tracked by the open (see progress.ts), not by this write, so there is no
// "did you sit with it" flag. Empty reflection text is stored as null rather
// than '' to keep the column clean.
export async function submitCheckin(input: CheckinInput): Promise<Checkin> {
  const { data, error } = await supabase
    .from('checkins')
    .insert({
      entry_id: input.entryId,
      checkin_date: input.date,
      what_landed: input.whatLanded.trim() || null,
      what_didnt: input.whatDidnt.trim() || null,
      consumed_as: input.consumedAs,
    })
    .select('id, entry_id, checkin_date, sat_with_it, what_landed, what_didnt, consumed_as')
    .single()
  if (error) throw error
  return data as Checkin
}
