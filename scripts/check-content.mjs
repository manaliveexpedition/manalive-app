// Content load check: confirms the 30 real entries are in place with the right
// week/day/sort_index mapping, a reflection_prompt and body on each, clean
// titles, and audio_url still null (audio not recorded yet). Read via the
// service role (read-only assertion). Run: node scripts/check-content.mjs
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
const SERVICE = getval('SUPABASE_SERVICE_ROLE_KEY', '.secrets.local')
if (!URL_ || !SERVICE) { console.error('Missing env.'); process.exit(1) }

let pass = 0, fail = 0
const check = (n, c, d = '') => { c ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n}${d ? ` — ${d}` : ''}`)) }

const admin = createClient(URL_, SERVICE, { auth: { persistSession: false } })

console.log('\ncontent load (Days 1-30):')
const { data, error } = await admin
  .from('entries')
  .select('week, day, title, body_text, audio_url, sort_index, reflection_prompt, format, phase')
  .order('sort_index', { ascending: true })
if (error) { console.error(error.message); process.exit(1) }

check('exactly 30 entries', data.length === 30, `got ${data.length}`)

const sortContiguous = data.every((e, i) => e.sort_index === i + 1)
check('sort_index is 1..30 contiguous', sortContiguous)

const mappingOk = data.every((e) => e.week === Math.ceil(e.sort_index / 7) && e.day === ((e.sort_index - 1) % 7) + 1)
check('week/day match sort_index', mappingOk)

const allHaveBody = data.every((e) => (e.body_text || '').trim().length > 0)
check('every entry has body_text (the read)', allHaveBody)

const allHavePrompt = data.every((e) => (e.reflection_prompt || '').trim().length > 0)
check('every entry has a reflection_prompt (sit with it)', allHavePrompt)

const titlesClean = data.every((e) => !/^day\s*\d+\s*[:\-]/i.test((e.title || '').trim()))
check('titles carry no "Day N:" prefix', titlesClean)

const allAudioNull = data.every((e) => e.audio_url === null)
check('audio_url null on all (audio not recorded yet)', allAudioNull)

const FORMATS = new Set(['Anchor', 'Question', 'Truth', 'Story', 'Listen', 'Challenge', 'Pause'])
const allTagged = data.every((e) => FORMATS.has(e.format) && (e.phase || '').length > 0)
check('every entry has a valid Format + a Phase', allTagged)
const d1tag = data.find((e) => e.sort_index === 1)
check('Day 1 tagged Anchor / Re-entry', d1tag?.format === 'Anchor' && d1tag?.phase === 'Re-entry', `${d1tag?.format}/${d1tag?.phase}`)
const d11tag = data.find((e) => e.sort_index === 11)
check('Day 11 tagged Story / The drift', d11tag?.format === 'Story' && d11tag?.phase === 'The drift', `${d11tag?.format}/${d11tag?.phase}`)

// Spot-check a couple of known days.
const d1 = data.find((e) => e.sort_index === 1)
check('Day 1 title is "Before the World Grabs You"', d1?.title === 'Before the World Grabs You', d1?.title)
const d30 = data.find((e) => e.sort_index === 30)
check('Day 30 is Week 5 / Day 2 "The Wound Underneath"',
  d30?.week === 5 && d30?.day === 2 && d30?.title === 'The Wound Underneath',
  `wk${d30?.week} d${d30?.day} "${d30?.title}"`)

console.log(`\n${pass} passed, ${fail} failed.`)
process.exit(fail === 0 ? 0 : 1)
