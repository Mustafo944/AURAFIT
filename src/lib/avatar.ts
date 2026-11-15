import { createClient } from "@/lib/supabase/client";

const MAX_SOURCE_BYTES = 7 * 1024 * 1024; // yuklangan asl rasmning chegarasi; rasm yuborishdan oldin brauzerda kichraytiriladi
const AVATAR_SIDE = 512;
const REMOVABLE_OLD_PATHS = ["png", "webp", "jpeg"];

// Rasm brauzerda 512 px JPEG'ga aylantiriladi: hajmi kichik bo'ladi, iPhone HEIC
// ham JPEG'ga o'tadi va EXIF ma'lumotlari (jumladan suratga olingan joy/GPS)
// o'chib ketadi. Fayl kengaytmasi foydalanuvchi bergan nomdan emas, doim "jpg".
async function toAvatarJpeg(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  try {
    const side = Math.min(bitmap.width, bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = AVATAR_SIDE;
    canvas.height = AVATAR_SIDE;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("CANVAS_UNAVAILABLE");
    // Markazdan kvadrat qirqiladi.
    ctx.drawImage(
      bitmap,
      (bitmap.width - side) / 2,
      (bitmap.height - side) / 2,
      side,
      side,
      0,
      0,
      AVATAR_SIDE,
      AVATAR_SIDE,
    );
    return await new Promise((resolve, reject) =>
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("EXPORT_FAILED"))), "image/jpeg", 0.88),
    );
  } finally {
    bitmap.close();
  }
}

// Har bir foydalanuvchi uchun "<user_id>/avatar.jpg" yo'lida bitta fayl —
// `upsert: true` orqali eski rasm ustidan qayta yoziladi. `getPublicUrl` o'zgarmas
// URL qaytaradi, shu sababli brauzer eski rasmni ko'rsatib qolmasligi uchun URL'ga
// vaqt belgisi qo'shiladi.
export async function uploadAvatar(userId: string, file: File): Promise<{ url: string | null; error: string | null }> {
  if (!file.type.startsWith("image/")) {
    return { url: null, error: "Faqat rasm fayli yuklash mumkin." };
  }
  if (file.size > MAX_SOURCE_BYTES) {
    return { url: null, error: "Rasm hajmi 7MB dan oshmasligi kerak." };
  }

  let jpeg: Blob;
  try {
    jpeg = await toAvatarJpeg(file);
  } catch {
    return { url: null, error: "Rasmni o'qib bo'lmadi. Boshqa rasm tanlab ko'ring." };
  }

  const supabase = createClient();
  const path = `${userId}/avatar.jpg`;
  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, jpeg, { upsert: true, cacheControl: "3600", contentType: "image/jpeg" });
  if (uploadError) {
    return { url: null, error: uploadError.message };
  }
  // Oldingi versiyalarda boshqa kengaytma bilan saqlangan rasmlar ortib qolmasin.
  void supabase.storage.from("avatars").remove(REMOVABLE_OLD_PATHS.map((ext) => `${userId}/avatar.${ext}`));

  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return { url: `${data.publicUrl}?t=${Date.now()}`, error: null };
}
