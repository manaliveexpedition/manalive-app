-- Web Push foundation: per-device subscriptions + per-user notification prefs,
-- plus a service-role function that returns who is due for a nudge right now.
--
-- IMPORTANT (grants): api auto_expose_new_tables defaults false on this project,
-- so RLS alone is not enough. New tables need EXPLICIT table-level GRANTs or
-- PostgREST returns permission-denied / empty. Existing tables predate this, so
-- they never needed it. We grant explicitly below.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

-- One row per browser/device a man has subscribed from. endpoint is the unique
-- push target; p256dh/auth are the encryption keys the push service needs.
create table public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  ua_label    text,                          -- e.g. "iPhone Safari", for the UI
  created_at  timestamptz default now(),
  last_seen   timestamptz default now()
);
create index on public.push_subscriptions (user_id);

-- One row per man. Two independent toggles (dot / reminder), each with a time,
-- his IANA timezone (captured client-side), and the local date we last pushed
-- (so we never send twice in a day).
create table public.notification_prefs (
  user_id          uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  dot_enabled      boolean not null default false,   -- new-day dot toggle
  reminder_enabled boolean not null default false,   -- timed reminder toggle
  reminder_time    time not null default '08:00',    -- his chosen local time
  dot_time         time not null default '07:00',    -- default time the dot rides on
  timezone         text not null default 'UTC',      -- IANA, e.g. 'America/Chicago'
  last_sent_on     date,                             -- local date of last push
  updated_at       timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.push_subscriptions enable row level security;
alter table public.notification_prefs enable row level security;

-- push_subscriptions: a man manages only his own; admin may read.
create policy "read own subs" on public.push_subscriptions for select to authenticated
  using ( (select auth.uid()) = user_id or public.is_admin() );
create policy "insert own subs" on public.push_subscriptions for insert to authenticated
  with check ( (select auth.uid()) = user_id );
create policy "update own subs" on public.push_subscriptions for update to authenticated
  using ( (select auth.uid()) = user_id )
  with check ( (select auth.uid()) = user_id );
create policy "delete own subs" on public.push_subscriptions for delete to authenticated
  using ( (select auth.uid()) = user_id );

-- notification_prefs: a man reads/writes only his own; admin may read.
create policy "read own prefs" on public.notification_prefs for select to authenticated
  using ( (select auth.uid()) = user_id or public.is_admin() );
create policy "insert own prefs" on public.notification_prefs for insert to authenticated
  with check ( (select auth.uid()) = user_id );
create policy "update own prefs" on public.notification_prefs for update to authenticated
  using ( (select auth.uid()) = user_id )
  with check ( (select auth.uid()) = user_id );

-- ---------------------------------------------------------------------------
-- Explicit grants (required; see header note)
-- ---------------------------------------------------------------------------

grant select, insert, update, delete on public.push_subscriptions to authenticated;
grant select, delete                 on public.push_subscriptions to service_role;

grant select, insert, update on public.notification_prefs to authenticated;
grant select, update         on public.notification_prefs to service_role;

-- ---------------------------------------------------------------------------
-- "Who is due for a nudge right now" (service role only)
-- ---------------------------------------------------------------------------
-- Replicates the client-side resolveSortIndex on the server using each man's
-- stored IANA timezone: current sort_index = (local_today - start_date) + 1,
-- Day 1 = start_date. A man is due when:
--   * a toggle is on and his start_date is set,
--   * the current local wall-clock is within a 10-minute catch window of the
--     active toggle's time (reminder_time if reminder is on, else dot_time) —
--     interval math, not HH:MM strings, so it survives hour/midnight/DST edges,
--   * we have not already pushed him today (last_sent_on < local_today),
--   * the current day's entry exists, AND
--   * that entry is still UNREAD (no opened_entry event for it).
-- The 10-minute window with a */5 cron overlaps slightly; last_sent_on dedupes,
-- and a skipped cron run is still recovered on the next tick.
create or replace function public.reminders_due_now()
returns table (
  user_id          uuid,
  entry_id         uuid,
  local_today      date,
  reminder_enabled boolean,
  dot_enabled      boolean
)
language sql
security definer
set search_path = ''
stable
as $$
  with prefs as (
    select
      np.user_id,
      np.reminder_enabled,
      np.dot_enabled,
      np.last_sent_on,
      p.start_date,
      (now() at time zone np.timezone)        as local_now,
      (now() at time zone np.timezone)::date  as local_today,
      case when np.reminder_enabled then np.reminder_time
           when np.dot_enabled      then np.dot_time end as fire_time
    from public.notification_prefs np
    join public.profiles p on p.id = np.user_id
    where (np.reminder_enabled or np.dot_enabled)
      and p.start_date is not null
  )
  select
    pr.user_id,
    e.id as entry_id,
    pr.local_today,
    pr.reminder_enabled,
    pr.dot_enabled
  from prefs pr
  join public.entries e
    on e.sort_index = (pr.local_today - pr.start_date) + 1
  where (pr.last_sent_on is null or pr.last_sent_on < pr.local_today)
    and (pr.local_today - pr.start_date) + 1 >= 1
    and pr.local_now >= (pr.local_today + pr.fire_time)
    and pr.local_now <  (pr.local_today + pr.fire_time + interval '10 minutes')
    and not exists (
      select 1 from public.events ev
      where ev.user_id = pr.user_id
        and ev.entry_id = e.id
        and ev.event_type = 'opened_entry'
    );
$$;

revoke all on function public.reminders_due_now() from public;
grant execute on function public.reminders_due_now() to service_role;
