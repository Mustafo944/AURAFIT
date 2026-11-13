-- Apply to existing Supabase projects. Safe to run more than once.
begin;
drop policy if exists "Foydalanuvchi faqat o'z mashg'ulotini o'chiradi" on public.workout_sessions;
create policy "Foydalanuvchi faqat o'z mashg'ulotini o'chiradi"
  on public.workout_sessions for delete
  using (auth.uid() = user_id);
commit;
