// Taom skaneri uchun ozuqaviy hisob-kitob (UI va tarmoqsiz sof mantiq).
//
// Aniqlik uchun ish bo'linadi: AI rasmdan faqat KOMPONENTLARNI aniqlaydi va
// har birining og'irligini (gramm) baholaydi; 100 g dagi kaloriya/BJU esa shu yerdagi
// ma'lumotnomadan olinadi (u yerda yo'q taomda — AI bahosi, tekshiruvdan keyin).
// Yig'indi ham AI'da emas, kodda hisoblanadi — arifmetika xatosi bo'lmaydi.

export interface Per100g {
  kcal: number;
  proteinG: number;
  fatG: number;
  carbG: number;
}

export interface ScanComponent {
  name: string;
  // Ma'lumotnoma identifikatori; null — qiymatlar AI bahosi.
  ref: string | null;
  grams: number;
  per100g: Per100g;
}

export interface Totals {
  kcal: number;
  proteinG: number;
  fatG: number;
  carbG: number;
}

export type ScanConfidence = "high" | "medium" | "low";

export interface ScanResponse {
  mealName: string;
  items: string[];
  components: ScanComponent[];
  totalCalories: number;
  proteinG: number;
  fatG: number;
  carbG: number;
  note: string;
  confidence: ScanConfidence;
}

// [id, nomi, kcal, oqsil, yog', uglevod] — 100 g tayyor (pishirilgan) mahsulot uchun
// o'rtacha qiymatlar (USDA/FAO jadvallari va mahalliy taomlarning odatiy retseptlari
// asosida). Mahalliy taomlar retseptga qarab ±15-25% farq qilishi mumkin.
const TABLE: ReadonlyArray<readonly [string, string, number, number, number, number]> = [
  // Milliy taomlar
  ["plov", "Osh (palov)", 195, 6, 9, 22.5],
  ["manti", "Manti", 200, 9, 9.5, 21],
  ["chuchvara", "Chuchvara (qaynatilgan)", 210, 9.5, 9, 23],
  ["somsa", "Somsa (go'shtli)", 290, 10, 18, 22],
  ["lagman", "Lag'mon", 150, 6, 5, 20],
  ["shashlik", "Shashlik (mol/qo'y go'shti)", 230, 21, 16, 0],
  ["lyulya", "Lyulya-kabob", 240, 16, 18, 2],
  ["kotlet", "Kotlet (qovurilgan)", 230, 14, 15, 10],
  ["shurpa", "Sho'rva (shurpa)", 65, 4, 3.5, 4.5],
  ["mastava", "Mastava", 85, 4, 3, 10],
  ["dimlama", "Dimlama (go'sht va sabzavot)", 120, 7, 7, 7],
  ["qozon_kabob", "Qozon kabob (kartoshkali go'sht)", 190, 10, 12, 10],
  // Kartoshka
  ["kartoshka_qaynatilgan", "Kartoshka (qaynatilgan)", 87, 1.9, 0.1, 20],
  ["kartoshka_qovurilgan", "Kartoshka (yog'da qovurilgan)", 190, 3, 9, 24],
  ["kartoshka_fri", "Fri kartoshkasi", 312, 3.4, 15, 41],
  ["kartoshka_pyure", "Kartoshka pyuresi (sariyog'li)", 105, 2, 3.5, 16],
  // Non va yormalar
  ["non", "Non (tandir/oq non)", 265, 9, 3.2, 49],
  ["guruch", "Guruch (qaynatilgan)", 130, 2.7, 0.3, 28],
  ["grechka", "Grechka (qaynatilgan)", 110, 4.2, 1.1, 21],
  ["makaron", "Makaron (qaynatilgan)", 158, 5.8, 0.9, 31],
  ["suli", "Suli bo'tqasi (suvda)", 71, 2.5, 1.5, 12],
  // Go'sht, baliq, tuxum
  ["tovuq_kokrak", "Tovuq ko'kragi (pishirilgan)", 165, 31, 3.6, 0],
  ["tovuq_qovurilgan", "Tovuq go'shti (qovurilgan, terili)", 250, 26, 15, 4],
  ["mol", "Mol go'shti (pishirilgan)", 250, 26, 16, 0],
  ["qoy", "Qo'y go'shti (pishirilgan)", 290, 25, 21, 0],
  ["kolbasa", "Kolbasa/sosiska", 250, 12, 22, 1.5],
  ["baliq_pishirilgan", "Baliq (bug'da/panada pishirilgan)", 140, 24, 5, 0],
  ["baliq_qovurilgan", "Baliq (qovurilgan)", 210, 19, 13, 5],
  ["tuxum_qaynatilgan", "Tuxum (qaynatilgan)", 155, 13, 11, 1.1],
  ["tuxum_qovurilgan", "Tuxum (yog'da qovurilgan)", 195, 13.6, 15, 0.8],
  // Sut mahsulotlari va yog'lar
  ["sut", "Sut", 52, 2.9, 2.5, 4.8],
  ["qatiq", "Qatiq/yogurt (shirinlashtirilmagan)", 60, 3.2, 3.3, 4.7],
  ["tvorog", "Tvorog", 121, 17, 5, 1.8],
  ["pishloq", "Pishloq", 350, 25, 27, 1],
  ["smetana", "Smetana", 205, 2.8, 20, 3.2],
  ["saryog", "Sariyog'", 717, 0.9, 79.5, 0.1],
  ["osimlik_yogi", "O'simlik yog'i", 884, 0, 100, 0],
  ["mayonez", "Mayonez", 690, 1, 75, 3],
  // Meva va sabzavotlar
  ["banan", "Banan", 89, 1.1, 0.3, 23],
  ["olma", "Olma", 52, 0.3, 0.2, 14],
  ["apelsin", "Apelsin/mandarin", 47, 0.9, 0.1, 12],
  ["uzum", "Uzum", 69, 0.7, 0.2, 18],
  ["tarvuz", "Tarvuz", 30, 0.6, 0.2, 7.6],
  ["qovun", "Qovun", 34, 0.8, 0.2, 8.2],
  ["shaftoli", "Shaftoli/o'rik", 40, 0.9, 0.3, 10],
  ["quruq_meva", "Quritilgan meva (mayiz, o'rik)", 275, 3, 0.5, 65],
  ["pomidor", "Pomidor", 18, 0.9, 0.2, 3.9],
  ["bodring", "Bodring", 15, 0.7, 0.1, 3.6],
  ["sabzi", "Sabzi", 41, 0.9, 0.2, 9.6],
  ["karam", "Karam", 25, 1.3, 0.1, 5.8],
  ["piyoz", "Piyoz", 40, 1.1, 0.1, 9.3],
  ["salat_yogsiz", "Sabzavot salati (yog'siz, achchiq-chuchuk)", 22, 1, 0.2, 4.5],
  ["salat_yogli", "Sabzavot salati (o'simlik yog'i bilan)", 75, 1, 6, 4.5],
  ["olivye", "Olivye/mayonezli salat", 190, 5, 15, 8],
  // Shirinlik, gazak, ichimliklar
  ["shokolad", "Shokolad", 540, 6, 31, 58],
  ["pechenye", "Pechenye/biskvit", 455, 6, 18, 68],
  ["tort", "Tort/pirojniy", 380, 4, 20, 46],
  ["muzqaymoq", "Muzqaymoq", 207, 3.5, 11, 24],
  ["asal", "Asal", 304, 0.3, 0, 82],
  ["shakar", "Shakar", 387, 0, 0, 99.8],
  ["chips", "Chips", 545, 7, 35, 53],
  ["yongoq", "Yong'oq/bodom (aralash)", 620, 17, 54, 18],
  ["pitsa", "Pitsa", 266, 11, 10, 33],
  ["burger", "Burger", 300, 15, 14, 30],
  ["gazli_ichimlik", "Kola/gazlangan ichimlik", 42, 0, 0, 10.6],
  ["sharbat", "Meva sharbati", 45, 0.5, 0.1, 10.5],
  ["choy_shirin", "Choy (shakarli)", 20, 0, 0, 5],
  ["choy", "Choy (shakarsiz)", 1, 0, 0, 0.2],
];

export interface FoodReference {
  id: string;
  name: string;
  per100g: Per100g;
}

export const FOOD_REFERENCE: FoodReference[] = TABLE.map(([id, name, kcal, proteinG, fatG, carbG]) => ({
  id,
  name,
  per100g: { kcal, proteinG, fatG, carbG },
}));

const REFERENCE_BY_ID = new Map(FOOD_REFERENCE.map((entry) => [entry.id, entry]));

// AI promptiga qo'yiladigan ixcham ro'yxat: "id — nomi".
export function referencePromptList(): string {
  return FOOD_REFERENCE.map((entry) => `${entry.id} — ${entry.name}`).join("\n");
}

const round1 = (value: number) => Math.round(value * 10) / 10;
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const toNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

// Bitta komponentning ozuqaviy qiymati (grammga mutanosib).
export function componentTotals(component: Pick<ScanComponent, "grams" | "per100g">): Totals {
  const factor = Math.max(0, component.grams) / 100;
  return {
    kcal: component.per100g.kcal * factor,
    proteinG: component.per100g.proteinG * factor,
    fatG: component.per100g.fatG * factor,
    carbG: component.per100g.carbG * factor,
  };
}

// Yig'indi: avval aniq qiymatlar qo'shiladi, faqat oxirida butun songa yaxlitlanadi
// (har komponentni alohida yaxlitlash xatoni to'plardi).
export function sumComponents(components: ScanComponent[]): Totals {
  const sum = components.reduce(
    (acc, component) => {
      const t = componentTotals(component);
      return {
        kcal: acc.kcal + t.kcal,
        proteinG: acc.proteinG + t.proteinG,
        fatG: acc.fatG + t.fatG,
        carbG: acc.carbG + t.carbG,
      };
    },
    { kcal: 0, proteinG: 0, fatG: 0, carbG: 0 },
  );
  return {
    kcal: Math.round(sum.kcal),
    proteinG: Math.round(sum.proteinG),
    fatG: Math.round(sum.fatG),
    carbG: Math.round(sum.carbG),
  };
}

// AI bergan 100 g qiymatlarini tekshiradi: chegaralar va ichki muvofiqlik
// (kaloriya ≈ 4·oqsil + 4·uglevod + 9·yog'). Mos kelmasa, makrolardan hisoblanadi.
function sanitizeEstimate(raw: Record<string, unknown>): Per100g | null {
  const kcal = toNumber(raw.kcalPer100g);
  const proteinG = toNumber(raw.proteinPer100g);
  const fatG = toNumber(raw.fatPer100g);
  const carbG = toNumber(raw.carbPer100g);
  if (kcal === null || proteinG === null || fatG === null || carbG === null) return null;
  if (kcal < 0 || kcal > 900) return null;
  for (const macro of [proteinG, fatG, carbG]) if (macro < 0 || macro > 100) return null;
  if (proteinG + fatG + carbG > 105) return null;
  const implied = 4 * proteinG + 4 * carbG + 9 * fatG;
  const consistent = Math.abs(kcal - implied) <= Math.max(25, implied * 0.25);
  return { kcal: Math.round(consistent ? kcal : implied), proteinG, fatG, carbG };
}

// AI komponentini ichki ko'rinishga o'tkazadi. Ma'lumotnomadagi taomda 100 g qiymati
// DOIM jadvaldan olinadi (AI qiymati e'tiborga olinmaydi); aks holda AI bahosi
// tekshiruvdan o'tishi shart. Yaroqsiz komponent null qaytaradi.
export function resolveComponent(raw: unknown): ScanComponent | null {
  if (!isRecord(raw)) return null;
  const name = typeof raw.name === "string" ? raw.name.trim().slice(0, 80) : "";
  const grams = toNumber(raw.grams);
  if (!name || grams === null || grams < 1 || grams > 2000) return null;
  const reference = typeof raw.ref === "string" ? REFERENCE_BY_ID.get(raw.ref) : undefined;
  if (reference) return { name, ref: reference.id, grams: round1(grams), per100g: reference.per100g };
  const estimate = sanitizeEstimate(raw);
  return estimate ? { name, ref: null, grams: round1(grams), per100g: estimate } : null;
}

const CONFIDENCE: ScanConfidence[] = ["high", "medium", "low"];

// AI javobini mijozga qaytariladigan tayyor natijaga aylantiradi (yig'indilar kodda
// hisoblanadi). Yaroqli komponent bo'lmasa null.
export function parseScanResponse(value: unknown): ScanResponse | null {
  if (!isRecord(value)) return null;
  const mealName = typeof value.mealName === "string" ? value.mealName.trim().slice(0, 120) : "";
  if (!mealName || !Array.isArray(value.components)) return null;
  const components = value.components.slice(0, 12).flatMap((item) => {
    const component = resolveComponent(item);
    return component ? [component] : [];
  });
  if (components.length === 0) return null;
  const totals = sumComponents(components);
  const confidence = CONFIDENCE.find((level) => level === value.confidence) ?? "medium";
  return {
    mealName,
    items: components.map((component) => component.name),
    components,
    totalCalories: totals.kcal,
    proteinG: totals.proteinG,
    fatG: totals.fatG,
    carbG: totals.carbG,
    note: typeof value.note === "string" ? value.note.trim().slice(0, 300) : "",
    confidence,
  };
}
