-- Existing AURAFIT database upgrade. Run as project owner in Supabase SQL Editor.
-- All operations are idempotent; application rows are preserved.

-- 202609260001_workout_delete_policy.sql
-- Apply to existing Supabase projects. Safe to run more than once.
begin;
drop policy if exists "Foydalanuvchi faqat o'z mashg'ulotini o'chiradi" on public.workout_sessions;
create policy "Foydalanuvchi faqat o'z mashg'ulotini o'chiradi"
  on public.workout_sessions for delete
  using (auth.uid() = user_id);
commit;

-- 202609260002_training_preferences.sql
begin;
alter table public.profiles add column if not exists activity_level text not null default 'moderate'
  check (activity_level in ('sedentary', 'light', 'moderate', 'active'));
alter table public.profiles add column if not exists training_preferences jsonb not null
  default '{"experience":"beginner","equipment":["bodyweight","dumbbell","barbell","machine","cable","ez-bar"],"daysPerWeek":3}'::jsonb;
commit;

-- 202609260003_shared_api_limits.sql
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
alter table public.api_rate_limits add column if not exists day date not null default current_date;
alter table public.api_rate_limits add column if not exists day_count integer not null default 1;

create or replace function public.consume_api_limit(p_scope text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  caller uuid := auth.uid();
  max_requests integer;
  max_daily integer;
  window_now timestamptz := clock_timestamp();
  today date := (clock_timestamp() at time zone 'utc')::date;
  accepted integer;
begin
  if caller is null then return false; end if;
  select per_minute, per_day into max_requests, max_daily from (values
    ('scan-food', 4, 30),
    ('workout-recovery', 15, 30),
    ('lookup-barcode', 20, 300)
  ) as limits_by_scope(scope, per_minute, per_day) where scope = p_scope;
  if max_requests is null then return false; end if;
  insert into public.api_rate_limits as limits (user_id, scope, window_started_at, request_count, day, day_count)
    values (caller, p_scope, window_now, 1, today, 1)
  on conflict (user_id, scope) do update set
    window_started_at = case when limits.window_started_at <= window_now - interval '60 seconds' then window_now else limits.window_started_at end,
    request_count = case when limits.window_started_at <= window_now - interval '60 seconds' then 1 else limits.request_count + 1 end,
    day = today,
    day_count = case when limits.day = today then limits.day_count + 1 else 1 end
  where (limits.window_started_at <= window_now - interval '60 seconds' or limits.request_count < max_requests)
    and (limits.day <> today or limits.day_count < max_daily)
  returning request_count into accepted;
  return accepted is not null;
end;
$$;
revoke all on function public.consume_api_limit(text) from public, anon;
grant execute on function public.consume_api_limit(text) to authenticated;
commit;

-- 202610010004_workout_cardio.sql
-- Existing installations may predate cardio support. No existing rows are removed.
begin;
alter table public.workout_sessions
  add column if not exists cardio jsonb not null default '[]'::jsonb;
commit;
