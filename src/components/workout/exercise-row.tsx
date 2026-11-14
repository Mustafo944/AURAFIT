"use client";

import { ExerciseImage } from "@/components/workout/exercise-image";
import { ExerciseIcon } from "@/components/workout/exercise-icon";
import { EQUIPMENT_LABELS, type Exercise } from "@/lib/exercise-metadata";

// Mashq tanlash ro'yxatidagi ixcham qator: kichik rasm (bosilsa texnika), nom va
// jihoz, o'ngda sevimli va katta "qo'shish/✓" tugmasi. Qatorning matn qismini
// bosish ham tanlaydi — barmoq bilan zalda aniq nishonga olish shart emas.
export function ExerciseRow({
  exercise,
  selected,
  locked,
  favorite,
  favoriteDisabled,
  onToggle,
  onFavorite,
  onDetails,
}: {
  exercise: Exercise;
  selected: boolean;
  locked: boolean;
  favorite: boolean;
  favoriteDisabled: boolean;
  onToggle: () => void;
  onFavorite: () => void;
  onDetails: () => void;
}) {
  return (
    <li
      className={`flex items-center gap-2 rounded-xl border p-2 transition-colors ${
        selected ? "border-primary-fixed-dim/60 bg-primary-fixed-dim/[0.08]" : "border-white/10 bg-white/[0.03]"
      }`}
    >
      <button
        type="button"
        onClick={onDetails}
        aria-label={`${exercise.name}: texnikani ko'rish`}
        className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-[#f0f1eb]"
      >
        <ExerciseImage exercise={exercise} sizes="56px" />
      </button>
      <button
        type="button"
        onClick={onToggle}
        disabled={locked}
        aria-label={`${exercise.name}: ${selected ? "tanlovdan olish" : "rejaga qo'shish"}`}
        aria-pressed={selected}
        className="min-w-0 flex-1 py-1 text-left disabled:opacity-70"
      >
        <span className="line-clamp-2 text-[14px] font-semibold leading-snug text-white">{exercise.name}</span>
        <span className="mt-0.5 block truncate font-label-mono text-[10px] uppercase text-on-surface-variant">
          {EQUIPMENT_LABELS[exercise.equipment]} · {exercise.sets} × {exercise.reps}
        </span>
      </button>
      <button
        type="button"
        onClick={onFavorite}
        disabled={favoriteDisabled}
        aria-label={`${exercise.name}: sevimli`}
        aria-pressed={favorite}
        className={`flex h-10 w-9 shrink-0 items-center justify-center rounded-lg disabled:opacity-40 ${
          favorite ? "text-primary-fixed-dim" : "text-on-surface-variant hover:text-primary"
        }`}
      >
        <ExerciseIcon name="heart" width="18" height="18" fill={favorite ? "currentColor" : "none"} />
      </button>
      {/* Katta tugma matn qismining nusxasi: barmoq uchun qulay nishon, shu sabab
          ekran o'qish vositalariga va Tab tartibiga kirmaydi. */}
      <button
        type="button"
        onClick={onToggle}
        disabled={locked}
        aria-hidden="true"
        tabIndex={-1}
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors active:scale-95 disabled:opacity-50 ${
          selected
            ? "bg-primary-container text-on-primary-container"
            : "border border-primary-container/50 text-primary-fixed-dim hover:bg-primary-container/15"
        }`}
      >
        <ExerciseIcon name={selected ? "check" : "plus"} width="22" height="22" />
      </button>
    </li>
  );
}
