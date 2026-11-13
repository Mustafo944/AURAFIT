"use client";

import { useEffect, useState } from "react";
import { getAnimationFrames, type Exercise } from "@/lib/exercise-metadata";
import { ExerciseImage } from "@/components/workout/exercise-image";

export function ExerciseDemo({ exercise }: { exercise: Exercise }) {
  const frames = getAnimationFrames(exercise);
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [compare, setCompare] = useState(false);
  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => setFrame((value) => 1 - value), 1400);
    return () => clearInterval(timer);
  }, [playing]);
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10">
      {compare ? (
        <div className="grid grid-cols-2 gap-px bg-white/15">
          {frames.map((src, index) => (
            <div key={src} className="relative aspect-[3/2] bg-[#f5f5f1]">
              <ExerciseImage eager exercise={exercise} src={src} sizes="(max-width: 768px) 45vw, 200px" />
              <span className="absolute bottom-2 left-2 rounded-full bg-black/80 px-2 py-1 text-[10px] text-white">
                {index + 1}-holat
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="relative aspect-[4/3] bg-[#f5f5f1]">
          <ExerciseImage
            eager
            exercise={exercise}
            src={frames[frame]}
            sizes="(max-width: 768px) 90vw, 400px"
          />
          <span className="absolute left-3 top-3 rounded-full bg-black/80 px-3 py-1 text-xs text-white">
            {frame === 0 ? "01 · Boshlanish" : "02 · Yakun"}
          </span>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2 bg-surface-container p-3">
        {["Boshlanish", "Yakun"].map((label, index) => (
          <button
            key={label}
            type="button"
            aria-pressed={frame === index}
            onClick={() => {
              setPlaying(false);
              setCompare(false);
              setFrame(index);
            }}
            className={`min-h-10 rounded-lg px-3 text-xs ${frame === index ? "bg-primary/15 text-primary" : "text-on-surface-variant hover:bg-white/5"}`}
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          aria-pressed={playing}
          onClick={() => {
            setCompare(false);
            setPlaying(!playing);
          }}
          className="ml-auto min-h-10 rounded-lg px-3 text-xs text-primary hover:bg-white/5"
        >
          {playing ? "To'xtatish" : "Avtomatik ko'rish"}
        </button>
      </div>
      <button
        type="button"
        aria-pressed={compare}
        onClick={() => {
          setPlaying(false);
          setCompare(!compare);
        }}
        className="w-full border-t border-white/10 bg-surface-container px-4 py-3 text-xs text-primary hover:bg-white/5"
      >
        {compare ? "Bitta holatni ko'rish" : "Ikki holatni solishtirish"}
      </button>
      <p className="bg-surface-container px-4 pb-3 text-[11px] text-on-surface-variant">
        Ikki holat tasviri · to&apos;liq harakat videosi emas
      </p>
    </div>
  );
}
