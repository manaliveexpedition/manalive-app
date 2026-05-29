-- The Journey — initial schema, indexes, admin helper, and RLS policies.
-- RLS syntax confirmed against current Supabase docs (2026-05): (select auth.uid())
-- subselect for the initPlan optimization, `to authenticated` role targeting,
-- and a security-definer helper to avoid recursive evaluation on profiles.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  name        text,
  cohort      text,
  start_date  date,
  role        text not null default 'member',  -- 'member' | 'admin'
  created_at  timestamptz default now()
);

create table public.entries (
  id          uuid primary key default gen_random_uuid(),
  week        int,                              -- 1..26
  day         int,                              -- 1..7
  title       text,
  body_text   text,
  audio_url   text,                             -- nullable; file in Supabase storage
  sort_index  int,                              -- absolute order; week1/day1 = 1
  created_at  timestamptz default now()
);

create table public.checkins (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  entry_id      uuid references public.entries(id),
  checkin_date  date,
  sat_with_it   boolean,
  what_landed   text,
  what_didnt    text,
  consumed_as   text,                           -- 'read' | 'listen'
  created_at    timestamptz default now()
);

create table public.events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  entry_id    uuid references public.entries(id),  -- nullable
  event_type  text,  -- 'opened_app' | 'opened_entry' | 'played_audio' | 'submitted_checkin'
  created_at  timestamptz default now()
);

-- Stub tables (names reserved, RLS on, no policies = locked). Designed later.
create table public.connections (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz default now()
);
create table public.reunions (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz default now()
);
create table public.rsvps (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index on public.checkins (user_id);
create index on public.events (user_id);
create index on public.entries (sort_index);

-- ---------------------------------------------------------------------------
-- Admin helper (security definer so the profiles policy does not recurse)
-- ---------------------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ---------------------------------------------------------------------------
-- Enable RLS on every table
-- ---------------------------------------------------------------------------

alter table public.profiles    enable row level security;
alter table public.entries     enable row level security;
alter table public.checkins    enable row level security;
alter table public.events      enable row level security;
alter table public.connections enable row level security;
alter table public.reunions    enable row level security;
alter table public.rsvps       enable row level security;

-- ---------------------------------------------------------------------------
-- Policies
-- ---------------------------------------------------------------------------

-- profiles: a man reads and updates his own; admin reads all.
-- NOTE: there is intentionally no INSERT policy — profile rows are provisioned
-- out-of-band (service role / trigger / admin), not by the member himself.
create policy "read own profile" on public.profiles for select to authenticated
  using ( (select auth.uid()) = id or public.is_admin() );
create policy "update own profile" on public.profiles for update to authenticated
  using ( (select auth.uid()) = id )
  with check ( (select auth.uid()) = id );

-- entries: shared read for any logged-in member; no member writes (seed/admin only).
create policy "read entries" on public.entries for select to authenticated
  using ( true );

-- checkins: a man reads/writes only his own; admin reads all.
create policy "read own checkins" on public.checkins for select to authenticated
  using ( (select auth.uid()) = user_id or public.is_admin() );
create policy "insert own checkins" on public.checkins for insert to authenticated
  with check ( (select auth.uid()) = user_id );
create policy "update own checkins" on public.checkins for update to authenticated
  using ( (select auth.uid()) = user_id )
  with check ( (select auth.uid()) = user_id );

-- events: a man writes and reads only his own; admin reads all.
create policy "read own events" on public.events for select to authenticated
  using ( (select auth.uid()) = user_id or public.is_admin() );
create policy "insert own events" on public.events for insert to authenticated
  with check ( (select auth.uid()) = user_id );
