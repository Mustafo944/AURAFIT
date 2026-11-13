"use client";
import { useWorkoutSession } from "@/context/workout-session-context";
import { ExerciseIcon } from "@/components/workout/exercise-icon";

export function ExercisePlan() {
  const { activeSession, removeExercise, moveExercise } = useWorkoutSession();
  const exercises = activeSession?.exercises ?? [];
  if (!exercises.length) return null;
  return (
    <details
      className="mx-4 mb-5 rounded-2xl border border-primary/20 bg-primary/[0.04] md:mx-6"
      aria-label="Mashqlar tartibi"
    >
      <summary className="cursor-pointer px-4 py-4 text-sm font-semibold text-primary">
        Mening rejam{" "}
        <span className="ml-2 font-normal text-on-surface-variant">
          {exercises.length} mashq · tartibni sozlash
        </span>
      </summary>
      <div className="border-t border-white/10 p-3">
        <p className="mb-3 px-1 text-xs text-on-surface-variant">
          Mashqlar shu ketma-ketlikda bajariladi. O&apos;qlar yordamida tartiblang.
        </p>
        <ol className="space-y-2">
          {exercises.map((exercise, index) => (
            <li key={exercise.exerciseId} className="flex items-center gap-2 rounded-xl bg-black/15 p-2">
              <span className="w-6 shrink-0 text-center text-xs text-primary">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="min-w-0 flex-1 text-xs leading-relaxed text-white md:text-sm">
                {exercise.exerciseName}
                {exercise.sets.length > 0 && (
                  <span className="block text-[11px] text-on-surface-variant">
                    {exercise.sets.length} podxod yozilgan
                  </span>
                )}
              </span>
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  disabled={index === 0}
                  aria-label={`${exercise.exerciseName}: yuqoriga`}
                  onClick={() => moveExercise(exercise.exerciseId, -1)}
                  className="flex h-10 w-9 items-center justify-center rounded-lg border border-white/10 hover:bg-white/10 disabled:opacity-25"
                >
                  <ExerciseIcon name="up" />
                </button>
                <button
                  type="button"
                  disabled={index === exercises.length - 1}
                  aria-label={`${exercise.exerciseName}: pastga`}
                  onClick={() => moveExercise(exercise.exerciseId, 1)}
                  className="flex h-10 w-9 items-center justify-center rounded-lg border border-white/10 hover:bg-white/10 disabled:opacity-25"
                >
                  <ExerciseIcon name="down" />
                </button>
                <button
                  type="button"
                  disabled={exercise.sets.length > 0}
                  aria-label={`${exercise.exerciseName}: rejadan olish`}
                  onClick={() => removeExercise(exercise.exerciseId)}
                  className="flex h-10 w-9 items-center justify-center rounded-lg text-on-surface-variant hover:bg-error/10 hover:text-error disabled:opacity-25"
                >
                  <ExerciseIcon name="close" />
                </button>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </details>
  );
}
