// Load a camp's men into camp_roster so they can create an account and start
// on the camp's Day 1 (see supabase/migrations/20261026000001_camp_roster.sql).
//
//   node scripts/load-roster.mjs <list.csv|.txt> --start=2026-10-26 --cohort="TX Oct 2026" [--dry]
//
// The list can be a CSV export or pasted lines in almost any shape: each line
// just needs an email address somewhere; whatever else is on the line is taken
// as the name (first word = name, the rest = last name). Lines without an email
// (headers, blanks) are skipped and reported. Re-running is safe: rows upsert
// by email. Service role from .secrets.local.
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

function getval(key, file) {
  try {
    const line = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')
      .split('\n').find((l) => l.startsWith(`${key}=`))
    return line ? line.slice(key.length + 1).replace(/[\r\n]/g, '').trim() : ''
  } catch { return '' }
}

const args = process.argv.slice(2)
const file = args.find((a) => !a.startsWith('--'))
const opt = (k) => args.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3)
const start = opt('start')
const cohort = opt('cohort') ?? null
const dry = args.includes('--dry')
if (!file || !/^\d{4}-\d{2}-\d{2}$/.test(start ?? '')) {
  console.error('Usage: node scripts/load-roster.mjs <list> --start=YYYY-MM-DD [--cohort="name"] [--dry]')
  process.exit(1)
}
if (new Date(`${start}T00:00:00`).getDay() !== 1) console.warn(`WARNING: ${start} is not a Monday.`)

const EMAIL = /[A-Z0-9._%+'-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i
const rows = new Map()
const skipped = []
for (const raw of readFileSync(file, 'utf8').replace(/^﻿/, '').split(/\r?\n/)) {
  const m = raw.match(EMAIL)
  if (!m) { if (raw.trim()) skipped.push(raw.trim()); continue }
  const email = m[0].toLowerCase()
  const rest = raw.replace(m[0], ' ').replace(/[",;<>\t]/g, ' ').replace(/\s+/g, ' ').trim()
  const [first, ...last] = rest ? rest.split(' ') : []
  rows.set(email, { email, name: first ?? null, last_name: last.join(' ') || null, cohort, start_date: start })
}

console.log(`${rows.size} men found${skipped.length ? `, ${skipped.length} line(s) skipped (no email):` : '.'}`)
for (const s of skipped) console.log(`  skipped: ${s}`)
for (const r of rows.values()) console.log(`  ${r.email.padEnd(40)} ${[r.name, r.last_name].filter(Boolean).join(' ')}`)
if (dry) { console.log('\n--dry: nothing written.'); process.exit(0) }

const ref = getval('VITE_SUPABASE_URL', '.env.local').match(/[a-z0-9]{20}/)?.[0]
const SERVICE = getval('SUPABASE_SERVICE_ROLE_KEY', '.secrets.local')
if (!ref || !SERVICE) { console.error('Missing env (.env.local / .secrets.local).'); process.exit(1) }
const db = createClient(`https://${ref}.supabase.co`, SERVICE, { auth: { persistSession: false } })

const { error } = await db.from('camp_roster').upsert([...rows.values()], { onConflict: 'email' })
if (error) { console.error(`FAILED: ${error.message}`); process.exit(1) }
console.log(`\nLoaded ${rows.size} into camp_roster (Day 1 = ${start}${cohort ? `, cohort "${cohort}"` : ''}).`)
