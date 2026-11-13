"use client";
import { ExerciseImage } from "@/components/workout/exercise-image";
import { ExerciseIcon } from "@/components/workout/exercise-icon";
import { EQUIPMENT_LABELS, LEVEL_LABELS, MUSCLE_GROUPS, type Exercise } from "@/lib/exercise-metadata";
import styles from "./exercise-library.module.css";

export function ExerciseCard({
  exercise,
  selected,
  locked,
  favorite,
  favoriteDisabled,
  compact,
  onFavorite,
  onToggle,
  onDetails,
}: {
  exercise: Exercise;
  selected: boolean;
  locked: boolean;
  favorite: boolean;
  favoriteDisabled: boolean;
  compact: boolean;
  onFavorite: () => void;
  onToggle: () => void;
  onDetails: () => void;
}) {
  return (
    <article
      aria-label={exercise.name}
      className={`${styles.card} ${selected ? styles.selected : ""} ${compact ? styles.compact : ""}`}
    >
      <button
        type="button"
        onClick={onDetails}
        aria-label={`${exercise.name}: texnikani ko'rish`}
        className={styles.picture}
      >
        <ExerciseImage
          exercise={exercise}
          sizes={compact ? "160px" : "(max-width: 640px) 90vw, (max-width: 1536px) 35vw, 25vw"}
        />
        <span className="absolute bottom-2 left-3 rounded-full bg-black/75 px-2.5 py-1 text-[10px] text-white">
          {MUSCLE_GROUPS.find((group) => group.id === exercise.muscleGroup)?.label.replace(" mashqlari", "")}
        </span>
      </button>
      <button
        type="button"
        className={styles.favorite}
        aria-label={`${exercise.name}: sevimli`}
        aria-pressed={favorite}
        disabled={favoriteDisabled}
        onClick={onFavorite}
      >
        <ExerciseIcon name="heart" fill={favorite ? "currentColor" : "none"} />
      </button>
      <div className={styles.cardBody}>
        <div className={styles.meta}>
          <span>{EQUIPMENT_LABELS[exercise.equipment]}</span>
          <span>{LEVEL_LABELS[exercise.level]}</span>
        </div>
        <h3 className={styles.cardTitle}>{exercise.name}</h3>
        <p className="mt-1 text-[11px] leading-relaxed text-on-surface-variant/65">{exercise.englishName}</p>
        <div className={styles.measure}>
          <strong>{exercise.sets} podxod</strong>
          <span>×</span>
          <strong>
            {exercise.reps} {exercise.reps.includes("son") || exercise.reps.includes("sek") ? "" : "takror"}
          </strong>
        </div>
        <div className="mt-auto grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onDetails}
            className="min-h-11 rounded-xl border border-white/15 px-2 text-xs text-white hover:bg-white/5"
          >
            Texnika <span aria-hidden="true">↗</span>
          </button>
          <button
            type="button"
            onClick={onToggle}
            aria-pressed={selected}
            disabled={locked}
            aria-label={`${exercise.name}: ${selected ? "tanlovdan olish" : "rejaga qo'shish"}`}
            className={`flex min-h-11 items-center justify-center gap-1 rounded-xl px-2 text-xs font-semibold disabled:opacity-60 ${selected ? "bg-primary/10 text-primary" : "bg-primary-container text-on-primary-container"}`}
          >
            <ExerciseIcon name={selected ? "check" : "plus"} width="15" height="15" />
            {locked ? "Qayd etilgan" : selected ? "Tanlangan" : "Qo'shish"}
          </button>
        </div>
      </div>
    </article>
  );
}
