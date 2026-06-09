import { supabase } from './supabase'

// A man's private note for one day's entry. Own-only via RLS (not even admin
// reads these), so the queries below are naturally scoped to him.

async function getUid(): Promise<string> {
  const { data } = await supabase.auth.getSession()
  const uid = data.session?.user?.id
  if (!uid) throw new Error('Not signed in')
  return uid
}

export async function loadNote(entryId: string): Promise<string> {
  const uid = await getUid()
  const { data, error } = await supabase
    .from('notes')
    .select('body')
    .eq('user_id', uid)
    .eq('entry_id', entryId)
    .maybeSingle()
  if (error) throw error
  return data?.body ?? ''
}

export async function saveNote(entryId: string, body: string): Promise<void> {
  const uid = await getUid()
  const { error } = await supabase.from('notes').upsert(
    {
      user_id: uid,
      entry_id: entryId,
      body: body.trim() || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,entry_id' },
  )
  if (error) throw error
}
