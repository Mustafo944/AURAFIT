"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { getAnimationFrames, type Exercise } from "@/lib/exercises";

const FRAME_MS = 1000; // har bir holat ko'rinib turadigan vaqt

// Mashqning boshlang'ich (0.jpg) va yakuniy (1.jpg) holat suratlarini yumshoq
// crossfade bilan almashtirib, bajarilish harakatini jonlantiradi. Ikkala kadr
// ham doim DOM'da turadi — birinchi almashishda rasm yuklanishini kutib
// "lip-lip" etib qolmasligi uchun.
export function ExerciseDemo({ exercise }: { exercise: Exercise }) {
  const [start, end] = getAnimationFrames(exercise);
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setFrame((f) => (f === 0 ? 1 : 0)), FRAME_MS);
    return () => clearInterval(id);
  }, [playing, exercise.id]);

  return (
    <div className="relative rounded-xl overflow-hidden bg-white select-none">
      <button
        type="button"
        onClick={() => setPlaying((p) => !p)}
        aria-label={playing ? "Animatsiyani to'xtatish" : "Animatsiyani boshlash"}
        className="block w-full relative aspect-[4/3] cursor-pointer"
      >
        <Image
          src={start}
          alt={`${exercise.englishName} — boshlang'ich holat`}
          fill
          sizes="(max-width: 768px) 100vw, 400px"
          className="object-contain transition-opacity duration-500 ease-in-out"
          style={{ opacity: frame === 0 ? 1 : 0 }}
        />
        <Image
          src={end}
          alt={`${exercise.englishName} — yakuniy holat`}
          fill
          sizes="(max-width: 768px) 100vw, 400px"
          className="object-contain transition-opacity duration-500 ease-in-out"
          style={{ opacity: frame === 1 ? 1 : 0 }}
        />
      </button>

      {/* Pastki boshqaruv paneli */}
      <div className="absolute bottom-0 inset-x-0 flex items-center gap-2 px-3 py-2 bg-gradient-to-t from-black/70 to-transparent pointer-events-none">
        <button
          type="button"
          onClick={() => setPlaying((p) => !p)}
          aria-label={playing ? "To'xtatish" : "Boshlash"}
          className="pointer-events-auto w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
            {playing ? "pause" : "play_arrow"}
          </span>
        </button>
        <div className="flex items-center gap-1.5">
          {[0, 1].map((i) => (
            <span
              key={i}
              className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${
                frame === i ? "bg-primary-fixed" : "bg-white/40"
              }`}
            />
          ))}
        </div>
        <span className="ml-auto font-label-mono text-[10px] text-white/80 uppercase tracking-wider">
          {frame === 0 ? "Boshlanish" : "Yakun"}
        </span>
      </div>
    </div>
  );
}
