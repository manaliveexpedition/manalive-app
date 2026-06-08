-- reminders_due_now() reads across every man's prefs/events, so it must be
-- callable ONLY by the service role (the edge function). Supabase default
-- privileges auto-grant EXECUTE on new public functions to anon + authenticated,
-- so the `revoke ... from public` in the previous migration is not enough on its
-- own. Revoke from those roles explicitly; service_role keeps its grant.
revoke execute on function public.reminders_due_now() from anon, authenticated;
