// Manual test of the weekly digest email (Node + nodemailer via Gmail SMTP),
// to de-risk sending BEFORE the Deno edge function. Assembles the end-of-week
// recap from entries.recap_line and sends it to one address.
//
// Reads GMAIL_APP_PASSWORD from .secrets.local, Supabase from .env.local.
// Usage: node scripts/send-test-email.mjs            # week 1 -> sends to SENDER
//        node scripts/send-test-email.mjs 2 you@x.com  # week 2 -> that address
import { readFileSync } from 'node:fs'
import nodemailer from 'nodemailer'
import { createClient } from '@supabase/supabase-js'

function gv(k, f) {
  const l = readFileSync(new URL(`../${f}`, import.meta.url), 'utf8')
    .split(/\r?\n/).find((x) => x.startsWith(`${k}=`))
  return l ? l.slice(k.length + 1).trim() : ''
}

const SENDER = 'jpulley@manaliveexpedition.com'
const APP_PASSWORD = gv('GMAIL_APP_PASSWORD', '.secrets.local').replace(/\s+/g, '')
const ref = gv('VITE_SUPABASE_URL', '.env.local').match(/[a-z0-9]{20}/)?.[0]
const SERVICE = gv('SUPABASE_SERVICE_ROLE_KEY', '.secrets.local')
if (!APP_PASSWORD) { console.error('Missing GMAIL_APP_PASSWORD in .secrets.local'); process.exit(1) }

const weekNumber = Number(process.argv[2] || 1)
const recipient = process.argv[3] || SENDER

const WEEK_WORD = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight']
const weekWord = (n) => WEEK_WORD[n] || String(n)

const sb = createClient(`https://${ref}.supabase.co`, SERVICE, { auth: { persistSession: false } })

// Pull the 7 days of the requested week + the recipient's preferred name.
const from = (weekNumber - 1) * 7 + 1
const to = weekNumber * 7
const { data: days } = await sb.from('entries')
  .select('sort_index, title, recap_line').gte('sort_index', from).lte('sort_index', to).order('sort_index')
const { data: prof } = await sb.from('profiles').select('name').eq('email', recipient).maybeSingle()
const name = prof?.name || null

function build({ weekNumber, days, name }) {
  const greet = name ? `Hey ${name},` : 'Men,'
  const subject = `Week ${weekWord(weekNumber)} is in the books. You're caught up.`
  const dayOf = (si) => ((si - 1) % 7) + 1

  const dayText = days.map((d) => `Day ${dayOf(d.sort_index)}, ${d.title}. ${d.recap_line ?? ''}`).join('\n\n')
  const text = `${greet}

One week down. Maybe you read every day, maybe you missed a few and doubted the whole thing on Wednesday. Either way you are not behind, and there is nothing to apologize for. Here is the heart of the week, in case any of it slipped by.

${dayText}

Reread any day in the app: https://manalive-app.vercel.app/#days

That is the week. If you just read that, you are caught up. Tomorrow we start fresh.

One thing that helps: if you keep forgetting to check in, set a daily reminder in the app. Gentle nudge, no guilt.

1. Open The Journey and tap Settings.
2. Turn on Daily reminder and pick your time.
3. Tap Allow when your phone asks.

(iPhone: add the app to your home screen first.)

Strength and Honor,

Pulley`

  const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const dayHtml = days.map((d) =>
    `<p style="margin:0 0 14px"><strong>Day ${dayOf(d.sort_index)}, ${esc(d.title)}.</strong> ${esc(d.recap_line)}</p>`).join('\n')
  const html = `<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;font-size:16px;line-height:1.55;color:#2c3137;max-width:560px">
<p style="margin:0 0 14px">${esc(greet)}</p>
<p style="margin:0 0 14px">One week down. Maybe you read every day, maybe you missed a few and doubted the whole thing on Wednesday. Either way you are not behind, and there is nothing to apologize for. Here is the heart of the week, in case any of it slipped by.</p>
${dayHtml}
<p style="margin:14px 0 16px"><a href="https://manalive-app.vercel.app/#days" style="color:#8a3a2e;font-weight:600;text-decoration:none">Reread any day in the app &rsaquo;</a></p>
<p style="margin:0 0 14px">That is the week. If you just read that, you are caught up. Tomorrow we start fresh.</p>
<p style="margin:0 0 8px"><strong>One thing that helps:</strong> if you keep forgetting to check in, set a daily reminder in the app. Gentle nudge, no guilt.</p>
<ol style="margin:0 0 14px;padding-left:22px">
<li>Open The Journey and tap <strong>Settings</strong>.</li>
<li>Turn on <strong>Daily reminder</strong> and pick your time.</li>
<li>Tap <strong>Allow</strong> when your phone asks.</li>
</ol>
<p style="margin:0 0 14px">(iPhone: add the app to your home screen first.)</p>
<p style="margin:0 0 14px">Strength and Honor,</p>
<p style="margin:0">Pulley</p>
</div>`
  return { subject, text, html }
}

const { subject, text, html } = build({ weekNumber, days: days ?? [], name })

const transport = nodemailer.createTransport({
  host: 'smtp.gmail.com', port: 465, secure: true,
  auth: { user: SENDER, pass: APP_PASSWORD },
})

console.log(`Sending Week ${weekNumber} digest to ${recipient} (greeting: ${name ? 'Hey ' + name : 'Men'})...`)
const info = await transport.sendMail({
  from: `The Journey <${SENDER}>`,
  to: recipient,
  subject,
  text,
  html,
})
console.log('Sent. messageId:', info.messageId, '| accepted:', info.accepted)
process.exit(0)
