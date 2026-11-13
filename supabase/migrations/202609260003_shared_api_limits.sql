begin;
create table if not exists public.api_rate_limits (
  user_id uuid not null references auth.users(id) on delete cascade,
  scope text not null,
  window_started_at timestamptz not null,
  request_count integer not null check (request_count > 0),
  primary key (user_id, scope)
);
alter table public.api_rate_limits enable row level security;
revoke all on public.api_rate_limits from anon, authenticated;

-- Atomic per-user fixed windows shared by all application instances.
-- The client cannot supply its own user ID or quota.
create or replace function public.consume_api_limit(p_scope text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  caller uuid := auth.uid();
  max_requests integer;
  window_now timestamptz := clock_timestamp();
  accepted integer;
begin
  if caller is null then return false; end if;
  max_requests := case p_scope
    when 'scan-food' then 4
    when 'profile-insight' then 15
    when 'workout-recovery' then 15
    when 'lookup-barcode' then 20
    else 0 end;
  if max_requests = 0 then return false; end if;
  insert into public.api_rate_limits as limits (user_id, scope, window_started_at, request_count)
    values (caller, p_scope, window_now, 1)
  on conflict (user_id, scope) do update set
    window_started_at = case when limits.window_started_at <= window_now - interval '60 seconds' then window_now else limits.window_started_at end,
    request_count = case when limits.window_started_at <= window_now - interval '60 seconds' then 1 else limits.request_count + 1 end
  where limits.window_started_at <= window_now - interval '60 seconds' or limits.request_count < max_requests
  returning request_count into accepted;
  return accepted is not null;
end;
$$;
revoke all on function public.consume_api_limit(text) from public, anon;
grant execute on function public.consume_api_limit(text) to authenticated;
commit;
