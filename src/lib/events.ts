import { supabase } from './supabase'

export type EventType =
  | 'opened_app'
  | 'opened_entry'
  | 'played_audio'
  | 'submitted_checkin'

// Fire-and-forget engagement logging. user_id defaults to auth.uid() server-side,
// so we never pass it from the client. Failures are swallowed — a missed event
// must never break the screen the man is looking at.
export async function logEvent(eventType: EventType, entryId?: string) {
  const { error } = await supabase
    .from('events')
    .insert({ event_type: eventType, entry_id: entryId ?? null })
  if (error) console.warn(`logEvent(${eventType}) failed:`, error.message)
}
