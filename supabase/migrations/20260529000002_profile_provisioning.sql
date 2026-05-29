-- Profile provisioning + column lockdown.
-- A signup trigger auto-creates a blank profile (id, email) for every new
-- auth user. start_date / cohort are left null and are admin/cohort-provisioned
-- later. Members may update only their own `name`; role/start_date/cohort change
-- only via the service role or an admin path.
--
-- Pattern per Supabase "managing user data" docs: SECURITY DEFINER with an empty
-- search_path and fully-qualified names. NOTE: if this trigger errors it blocks
-- signups — exercised by the RLS harness (a new auth user must get a profile).

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Column-level lockdown: members can update `name` only. The row-level update
-- policy (auth.uid() = id) still applies on top of this. role, start_date, and
-- cohort are not member-updatable.
revoke update on public.profiles from authenticated;
grant update (name) on public.profiles to authenticated;
