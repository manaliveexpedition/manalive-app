import { supabase } from './supabase'

export type EventType =
  | 'opened_app'
  | 'opened_entry'
  | 'played_audio'
  | 'submitted_checkin'
  | 'clicked_link' // tapped an outbound link in the entry copy (e.g. the alumni group)
  | 'shared_to_group' // tapped "Share in the group" (copies his thought, opens the alumni group)
  | 'started_with_dad' // started the With Dad quiet-time timer

// Fire-and-forget engagement logging. user_id defaults to auth.uid() server-side,
// so we never pass it from the client. Failures are swallowed — a missed event
// must never break the screen the man is looking at.
export async function logEvent(eventType: EventType, entryId?: string) {
  const { error } = await supabase
    .from('events')
    .insert({ event_type: eventType, entry_id: entryId ?? null })
  if (error) console.warn(`logEvent(${eventType}) failed:`, error.message)
}
