# The Journey (ManAlive)

A devotional PWA that delivers a daily reading plus audio to men after a ManAlive
Expedition weekend. Each man moves through the plan one day at a time, paced from
his own start date. He can read, listen, journal privately, check in, and get a
gentle push notification or a weekly recap email. Admins get an engagement dashboard.

This README is the front door. Go deeper from here:

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) : the system map (data model, RLS, content pipeline, cron, gotchas).
- [`docs/SETUP.md`](docs/SETUP.md) : one-time setup (Supabase project, Google OAuth, SMTP, VAPID).
- [`scripts/README.md`](scripts/README.md) : what every script does and how to run it.
- Notion runbook **"The Daily, Runbook: How to Prepare and Ship a Week"** : the non-code workflow and the writing standards.

## Stack

- **Frontend:** Vite + React 19 + TypeScript, shipped as an installable PWA
  (`vite-plugin-pwa`, custom service worker in `src/sw.ts`).
- **Backend:** Supabase (Postgres, Auth, Storage, Row Level Security, Edge
  Functions on Deno, `pg_cron` + `pg_net` for scheduling).
- **Email / push:** Web Push (VAPID) for notifications; Gmail SMTP (`denomailer`)
  for the weekly recap email.
- **Hosting:** Vercel auto-deploys the frontend on every push to `main`.

## Quick start

```bash
npm install
npm run dev        # local dev server (Vite)
npm run build      # typecheck (tsc -b) + production build
npm run lint       # eslint
```

Two gitignored env files must exist at the repo root (details in
[`docs/SETUP.md`](docs/SETUP.md)):

- `.env.local` : `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_VAPID_PUBLIC_KEY` (browser-safe).
- `.secrets.local` : service role key, DB password, VAPID private key, cron
  secret, Gmail app password. Used by scripts and edge functions only, never the browser.

## Repo map

```
src/
  main.tsx            App bootstrap (React root).
  App.tsx             Auth gate + Shell (top nav + which screen shows) + SignIn + NameSetup.
  sw.ts               Service worker: receives push, sets the app-icon badge, routes notification taps.
  index.css, App.css  Global styles (design tokens live at the top of index.css).

  screens/            One file per view. UI plus light data loading.
    Today.tsx           The daily entry, or the "not started" / "caught up" states.
    entryParts.tsx      Shared pieces: EntryBody, AudioPlayer, CheckInCard, NotesCard.
    Progress.tsx        The man's own progress (streak, days reached).
    DayBrowser.tsx      Re-read any day he has already reached.
    Settings.tsx        Notifications (reminder toggle + time), name, install prompt.
    Library.tsx         Admin-only: every entry, for review.
    Admin.tsx           Admin-only: engagement dashboard (tabs: Engagement, List, Feedback, Phase, Scorecard).
    InstallBanner.tsx   "Add to home screen" nudge.

  lib/                Logic and data access. No JSX. Each file owns one concern.
    supabase.ts         The shared Supabase browser client.
    today.ts            Day math: resolveSortIndex(start_date -> journey day), loadToday, loadReachedEntries.
    progress.ts         Streak / progress derivation and TOTAL_WEEKS.
    checkins.ts         Read/write a day's check-in (beta feedback fields live here).
    notes.ts            A man's PRIVATE per-day notes (admins cannot read them).
    events.ts           Fire-and-forget engagement logging (opened_entry, played_audio, ...).
    profile.ts          Profile type + fetch + saveName (preferred + last name).
    admin.ts            loadAdminData: the whole admin dashboard is computed here.
    push.ts             Web Push subscribe/enable, reminder prefs, badge clearing.
    install.ts          PWA install-prompt plumbing.
    deeplink.ts         Survives email deep links across the Google OAuth redirect (localStorage stash).

scripts/              Node one-off tooling (not shipped). See scripts/README.md.
supabase/
  migrations/         Timestamped schema history (source of truth for the DB shape).
  functions/          Edge Functions: send-reminders, send-weekly-digest.
  seed.sql            All daily CONTENT, Days 1-49 (title, read, do-this, tags, heart lines).
docs/
  ARCHITECTURE.md     Deep system map.
  SETUP.md            One-time project + auth + SMTP + VAPID setup.
```

## How content gets into the app

Content is authored in Notion, then loaded into the database. The app reads it
live, so **new content needs no deploy**.

1. A week is written on its Notion "The Daily, Week N Copy" page: per day a title,
   the read (`body_text`), the listen (audio script), the do-this
   (`reflection_prompt`), and a one-line heart line (`recap_line`).
2. The reads / prompts / tags / heart lines are loaded into the `entries` table.
   The canonical copy lives in `supabase/seed.sql`.
3. Audio is recorded separately, dropped in `audio-source/` as `day-NN.mp3`, and
   uploaded with `npm run upload:audio`, which also sets `entries.audio_url`.

`seed.sql` never overwrites `audio_url` on re-run, so re-seeding content can never
wipe the recordings. The full workflow and the writing standards live in the Notion runbook.

## Key concepts (one line each; details in ARCHITECTURE.md)

- **Journey day** = calendar days since the man's `start_date`, resolved locally
  so the day flips at his own midnight (`resolveSortIndex` in `lib/today.ts`).
- **RLS everywhere:** a man reads/writes only his own rows; only `is_admin()`
  reads across the cohort. Notes are private even from admins.
- **Audio** lives in a private Storage bucket; the app mints a short-lived signed
  URL at play time.
- **Weekly email** fires on each man's Pause day (Day 7 of a week) and prints all
  seven days' `recap_line`, so every day needs one.
- **Push** is opt-in: a new-day badge, plus an optional daily reminder at a chosen
  time (only if the day is still unread).

## Deploy and ops

- **Frontend:** push to `main`; Vercel builds and deploys.
- **Database schema:** `supabase db push` applies new `migrations/`.
- **Content / data:** loaded via scripts or `scripts/db-exec.mjs`; canonical in
  `seed.sql`. Never edit RLS-sensitive data through the Supabase SQL editor.
- **Edge functions + cron:** `send-reminders` and `send-weekly-digest` run hourly
  via `pg_cron`; the timing and dedupe logic lives in SQL functions.

## Conventions

- Every source file opens with a short comment saying what it owns and why.
- `lib/` is pure logic/data (no JSX); `screens/` is UI.
- No em dashes anywhere in user-facing copy or content.
- Commits are authored as `John Pulley <jpulley@manaliveexpedition.com>`.
