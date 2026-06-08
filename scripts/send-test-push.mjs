// Manual Web Push test (Node) — de-risks VAPID + web-push BEFORE the Deno edge
// function. Sends a gentle test notification to stored subscriptions.
//
// Reads VAPID keys + service role from .secrets.local, Supabase URL from
// .env.local. Subscriptions must already exist (a man opted in on a real
// device via the Settings screen).
//
// Usage:
//   node scripts/send-test-push.mjs                 # send to ALL subscriptions
//   node scripts/send-test-push.mjs you@example.com # only that man's devices
//
// Expired endpoints (404/410) are deleted, same as the edge function will do.
import { readFileSync } from 'node:fs'
import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

function getval(key, file) {
  try {
    const line = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')
      .split('\n').find((l) => l.startsWith(`${key}=`))
    return line ? line.slice(key.length + 1).replace(/[\r\n]/g, '').trim() : ''
  } catch {
    return ''
  }
}

const ref = getval('VITE_SUPABASE_URL', '.env.local').match(/[a-z0-9]{20}/)?.[0]
const SERVICE = getval('SUPABASE_SERVICE_ROLE_KEY', '.secrets.local')
const VAPID_PUBLIC = getval('VAPID_PUBLIC_KEY', '.secrets.local')
const VAPID_PRIVATE = getval('VAPID_PRIVATE_KEY', '.secrets.local')

if (!ref || !SERVICE) { console.error('Missing Supabase env (.env.local / .secrets.local).'); process.exit(1) }
if (!VAPID_PUBLIC || !VAPID_PRIVATE) { console.error('Missing VAPID keys in .secrets.local.'); process.exit(1) }

webpush.setVapidDetails('mailto:jpulley@manaliveexpedition.com', VAPID_PUBLIC, VAPID_PRIVATE)
const sb = createClient(`https://${ref}.supabase.co`, SERVICE, { auth: { persistSession: false } })

const email = process.argv[2]
let userId = null
if (email) {
  const { data, error } = await sb.from('profiles').select('id').eq('email', email).maybeSingle()
  if (error) { console.error('profile lookup failed:', error.message); process.exit(1) }
  if (!data) { console.error(`No profile with email ${email}.`); process.exit(1) }
  userId = data.id
}

let q = sb.from('push_subscriptions').select('id, user_id, endpoint, p256dh, auth, ua_label')
if (userId) q = q.eq('user_id', userId)
const { data: subs, error } = await q
if (error) { console.error('subscription query failed:', error.message); process.exit(1) }

if (!subs?.length) {
  console.log('No push subscriptions found. Opt in on a real device via Settings first.')
  process.exit(0)
}

const payload = JSON.stringify({
  title: 'ManAlive',
  body: 'A new day is ready.',
  tag: 'daily',
})

console.log(`Sending test push to ${subs.length} subscription(s):`)
let ok = 0, gone = 0, fail = 0
for (const s of subs) {
  try {
    await webpush.sendNotification(
      { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
      payload,
    )
    ok++
    console.log(`  OK    ${s.ua_label ?? 'device'} (${s.endpoint.slice(0, 40)}…)`)
  } catch (e) {
    const code = e?.statusCode
    if (code === 404 || code === 410) {
      await sb.from('push_subscriptions').delete().eq('id', s.id)
      gone++
      console.log(`  GONE  ${s.ua_label ?? 'device'} — deleted expired subscription`)
    } else {
      fail++
      console.log(`  FAIL  ${s.ua_label ?? 'device'} — ${code ?? ''} ${e?.message ?? e}`)
    }
  }
}
console.log(`\nDone. ${ok} sent, ${gone} expired/removed, ${fail} failed.`)
process.exit(fail === 0 ? 0 : 1)
