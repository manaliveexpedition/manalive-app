import { supabase } from './supabase'

export type Profile = {
  id: string
  email: string | null
  name: string | null
  cohort: string | null
  start_date: string | null
  role: string
}

// The signed-in man's own profile row (RLS returns only his). The signup
// trigger guarantees the row exists, so a missing row is a real error.
export async function fetchMyProfile(): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, name, cohort, start_date, role')
    .single()
  if (error) throw error
  return data as Profile
}
