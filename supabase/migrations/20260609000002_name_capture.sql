-- Name capture. Keep `name` as the man's PREFERRED name (what he goes by, used in
-- greetings), add `last_name`, and a `name_confirmed` flag so we ask every man
-- once ("What do you go by?") even when Google handed us a name, he may go by
-- something else (Brent -> Hershey). New + existing rows default to unconfirmed.

alter table public.profiles add column if not exists last_name text;
alter table public.profiles add column if not exists name_confirmed boolean not null default false;

-- Members may set their own name / last_name / confirm flag. role, start_date,
-- cohort, email stay locked to the service role / admin path.
grant update (name, last_name, name_confirmed) on public.profiles to authenticated;

-- Signup trigger: pre-fill name/last_name from the OAuth provider (Google gives
-- given_name / family_name) so the "what do you go by?" screen is a quick confirm.
-- Email-code signups carry no provider name, so they fill it in fresh. Written
-- defensively (coalesce / nullif) so it can never block a signup.
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
  insert into public.profiles (id, email, name, last_name)
  values (new.id, new.email, first_nm, last_nm);
  return new;
end;
$$;
