// Batch-upload day audio from ./audio-source into the private daily-audio bucket
// and set entries.audio_url for the matching day. Files must be named
// day-<N>.<ext> (e.g. day-09.mp3). Service role from .secrets.local.
// Run: node scripts/upload-audio-batch.mjs   (or: npm run upload:audio)
import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, extname } from 'node:path'
import { createClient } from '@supabase/supabase-js'

function getval(key, file) {
  try {
    const line = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')
      .split('\n').find((l) => l.startsWith(`${key}=`))
    return line ? line.slice(key.length + 1).replace(/[\r\n]/g, '').trim() : ''
  } catch { return '' }
}
const ref = getval('VITE_SUPABASE_URL', '.env.local').match(/[a-z0-9]{20}/)?.[0]
const SERVICE = getval('SUPABASE_SERVICE_ROLE_KEY', '.secrets.local')
if (!ref || !SERVICE) { console.error('Missing env (.env.local / .secrets.local).'); process.exit(1) }

const supabase = createClient(`https://${ref}.supabase.co`, SERVICE, { auth: { persistSession: false } })

const BUCKET = 'daily-audio'
const CONTENT_TYPE = { '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.wav': 'audio/wav', '.aac': 'audio/aac' }

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'audio-source')
const files = readdirSync(dir).filter((f) => /^day-\d+\.(mp3|m4a|wav|aac)$/i.test(f))

if (!files.length) {
  console.log('No day-<N>.<ext> files in audio-source/. Nothing to upload.')
  process.exit(0)
}

console.log(`Uploading ${files.length} file(s) to ${BUCKET}:`)
let ok = 0, warn = 0, fail = 0
for (const f of files.sort()) {
  const day = parseInt(f.match(/^day-(\d+)\./i)[1], 10)
  const ext = extname(f).toLowerCase()
  const path = `day-${String(day).padStart(2, '0')}${ext}`
  try {
    const buf = readFileSync(join(dir, f))
    const { error: upErr } = await supabase.storage.from(BUCKET)
      .upload(path, buf, { contentType: CONTENT_TYPE[ext] || 'application/octet-stream', upsert: true })
    if (upErr) { fail++; console.error(`  FAIL  ${f}: upload — ${upErr.message}`); continue }

    const { data, error: updErr } = await supabase.from('entries')
      .update({ audio_url: path }).eq('sort_index', day).select('sort_index, title')
    if (updErr) { fail++; console.error(`  FAIL  ${f}: set audio_url — ${updErr.message}`); continue }
    if (!data || !data.length) {
      warn++; console.warn(`  WARN  ${f}: uploaded as ${path}, but no entry with sort_index ${day} (audio_url not set)`)
      continue
    }
    ok++; console.log(`  OK    day ${day} -> ${path}  (${data[0].title})`)
  } catch (e) {
    fail++; console.error(`  FAIL  ${f}: ${e instanceof Error ? e.message : e}`)
  }
}
console.log(`\nDone. ${ok} uploaded, ${warn} warning(s), ${fail} failed.`)
process.exit(fail === 0 ? 0 : 1)
