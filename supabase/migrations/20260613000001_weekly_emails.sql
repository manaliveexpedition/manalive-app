-- Weekly digest automation: bookkeeping table (so a man never gets the same
-- week twice) + a service-role function that returns who is due for the email
-- right now (evening of their Day 7 / 14 / 21 / 28, per their own start_date).
--
-- Timezone: a single program timezone (America/Chicago) decides "what day / what
-- hour" for the whole cohort. A weekly digest is not time-critical, so this is
-- simpler than per-user timezones. Revisit if the men spread across timezones.

create table public.weekly_emails (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  week_number int not null,
  sent_at     timestamptz default now(),
  unique (user_id, week_number)
);
alter table public.weekly_emails enable row level security;
-- server-only bookkeeping: no member policies; only the sender (service role) touches it.
grant select, insert on public.weekly_emails to service_role;

-- Who is due for a weekly digest right now. A man is due when:
--   * his current journey day is the last day of a week (7, 14, 21, 28),
--   * it is evening in the program timezone (>= 7pm Central),
--   * he has not already been sent that week's email, AND
--   * we actually have recap content for all 7 days of that week (so weeks whose
--     heart-lines are not written yet are skipped automatically).
create or replace function public.weekly_digests_due()
returns table (user_id uuid, email text, name text, week_number int)
language sql
security definer
set search_path = ''
stable
as $$
  with ctx as (
    select
      p.id, p.email, p.name, p.start_date,
      (now() at time zone 'America/Chicago')::date            as local_today,
      extract(hour from (now() at time zone 'America/Chicago')) as local_hour
    from public.profiles p
    where p.start_date is not null and p.email is not null
  ),
  due as (
    select
      c.id, c.email, c.name,
      (c.local_today - c.start_date) + 1 as sort_index,
      ((c.local_today - c.start_date) + 1) / 7 as week_number
    from ctx c
    where (c.local_today - c.start_date) + 1 >= 7
      and ((c.local_today - c.start_date) + 1) % 7 = 0
      and c.local_hour >= 19
  )
  select d.id, d.email, d.name, d.week_number
  from due d
  where not exists (
      select 1 from public.weekly_emails we
      where we.user_id = d.id and we.week_number = d.week_number
    )
    and (
      select count(*) from public.entries e
      where e.sort_index between (d.sort_index - 6) and d.sort_index
        and e.recap_line is not null
    ) = 7;
$$;

revoke all on function public.weekly_digests_due() from public;
grant execute on function public.weekly_digests_due() to service_role;
