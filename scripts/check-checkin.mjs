// Check-in flow check. Through real signed-in clients (RLS applies): a man
// submits a check-in, it comes back as his with consumed_as set, a
// submitted_checkin event is written, and a second member cannot read either.
// Fixtures use the service role from .secrets.local. Run: node scripts/check-checkin.mjs
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

function getval(key, file) {
  try {
    const line = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')
      .split('\n').find((l) => l.startsWith(`${key}=`))
    return line ? line.slice(key.length + 1).replace(/[\r\n]/g, '').trim() : ''
  } catch { return '' }
}
function getUrlRef() {
  const v = getval('VITE_SUPABASE_URL', '.env.local')
  const ref = v.match(/[a-z0-9]{20}/)?.[0]
  return ref ? `https://${ref}.supabase.co` : v
}

const URL_ = getUrlRef()
const ANON = getval('VITE_SUPABASE_ANON_KEY', '.env.local')
const SERVICE = getval('SUPABASE_SERVICE_ROLE_KEY', '.secrets.local')
if (!URL_ || !ANON || !SERVICE) { console.error('Missing env (.env.local / .secrets.local).'); process.exit(1) }

let pass = 0, fail = 0
const check = (n, c, d = '') => { c ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n}${d ? ` — ${d}` : ''}`)) }

const admin = createClient(URL_, SERVICE, { auth: { persistSession: false } })
const PW = 'Test-Passw0rd!Checkin'
const tag = Date.now()
// A throwaway fixture entry (NOT seeded content), so tests never clobber real
// devotional copy. sort_index 999 keeps it clear of the real days (1..30).
const TEST_ENTRY = 'effffff1-1111-1111-1111-111111111111'
const date = new Date().toISOString().slice(0, 10)
const ids = {}

async function mkUser(label) {
  const email = `checkin.${label}.${tag}@example.com`
  const { data, error } = await admin.auth.admin.createUser({ email, password: PW, email_confirm: true })
  if (error) throw new Error(`createUser ${label}: ${error.message}`)
  ids[label] = data.user.id
  const c = createClient(URL_, ANON, { auth: { persistSession: false } })
  const { error: sErr } = await c.auth.signInWithPassword({ email, password: PW })
  if (sErr) throw new Error(`sign-in ${label}: ${sErr.message}`)
  return c
}

console.log('\ncheck-in flow (signed-in clients):')
try {
  // Ensure the throwaway fixture entry exists (deleted in teardown).
  await admin.from('entries').upsert(
    { id: TEST_ENTRY, week: 99, day: 1, title: 'checkin-test', body_text: 'x', sort_index: 999 },
    { onConflict: 'id' },
  )

  const al = await mkUser('al')
  const bo = await mkUser('bo')

  // 1) Al submits a check-in (consumed_as 'listen', sat_with_it true).
  const { data: saved, error: insErr } = await al.from('checkins')
    .insert({ entry_id: TEST_ENTRY, checkin_date: date, sat_with_it: true,
              what_landed: 'kept private', consumed_as: 'listen' })
    .select('id, user_id, consumed_as, sat_with_it').single()
  check('al submits check-in (his own, consumed_as set)',
    !insErr && saved?.user_id === ids.al && saved?.consumed_as === 'listen' && saved?.sat_with_it === true,
    insErr ? insErr.message : JSON.stringify(saved))

  // 2) Al logs a submitted_checkin event.
  const { error: evErr } = await al.from('events')
    .insert({ entry_id: TEST_ENTRY, event_type: 'submitted_checkin' })
  check('al logs submitted_checkin event', !evErr, evErr?.message)

  // 3) Al reads back exactly his check-in for today.
  const { data: mine } = await al.from('checkins').select('id').eq('checkin_date', date)
  check('al reads back his own check-in', (mine?.length ?? 0) >= 1, `got ${mine?.length}`)

  // 4) Bo (another member) cannot see Al's check-in or his event.
  const { data: boCheckins } = await bo.from('checkins').select('id, user_id')
  const boSeesAl = (boCheckins ?? []).some((r) => r.user_id === ids.al)
  check('bo cannot read al check-ins', !boSeesAl, `bo saw ${boCheckins?.length} rows`)

  const { data: boEvents } = await bo.from('events').select('id, user_id')
  const boSeesAlEvents = (boEvents ?? []).some((r) => r.user_id === ids.al)
  check('bo cannot read al events', !boSeesAlEvents, `bo saw ${boEvents?.length} rows`)
} finally {
  // Delete users first (cascades their checkins/events), then the fixture entry.
  for (const id of Object.values(ids)) await admin.auth.admin.deleteUser(id)
  await admin.from('entries').delete().eq('id', TEST_ENTRY)
}

console.log(`\n${pass} passed, ${fail} failed.`)
process.exit(fail === 0 ? 0 : 1)
