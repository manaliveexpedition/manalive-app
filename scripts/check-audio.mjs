// Audio access-control check. The daily-audio bucket is private:
//   - a signed-in member can mint a signed URL that fetches 200 + log played_audio
//   - an anonymous caller cannot mint a signed URL
//   - the raw (public-style) object URL is NOT fetchable
// Fixtures use the service role from .secrets.local. Run: node scripts/check-audio.mjs
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

const BUCKET = 'daily-audio'
const OBJECT_PATH = 'day-01.mp3' // a real uploaded recording (Day 1)
const DAY3_ENTRY = 'e1000001-0001-0001-0001-000000000003'

let pass = 0, fail = 0
const check = (n, c, d = '') => { c ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n}${d ? ` — ${d}` : ''}`)) }

const admin = createClient(URL_, SERVICE, { auth: { persistSession: false } })
const PW = 'Test-Passw0rd!Audio'
const tag = Date.now()
const email = `audio.${tag}@example.com`
let uid

console.log('\naudio access control:')
try {
  const { data: c, error: cErr } = await admin.auth.admin.createUser({ email, password: PW, email_confirm: true })
  if (cErr) throw new Error(cErr.message)
  uid = c.user.id

  const user = createClient(URL_, ANON, { auth: { persistSession: false } })
  const { error: sErr } = await user.auth.signInWithPassword({ email, password: PW })
  if (sErr) throw new Error(sErr.message)

  // 1) Signed-in member mints a signed URL.
  const { data: signed, error: signErr } = await user.storage.from(BUCKET).createSignedUrl(OBJECT_PATH, 60)
  check('signed-in member can mint a signed URL', !signErr && !!signed?.signedUrl,
    signErr ? signErr.message : 'no url')

  // 2) The signed URL actually fetches the file (200).
  if (signed?.signedUrl) {
    const res = await fetch(signed.signedUrl)
    check('signed URL fetches the file (200)', res.status === 200, `status ${res.status}`)
  } else {
    check('signed URL fetches the file (200)', false, 'no signed url to fetch')
  }

  // 3) Member can log played_audio for this entry.
  const { error: evErr } = await user.from('events').insert({ entry_id: DAY3_ENTRY, event_type: 'played_audio' })
  check('member logs played_audio', !evErr, evErr?.message)

  // 4) Anonymous caller cannot mint a signed URL.
  const anon = createClient(URL_, ANON, { auth: { persistSession: false } })
  const { data: anonSigned, error: anonErr } = await anon.storage.from(BUCKET).createSignedUrl(OBJECT_PATH, 60)
  check('anon CANNOT mint a signed URL', !!anonErr || !anonSigned?.signedUrl,
    anonSigned?.signedUrl ? 'anon unexpectedly got a signed URL' : `(rejected: ${anonErr?.message ?? 'no url'})`)

  // 5) The raw public-style object URL is NOT fetchable (bucket is private).
  const publicUrl = `${URL_}/storage/v1/object/public/${BUCKET}/${OBJECT_PATH}`
  const pubRes = await fetch(publicUrl)
  check('raw public object URL is rejected', pubRes.status !== 200, `status ${pubRes.status}`)
} finally {
  if (uid) await admin.auth.admin.deleteUser(uid)
}

console.log(`\n${pass} passed, ${fail} failed.`)
process.exit(fail === 0 ? 0 : 1)
