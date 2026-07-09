-- AuraFit — Supabase sxemasi
-- Ishlatish: Supabase loyihangizda SQL Editor'ni oching va bu faylni to'liq bajaring.

-- ============================================================================
-- PROFILES — har bir foydalanuvchi uchun 1 ta qator, auth.users bilan 1:1
-- ============================================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  age integer not null default 28,
  gender text not null default 'male' check (gender in ('male', 'female')),
  weight_kg numeric not null default 78,
  height_cm numeric not null default 178,
  goal text not null default 'maintain' check (goal in ('lose', 'maintain', 'gain')),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Foydalanuvchi faqat o'z profilini ko'radi"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Foydalanuvchi faqat o'z profilini yangilaydi"
  on public.profiles for update
  using (auth.uid() = id);

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
  calories integer not null,
  protein_g integer not null,
  fat_g integer not null,
  carb_g integer not null,
  items text[] not null default '{}',
  logged_at timestamptz not null default now()
);

create index if not exists meals_user_id_logged_at_idx on public.meals (user_id, logged_at desc);

alter table public.meals enable row level security;

create policy "Foydalanuvchi faqat o'z taomlarini ko'radi"
  on public.meals for select
  using (auth.uid() = user_id);

create policy "Foydalanuvchi faqat o'ziga taom qo'shadi"
  on public.meals for insert
  with check (auth.uid() = user_id);

create policy "Foydalanuvchi faqat o'z taomini o'chiradi"
  on public.meals for delete
  using (auth.uid() = user_id);

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

alter table public.workout_sessions enable row level security;

create policy "Foydalanuvchi faqat o'z mashg'ulotlarini ko'radi"
  on public.workout_sessions for select
  using (auth.uid() = user_id);

create policy "Foydalanuvchi faqat o'ziga mashg'ulot qo'shadi"
  on public.workout_sessions for insert
  with check (auth.uid() = user_id);

create policy "Foydalanuvchi faqat o'z mashg'ulotini yangilaydi"
  on public.workout_sessions for update
  using (auth.uid() = user_id);
