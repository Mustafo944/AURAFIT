"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useWorkoutSession } from "@/context/workout-session-context";
import { ExerciseSetLogger } from "@/components/exercise-set-logger";
import { EQUIPMENT_LABELS, LEVEL_LABELS, getAnimationFrames, type Exercise, type Level } from "@/lib/exercises";

const LEVEL_BADGE_STYLES: Record<Level, string> = {
  beginner: "border-primary-fixed-dim/50 text-primary-fixed-dim bg-primary-fixed-dim/10",
  intermediate: "border-tertiary-fixed-dim/50 text-tertiary-fixed-dim bg-tertiary-fixed-dim/10",
  expert: "border-error/50 text-error bg-error/10",
};

const ANIMATION_INTERVAL_MS = 650;

export function ExerciseCard({ exercise }: { exercise: Exercise }) {
  const [expanded, setExpanded] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false);
  const [frame, setFrame] = useState(0);
  const { isActive, getLoggedSets } = useWorkoutSession();
  const loggedCount = getLoggedSets(exercise.id).length;
  const frames = getAnimationFrames(exercise);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setFrame((f) => (f === 0 ? 1 : 0)), ANIMATION_INTERVAL_MS);
    return () => {
      clearInterval(id);
      setFrame(0);
    };
  }, [playing]);

  const togglePlaying = () => {
    setHasPlayed(true);
    setPlaying((p) => !p);
  };

  return (
    <div
      className={`glass-card rounded-xl overflow-hidden group transition-colors ${
        loggedCount > 0 ? "border-primary/60" : "hover:border-primary/50"
      }`}
    >
      <div className="h-48 w-full relative overflow-hidden">
        {frames.map((src, index) => {
          // Ikkinchi kadr faqat foydalanuvchi play tugmasini bosgandan keyin
          // yuklanadi — har bir mashq kartasi uchun ikki barobar rasm
          // so'rovini oldini olish, chunki ko'p hollarda animatsiya umuman
          // ishga tushirilmaydi.
          if (index === 1 && !hasPlayed) return null;
          return (
            <Image
              key={src}
              src={src}
              alt={exercise.englishName}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
              className={`object-cover transition-opacity duration-300 ${
                frame === index ? "opacity-90 group-hover:opacity-100" : "opacity-0"
              }`}
            />
          );
        })}
        <button
          type="button"
          onClick={togglePlaying}
          aria-label={playing ? "Animatsiyani to'xtatish" : "Bajarilishini animatsiyada ko'rish"}
          aria-pressed={playing}
          className="absolute inset-0 flex items-center justify-center z-10"
        >
          <span className="w-14 h-14 rounded-full bg-black/50 border border-white/30 backdrop-blur-sm flex items-center justify-center transition-all hover:scale-110 hover:bg-black/60">
            <span
              className="material-symbols-outlined text-[28px] text-white"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              {playing ? "pause" : "play_arrow"}
            </span>
          </span>
        </button>
        <div
          className={`absolute inset-0 bg-gradient-to-t from-background to-transparent pointer-events-none transition-opacity duration-300 ${
            playing ? "opacity-0" : "opacity-100"
          }`}
        />
        <div
          className={`absolute bottom-4 left-4 right-4 transition-opacity duration-300 ${
            playing ? "opacity-0" : "opacity-100"
          }`}
        >
          <h3 className="font-headline-md text-[18px] text-primary uppercase italic leading-tight">{exercise.name}</h3>
          <p className="font-label-mono text-label-mono text-on-surface-variant">{EQUIPMENT_LABELS[exercise.equipment]}</p>
        </div>
        <div
          className={`absolute top-3 right-3 border rounded px-2 py-1 backdrop-blur-sm font-label-mono text-[10px] uppercase transition-opacity duration-300 ${
            playing ? "opacity-0" : "opacity-100"
          } ${LEVEL_BADGE_STYLES[exercise.level]}`}
        >
          {LEVEL_LABELS[exercise.level]}
        </div>
        {loggedCount > 0 && (
          <div
            className={`absolute top-3 left-3 border border-primary-fixed-dim/60 bg-primary-fixed-dim/20 text-primary-fixed-dim rounded px-2 py-1 backdrop-blur-sm font-label-mono text-[10px] uppercase flex items-center gap-1 transition-opacity duration-300 ${
              playing ? "opacity-0" : "opacity-100"
            }`}
          >
            <span className="material-symbols-outlined text-[12px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              check_circle
            </span>
            {loggedCount} PODXOD
          </div>
        )}
      </div>

      <div className="p-4 grid grid-cols-2 gap-2">
        <div className="bg-surface-container rounded p-2 text-center border border-outline/20">
          <div className="font-label-mono text-label-mono text-on-surface-variant">TO&apos;PLAM</div>
          <div className="font-headline-md text-headline-md text-primary">{exercise.sets}</div>
        </div>
        <div className="bg-surface-container rounded p-2 text-center border border-outline/20">
          <div className="font-label-mono text-label-mono text-on-surface-variant">TAKRORLASH</div>
          <div className="font-headline-md text-headline-md text-primary">{exercise.reps}</div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
        className="w-full flex items-center justify-between px-4 py-3 border-t border-white/10 text-on-surface-variant hover:text-primary transition-colors"
      >
        <span className="font-label-mono text-label-mono uppercase">Bajarilish Texnikasi</span>
        <span
          className="material-symbols-outlined text-[20px] transition-transform duration-200"
          style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}
        >
          expand_more
        </span>
      </button>

      {expanded && (
        <ol className="px-4 pb-4 space-y-2">
          {exercise.instructions.map((step, index) => (
            <li key={index} className="flex gap-3 font-body-md text-[14px] text-on-surface">
              <span className="font-label-mono text-label-mono text-primary-fixed-dim shrink-0">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      )}

      {isActive && <ExerciseSetLogger exercise={exercise} />}
    </div>
  );
}
