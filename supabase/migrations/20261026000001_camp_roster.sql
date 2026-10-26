-- Camp roster: who may create an account, and when their journey starts.
--
-- After a camp, John loads the men who attended (name + registration email).
-- Only those emails can create a NEW account, by Google or by email code;
-- existing accounts are untouched.
--
-- Start date: the Monday of the week he signs up (Central time), never earlier
-- than the camp's Monday (roster start_date). The weeks run Monday to Sunday,
-- so a man who signs up Wednesday lands on Day 3 with Days 1-2 waiting under
-- "View previous days", and one who signs up the following Tuesday starts that
-- week on Day 2 instead of being a week behind.
--
-- Not readable by members: no policies, no grants to anon/authenticated. Only
-- the service role (loader script) and the SECURITY DEFINER trigger touch it.
create table if not exists public.camp_roster (
  email       text primary key check (email = lower(btrim(email))),
  name        text,
  last_name   text,
  cohort      text,
  start_date  date not null,
  created_at  timestamptz default now()
);

alter table public.camp_roster enable row level security;
revoke all on public.camp_roster from anon, authenticated;
grant select, insert, update, delete on public.camp_roster to service_role;

-- Signup trigger. Same as 20260615000001 (OAuth name pre-fill, Central-time
-- Monday) plus the roster gate and roster-driven start date.
--
-- The gate raises, which makes Supabase Auth refuse to create the user. The
-- app shows that refusal as "use the email you registered with" (App.tsx).
-- @example.com is let through for the ops scripts' throwaway test users: it is
-- a reserved domain that can't receive a login code or be a Google account.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  first_nm text := nullif(btrim(coalesce(
                     meta->>'given_name',
                     meta->>'first_name',
                     split_part(coalesce(meta->>'full_name', meta->>'name', ''), ' ', 1))), '');
  last_nm  text := nullif(btrim(coalesce(meta->>'family_name', meta->>'last_name')), '');
  em       text := lower(btrim(coalesce(new.email, '')));
  r        public.camp_roster%rowtype;
  today_ct date := (now() at time zone 'America/Chicago')::date;
  -- Monday of this week (isodow: Mon=1 .. Sun=7).
  this_monday date := today_ct - (extract(isodow from today_ct)::int - 1);
begin
  select * into r from public.camp_roster where email = em;

  if not found and em not like '%@example.com' then
    raise exception 'not_on_roster: % is not on a camp roster', em
      using hint = 'Load the man with scripts/load-roster.mjs';
  end if;

  insert into public.profiles (id, email, name, last_name, cohort, start_date)
  values (
    new.id, new.email,
    coalesce(nullif(btrim(r.name), ''), first_nm),
    coalesce(nullif(btrim(r.last_name), ''), last_nm),
    r.cohort,
    case when r.email is not null
      then greatest(r.start_date, this_monday)
      else public.next_monday(today_ct)
    end
  );
  return new;
end;
$$;
