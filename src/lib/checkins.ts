import { supabase } from './supabase'

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
  const { data, error } = await supabase
    .from('checkins')
    .select('id, entry_id, checkin_date, sat_with_it, what_landed, what_didnt, consumed_as')
    .eq('entry_id', entryId)
    .eq('checkin_date', date)
    .maybeSingle()
  if (error) throw error
  return (data as Checkin) ?? null
}

export type CheckinInput = {
  entryId: string
  date: string
  satWithIt: boolean
  whatLanded: string
  whatDidnt: string
  consumedAs: ConsumedAs
}

// Write his check-in. user_id defaults to auth.uid() server-side. Empty
// reflection text is stored as null rather than '' to keep the column clean.
export async function submitCheckin(input: CheckinInput): Promise<Checkin> {
  const { data, error } = await supabase
    .from('checkins')
    .insert({
      entry_id: input.entryId,
      checkin_date: input.date,
      sat_with_it: input.satWithIt,
      what_landed: input.whatLanded.trim() || null,
      what_didnt: input.whatDidnt.trim() || null,
      consumed_as: input.consumedAs,
    })
    .select('id, entry_id, checkin_date, sat_with_it, what_landed, what_didnt, consumed_as')
    .single()
  if (error) throw error
  return data as Checkin
}
