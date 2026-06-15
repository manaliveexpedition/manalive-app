-- FIX: the name-capture migration (20260609000002) rewrote handle_new_user and
-- accidentally dropped start_date, so new signups since then get a NULL start_date
-- and never begin their journey. Restore it. Also compute the upcoming Monday in
-- the program timezone (America/Chicago) instead of UTC, so a man who signs up any
-- time on Monday (Central) starts THAT Monday, not the next one (UTC rolled the
-- date over in the evening). Keeps the OAuth name pre-fill from the name migration.
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
begin
  insert into public.profiles (id, email, name, last_name, start_date)
  values (
    new.id, new.email, first_nm, last_nm,
    public.next_monday((now() at time zone 'America/Chicago')::date)
  );
  return new;
end;
$$;
