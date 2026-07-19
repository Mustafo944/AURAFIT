import type { Exercise } from "@/lib/exercises";
import type { SetEntry } from "@/lib/workout-log";

export interface LoadSuggestion {
  weightKg: number;
  reps: number;
  // true — og'irlik oshirildi (yangi bosqich), false — o'sha vaznda takror qo'shish.
  weightIncreased: boolean;
}

// Zallardagi eng kichik disk juftligi 1.25kg x 2 — shtanga uchun minimal qadam.
const WEIGHT_INCREMENT_KG = 2.5;

// "8-12" -> {min:8, max:12}; "20 (10/tomon)" -> {min:20, max:20}.
// Vaqtga asoslangan qiymatlar ("30-45 son.") takror emas — null qaytadi.
function parseRepRange(reps: string): { min: number; max: number } | null {
  if (reps.includes("son")) return null;
  const match = reps.match(/^(\d+)(?:-(\d+))?/);
  if (!match) return null;
  const min = Number(match[1]);
  const max = match[2] ? Number(match[2]) : min;
  return { min, max };
}

// "Double progression" modeli: avval takrorlar maqsad oralig'ining yuqori
// chegarasigacha oshiriladi, unga yetgach og'irlik bir qadam ko'tarilib,
// takrorlar pastki chegaradan qayta boshlanadi. Tavsiya oxirgi mashg'ulotdagi
// eng og'ir podxodga tayanadi; tarix bo'lmasa tavsiya ham yo'q.
export function suggestNextLoad(exercise: Exercise, lastBest: SetEntry | null): LoadSuggestion | null {
  if (!lastBest || lastBest.weightKg <= 0 || lastBest.reps <= 0) return null;
  const range = parseRepRange(exercise.reps);
  if (!range) return null;

  if (lastBest.reps >= range.max) {
    return { weightKg: lastBest.weightKg + WEIGHT_INCREMENT_KG, reps: range.min, weightIncreased: true };
  }
  return { weightKg: lastBest.weightKg, reps: lastBest.reps + 1, weightIncreased: false };
}
