// Login/tasdiqlash havolasidagi `next` parametri faqat ilovaning ichki yo'liga
// olib borishi kerak. Aks holda `origin + next` ("...app" + ".evil.com" yoki
// "@evil.com") foydalanuvchini begona saytga yuborishi (open redirect) mumkin.
export function safeNextPath(next: string | null | undefined): string {
  if (!next) return "/";
  // Faqat "/yo'l" ko'rinishidagi nisbiy yo'llar; "//host" va "\" brauzerda host deb o'qiladi.
  if (!next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return "/";
  // Boshqaruv belgilari (CR/LF/tab) yo'naltirish sarlavhasini buzishi mumkin.
  for (let i = 0; i < next.length; i++) if (next.charCodeAt(i) < 0x20 || next.charCodeAt(i) === 0x7f) return "/";
  try {
    if (new URL(next, "http://aurafit.invalid").origin !== "http://aurafit.invalid") return "/";
  } catch {
    return "/";
  }
  return next;
}
