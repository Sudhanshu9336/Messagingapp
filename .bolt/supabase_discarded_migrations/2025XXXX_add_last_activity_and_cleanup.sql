-- 1) Add the column and backfill
alter table public.profiles
  add column if not exists last_activity timestamptz;

update public.profiles
set last_activity = coalesce(updated_at, created_at, now())
where last_activity is null;

alter table public.profiles
  alter column last_activity set default now();

-- 2) Index for fast cleanup
create index if not exists idx_profiles_last_activity
  on public.profiles (last_activity);

-- 3) Helper to bump activity (call from app on login/foreground)
create or replace function public.touch_last_activity(p_profile_id uuid)
returns void
language sql
security definer
as $$
  update public.profiles
  set last_activity = now(),
      updated_at = now()
  where id = p_profile_id;
$$;

revoke all on function public.touch_last_activity(uuid) from anon, authenticated;
grant execute on function public.touch_last_activity(uuid) to authenticated;

-- 4) Cleanup function (server-only)
create or replace function public.cleanup_inactive_profiles(p_cutoff interval default interval '60 days')
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted bigint;
begin
  -- delete profile rows older than now() - p_cutoff
  delete from public.profiles p
  where p.last_activity < now() - p_cutoff
  returning 1 into v_deleted;

  -- NOTE: if you also want to remove auth users, do it here via auth.users using service role in an Edge Function.
  return coalesce(v_deleted, 0);
end;
$$;

-- lock down who can run cleanup
revoke all on function public.cleanup_inactive_profiles(interval) from anon, authenticated;
-- do NOT grant to client roles; only the service role/Edge function should call it.
