// Aerobik (kardio) mashqlar uchun kaloriya va suv hisob-kitobi.
//
// Barcha hisoblar FORMULAGA tayanadi (AI emas) — natija bir zumda, tarmoqsiz
// chiqadi. Umumiy usul MET (Metabolic Equivalent of Task):
//   kaloriya (kcal) = MET x tana vazni (kg) x davomiylik (soat).
// Yugurish yo'lagi uchun esa aniqroq ACSM metabolik tenglamalari ishlatiladi —
// tezlik va qiyalik (%) hisobga olinadi.

export type CardioTypeId = "treadmill" | "bike" | "rowing" | "elliptical" | "jump_rope";

// "treadmill" — tezlik + qiyalik + vaqt kiritiladi (ACSM tenglamasi).
// "simple" — faqat vaqt kiritiladi (o'rtacha MET).
export type CardioMode = "treadmill" | "simple";

export interface CardioTypeInfo {
  id: CardioTypeId;
  label: string;
  mode: CardioMode;
  defaultMet: number;
}

export const CARDIO_TYPES: CardioTypeInfo[] = [
  { id: "treadmill", label: "Yugurish yo'lagi", mode: "treadmill", defaultMet: 7.0 },
  { id: "bike", label: "Velotrenajyor", mode: "simple", defaultMet: 7.0 },
  { id: "rowing", label: "Eshkak (Rowing)", mode: "simple", defaultMet: 7.0 },
  { id: "elliptical", label: "Elliptik", mode: "simple", defaultMet: 5.0 },
  { id: "jump_rope", label: "Arg'amchi", mode: "simple", defaultMet: 12.0 },
];

export interface CardioEntry {
  typeId: CardioTypeId;
  label: string;
  durationMin: number;
  speedKmh?: number;
  inclinePct?: number;
  caloriesBurned: number;
}

export interface CardioInput {
  durationMin: number;
  speedKmh?: number;
  inclinePct?: number;
}

export function cardioTypeInfo(id: CardioTypeId): CardioTypeInfo {
  return CARDIO_TYPES.find((t) => t.id === id) ?? CARDIO_TYPES[0];
}

// ACSM metabolik tenglamalari (yurish va yugurish uchun alohida) — natija VO2
// (ml/kg/min), undan MET = VO2 / 3.5. Tezlik ~7 km/soatdan oshsa yugurish
// tenglamasi ishlatiladi. Qiyalik (grade) MET'ni sezilarli oshiradi.
function treadmillMet(speedKmh: number, inclinePct: number): number {
  const mPerMin = (speedKmh * 1000) / 60;
  const grade = Math.max(0, inclinePct) / 100;
  const vo2 =
    speedKmh >= 7
      ? 0.2 * mPerMin + 0.9 * mPerMin * grade + 3.5
      : 0.1 * mPerMin + 1.8 * mPerMin * grade + 3.5;
  return vo2 / 3.5;
}

// Tanlangan tur va kiritilgan ko'rsatkichlar asosida yoqilgan kaloriyani vaznga
// tayanib hisoblaydi. Yugurish yo'lagida tezlik berilsa ACSM tenglamasi, aks holda
// turning o'rtacha MET'i ishlatiladi.
export function computeCardioCalories(typeId: CardioTypeId, input: CardioInput, weightKg: number): number {
  const hours = input.durationMin / 60;
  if (hours <= 0 || weightKg <= 0) return 0;

  const info = cardioTypeInfo(typeId);
  let met = info.defaultMet;
  if (info.mode === "treadmill" && input.speedKmh && input.speedKmh > 0) {
    met = treadmillMet(input.speedKmh, input.inclinePct ?? 0);
  }
  return Math.round(met * weightKg * hours);
}

export interface WaterRecommendation {
  baseMl: number; // kunlik asosiy ehtiyoj (vaznga bog'liq)
  workoutMl: number; // mashg'ulot davomida ter bilan yo'qotilgan (o'rnini to'ldirish)
  totalMl: number;
}

// Suv ehtiyoji: kunlik asos ~35 ml/kg (keng qabul qilingan tavsiya), ustiga
// mashg'ulot davomida terlash orqali yo'qotilgan suyuqlik ~500 ml/soat qo'shiladi.
export function recommendedWater(weightKg: number, workoutMinutes: number): WaterRecommendation {
  const baseMl = Math.round(weightKg * 35);
  const workoutMl = Math.round((Math.max(0, workoutMinutes) / 60) * 500);
  return { baseMl, workoutMl, totalMl: baseMl + workoutMl };
}

export function formatLiters(ml: number): string {
  return (ml / 1000).toLocaleString("uz-UZ", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export interface CardioSessionInsight {
  totalMinutes: number;
  totalKcal: number;
  tips: string[];
}

// Shu mashg'ulotdagi barcha kardio yozuvlari qo'shilgach ko'rsatiladigan
// tezkor tahlil — AI emas, ilmiy manbalarga (ACSM, JSST/WHO) asoslangan
// qat'iy qoidalar:
//   - ACSM: yurak-qon tomir tizimiga sezilarli foyda uchun bitta mashqda
//     kamida 20-30 daqiqa tavsiya etiladi.
//   - WHO 2020 jismoniy faollik bo'yicha ko'rsatmalari: haftasiga kamida
//     150 daqiqa o'rtacha intensivlik (yoki 75 daqiqa yuqori intensivlik,
//     vaqt jihatidan 2 baravar hisoblanadi) kardio tavsiya etiladi.
//   - ACSM suyuqlik tavsiyasi: mashq davomida har 15-20 daqiqada ~150-250 ml.
export function cardioSessionInsight(entries: CardioEntry[]): CardioSessionInsight {
  const totalMinutes = entries.reduce((sum, e) => sum + e.durationMin, 0);
  const totalKcal = entries.reduce((sum, e) => sum + e.caloriesBurned, 0);
  const hasVigorous = entries.some((e) => (e.speedKmh ?? 0) >= 7 || e.typeId === "jump_rope");

  const tips: string[] = [];

  if (totalMinutes < 20) {
    tips.push(
      "ACSM tavsiyasiga ko'ra yurak-qon tomir tizimiga sezilarli foyda uchun bitta mashg'ulotda kamida 20-30 daqiqa kardio maqsad qiling."
    );
  } else if (totalMinutes <= 60) {
    const weeklyPct = Math.round((totalMinutes / 150) * 100);
    tips.push(
      `Yaxshi natija — bu mashg'ulot JSST (WHO)ning haftalik 150 daqiqalik o'rtacha intensivlik maqsadining taxminan ${weeklyPct}%ini qopladi.`
    );
  } else {
    tips.push(
      "Uzoq davomiyli kardio (60+ daqiqa) chidamlilikni oshiradi, lekin haddan tashqari yuklama shikastlanish xavfini oshiradi — bunday sessiyalarni haftasiga 1-2 martadan oshirmang va yaxshi tiklaning."
    );
  }

  if (hasVigorous) {
    tips.push(
      "Yuqori intensivlik (7 km/soatdan tez yugurish yoki arg'amchi) JSST bo'yicha vaqt jihatidan 2 baravar hisoblanadi — haftasiga 75 daqiqa shu turdagi mashqlar 150 daqiqalik o'rtacha maqsadga teng keladi."
    );
  }

  tips.push(
    "Terlash orqali yo'qotilgan suyuqlikni tiklash uchun har 15-20 daqiqa kardioda taxminan 150-250 ml suv iching (ACSM suyuqlik tavsiyasi)."
  );

  return { totalMinutes, totalKcal, tips };
}
