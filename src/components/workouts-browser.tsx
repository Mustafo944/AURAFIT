"use client";

import { useState } from "react";
import Image from "next/image";
import { ExerciseCard } from "@/components/exercise-card";
import { MUSCLE_GROUPS, type Exercise, type MuscleGroupId } from "@/lib/exercises";

function MuscleGroupTile({
  label,
  icon,
  count,
  thumbnail,
  onClick,
}: {
  label: string;
  icon: string;
  count: number;
  thumbnail: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="glass-card rounded-xl overflow-hidden relative h-40 text-left group hover:-translate-y-1 hover:border-primary/50 transition-all duration-300"
    >
      <Image
        src={thumbnail}
        alt={label}
        fill
        sizes="(max-width: 768px) 50vw, (max-width: 1280px) 33vw, 25vw"
        className="object-cover opacity-40 group-hover:opacity-60 transition-opacity"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
      <div className="absolute inset-0 flex flex-col items-start justify-end p-5">
        <span className="material-symbols-outlined text-primary-fixed-dim text-2xl mb-1">{icon}</span>
        <h3 className="font-headline-md text-headline-md text-primary uppercase italic">{label}</h3>
        <span className="font-label-mono text-label-mono text-on-surface-variant">{count} TA MASHQ</span>
      </div>
    </button>
  );
}

export function WorkoutsBrowser({ exercises }: { exercises: Exercise[] }) {
  const [activeGroup, setActiveGroup] = useState<MuscleGroupId | null>(null);

  if (activeGroup === null) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-gutter">
        {MUSCLE_GROUPS.map((group) => {
          const groupExercises = exercises.filter((exercise) => exercise.muscleGroup === group.id);
          // Mashqsiz guruh ko'rsatilmaydi — aks holda groupExercises[0].image
          // undefined bo'lib butun sahifa crash bo'lardi.
          if (groupExercises.length === 0) return null;
          return (
            <MuscleGroupTile
              key={group.id}
              label={group.label}
              icon={group.icon}
              count={groupExercises.length}
              thumbnail={groupExercises[0].image}
              onClick={() => setActiveGroup(group.id)}
            />
          );
        })}
      </div>
    );
  }

  const group = MUSCLE_GROUPS.find((g) => g.id === activeGroup)!;
  const groupExercises = exercises.filter((exercise) => exercise.muscleGroup === activeGroup);

  return (
    <div className="space-y-stack-md">
      <button
        type="button"
        onClick={() => setActiveGroup(null)}
        className="flex items-center gap-2 font-label-mono text-label-mono uppercase text-on-surface-variant hover:text-primary transition-colors"
      >
        <span className="material-symbols-outlined text-[18px]">arrow_back</span>
        Barcha Guruhlar
      </button>

      <div className="flex items-center gap-3">
        <span className="material-symbols-outlined text-primary-fixed-dim">{group.icon}</span>
        <h2 className="font-headline-md text-headline-md text-primary uppercase italic">{group.label}</h2>
        <span className="font-label-mono text-label-mono text-on-surface-variant">{groupExercises.length} TA MASHQ</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-gutter">
        {groupExercises.map((exercise) => (
          <ExerciseCard key={exercise.id} exercise={exercise} />
        ))}
      </div>
    </div>
  );
}
