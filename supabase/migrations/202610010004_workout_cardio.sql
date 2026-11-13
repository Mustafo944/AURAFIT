-- Existing installations may predate cardio support. No existing rows are removed.
begin;
alter table public.workout_sessions
  add column if not exists cardio jsonb not null default '[]'::jsonb;
commit;
