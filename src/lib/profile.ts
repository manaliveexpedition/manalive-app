import { supabase } from './supabase'

export type Profile = {
  id: string
  email: string | null
  name: string | null
  cohort: string | null
  start_date: string | null
  role: string
}

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
    .select('id, email, name, cohort, start_date, role')
    .eq('id', uid)
    .single()
  if (error) throw error
  return data as Profile
}
