# Architecture

The system map for The Journey. Read the [README](../README.md) first for the
repo layout; this document explains how the pieces work together.

## Big picture

```
   Notion (authoring)                 Supabase (backend)                 Browser (PWA)
  ------------------      load       --------------------    reads      --------------
  Week N Copy pages  ------------->   entries table       ------------>  Today / DayBrowser
  84-Day Map + runbook              checkins, notes,      <------------  check-ins, notes,
                                    events, profiles       writes        events (RLS-scoped)
  audio recordings  --upload:audio-> Storage (private)    --signed URL-> AudioPlayer
                                    Edge fns + pg_cron    --push/email-> notifications + weekly recap
```

The frontend is a thin React client. All authority lives in Postgres via Row
Level Security, so the browser can hold the service-role-free anon key safely: a
man simply cannot read another man's rows.

## Data model

All app tables live in `public`. Schema history is in `supabase/migrations/`
(timestamped; that is the source of truth for shape). Daily content is in
`supabase/seed.sql` (source of truth for the words).

| Table | What it holds | Ownership |
|-------|---------------|-----------|
| `profiles` | one row per man: `role`, `start_date`, `cohort`, `name` (preferred), `last_name`, `name_confirmed`, `email` | self + admin |
| `entries` | the daily content: `sort_index` (absolute day 1..N), `week`, `day` (1-7), `title`, `body_text` (the read), `reflection_prompt` (do-this), `audio_url`, `format`, `phase`, `recap_line` (weekly-email heart line) | readable by any signed-in member |
| `checkins` | one per man per day: `consumed_as` (read/listen), plus beta feedback `what_landed` / `what_didnt` | self + admin |
| `notes` | a man's PRIVATE per-day journal | self ONLY (admins blocked) |
| `events` | fire-and-forget engagement pings: `opened_app`, `opened_entry`, `played_audio`, `clicked_link`, `submitted_checkin` | self + admin |
| `notification_prefs` | reminder on/off + time | self |
| `push_subscriptions` | Web Push endpoints per device | self |
| `weekly_emails` | dedupe log: which week digest a man has already been sent | service role |

### Row Level Security

- Every member policy is `(select auth.uid()) = user_id or public.is_admin()`.
  `notes` is the exception: self only, no admin clause, so a man's journal is
  private even from John.
- `is_admin()` is a `security definer` function that checks the caller's
  `profiles.role`. It lets the Admin dashboard read across the cohort without
  weakening per-user policies.
- Table grants are EXPLICIT. The project has `auto_expose_new_tables = false`, so
  every new table needs its grants spelled out in the migration, and helper
  functions must have EXECUTE revoked from `anon`/`authenticated` when they should
  not be callable by members (see `20260608000002_lock_reminders_fn.sql`).

## Day resolution (the heart of the app)

`lib/today.ts` turns a man's `start_date` into which entry he sees:

- `resolveSortIndex(start_date, now)` = calendar days elapsed since `start_date`,
  plus one. Day 1 of the journey is `start_date` itself. It compares LOCAL
  midnights, so the entry flips at the man's own midnight, not UTC.
- `loadToday` returns one of three states: `not_started` (no start date or still
  in the future), `entry` (the resolved day), or `caught_up` (past the last
  seeded entry). The Today screen renders a calm state for each, never an error.
- `loadReachedEntries` returns day 1 through his current day for re-reading. Future
  days are never returned, so there are no spoilers.

`start_date` is set at signup to the upcoming Monday in America/Chicago
(`next_monday`), so a cohort starts together.

## Auth and signup

- Passwordless: Google OAuth (primary) or a 6-digit email code (fallback), both in
  `App.tsx`. Login codes are sent from the ManAlive domain via custom SMTP
  configured in Supabase Auth.
- On first sign-in a trigger, `handle_new_user()` (SECURITY DEFINER, empty
  `search_path`), creates the `profiles` row and stamps `start_date =
  next_monday(today)`. This trigger is critical: a regression once dropped
  `start_date` and new signups got NULL (fixed in `20260615000001`). If you touch
  it, verify a fresh signup still gets the upcoming Monday.
- First run in the app asks "What do you go by?" (`NameSetup` in `App.tsx`) and
  sets `name` / `last_name` / `name_confirmed`.

## Audio

- Recordings live in a PRIVATE Storage bucket (`daily-audio`) as `day-NN.mp3`.
- `entries.audio_url` stores just the object path (e.g. `day-36.mp3`).
- `AudioPlayer` (in `screens/entryParts.tsx`) mints a short-lived signed URL at
  play time via `createSignedUrl`; anonymous callers are rejected by the Storage
  policy. There is no public URL.
- Uploads are out-of-band: `npm run upload:audio` uploads the files and sets
  `audio_url`. `seed.sql`'s `ON CONFLICT DO UPDATE` deliberately EXCLUDES
  `audio_url`, so re-seeding content never resets the recordings.

## Weekly recap email

`supabase/functions/send-weekly-digest/index.ts`, Gmail SMTP via `denomailer`.

- Runs hourly via `pg_cron`. The SQL function `weekly_digests_due()` decides who
  is due right now (evening of their Day 7/14/21/... , deduped against
  `weekly_emails`). The function just assembles and sends.
- The email prints ALL SEVEN days of the finished week, each as
  `Day N, {title}. {recap_line}` plus a "Reread Day N" deep link. **`recap_line`
  is therefore per-day: every day needs one, or that day renders a blank line.**
- `?dryRun` returns who is due without sending; `?test=a@b.com` sends the Week 1
  sample to verify SMTP.

## Push notifications and reminders

- `lib/push.ts` handles subscribe/enable, stores the subscription, and reads/writes
  `notification_prefs`. VAPID public key is a `VITE_` env var; the private key is a
  server secret.
- `src/sw.ts` is the service worker: on `push` it shows the notification and sets
  the app-icon badge (unless the payload says otherwise); on notification tap it
  posts `{type:'navigate', view:'today'}` to the app, which `App.tsx` listens for.
- `supabase/functions/send-reminders/index.ts` sends the opt-in daily reminder,
  hourly via cron, only to men whose current day is unread and whose chosen time
  has arrived (`reminders_due_now()`).

## Admin analytics

`lib/admin.ts` (`loadAdminData`) computes the entire dashboard client-side from
four fetches (profiles, entries, checkins, events). `Admin.tsx` renders it as five
tabs. Two hard-won correctness rules live here:

- **Pagination:** PostgREST caps a response at 1000 rows. `events` has outgrown
  that, so `fetchAllRows` pages through with `.range()`. Without it, the newest
  events silently vanish and every recent-day stat reads far too low.
- **Central time:** engagement dates are bucketed in America/Chicago (`ctDate`),
  not UTC, so a 9pm-Central open does not get filed on the next day.
- Engagement "reach" counts ANY footprint (open, audio, link, or check-in), because
  the `opened_entry` ping is fire-and-forget and drops on flaky connections.

## Deploy and ops

- **Frontend:** Vercel builds on push to `main`.
- **Schema:** author a migration in `supabase/migrations/`, then `supabase db push`.
- **Data/content:** `scripts/db-exec.mjs <file.sql>` runs SQL against the pooler;
  content scripts use the service role. Validate a `seed.sql` change by wrapping it
  in `begin; ... rollback;` and running it through `db-exec` first.
- **Secrets:** `.env.local` (browser-safe `VITE_` vars) and `.secrets.local`
  (service role, DB password, VAPID private, cron secret, Gmail app password),
  both gitignored. The Gmail app password lives in three places that must stay in
  sync: Supabase Auth SMTP, the `send-weekly-digest` function secret, and
  `.secrets.local`.

## Gotchas and learnings (read before you debug)

- **1000-row cap** on any Supabase/PostgREST query. Paginate anything that grows.
- **UTC vs Central:** timestamps are stored UTC; bucket by America/Chicago for any
  man-facing "day" math or the numbers drift by up to a day.
- **`audio_url` on re-seed:** never let a content re-seed null it out (the ON
  CONFLICT clause guards this).
- **RLS default grants:** new tables are not auto-exposed; grant explicitly, and
  revoke EXECUTE on helper functions that members should not call.
- **Deep links + OAuth:** the Google redirect drops the URL hash, so `deeplink.ts`
  stashes the target in localStorage before redirecting and consumes it after login.
- **PWA install gate:** iOS only allows Web Push once the app is added to the home
  screen; Settings primes this.
- **`recap_line` is per-day**, not per-week (see weekly email above).
