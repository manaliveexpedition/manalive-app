// Edge function: send the end-of-week digest to everyone due right now (decided
// by weekly_digests_due()). Invoked hourly by pg_cron; the evening / day-7 /
// dedupe logic all lives in the SQL function, so this just assembles + sends.
//
// Secrets: CRON_SECRET, GMAIL_APP_PASSWORD (Gmail App Password for the sender).
// SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are injected.
//
//   ?dryRun        -> return who is due, send nothing
//   ?test=a@b.com  -> send the Week 1 sample to that address (verifies SMTP)
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

const CRON_SECRET = Deno.env.get('CRON_SECRET')
const APP_PASSWORD = (Deno.env.get('GMAIL_APP_PASSWORD') ?? '').replace(/\s+/g, '')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const SENDER = 'jpulley@manaliveexpedition.com'
const BASE = 'https://manalive-app.vercel.app'

const WEEK_WORD = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight']
const weekWord = (n: number) => WEEK_WORD[n] || String(n)
const dayOf = (si: number) => ((si - 1) % 7) + 1
const esc = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function json(obj: unknown, status = 200): Response {
  return new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json' } })
}

type Day = { sort_index: number; title: string; recap_line: string | null }

function assemble(weekNumber: number, days: Day[], name: string | null) {
  const greet = name ? `Hey ${name},` : 'Men,'
  const subject = `Week ${weekWord(weekNumber)} is in the books. You're caught up.`

  const dayText = days.map((d) => {
    const n = dayOf(d.sort_index)
    return `Day ${n}, ${d.title}. ${d.recap_line ?? ''}\nReread Day ${n}: ${BASE}/#day/${d.sort_index}`
  }).join('\n\n')

  const text = `${greet}

One week down. Maybe you read every day, maybe you missed a few and doubted the whole thing on Wednesday. Either way you are not behind, and there is nothing to apologize for. Here is the heart of the week, in case any of it slipped by.

${dayText}

That is the week. If you just read that, you are caught up. Tomorrow we start fresh.

One thing that helps: if you keep forgetting to check in, set a daily reminder. Gentle nudge, no guilt.

Set your reminder: ${BASE}/#settings

Flip on Daily reminder, pick your time, and tap Allow when your phone asks. (iPhone: add the app to your home screen first.)

Strength and Honor,

Pulley`

  const dayHtml = days.map((d) => {
    const n = dayOf(d.sort_index)
    return `<p style="margin:0 0 14px"><strong>Day ${n}, ${esc(d.title)}.</strong> ${esc(d.recap_line)} <a href="${BASE}/#day/${d.sort_index}" style="color:#8a3a2e;font-weight:600;text-decoration:none;white-space:nowrap">Reread Day ${n} &rsaquo;</a></p>`
  }).join('\n')

  const html = `<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;font-size:16px;line-height:1.55;color:#2c3137;max-width:560px">
<p style="margin:0 0 14px">${esc(greet)}</p>
<p style="margin:0 0 14px">One week down. Maybe you read every day, maybe you missed a few and doubted the whole thing on Wednesday. Either way you are not behind, and there is nothing to apologize for. Here is the heart of the week, in case any of it slipped by.</p>
${dayHtml}
<p style="margin:18px 0 14px">That is the week. If you just read that, you are caught up. Tomorrow we start fresh.</p>
<p style="margin:0 0 12px"><strong>One thing that helps:</strong> if you keep forgetting to check in, set a daily reminder. Gentle nudge, no guilt.</p>
<p style="margin:0 0 12px"><a href="${BASE}/#settings" style="display:inline-block;background:#8a3a2e;color:#ece6d7;padding:11px 20px;border-radius:8px;text-decoration:none;font-weight:600">Set your reminder &rsaquo;</a></p>
<p style="margin:0 0 14px;font-size:14px;color:#6b6f76">Flip on Daily reminder, pick your time, and tap Allow when your phone asks. (iPhone: add the app to your home screen first.)</p>
<p style="margin:0 0 14px">Strength and Honor,</p>
<p style="margin:0">Pulley</p>
</div>`

  return { subject, text, html }
}

async function daysForWeek(sb: ReturnType<typeof createClient>, weekNumber: number): Promise<Day[]> {
  const from = (weekNumber - 1) * 7 + 1
  const to = weekNumber * 7
  const { data } = await sb.from('entries')
    .select('sort_index, title, recap_line').gte('sort_index', from).lte('sort_index', to).order('sort_index')
  return (data ?? []) as Day[]
}

Deno.serve(async (req) => {
  if (!CRON_SECRET || req.headers.get('x-cron-secret') !== CRON_SECRET) return json({ error: 'forbidden' }, 403)
  if (!SUPABASE_URL || !SERVICE_ROLE) return json({ error: 'missing supabase env' }, 500)
  if (!APP_PASSWORD) return json({ error: 'missing GMAIL_APP_PASSWORD' }, 500)

  const url = new URL(req.url)
  const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } })

  if (url.searchParams.has('dryRun')) {
    const { data, error } = await sb.rpc('weekly_digests_due')
    return error ? json({ error: error.message }, 500) : json({ dueCount: (data ?? []).length, due: data })
  }

  const client = new SMTPClient({
    connection: { hostname: 'smtp.gmail.com', port: 465, tls: true, auth: { username: SENDER, password: APP_PASSWORD } },
  })

  try {
    // Test mode: send the Week 1 sample to one address, ignore the due logic.
    const testTo = url.searchParams.get('test')
    if (testTo) {
      const days = await daysForWeek(sb, 1)
      const { subject, text, html } = assemble(1, days, 'Pulley')
      await client.send({ from: `The Journey <${SENDER}>`, to: testTo, subject, content: text, html })
      return json({ test: true, sentTo: testTo })
    }

    const { data: due, error } = await sb.rpc('weekly_digests_due')
    if (error) return json({ error: error.message }, 500)

    let sent = 0, failed = 0
    for (const row of due ?? []) {
      try {
        const days = await daysForWeek(sb, row.week_number)
        const { subject, text, html } = assemble(row.week_number, days, row.name)
        await client.send({ from: `The Journey <${SENDER}>`, to: row.email, subject, content: text, html })
        await sb.from('weekly_emails').insert({ user_id: row.user_id, week_number: row.week_number })
        sent++
      } catch (_e) {
        failed++ // not recorded -> retried on the next hourly tick
      }
    }
    return json({ dueCount: (due ?? []).length, sent, failed })
  } finally {
    await client.close()
  }
})
