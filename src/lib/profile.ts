import { supabase } from './supabase'

export type Profile = {
  id: string
  email: string | null
  name: string | null // preferred name (what he goes by); used in greetings
  last_name: string | null
  name_confirmed: boolean
  cohort: string | null
  start_date: string | null
  role: string
}

const PROFILE_COLS = 'id, email, name, last_name, name_confirmed, cohort, start_date, role'

// The signed-in man's own profile row. We scope to his id explicitly rather
// than relying on RLS: for an ADMIN the read policy (auth.uid() = id OR
// is_admin()) returns every profile, which would make .single() see many rows
// and fail with a 406. The signup trigger guarantees the row exists.
export async function fetchMyProfile(): Promise<Profile> {
  const { data: { session } } = await supabase.auth.getSession()
  const uid = session?.user?.id
  if (!uid) throw new Error('Not signed in')

  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_COLS)
    .eq('id', uid)
    .single()
  if (error) throw error
  return data as Profile
}

// Save the man's preferred name (+ optional last name) and mark it confirmed, so
// the "what do you go by?" step does not show again. Used by the first-run screen
// and the Settings edit.
export async function saveName(name: string, lastName: string): Promise<Profile> {
  const { data: { session } } = await supabase.auth.getSession()
  const uid = session?.user?.id
  if (!uid) throw new Error('Not signed in')
  const { data, error } = await supabase
    .from('profiles')
    .update({ name: name.trim() || null, last_name: lastName.trim() || null, name_confirmed: true })
    .eq('id', uid)
    .select(PROFILE_COLS)
    .single()
  if (error) throw error
  return data as Profile
}
