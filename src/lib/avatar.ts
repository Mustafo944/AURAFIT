import { createClient } from "@/lib/supabase/client";

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

// Har bir foydalanuvchi uchun "<user_id>/avatar.<ext>" yo'lida bitta fayl —
// `upsert: true` orqali eski rasm ustidan qayta yoziladi, bucket'da eskisi
// qolib ketmaydi. `getPublicUrl` o'zgarmas URL qaytaradi, shu sababli faylni
// almashtirganda brauzer/CDN eski rasmni ko'rsatib qolmasligi uchun URL'ga
// vaqt belgisi qo'shiladi.
export async function uploadAvatar(userId: string, file: File): Promise<{ url: string | null; error: string | null }> {
  if (!file.type.startsWith("image/")) {
    return { url: null, error: "Faqat rasm fayli yuklash mumkin." };
  }
  if (file.size > MAX_AVATAR_BYTES) {
    return { url: null, error: "Rasm hajmi 5MB dan oshmasligi kerak." };
  }

  const supabase = createClient();
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${userId}/avatar.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, file, { upsert: true, cacheControl: "3600" });
  if (uploadError) {
    return { url: null, error: uploadError.message };
  }

  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return { url: `${data.publicUrl}?t=${Date.now()}`, error: null };
}
