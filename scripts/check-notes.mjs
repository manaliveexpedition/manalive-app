// Notes checks for the Day 7 "your week" view and the My Notes tab.
//   LIVE: the exact query lib/notes.ts uses (notes + embedded entries, inner
//         join, optional sort_index range) returns only HIS non-empty notes,
//         filtered to the week, with the day's context; and another man can
//         never see them (RLS own-only).
// Fixtures use the service role from .secrets.local and are deleted after.
// Run: node scripts/check-notes.mjs
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

function getval(key, file) {
  try {
    const line = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')
      .split('\n').find((l) => l.startsWith(`${key}=`))
    return line ? line.slice(key.length + 1).replace(/[\r\n]/g, '').trim() : ''
  } catch { return '' }
}
const ref = getval('VITE_SUPABASE_URL', '.env.local').match(/[a-z0-9]{20}/)?.[0]
const URL_ = ref ? `https://${ref}.supabase.co` : ''
const ANON = getval('VITE_SUPABASE_ANON_KEY', '.env.local')
const SERVICE = getval('SUPABASE_SERVICE_ROLE_KEY', '.secrets.local')
if (!URL_ || !ANON || !SERVICE) { console.error('Missing env (.env.local / .secrets.local).'); process.exit(1) }

let pass = 0, fail = 0
const check = (n, c, d = '') => { c ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n}${d ? `: ${d}` : ''}`)) }

const admin = createClient(URL_, SERVICE, { auth: { persistSession: false } })
const PW = 'Test-Passw0rd!Notes'
const tag = Date.now()
const ids = {}

async function mkUser(label) {
  const email = `notes.${label}.${tag}@example.com`
  const { data, error } = await admin.auth.admin.createUser({ email, password: PW, email_confirm: true })
  if (error) throw new Error(`createUser ${label}: ${error.message}`)
  ids[label] = data.user.id
  const c = createClient(URL_, ANON, { auth: { persistSession: false } })
  const { error: sErr } = await c.auth.signInWithPassword({ email, password: PW })
  if (sErr) throw new Error(`sign-in ${label}: ${sErr.message}`)
  return c
}

// Same select as lib/notes.ts loadNotesWithDays.
const SELECT = 'entry_id, body, entries!inner(sort_index, week, day, title, carry_line, with_dad_prompt)'
async function notesFor(client, uid, range) {
  let q = client.from('notes').select(SELECT).eq('user_id', uid).not('body', 'is', null)
  if (range) q = q.gte('entries.sort_index', range.from).lte('entries.sort_index', range.to)
  const { data, error } = await q
  if (error) throw new Error(error.message)
  return data
}

console.log('\nlive notes (Day 7 + My Notes):')
try {
  const alice = await mkUser('alice')
  const bob = await mkUser('bob')

  const { data: entries } = await admin.from('entries').select('id, sort_index').in('sort_index', [2, 5, 9])
  const bySort = Object.fromEntries(entries.map((e) => [e.sort_index, e.id]))

  // Alice writes on days 2 and 5 (week 1) and day 9 (week 2). Bob writes on day 2.
  for (const [si, body] of [[2, 'alice day 2'], [5, 'alice day 5'], [9, 'alice day 9']]) {
    const { error } = await alice.from('notes').upsert({ user_id: ids.alice, entry_id: bySort[si], body }, { onConflict: 'user_id,entry_id' })
    if (error) throw new Error(`alice note ${si}: ${error.message}`)
  }
  await bob.from('notes').upsert({ user_id: ids.bob, entry_id: bySort[2], body: 'BOB-PRIVATE' }, { onConflict: 'user_id,entry_id' })

  const all = await notesFor(alice, ids.alice)
  check('My Notes: alice sees all 3 of her notes', all.length === 3, `got ${all.length}`)
  check('My Notes: each note carries its day context', all.every((n) => n.entries && n.entries.sort_index && n.entries.title))

  const week1 = await notesFor(alice, ids.alice, { from: 1, to: 7 })
  const w1Sorts = week1.map((n) => n.entries.sort_index).sort((a, b) => a - b)
  check('Day 7: week 1 range returns only days 2 and 5', JSON.stringify(w1Sorts) === '[2,5]', JSON.stringify(w1Sorts))

  const week2 = await notesFor(alice, ids.alice, { from: 8, to: 14 })
  check('Day 14: week 2 range returns only day 9', week2.length === 1 && week2[0].entries.sort_index === 9, JSON.stringify(week2.map((n) => n.entries.sort_index)))

  check("alice never sees bob's note", !all.some((n) => n.body === 'BOB-PRIVATE'))
  const { data: bobPeek } = await bob.from('notes').select('body').eq('user_id', ids.alice)
  check("bob cannot read alice's notes even by asking for her user_id", (bobPeek ?? []).length === 0, `bob saw ${bobPeek?.length}`)
} finally {
  // Deleting the users cascades their notes.
  for (const id of Object.values(ids)) await admin.auth.admin.deleteUser(id)
}

console.log(`\n${pass} passed, ${fail} failed.`)
process.exit(fail === 0 ? 0 : 1)
