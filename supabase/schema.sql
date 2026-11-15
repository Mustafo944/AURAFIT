-- AuraFit — Supabase sxemasi
-- Ishlatish: Supabase loyihangizda SQL Editor'ni oching va bu faylni to'liq bajaring.

-- ============================================================================
-- PROFILES — har bir foydalanuvchi uchun 1 ta qator, auth.users bilan 1:1
-- ============================================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  first_name text not null default '',
  last_name text not null default '',
  age integer not null default 28,
  gender text not null default 'male' check (gender in ('male', 'female')),
  weight_kg numeric not null default 78,
  height_cm numeric not null default 178,
  goal text not null default 'maintain' check (goal in ('lose', 'maintain', 'gain')),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Foydalanuvchi faqat o'z profilini ko'radi" on public.profiles;
create policy "Foydalanuvchi faqat o'z profilini ko'radi"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Foydalanuvchi faqat o'z profilini yangilaydi" on public.profiles;
create policy "Foydalanuvchi faqat o'z profilini yangilaydi"
  on public.profiles for update
  using (auth.uid() = id);

drop policy if exists "Foydalanuvchi faqat o'z profilini yaratadi" on public.profiles;
create policy "Foydalanuvchi faqat o'z profilini yaratadi"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Yangi foydalanuvchi ro'yxatdan o'tganda avtomatik standart profil yaratadi.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================================
-- MEALS — AI ovqat skaneridan qo'shilgan taomlar jurnali
-- ============================================================================
create table if not exists public.meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  meal_name text not null,
  meal_type text not null default 'snack' check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
  calories integer not null,
  protein_g integer not null,
  fat_g integer not null,
  carb_g integer not null,
  items text[] not null default '{}',
  logged_at timestamptz not null default now()
);

create index if not exists meals_user_id_logged_at_idx on public.meals (user_id, logged_at desc);

-- Eski jadvallarda ustun bo'lmasa qo'shib qo'yadi (create table if not exists
-- mavjud jadvalni o'zgartirmaydi) — Nonushta/Tushlik/Kechki ovqat/Perekus
-- kartalari bo'yicha taomlarni ajratish uchun.
alter table public.meals add column if not exists meal_type text not null default 'snack'
  check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack'));

alter table public.meals enable row level security;

drop policy if exists "Foydalanuvchi faqat o'z taomlarini ko'radi" on public.meals;
create policy "Foydalanuvchi faqat o'z taomlarini ko'radi"
  on public.meals for select
  using (auth.uid() = user_id);

drop policy if exists "Foydalanuvchi faqat o'ziga taom qo'shadi" on public.meals;
create policy "Foydalanuvchi faqat o'ziga taom qo'shadi"
  on public.meals for insert
  with check (auth.uid() = user_id);

drop policy if exists "Foydalanuvchi faqat o'z taomini o'chiradi" on public.meals;
create policy "Foydalanuvchi faqat o'z taomini o'chiradi"
  on public.meals for delete
  using (auth.uid() = user_id);

-- ============================================================================
-- BODY_WEIGHT_LOGS — vazn tarixi (dinamika grafigi va prognoz uchun)
-- ============================================================================
create table if not exists public.body_weight_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  weight_kg numeric not null,
  logged_at timestamptz not null default now()
);

create index if not exists body_weight_logs_user_id_logged_at_idx
  on public.body_weight_logs (user_id, logged_at desc);

alter table public.body_weight_logs enable row level security;

drop policy if exists "Foydalanuvchi faqat o'z vazn tarixini ko'radi" on public.body_weight_logs;
create policy "Foydalanuvchi faqat o'z vazn tarixini ko'radi"
  on public.body_weight_logs for select
  using (auth.uid() = user_id);

drop policy if exists "Foydalanuvchi faqat o'ziga vazn yozuvi qo'shadi" on public.body_weight_logs;
create policy "Foydalanuvchi faqat o'ziga vazn yozuvi qo'shadi"
  on public.body_weight_logs for insert
  with check (auth.uid() = user_id);

drop policy if exists "Foydalanuvchi faqat o'z vazn yozuvini o'chiradi" on public.body_weight_logs;
create policy "Foydalanuvchi faqat o'z vazn yozuvini o'chiradi"
  on public.body_weight_logs for delete
  using (auth.uid() = user_id);

-- Ixtiyoriy maqsad vazni — "Aqlli Tahlil" bo'limida necha haftada maqsadga
-- yetish prognozini hisoblash uchun. NULL bo'lsa faqat oddiy trend proyeksiyasi
-- ko'rsatiladi (ETA hisoblanmaydi).
alter table public.profiles add column if not exists target_weight_kg numeric;

-- ============================================================================
-- WORKOUT_SESSIONS — yakunlangan mashg'ulotlar tarixi
-- ============================================================================
create table if not exists public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  started_at timestamptz not null,
  finished_at timestamptz not null,
  -- LoggedExercise[]: [{ exerciseId, exerciseName, muscleGroup, sets: [{ weightKg, reps }] }]
  exercises jsonb not null default '[]',
  total_volume_kg numeric not null default 0,
  total_sets integer not null default 0,
  calories_burned integer not null default 0,
  recovery_advice text,
  progress_advice text,
  created_at timestamptz not null default now()
);

create index if not exists workout_sessions_user_id_finished_at_idx
  on public.workout_sessions (user_id, finished_at desc);

-- Aerobik (kardio) mashqlar jurnali — yurish yo'lagi, velotrenajyor va h.k.
-- CardioEntry[]: [{ typeId, label, durationMin, distanceKm?, caloriesBurned }].
-- Eski jadvallarda ustun bo'lmasa qo'shib qo'yadi.
alter table public.workout_sessions add column if not exists cardio jsonb not null default '[]';

alter table public.workout_sessions enable row level security;

drop policy if exists "Foydalanuvchi faqat o'z mashg'ulotlarini ko'radi" on public.workout_sessions;
create policy "Foydalanuvchi faqat o'z mashg'ulotlarini ko'radi"
  on public.workout_sessions for select
  using (auth.uid() = user_id);

drop policy if exists "Foydalanuvchi faqat o'ziga mashg'ulot qo'shadi" on public.workout_sessions;
create policy "Foydalanuvchi faqat o'ziga mashg'ulot qo'shadi"
  on public.workout_sessions for insert
  with check (auth.uid() = user_id);

drop policy if exists "Foydalanuvchi faqat o'z mashg'ulotini yangilaydi" on public.workout_sessions;
create policy "Foydalanuvchi faqat o'z mashg'ulotini yangilaydi"
  on public.workout_sessions for update
  using (auth.uid() = user_id);

-- Allow owners to delete completed sessions.
drop policy if exists "Foydalanuvchi faqat o'z mashg'ulotini o'chiradi" on public.workout_sessions;
create policy "Foydalanuvchi faqat o'z mashg'ulotini o'chiradi"
  on public.workout_sessions for delete
  using (auth.uid() = user_id);

-- Profil rasmi — Supabase Storage'dagi "avatars" bucket'iga yuklanadi,
-- profiles jadvalida esa faqat shu rasmning public URL'i saqlanadi.
alter table public.profiles add column if not exists avatar_url text;

-- Ism/familiya — profil sahifasidagi sarlavhada "ATHLETE_01" o'rniga
-- ko'rsatiladi. Eski jadvallarda ustun bo'lmasa qo'shib qo'yadi.
alter table public.profiles add column if not exists first_name text not null default '';
alter table public.profiles add column if not exists last_name text not null default '';

-- ============================================================================
-- STORAGE — foydalanuvchi profil rasmlari uchun "avatars" bucket'i.
-- Fayllar "<user_id>/avatar.<ext>" yo'lida saqlanadi — policy'lar shu birinchi
-- papka segmentini auth.uid() bilan solishtirib, faqat egasiga yozish/o'chirish
-- huquqini beradi. Bucket public — hammaga o'qish uchun ochiq (rasmlar sir emas).
-- ============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 7340032, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Profil rasmlari hammaga ko'rinadi" on storage.objects;
create policy "Profil rasmlari hammaga ko'rinadi"
  on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "Foydalanuvchi faqat o'z papkasiga rasm yuklaydi" on storage.objects;
create policy "Foydalanuvchi faqat o'z papkasiga rasm yuklaydi"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
    and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp')
  );

drop policy if exists "Foydalanuvchi faqat o'z rasmini yangilaydi" on storage.objects;
create policy "Foydalanuvchi faqat o'z rasmini yangilaydi"
  on storage.objects for update
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
    and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp')
  );

drop policy if exists "Foydalanuvchi faqat o'z rasmini o'chiradi" on storage.objects;
create policy "Foydalanuvchi faqat o'z rasmini o'chiradi"
  on storage.objects for delete
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

begin;
alter table public.profiles add column if not exists activity_level text not null default 'moderate'
  check (activity_level in ('sedentary', 'light', 'moderate', 'active'));
alter table public.profiles add column if not exists training_preferences jsonb not null
  default '{"experience":"beginner","equipment":["bodyweight","dumbbell","barbell","machine","cable","ez-bar"],"daysPerWeek":3}'::jsonb;
commit;

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
alter table public.api_rate_limits add column if not exists day date not null default ((now() at time zone 'utc')::date);
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
