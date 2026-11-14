import { EXERCISES, MUSCLE_SHORT_LABELS, type Exercise, type MuscleGroupId } from "@/lib/exercises";
import { dayKey } from "@/lib/date-key";

// Mashg'ulotni tez boshlash uchun sof mantiq (UI'siz): tayyor dasturlar,
// o'tgan mashg'ulotni takrorlash va yaqinda bajarilgan mashqlar.

export interface WorkoutProgram {
  id: string;
  name: string;
  focus: string;
  // Sarlavha yonidagi mushak ikonkasi uchun asosiy guruh.
  muscleGroup: MuscleGroupId;
  exerciseIds: string[];
}

// Klassik bo'linmalar — faqat katalogdagi mashqlardan (test buni tekshiradi).
export const WORKOUT_PROGRAMS: WorkoutProgram[] = [
  {
    id: "push",
    name: "Ko'krak & Yelka (Push)",
    focus: "Ko'krak · Yelka · Triseps",
    muscleGroup: "chest",
    exerciseIds: [
      "Barbell_Bench_Press_-_Medium_Grip",
      "Incline_Dumbbell_Press",
      "Seated_Dumbbell_Press",
      "Side_Lateral_Raise",
      "Triceps_Pushdown",
    ],
  },
  {
    id: "pull",
    name: "Qanot & Biseps (Pull)",
    focus: "Qanot · Biseps",
    muscleGroup: "back",
    exerciseIds: [
      "Wide-Grip_Lat_Pulldown",
      "Bent_Over_Barbell_Row",
      "Seated_Cable_Rows",
      "Barbell_Curl",
      "Hammer_Curls",
    ],
  },
  {
    id: "legs",
    name: "Oyoq & Press",
    focus: "Son · Dumba · Boldir",
    muscleGroup: "legs",
    exerciseIds: [
      "Barbell_Squat",
      "Romanian_Deadlift",
      "Leg_Press",
      "Lying_Leg_Curls",
      "Standing_Calf_Raises",
    ],
  },
  {
    id: "full-body",
    name: "Butun tana",
    focus: "Asosiy mushaklar bitta mashg'ulotda",
    muscleGroup: "abs",
    exerciseIds: [
      "Barbell_Squat",
      "Barbell_Bench_Press_-_Medium_Grip",
      "Wide-Grip_Lat_Pulldown",
      "Seated_Dumbbell_Press",
      "Crunches",
    ],
  },
];

const EXERCISE_BY_ID = new Map(EXERCISES.map((exercise) => [exercise.id, exercise]));

// ID'larni katalogdagi mashqlarga aylantiradi: tartib saqlanadi, takrorlar va
// katalogdan olib tashlangan (eski tarixdagi) mashqlar tushirib qoldiriladi.
export function resolveExercises(ids: string[]): Exercise[] {
  return [...new Set(ids)].flatMap((id) => {
    const exercise = EXERCISE_BY_ID.get(id);
    return exercise ? [exercise] : [];
  });
}

interface SessionLike {
  finishedAt: string;
  exercises: { exerciseId: string; muscleGroup: MuscleGroupId; sets: unknown[] }[];
}

// Takrorlash mumkin bo'lgan eng so'nggi mashg'ulot (sessiyalar eskidan yangiga tartiblangan).
export function lastRepeatableSession<T extends SessionLike>(sessions: T[]): T | null {
  for (let i = sessions.length - 1; i >= 0; i--) {
    if (resolveExercises(sessions[i].exercises.map((e) => e.exerciseId)).length > 0) return sessions[i];
  }
  return null;
}

// "Ko'krak + Triseps": podxodlar soni bo'yicha eng ko'p ishlangan ikki mushak guruhi.
export function sessionTitle(session: SessionLike): string {
  const setsByGroup = new Map<MuscleGroupId, number>();
  for (const exercise of session.exercises)
    setsByGroup.set(exercise.muscleGroup, (setsByGroup.get(exercise.muscleGroup) ?? 0) + exercise.sets.length);
  const top = [...setsByGroup.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([group]) => MUSCLE_SHORT_LABELS[group]);
  return top.length > 0 ? top.join(" + ") : "Mashg'ulot";
}

// So'nggi `sessionCount` mashg'ulotda bajarilgan mashqlar — eng yangisi birinchi, takrorsiz.
export function recentExerciseIds(sessions: SessionLike[], sessionCount = 4): string[] {
  return [
    ...new Set(
      sessions
        .slice(-sessionCount)
        .reverse()
        .flatMap((session) => session.exercises.map((exercise) => exercise.exerciseId)),
    ),
  ];
}

// "bugun" / "kecha" / "5 kun oldin" — taqvim kunlari bo'yicha (mahalliy vaqt).
export function daysAgoLabel(iso: string, now: Date): string {
  const toMidnight = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  if (dayKey(new Date(iso)) === dayKey(now)) return "bugun";
  const days = Math.round((toMidnight(now) - toMidnight(new Date(iso))) / 86_400_000);
  if (days <= 0) return "bugun";
  return days === 1 ? "kecha" : `${days} kun oldin`;
}
