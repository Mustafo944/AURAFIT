begin;
-- Foydalanuvchi o'z parametrlarini (jins, yosh, bo'y, vazn, maqsad) kiritganmi.
-- Yangi hisoblar false bilan boshlanadi va tanishuv anketasini ko'radi;
-- mavjud foydalanuvchilar allaqachon profil bilan ishlagani uchun true qilinadi.
alter table public.profiles add column if not exists onboarded boolean;
update public.profiles set onboarded = true where onboarded is null;
alter table public.profiles alter column onboarded set default false;
alter table public.profiles alter column onboarded set not null;
commit;
