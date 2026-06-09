// RLS verification harness — exercises every policy through the client SDK,
// the way a real browser would. The SQL editor bypasses RLS, so it cannot prove
// these guarantees; this script can.
//
// What uses what:
//   - The SERVICE ROLE key is used ONLY for fixtures (create/delete test users,
//     provision profile rows that have no INSERT policy, upsert a test entry).
//     It bypasses RLS by design and makes NO assertions.
//   - The ANON key + a real signed-in session is what every ASSERTION runs
//     through, so each result reflects the actual RLS policy for that role.
//
// Run (PowerShell):
//   $env:SUPABASE_SERVICE_ROLE_KEY="<service-role-key>"; node scripts/test-rls.mjs
//
// Requires .env.local with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.
// The service-role key is read from the environment and is never written to disk.

import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

// --- load env ---------------------------------------------------------------
function loadEnvLocal() {
  try {
    const raw = readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    for (const line of raw.split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (m) process.env[m[1]] ??= m[2].trim()
    }
  } catch {
    /* .env.local optional if vars already in environment */
  }
}
loadEnvLocal()

const URL_ = process.env.VITE_SUPABASE_URL
const ANON = process.env.VITE_SUPABASE_ANON_KEY
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!URL_ || !ANON) {
  console.error('Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY (set in .env.local).')
  process.exit(1)
}
if (!SERVICE) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY in the environment (needed for fixtures only).')
  process.exit(1)
}

// --- tiny assertion runner --------------------------------------------------
let passed = 0
let failed = 0
function check(name, condition, detail = '') {
  if (condition) {
    passed++
    console.log(`  PASS  ${name}`)
  } else {
    failed++
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`)
  }
}

const admin = createClient(URL_, SERVICE, { auth: { persistSession: false } })

function anonClient() {
  return createClient(URL_, ANON, { auth: { persistSession: false } })
}

// Sign a user in with the anon key and return an authenticated client.
async function userClient(email, password) {
  const c = createClient(URL_, ANON, { auth: { persistSession: false } })
  const { error } = await c.auth.signInWithPassword({ email, password })
  if (error) throw new Error(`sign-in failed for ${email}: ${error.message}`)
  return c
}

const PW = 'Test-Passw0rd!RLS'
const tag = Date.now()
const users = {
  alice: { email: `rls.alice.${tag}@example.com`, role: 'member' },
  bob: { email: `rls.bob.${tag}@example.com`, role: 'member' },
  carol: { email: `rls.carol.${tag}@example.com`, role: 'admin' },
}
// A throwaway fixture entry (NOT seeded content), so the RLS test never clobbers
// real devotional copy. sort_index 999 keeps it clear of the real days (1..30).
const TEST_ENTRY = 'effffff2-2222-2222-2222-222222222222'

async function setup() {
  // Make sure the throwaway fixture entry exists (removed in teardown).
  await admin.from('entries').upsert(
    { id: TEST_ENTRY, week: 99, day: 1, title: 'rls-test', body_text: 'x', sort_index: 999 },
    { onConflict: 'id' },
  )

  for (const key of Object.keys(users)) {
    const u = users[key]
    const { data, error } = await admin.auth.admin.createUser({
      email: u.email,
      password: PW,
      email_confirm: true,
    })
    if (error) throw new Error(`createUser ${u.email}: ${error.message}`)
    u.id = data.user.id
    // The on_auth_user_created trigger already created a blank profile row.
    // Provision admin/cohort fields via the service role (members can't set these).
    const { error: pErr } = await admin
      .from('profiles')
      .update({ role: u.role, start_date: '2026-05-01', cohort: 'rls-test' })
      .eq('id', u.id)
    if (pErr) throw new Error(`profile provision ${u.email}: ${pErr.message}`)
  }
}

async function teardown() {
  for (const key of Object.keys(users)) {
    if (users[key].id) await admin.auth.admin.deleteUser(users[key].id) // cascades to rows
  }
  await admin.from('entries').delete().eq('id', TEST_ENTRY) // remove the fixture entry
}

async function run() {
  console.log('\nRLS policy verification (via client SDK)\n')

  // 1) Anonymous requests must return empty for every table.
  console.log('1. Anonymous (unauthenticated) requests:')
  const anon = anonClient()
  for (const table of ['profiles', 'entries', 'checkins', 'events', 'push_subscriptions', 'notification_prefs', 'notes']) {
    const { data, error } = await anon.from(table).select('*')
    check(`anon ${table} -> empty`, !error && Array.isArray(data) && data.length === 0,
      error ? error.message : `got ${data?.length} rows`)
  }

  const alice = await userClient(users.alice.email, PW)
  const bob = await userClient(users.bob.email, PW)
  const carol = await userClient(users.carol.email, PW)

  // 2) Authenticated members can read shared entries.
  console.log('\n2. Shared content (entries) is readable by members:')
  {
    const { data, error } = await alice.from('entries').select('id')
    check('alice can read entries', !error && (data?.length ?? 0) >= 1,
      error ? error.message : `got ${data?.length} rows`)
  }

  // 3) Alice writes her own checkin + event (user_id defaults to auth.uid()).
  console.log('\n3. A member writes his own rows:')
  let aliceCheckinId
  {
    const { data, error } = await alice.from('checkins')
      .insert({ entry_id: TEST_ENTRY, checkin_date: '2026-05-01', sat_with_it: true, consumed_as: 'read' })
      .select('id, user_id').single()
    check('alice insert own checkin', !error && data?.user_id === users.alice.id, error?.message)
    aliceCheckinId = data?.id
  }
  {
    const { error } = await alice.from('events')
      .insert({ entry_id: TEST_ENTRY, event_type: 'submitted_checkin' })
    check('alice insert own event', !error, error?.message)
  }

  // 4) Bob (another member) sees only his own rows — not Alice's.
  console.log('\n4. A member sees only his own check-in/event rows:')
  {
    const { data, error } = await bob.from('checkins').select('id, user_id')
    const seesAlice = (data ?? []).some((r) => r.user_id === users.alice.id)
    check('bob does NOT see alice checkins', !error && !seesAlice,
      error ? error.message : `bob saw ${data?.length} rows`)
  }
  {
    const { data, error } = await bob.from('profiles').select('id')
    const onlyOwn = (data ?? []).length === 1 && data[0].id === users.bob.id
    check('bob sees only his own profile', !error && onlyOwn,
      error ? error.message : `bob saw ${data?.length} profile rows`)
  }

  // 5) Cross-user write is rejected by the WITH CHECK clause.
  console.log('\n5. A member cannot write a row owned by someone else:')
  {
    const { data, error } = await bob.from('checkins')
      .insert({ user_id: users.alice.id, entry_id: TEST_ENTRY, sat_with_it: false })
      .select('id')
    check('bob insert as alice -> rejected', !!error || (data?.length ?? 0) === 0,
      error ? `(rejected: ${error.message})` : 'insert unexpectedly succeeded')
  }

  // 6) Admin reads across all members.
  console.log('\n6. Admin reads across the cohort:')
  {
    const { data, error } = await carol.from('checkins').select('id, user_id')
    const seesAlice = (data ?? []).some((r) => r.id === aliceCheckinId)
    check('admin sees alice checkin', !error && seesAlice,
      error ? error.message : `admin saw ${data?.length} rows`)
  }
  {
    const { data, error } = await carol.from('profiles').select('id')
    check('admin sees multiple profiles', !error && (data?.length ?? 0) >= 3,
      error ? error.message : `admin saw ${data?.length} profiles`)
  }

  // 7) The signup trigger auto-creates a profile for a brand-new auth user.
  console.log('\n7. Signup trigger auto-provisions a profile:')
  {
    const email = `rls.trigger.${tag}@example.com`
    const { data: created, error: cErr } = await admin.auth.admin.createUser({
      email, password: PW, email_confirm: true,
    })
    if (cErr) {
      check('new signup creates profile', false, `createUser failed: ${cErr.message}`)
    } else {
      const { data, error } = await admin.from('profiles').select('id, email').eq('id', created.user.id)
      check('new signup creates profile', !error && data?.length === 1 && data[0].email === email,
        error ? error.message : `got ${data?.length} rows`)
      await admin.auth.admin.deleteUser(created.user.id)
    }
  }

  // 8) A member may change his own name, but NOT his role or start_date.
  console.log('\n8. A member cannot escalate role or move his start_date:')
  {
    const { error } = await alice.from('profiles').update({ name: 'Alice Updated' }).eq('id', users.alice.id)
    check('member can update own name', !error, error?.message)
  }
  {
    const { error } = await alice.from('profiles').update({ role: 'admin' }).eq('id', users.alice.id)
    const { data: after } = await admin.from('profiles').select('role').eq('id', users.alice.id).single()
    check('member cannot set own role', !!error || after?.role === 'member',
      error ? `(rejected: ${error.message})` : `role is now ${after?.role}`)
  }
  {
    const { error } = await alice.from('profiles').update({ start_date: '2030-01-01' }).eq('id', users.alice.id)
    const { data: after } = await admin.from('profiles').select('start_date').eq('id', users.alice.id).single()
    check('member cannot set own start_date', !!error || after?.start_date === '2026-05-01',
      error ? `(rejected: ${error.message})` : `start_date is now ${after?.start_date}`)
  }

  // 9) Push subscriptions: a man manages only his own (also proves the explicit
  //    table GRANT — a missing grant surfaces here as permission-denied/empty).
  console.log('\n9. Push subscriptions are per-man:')
  {
    const { data, error } = await alice.from('push_subscriptions')
      .insert({ endpoint: `https://push.example/alice-${tag}`, p256dh: 'p256', auth: 'authk', ua_label: 'test' })
      .select('id, user_id').single()
    check('alice insert + read own push sub', !error && data?.user_id === users.alice.id, error?.message)
  }
  {
    const { data, error } = await bob.from('push_subscriptions').select('id, user_id')
    const seesAlice = (data ?? []).some((r) => r.user_id === users.alice.id)
    check('bob does NOT see alice push subs', !error && !seesAlice,
      error ? error.message : `bob saw ${data?.length} rows`)
  }
  {
    const { data, error } = await bob.from('push_subscriptions')
      .insert({ user_id: users.alice.id, endpoint: `https://push.example/bobasalice-${tag}`, p256dh: 'p', auth: 'a' })
      .select('id')
    check('bob insert sub as alice -> rejected', !!error || (data?.length ?? 0) === 0,
      error ? `(rejected: ${error.message})` : 'insert unexpectedly succeeded')
  }

  // 10) Notification prefs: per-man read/write; admin may read.
  console.log('\n10. Notification prefs are per-man:')
  {
    const { data, error } = await alice.from('notification_prefs')
      .insert({ reminder_enabled: true, reminder_time: '08:00', timezone: 'America/Chicago' })
      .select('user_id, reminder_enabled').single()
    check('alice insert + read own prefs', !error && data?.user_id === users.alice.id && data?.reminder_enabled === true,
      error?.message)
  }
  {
    const { data, error } = await bob.from('notification_prefs').select('user_id')
    const seesAlice = (data ?? []).some((r) => r.user_id === users.alice.id)
    check('bob does NOT see alice prefs', !error && !seesAlice,
      error ? error.message : `bob saw ${data?.length} rows`)
  }
  {
    const { data, error } = await carol.from('notification_prefs').select('user_id')
    const seesAlice = (data ?? []).some((r) => r.user_id === users.alice.id)
    check('admin sees alice prefs', !error && seesAlice,
      error ? error.message : `admin saw ${data?.length} rows`)
  }

  // 11) reminders_due_now() is service-role only (not callable by a member).
  console.log('\n11. reminders_due_now() is locked to the service role:')
  {
    const { error } = await alice.rpc('reminders_due_now')
    check('member cannot call reminders_due_now', !!error,
      error ? `(rejected: ${error.message})` : 'unexpectedly allowed')
  }
  {
    const { error } = await admin.rpc('reminders_due_now')
    check('service role can call reminders_due_now', !error, error?.message)
  }

  // 12) Notes are PRIVATE to the man — not other members, and NOT even admin.
  console.log('\n12. Notes are private (admin cannot read them):')
  {
    const { data, error } = await alice.from('notes')
      .insert({ entry_id: TEST_ENTRY, body: 'alice private note' })
      .select('id, user_id, body').single()
    check('alice insert + read own note', !error && data?.user_id === users.alice.id && data?.body === 'alice private note',
      error?.message)
  }
  {
    const { data, error } = await bob.from('notes').select('id, user_id')
    const seesAlice = (data ?? []).some((r) => r.user_id === users.alice.id)
    check('bob does NOT see alice notes', !error && !seesAlice,
      error ? error.message : `bob saw ${data?.length} rows`)
  }
  {
    const { data, error } = await carol.from('notes').select('id, user_id, body')
    const seesAlice = (data ?? []).some((r) => r.user_id === users.alice.id)
    check('ADMIN does NOT see alice notes', !error && !seesAlice,
      error ? error.message : `admin saw ${data?.length} note rows`)
  }
}

console.log('Setting up fixtures…')
await setup()
try {
  await run()
} finally {
  console.log('\nTearing down fixtures…')
  await teardown()
}

console.log(`\n${passed} passed, ${failed} failed.`)
process.exit(failed === 0 ? 0 : 1)
