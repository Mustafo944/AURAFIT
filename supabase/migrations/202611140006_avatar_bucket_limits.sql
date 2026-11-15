begin;
-- Avatar bucket'ida server tomonidan cheklov: faqat JPEG/PNG/WebP va <= 7 MB.
-- (Avval fayl turi va hajmi faqat brauzerda tekshirilardi.)
update storage.buckets
  set file_size_limit = 7340032,
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
  where id = 'avatars';

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
commit;
