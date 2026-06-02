// Admin view checks.
//   STATIC: src/lib/admin.ts must never reference the reflection columns.
//   LIVE:  an admin reads all members' metadata; a member cannot cross-read;
//          read/listen split and week-8 activity are computed correctly; and even
//          though a member WROTE reflection text, our admin select never returns it.
// Fixtures use the service role from .secrets.local. Run: node scripts/check-admin.mjs
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

const TEST_ENTRY = 'e1000001-0001-0001-0001-000000000001' // week 1, day 1 (sortIndex 1)
const DAY17_ENTRY = 'e1000001-0001-0001-0001-000000000017' // sortIndex 17 (for habit/on-time)
let pass = 0, fail = 0
const check = (n, c, d = '') => { c ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n}${d ? ` — ${d}` : ''}`)) }

const iso = (offsetDays) => {
  const d = new Date(); d.setDate(d.getDate() - offsetDays)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function addDaysISO(isoDate, days) {
  const d = new Date(`${isoDate}T00:00:00`); d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
// Mirror admin.ts: active at week 8 = an OPEN within start+49..start+55 incl.
function activeAtW8(startISO, openISOs) {
  const s = addDaysISO(startISO, 49), e = addDaysISO(startISO, 55)
  return openISOs.some((d) => d >= s && d <= e)
}
// An event timestamp at local noon of `offsetDays` ago (stable local date).
function localNoonISO(offsetDays) {
  const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() - offsetDays)
  return d.toISOString()
}
function localISO(dt) {
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}

// NOTE: the old "hard rule" (admin must never read what_landed/what_didnt) was
// reversed — during the beta those two are feedback FOR John, read + aggregated
// by the admin view. Peer privacy still holds and is tested live below.

// --- LIVE --------------------------------------------------------------------
const admin = createClient(URL_, SERVICE, { auth: { persistSession: false } })
const PW = 'Test-Passw0rd!Admin'
const tag = Date.now()
const ids = {}

async function mkUser(label, role, startOffsetDays) {
  const email = `admin.${label}.${tag}@example.com`
  const { data, error } = await admin.auth.admin.createUser({ email, password: PW, email_confirm: true })
  if (error) throw new Error(`createUser ${label}: ${error.message}`)
  ids[label] = data.user.id
  await admin.from('profiles').update({ role, start_date: iso(startOffsetDays), cohort: 'admin-check', name: label }).eq('id', data.user.id)
  const c = createClient(URL_, ANON, { auth: { persistSession: false } })
  const { error: sErr } = await c.auth.signInWithPassword({ email, password: PW })
  if (sErr) throw new Error(`sign-in ${label}: ${sErr.message}`)
  return c
}

console.log('\nlive admin engagement:')
try {
  const carol = await mkUser('carol', 'admin', 0)
  await mkUser('alice', 'member', 16) // week 3
  await mkUser('bob', 'member', 60)   // reached week 8; window = days 50-56
  await mkUser('dave', 'member', 60)  // reached week 8 but only active outside it

  // Alice: OPENED the wk1 entry on 2 days — yesterday (read) and today (also
  // played audio -> listen) -> read/listen split 1/1. She also writes a check-in
  // WITH reflection text, to prove the admin select never returns reflection.
  await admin.from('events').insert([
    { user_id: ids.alice, entry_id: TEST_ENTRY, event_type: 'opened_entry', created_at: localNoonISO(1) },
    { user_id: ids.alice, entry_id: TEST_ENTRY, event_type: 'opened_entry', created_at: localNoonISO(0) },
    { user_id: ids.alice, entry_id: TEST_ENTRY, event_type: 'played_audio', created_at: localNoonISO(0) },
    // She opened the SAME entry twice (above) -> 1 revisit; a 2nd audio play -> 2 listens.
    { user_id: ids.alice, entry_id: TEST_ENTRY, event_type: 'played_audio', created_at: localNoonISO(0) },
    // Tapped the alumni group link once.
    { user_id: ids.alice, entry_id: TEST_ENTRY, event_type: 'clicked_link', created_at: localNoonISO(0) },
    // Alice started 16 days ago, so the day-17 entry is scheduled for TODAY. She
    // opens it today -> ON TIME; her day-1 opens (above) are LATE. So 1 of 2 on time.
    { user_id: ids.alice, entry_id: DAY17_ENTRY, event_type: 'opened_entry', created_at: localNoonISO(0) },
  ])
  await admin.from('checkins').insert([
    { user_id: ids.alice, entry_id: TEST_ENTRY, checkin_date: iso(0), what_landed: 'PRIVATE-REFLECTION-ALICE', what_didnt: 'PRIVATE-2' },
  ])
  // Bob started 60d ago: his week-8 window (start+49..+55) is 11..5 days ago.
  // An OPEN 8 days ago falls INSIDE the window -> active at week 8.
  await admin.from('events').insert([
    { user_id: ids.bob, entry_id: TEST_ENTRY, event_type: 'opened_entry', created_at: localNoonISO(8) },
  ])
  // Dave also started 60d ago but only opened today (day 61) -> AFTER the
  // window -> NOT active at week 8 (proves the bounded upper end).
  await admin.from('events').insert([
    { user_id: ids.dave, entry_id: TEST_ENTRY, event_type: 'opened_entry', created_at: localNoonISO(0) },
  ])

  // Admin cross-read, mirroring admin.ts SELECT lists.
  const { data: profs } = await carol.from('profiles').select('id, email, name, role, start_date')
  const { data: evs } = await carol.from('events').select('user_id, entry_id, event_type, created_at')
  const { data: cks } = await carol.from('checkins').select('user_id, entry_id, created_at, what_landed, what_didnt')
  const memberIds = new Set((profs ?? []).filter((p) => p.role !== 'admin').map((p) => p.id))
  check('admin sees both alice and bob as members',
    memberIds.has(ids.alice) && memberIds.has(ids.bob), `members=${memberIds.size}`)

  // Read/listen split computed from events (open days vs days he also listened).
  const openDatesOf = (uid) => new Set((evs ?? []).filter((e) => e.user_id === uid && e.event_type === 'opened_entry').map((e) => localISO(new Date(e.created_at))))
  const listenDatesOf = (uid) => new Set((evs ?? []).filter((e) => e.user_id === uid && e.event_type === 'played_audio').map((e) => localISO(new Date(e.created_at))))
  const aOpen = openDatesOf(ids.alice), aListen = listenDatesOf(ids.alice)
  const listen = [...aOpen].filter((d) => aListen.has(d)).length
  const read = aOpen.size - listen
  check('admin computes alice read/listen split (1/1)', read === 1 && listen === 1, `read=${read} listen=${listen}`)

  // New stats: revisits (re-opens of a day's entry) and audio plays.
  const playsOf = (uid) => (evs ?? []).filter((e) => e.user_id === uid && e.event_type === 'played_audio').length
  const revisitsOf = (uid) => {
    const m = new Map()
    ;(evs ?? []).filter((e) => e.user_id === uid && e.event_type === 'opened_entry' && e.entry_id)
      .forEach((e) => m.set(e.entry_id, (m.get(e.entry_id) ?? 0) + 1))
    return [...m.values()].reduce((s, n) => s + Math.max(0, n - 1), 0)
  }
  check('admin computes alice revisits (1) and listens (2)',
    revisitsOf(ids.alice) === 1 && playsOf(ids.alice) === 2, `revisits=${revisitsOf(ids.alice)} plays=${playsOf(ids.alice)}`)
  const clicksOf = (uid) => (evs ?? []).filter((e) => e.user_id === uid && e.event_type === 'clicked_link').length
  check('admin computes alice alumni clicks (1)', clicksOf(ids.alice) === 1, `clicks=${clicksOf(ids.alice)}`)

  // Habit: first-open vs scheduled day (start + sortIndex-1). Alice start = iso(16).
  const sortByEntry = { [TEST_ENTRY]: 1, [DAY17_ENTRY]: 17 }
  const firstOpen = {}
  ;(evs ?? []).filter((e) => e.user_id === ids.alice && e.event_type === 'opened_entry' && e.entry_id)
    .forEach((e) => { const d = e.created_at.slice(0, 10); if (!firstOpen[e.entry_id] || d < firstOpen[e.entry_id]) firstOpen[e.entry_id] = d })
  let onTime = 0, total = 0
  for (const [eid, d] of Object.entries(firstOpen)) {
    const si = sortByEntry[eid]; if (si == null) continue
    total++; if (d === addDaysISO(iso(16), si - 1)) onTime++
  }
  check('admin computes alice on-time opens (1 of 2)', onTime === 1 && total === 2, `onTime=${onTime} total=${total}`)

  // Beta feedback: the admin CAN read what_landed / what_didnt (feedback for John).
  const aliceCks = (cks ?? []).filter((c) => c.user_id === ids.alice)
  const seesFeedback = aliceCks.some((c) => c.what_landed === 'PRIVATE-REFLECTION-ALICE')
  check('admin reads beta feedback (what_landed/what_didnt)', seesFeedback)

  // Peer privacy still holds: bob (a member) cannot read alice's check-ins.
  const bobClient = await (async () => {
    const c = createClient(URL_, ANON, { auth: { persistSession: false } })
    await c.auth.signInWithPassword({ email: `admin.bob.${tag}@example.com`, password: PW })
    return c
  })()
  const { data: bobSeesCks } = await bobClient.from('checkins').select('user_id, what_landed')
  check('member cannot read another member feedback', !(bobSeesCks ?? []).some((c) => c.user_id === ids.alice),
    `bob saw ${bobSeesCks?.length} checkin rows`)

  // Week-8 window (bounded, days 50-56), open-based. Both started 60 days ago.
  const start60 = iso(60)
  const bobOpens = [...openDatesOf(ids.bob)]
  const daveOpens = [...openDatesOf(ids.dave)]
  check('bob IN-window open -> active at week 8', activeAtW8(start60, bobOpens) === true)
  check('dave only AFTER window -> NOT active at week 8', activeAtW8(start60, daveOpens) === false)

  // Regression (the "Something went wrong" admin bug): member-facing "own row"
  // queries must scope to the user explicitly, because RLS returns ALL rows to
  // an admin. An unscoped .single() on profiles sees many rows and 406s.
  const { data: ownProf, error: ownErr } = await carol.from('profiles').select('id').eq('id', ids.carol).single()
  check('admin fetches OWN profile when scoped by id (no 406)', !ownErr && ownProf?.id === ids.carol, ownErr?.message)
  const { error: unscopedErr } = await carol.from('profiles').select('id').single()
  check('UNSCOPED admin profile .single() errors — proves the scope is needed', !!unscopedErr)
  const { data: carolOpens } = await carol.from('events').select('id').eq('user_id', ids.carol).eq('event_type', 'opened_entry')
  const { data: allOpens } = await carol.from('events').select('id').eq('event_type', 'opened_entry')
  check('admin own-scoped opens exclude other men', (carolOpens?.length ?? 0) === 0 && (allOpens?.length ?? 0) > 0,
    `own=${carolOpens?.length} all=${allOpens?.length}`)

  // A member cannot cross-read the cohort: alice sees only her own profile.
  const aliceClient = await (async () => {
    const c = createClient(URL_, ANON, { auth: { persistSession: false } })
    await c.auth.signInWithPassword({ email: `admin.alice.${tag}@example.com`, password: PW })
    return c
  })()
  const { data: aliceProfs } = await aliceClient.from('profiles').select('id')
  check('member cannot cross-read cohort (sees only self)',
    (aliceProfs?.length ?? 0) === 1 && aliceProfs[0].id === ids.alice, `saw ${aliceProfs?.length}`)
} finally {
  for (const id of Object.values(ids)) await admin.auth.admin.deleteUser(id)
}

console.log(`\n${pass} passed, ${fail} failed.`)
process.exit(fail === 0 ? 0 : 1)
