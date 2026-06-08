// Edge function: send the gentle daily nudge to everyone who is due right now.
// Invoked every ~5 minutes by pg_cron (via pg_net), guarded by a shared secret.
//
// Who is "due" is decided entirely by the reminders_due_now() SQL function
// (toggle on, within the catch window of the chosen time, not already sent
// today, current day exists AND is still unread). This function just fans the
// result out to each man's devices and records that we sent.
//
// Secrets (supabase secrets set ...): CRON_SECRET, VAPID_PUBLIC_KEY,
// VAPID_PRIVATE_KEY. SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are injected.
//
// GET/POST ?dryRun returns the due list without sending (for testing).
import webpush from 'npm:web-push@3.6.7'
import { createClient } from 'npm:@supabase/supabase-js@2'

const CRON_SECRET = Deno.env.get('CRON_SECRET')
const VAPID_PUBLIC = Deno.env.get('VAPID_PUBLIC_KEY')
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails('mailto:jpulley@manaliveexpedition.com', VAPID_PUBLIC, VAPID_PRIVATE)
}

function json(obj: unknown, status = 200): Response {
  return new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json' } })
}

Deno.serve(async (req) => {
  // Shared-secret auth (the function is deployed with verify_jwt = false).
  if (!CRON_SECRET || req.headers.get('x-cron-secret') !== CRON_SECRET) {
    return json({ error: 'forbidden' }, 403)
  }
  if (!SUPABASE_URL || !SERVICE_ROLE) return json({ error: 'missing supabase env' }, 500)
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return json({ error: 'missing vapid env' }, 500)

  const dryRun = new URL(req.url).searchParams.has('dryRun')
  const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } })

  const { data: due, error } = await sb.rpc('reminders_due_now')
  if (error) return json({ error: error.message }, 500)
  if (dryRun) return json({ dueCount: (due ?? []).length, due })

  let sent = 0
  let gone = 0
  let failed = 0

  for (const row of due ?? []) {
    const { data: subs } = await sb
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .eq('user_id', row.user_id)

    // Reminder-on gets the nudge copy; dot-only still shows a minimal notice
    // (iOS requires a visible notification on every push). The badge flag is
    // honoured by the service worker so the dot only appears if dot is enabled.
    const body = row.reminder_enabled ? 'A new day is ready when you are.' : 'A new day is ready.'
    const payload = JSON.stringify({ title: 'ManAlive', body, tag: 'daily', badge: row.dot_enabled })

    let userSent = 0
    for (const s of subs ?? []) {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload,
        )
        sent++
        userSent++
      } catch (e) {
        const code = (e as { statusCode?: number })?.statusCode
        if (code === 404 || code === 410) {
          await sb.from('push_subscriptions').delete().eq('id', s.id)
          gone++
        } else {
          failed++
        }
      }
    }

    // Only mark "sent today" if at least one device actually got it, so a
    // transient failure can still be retried by the next cron tick.
    if (userSent > 0) {
      await sb.from('notification_prefs').update({ last_sent_on: row.local_today }).eq('user_id', row.user_id)
    }
  }

  return json({ dueCount: (due ?? []).length, sent, gone, failed })
})
