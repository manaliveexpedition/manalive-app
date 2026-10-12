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

// A note with the day it belongs to, for the Day 7 "your week" view and the
// My Notes tab. The context (carry line, With Dad question) is what turns a
// bare note back into a memory of that day.
export type NoteWithDay = {
  entryId: string
  body: string
  sortIndex: number
  week: number | null
  day: number | null
  title: string | null
  carryLine: string | null
  withDadPrompt: string | null
}

type NoteRow = {
  entry_id: string
  body: string | null
  entries: {
    sort_index: number | null; week: number | null; day: number | null; title: string | null
    carry_line: string | null; with_dad_prompt: string | null
  } | null
}

// His notes (non-empty only), optionally limited to a sort_index range, in
// journey order. Own-only by RLS; the explicit user_id filter is belt and braces.
export async function loadNotesWithDays(range?: { from: number; to: number }): Promise<NoteWithDay[]> {
  const uid = await getUid()
  let q = supabase
    .from('notes')
    .select('entry_id, body, entries!inner(sort_index, week, day, title, carry_line, with_dad_prompt)')
    .eq('user_id', uid)
    .not('body', 'is', null)
  if (range) q = q.gte('entries.sort_index', range.from).lte('entries.sort_index', range.to)
  const { data, error } = await q
  if (error) throw error
  return ((data ?? []) as unknown as NoteRow[])
    .filter((r) => r.entries && r.body && r.body.trim())
    .map((r) => ({
      entryId: r.entry_id,
      body: r.body as string,
      sortIndex: r.entries!.sort_index ?? 0,
      week: r.entries!.week,
      day: r.entries!.day,
      title: r.entries!.title,
      carryLine: r.entries!.carry_line,
      withDadPrompt: r.entries!.with_dad_prompt,
    }))
    .sort((a, b) => a.sortIndex - b.sortIndex)
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
