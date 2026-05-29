// One-off: upload a THROWAWAY placeholder audio file into the private
// daily-audio bucket and point the week-1/day-3 entry at it, so the player
// renders and plays end to end. This is plumbing only — real audio is separate
// content work. Uses the service role (bypasses storage RLS) from .secrets.local.
// Run: node scripts/upload-audio.mjs
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
if (!URL_ || !SERVICE) { console.error('Missing VITE_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.'); process.exit(1) }

const BUCKET = 'daily-audio'
const OBJECT_PATH = 'week-01/day-03.wav'
const DAY3_ENTRY = 'e1000001-0001-0001-0001-000000000003'

// Build a tiny valid WAV: 0.5s of silence, 8 kHz mono 8-bit PCM (128 = silent).
function silentWav(seconds = 0.5, rate = 8000) {
  const samples = Math.floor(seconds * rate)
  const buf = Buffer.alloc(44 + samples)
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + samples, 4); buf.write('WAVE', 8)
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16)
  buf.writeUInt16LE(1, 20)      // PCM
  buf.writeUInt16LE(1, 22)      // mono
  buf.writeUInt32LE(rate, 24)
  buf.writeUInt32LE(rate, 28)   // byte rate (rate * blockAlign)
  buf.writeUInt16LE(1, 32)      // block align
  buf.writeUInt16LE(8, 34)      // bits per sample
  buf.write('data', 36); buf.writeUInt32LE(samples, 40)
  buf.fill(128, 44)             // 8-bit silence
  return buf
}

const admin = createClient(URL_, SERVICE, { auth: { persistSession: false } })

const { error: upErr } = await admin.storage
  .from(BUCKET)
  .upload(OBJECT_PATH, silentWav(), { contentType: 'audio/wav', upsert: true })
if (upErr) { console.error(`upload failed: ${upErr.message}`); process.exit(1) }
console.log(`Uploaded placeholder -> ${BUCKET}/${OBJECT_PATH}`)

const { error: dbErr } = await admin
  .from('entries')
  .update({ audio_url: OBJECT_PATH })
  .eq('id', DAY3_ENTRY)
if (dbErr) { console.error(`entry update failed: ${dbErr.message}`); process.exit(1) }
console.log(`Set entries.audio_url = '${OBJECT_PATH}' for week 1 / day 3.`)
