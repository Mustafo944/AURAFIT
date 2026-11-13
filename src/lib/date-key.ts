// Mahalliy (telefon) vaqti bo'yicha kun kaliti: "2026-10-19".
export function dayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export const UZ_MONTHS = [
  "Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun",
  "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr",
];

// "2026-10-19" -> "19-oktabr, 2026"
export function formatDayKey(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  return `${d}-${UZ_MONTHS[m - 1].toLowerCase()}, ${y}`;
}
