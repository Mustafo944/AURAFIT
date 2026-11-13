import type { Exercise } from "@/lib/exercise-metadata";
import type { SetEntry } from "@/lib/workout-log";

interface LoadSuggestion {
  weightKg: number;
  reps: number;
  // true — og'irlik oshirildi (yangi bosqich), false — o'sha vaznda takror qo'shish.
  weightIncreased: boolean;
  reason: string;
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
// eng og'ir vazndagi barcha podxodlarga tayanadi; tarix bo'lmasa tavsiya yo'q.
export function suggestNextLoad(exercise: Exercise, previousSets: SetEntry[] | null): LoadSuggestion | null {
  if (!previousSets?.length) return null;
  const sets = previousSets.filter(
    (set) => Number.isFinite(set.weightKg) && set.weightKg >= 0 && Number.isInteger(set.reps) && set.reps > 0,
  );
  if (!sets.length) return null;
  const lastBest = sets.reduce((best, set) => (set.weightKg > best.weightKg ? set : best));
  if (lastBest.weightKg === 0 && exercise.equipment !== "bodyweight") return null;
  const range = parseRepRange(exercise.reps);
  if (!range) return null;

  const targetSets = Number.parseInt(exercise.sets, 10) || 3;
  const workingSets = sets.filter((set) => set.weightKg === lastBest.weightKg);
  const weakestReps = Math.min(...workingSets.map((set) => set.reps));
  if (workingSets.length >= targetSets && weakestReps >= range.max && lastBest.weightKg > 0) {
    return {
      weightKg: lastBest.weightKg + WEIGHT_INCREMENT_KG,
      reps: range.min,
      weightIncreased: true,
      reason: "Barcha maqsad podxodlarida yuqori chegaraga yetdingiz.",
    };
  }
  return {
    weightKg: lastBest.weightKg,
    reps: Math.min(range.max, weakestReps + 1),
    weightIncreased: false,
    reason:
      weakestReps >= range.max
        ? "Shu natijani barcha maqsad podxodlarida mustahkamlang."
        : "Avval shu og'irlikda takrorlarni bosqichma-bosqich oshiring.",
  };
}
