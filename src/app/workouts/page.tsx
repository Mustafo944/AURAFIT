"use client";

import { EXERCISES } from "@/lib/exercises";
import { WorkoutsBrowser } from "@/components/workouts-browser";
import { WorkoutSessionPanel } from "@/components/workout-session-panel";
import { WorkoutCalendar } from "@/components/workout-calendar";
import { useWorkoutHistory } from "@/lib/workout-log";

export default function WorkoutsPage() {
  const { sessions, addSession, updateSessionAdvice } = useWorkoutHistory();

  return (
    <div className="space-y-stack-lg max-w-7xl mx-auto">
      <div>
        <h1 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-primary uppercase italic">
          Mashg&apos;ulotlar
        </h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant mt-2">
          Mushak guruhlari bo&apos;yicha eng samarali mashqlar va ularning bajarilish texnikasi
        </p>
      </div>

      <WorkoutSessionPanel sessions={sessions} addSession={addSession} updateSessionAdvice={updateSessionAdvice} />

      {/* Mashg'ulotlar Kalendari */}
      <section className="glass-card rounded-xl p-6 border-l-[4px] border-l-error">
        <h3 className="font-headline-md text-headline-md text-primary uppercase italic mb-stack-sm flex items-center gap-2">
          <span className="material-symbols-outlined text-error">event</span>
          Mashg&apos;ulotlar Kalendari
        </h3>
        <p className="font-body-md text-[13px] text-on-surface-variant mb-5">
          Mashq qilingan kunlar qizil bilan belgilangan — batafsil ma&apos;lumot uchun bosing.
        </p>
        <WorkoutCalendar sessions={sessions} />
      </section>

      <WorkoutsBrowser exercises={EXERCISES} />

      {/* AI Mashg'ulot Generatori */}
      <div className="glass-card ai-accent-border rounded-xl p-6 md:p-8 text-center relative overflow-hidden">
        <div className="absolute right-0 top-0 opacity-10 pointer-events-none">
          <span className="material-symbols-outlined text-[140px]">psychology</span>
        </div>
        <div className="relative z-10 flex flex-col items-center gap-3 max-w-xl mx-auto">
          <span className="material-symbols-outlined text-tertiary-fixed-dim text-4xl">auto_awesome</span>
          <h3 className="font-headline-md text-headline-md text-primary uppercase italic">AI Mashg&apos;ulot Generatori</h3>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Maqsadingiz va bio-ma&apos;lumotlaringiz asosida shaxsiy mashg&apos;ulot rejasini avtomatik tuzadigan AI xususiyati tez orada ishga tushiriladi.
          </p>
          <button
            type="button"
            disabled
            className="mt-2 inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary-container/30 text-on-primary-container/50 font-headline-md text-sm uppercase tracking-wider cursor-not-allowed"
          >
            <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
            AI bilan Mashg&apos;ulot Tuzish
            <span className="font-label-mono text-[10px] bg-black/30 px-2 py-0.5 rounded ml-1">TEZ ORADA</span>
          </button>
        </div>
      </div>
    </div>
  );
}
