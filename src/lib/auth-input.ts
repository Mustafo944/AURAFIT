// Kirish/ro'yxatdan o'tish formalaridan kelgan qiymatlarni tekshirish va tozalash
// (UI va tarmoqsiz sof funksiyalar — test qilinadi).

// Oddiy, ataylab yumshoq tekshiruv: haqiqiy tekshiruv — emailga kod yuborilishi.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function normalizeEmail(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function isValidEmail(email: string): boolean {
  return email.length <= 254 && EMAIL_PATTERN.test(email);
}

// Emailga kelgan tasdiqlash kodi: faqat raqamlar, 6-10 xona (Supabase sozlamasiga qarab).
// Bo'sh joy va chiziqchalar (nusxalashda qo'shilib qolishi mumkin) olib tashlanadi.
export function parseVerificationCode(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const digits = value.replace(/[\s-]/g, "");
  return /^\d{6,10}$/.test(digits) ? digits : null;
}
