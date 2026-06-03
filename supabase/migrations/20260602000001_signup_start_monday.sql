-- New signups begin on the upcoming Monday, so each wave of men starts together
-- on a Monday. "Upcoming Monday" = the Monday on-or-after the signup date (a man
-- who signs up on a Monday starts that day; otherwise the next Monday).
-- Admin can still override any man's start_date afterward.

create or replace function public.next_monday(d date)
returns date
language sql
immutable
as $$
  -- isodow: Mon=1 .. Sun=7. Days to add to reach the next Monday (0 if already Monday).
  select d + ((8 - extract(isodow from d)::int) % 7);
$$;

-- Replace the signup trigger function so the profile is created WITH a start_date.
-- SECURITY DEFINER + empty search_path, fully-qualified names (per the original).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, start_date)
  values (new.id, new.email, public.next_monday((now() at time zone 'utc')::date));
  return new;
end;
$$;
