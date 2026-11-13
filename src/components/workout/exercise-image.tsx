"use client";

import { useState } from "react";
import Image from "next/image";
import type { Exercise } from "@/lib/exercise-metadata";

export function ExerciseImage({
  exercise,
  src = exercise.image,
  sizes = "(max-width: 640px) 100vw, 33vw",
  eager = false,
}: {
  exercise: Exercise;
  src?: string;
  sizes?: string;
  eager?: boolean;
}) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const [loadedSource, setLoadedSource] = useState<string | null>(null);
  if (failedSource === src)
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-surface-container text-on-surface-variant">
        <span aria-hidden="true" className="material-symbols-outlined text-4xl">
          fitness_center
        </span>
        <span className="text-xs">Rasm hozircha yuklanmadi</span>
      </div>
    );
  return (
    <>
      {loadedSource !== src && (
        <div
          aria-hidden="true"
          className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-gradient-to-br from-surface-container to-surface-container-high animate-pulse"
        >
          <span className="material-symbols-outlined text-on-surface-variant/40 text-2xl animate-pulse">
            fitness_center
          </span>
          <span className="font-label-mono text-[9px] uppercase tracking-wider text-on-surface-variant/60">
            Yuklanmoqda...
          </span>
        </div>
      )}
      <Image
        src={src}
        alt={exercise.name}
        fill
        sizes={sizes}
        loading={eager ? "eager" : "lazy"}
        className="object-contain p-3"
        onError={() => setFailedSource(src)}
        onLoad={() => setLoadedSource(src)}
      />
    </>
  );
}
