// Today-screen resolution check. Mirrors resolveSortIndex() + loadToday()'s
// entry query, exercised through a real signed-in client so RLS applies.
// Fixtures (user + start_date) use the service role, read from .secrets.local.
// Run (PowerShell):  node scripts/check-today.mjs
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

// --- copy of src/lib/today.ts resolveSortIndex (kept in sync by hand) --------
function resolveSortIndex(startDate, now = new Date()) {
  if (!startDate) return null
  const start = new Date(`${startDate}T00:00:00`)
  if (Number.isNaN(start.getTime())) return null
  const sm = new Date(start.getFullYear(), start.getMonth(), start.getDate())
  const nm = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const d = Math.floor((nm - sm) / 86400000)
  return d < 0 ? null : d + 1
}

let pass = 0, fail = 0
const check = (n, c, d = '') => { c ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n}${d ? ` — ${d}` : ''}`)) }

// --- unit checks on the pure resolver ----------------------------------------
console.log('\nresolveSortIndex (pure):')
const today = new Date()
// LOCAL date (not toISOString/UTC) to match resolveSortIndex, which compares
// local midnights. Using UTC here off-by-ones whenever local has not yet rolled
// to the same calendar day as UTC.
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const minus = (n) => { const d = new Date(today); d.setDate(d.getDate() - n); return iso(d) }
const plus = (n) => { const d = new Date(today); d.setDate(d.getDate() + n); return iso(d) }
check('null start -> null', resolveSortIndex(null) === null)
check('future start -> null', resolveSortIndex(plus(3)) === null)
check('start today -> 1', resolveSortIndex(minus(0)) === 1)
check('start 2 days ago -> 3', resolveSortIndex(minus(2)) === 3)

// --- live check through a signed-in client -----------------------------------
const admin = createClient(URL_, SERVICE, { auth: { persistSession: false } })
const PW = 'Test-Passw0rd!Today'
const tag = Date.now()
const email = `today.check.${tag}@example.com`
let uid

console.log('\nlive resolution (signed-in client):')
try {
  const { data: c, error: cErr } = await admin.auth.admin.createUser({ email, password: PW, email_confirm: true })
  if (cErr) throw new Error(cErr.message)
  uid = c.user.id

  // start 2 days ago -> should land on the day-3 entry (sort_index 3).
  await admin.from('profiles').update({ start_date: minus(2), cohort: 'today-check' }).eq('id', uid)

  const user = createClient(URL_, ANON, { auth: { persistSession: false } })
  const { error: sErr } = await user.auth.signInWithPassword({ email, password: PW })
  if (sErr) throw new Error(sErr.message)

  const { data: prof } = await user.from('profiles').select('start_date').single()
  const si = resolveSortIndex(prof.start_date)
  const { data: entry, error: eErr } = await user.from('entries')
    .select('id, title, sort_index, day, week').eq('sort_index', si).maybeSingle()
  check('signed-in user resolves an entry for start 2 days ago',
    !eErr && entry && entry.sort_index === 3,
    eErr ? eErr.message : `si=${si} entry=${entry ? entry.sort_index : 'none'}`)
  if (entry) console.log(`        -> "${entry.title}" (week ${entry.week}, day ${entry.day})`)

  // null start_date -> not_started (resolver returns null, no query).
  await admin.from('profiles').update({ start_date: null }).eq('id', uid)
  const { data: prof2 } = await user.from('profiles').select('start_date').single()
  check('null start_date -> not_started', resolveSortIndex(prof2.start_date) === null,
    `start_date=${prof2.start_date}`)
} finally {
  if (uid) await admin.auth.admin.deleteUser(uid)
}

console.log(`\n${pass} passed, ${fail} failed.`)
process.exit(fail === 0 ? 0 : 1)
