-- Personal notes: a private place for a man to capture what stood out in the
-- day's reading or audio. ONE note per man per day (entry), editable.
--
-- PRIVACY: unlike checkins.what_landed/what_didnt (which are beta feedback for
-- John), notes are genuinely private to the man. The SELECT policy is own-only
-- with NO is_admin() clause, so not even an admin can read them. They are never
-- read by the service role / edge functions either.

create table public.notes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  entry_id    uuid not null references public.entries(id),
  body        text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  unique (user_id, entry_id)
);
create index on public.notes (user_id);

alter table public.notes enable row level security;

-- Own-only, every operation. NOTE: deliberately no "or public.is_admin()".
create policy "read own notes" on public.notes for select to authenticated
  using ( (select auth.uid()) = user_id );
create policy "insert own notes" on public.notes for insert to authenticated
  with check ( (select auth.uid()) = user_id );
create policy "update own notes" on public.notes for update to authenticated
  using ( (select auth.uid()) = user_id )
  with check ( (select auth.uid()) = user_id );
create policy "delete own notes" on public.notes for delete to authenticated
  using ( (select auth.uid()) = user_id );

-- Explicit grants (auto_expose_new_tables is false on this project). No grant to
-- service_role: notes must never be read server-side.
grant select, insert, update, delete on public.notes to authenticated;
