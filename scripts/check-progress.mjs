// Progress math check. Pure-function checks for the streak (grace day + gap),
// plus a live check through a signed-in client: days-engaged counts his distinct
// opened-entry days only (engagement = opening the day's reading; another
// member's events excluded by RLS), and week-of derives from start_date.
// Fixtures use the service role from .secrets.local.
// Run: node scripts/check-progress.mjs
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

const TEST_ENTRY = 'e1000001-0001-0001-0001-000000000001'
const TOTAL_WEEKS = 26

let pass = 0, fail = 0
const check = (n, c, d = '') => { c ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n}${d ? ` — ${d}` : ''}`)) }

// --- date helpers + copies of progress.ts math (kept in sync by hand) --------
const today = new Date()
const iso = (offsetDays) => {
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  d.setDate(d.getDate() - offsetDays)
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}
function currentStreak(dates, now = today) {
  const localISO = (dt) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
  const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (!dates.has(localISO(cursor))) cursor.setDate(cursor.getDate() - 1)
  let s = 0
  while (dates.has(localISO(cursor))) { s++; cursor.setDate(cursor.getDate() - 1) }
  return s
}
function weekOf(sortIndex) { return Math.min(Math.ceil(sortIndex / 7), TOTAL_WEEKS) }

console.log('\nstreak (pure, soft):')
check('today+yest+day2 -> 3', currentStreak(new Set([iso(0), iso(1), iso(2)])) === 3)
check('yest+day2 (grace, no today) -> 2', currentStreak(new Set([iso(1), iso(2)])) === 2)
check('day2+day3 (2-day gap) -> 0', currentStreak(new Set([iso(2), iso(3)])) === 0)
check('empty -> 0', currentStreak(new Set()) === 0)
check('week-of: sortIndex 17 -> week 3', weekOf(17) === 3)
check('week-of capped at 26', weekOf(300) === 26)

// --- live: his own rows only -------------------------------------------------
const admin = createClient(URL_, SERVICE, { auth: { persistSession: false } })
const PW = 'Test-Passw0rd!Progress'
const tag = Date.now()
const ids = {}

async function mkUser(label, startOffsetDays) {
  const email = `progress.${label}.${tag}@example.com`
  const { data, error } = await admin.auth.admin.createUser({ email, password: PW, email_confirm: true })
  if (error) throw new Error(`createUser ${label}: ${error.message}`)
  ids[label] = data.user.id
  await admin.from('profiles').update({ start_date: iso(startOffsetDays), cohort: 'progress-check' }).eq('id', data.user.id)
  const c = createClient(URL_, ANON, { auth: { persistSession: false } })
  const { error: sErr } = await c.auth.signInWithPassword({ email, password: PW })
  if (sErr) throw new Error(`sign-in ${label}: ${sErr.message}`)
  return c
}
// An opened_entry event at local noon of the day `o` days ago. Noon keeps the
// local calendar date stable across reasonable timezones when read back.
function localNoonISO(offsetDays) {
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 0, 0)
  d.setDate(d.getDate() - offsetDays)
  return d.toISOString()
}
function localISO(dt) {
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}
async function seedOpens(userId, offsets) {
  const rows = offsets.map((o) => ({ user_id: userId, entry_id: TEST_ENTRY, event_type: 'opened_entry', created_at: localNoonISO(o) }))
  const { error } = await admin.from('events').insert(rows)
  if (error) throw new Error(`seed opens: ${error.message}`)
}

console.log('\nlive (his own rows only):')
try {
  // Alice started 16 days ago -> sortIndex 17 -> week 3. She OPENED the entry on
  // 4 distinct days (today, yest, day2 consecutive; plus day10) -> daysEngaged 4,
  // streak 3. No check-in is needed — the open is the engagement.
  const alice = await mkUser('alice', 16)
  await seedOpens(ids.alice, [0, 1, 2, 10])

  // Bob (another member) opened today — must NOT count toward Alice.
  const bob = await mkUser('bob', 5)
  await seedOpens(ids.bob, [0])

  const { data, error } = await alice.from('events').select('created_at, user_id, event_type').eq('event_type', 'opened_entry')
  if (error) throw new Error(error.message)
  const seesBob = (data ?? []).some((r) => r.user_id === ids.bob)
  const dates = new Set((data ?? []).map((r) => r.created_at).filter(Boolean).map((t) => localISO(new Date(t))))

  check('alice does NOT see bob opens', !seesBob, `rows=${data?.length}`)
  check('daysEngaged = 4 distinct days', dates.size === 4, `got ${dates.size}`)
  check('current streak = 3', currentStreak(dates) === 3, `got ${currentStreak(dates)}`)

  // weekOf from start_date 16 days ago: sortIndex 17 -> week 3.
  check('weekOf = 3 from start 16 days ago', weekOf(17) === 3)
} finally {
  for (const id of Object.values(ids)) await admin.auth.admin.deleteUser(id)
}

console.log(`\n${pass} passed, ${fail} failed.`)
process.exit(fail === 0 ? 0 : 1)
