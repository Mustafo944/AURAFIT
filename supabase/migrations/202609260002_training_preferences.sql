begin;
alter table public.profiles add column if not exists activity_level text not null default 'moderate'
  check (activity_level in ('sedentary', 'light', 'moderate', 'active'));
alter table public.profiles add column if not exists training_preferences jsonb not null
  default '{"experience":"beginner","equipment":["bodyweight","dumbbell","barbell","machine","cable","ez-bar"],"daysPerWeek":3}'::jsonb;
commit;
