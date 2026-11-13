"use client";
import { useEffect, useState } from "react";
import { useWeightHistory } from "@/lib/weight-log";
import { summarizeProgress } from "@/lib/progress-summary";
import type { WorkoutSession } from "@/lib/workout-log";

export function ProgressSummary({ sessions, hasMore }: { sessions: WorkoutSession[]; hasMore: boolean }) {
  const { entries, loading, error } = useWeightHistory();
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const update = () => setNow(new Date());
    const timer = setTimeout(update, 0);
    window.addEventListener("focus", update);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("focus", update);
    };
  }, []);
  if (!now) return <p role="status">Progress yuklanmoqda...</p>;
  const summary = summarizeProgress(sessions, entries, now);
  const max = Math.max(1, ...summary.groups.map((g) => g.sets));
  return (
    <section className="glass-card rounded-xl p-5 space-y-5" aria-label="Haftalik progress">
      <div>
        <h3 className="font-headline-md text-xl text-primary">So&apos;nggi 7 kun</h3>
        <p className="text-xs text-on-surface-variant mt-1">
          Bugun ham hisobga olinadi. Solishtirish: undan oldingi 7 kun.
        </p>
      </div>
      <div className="grid sm:grid-cols-3 gap-3">
        <div className="rounded-xl bg-white/5 p-4">
          <p className="text-sm">Mashg&apos;ulotlar</p>
          <strong className="text-2xl text-primary">{summary.count}</strong>
          <p className="text-xs text-on-surface-variant">Oldingi davr: {summary.previousCount}</p>
        </div>
        <div className="rounded-xl bg-white/5 p-4">
          <p className="text-sm">Ko&apos;tarilgan yuk</p>
          <strong className="text-2xl text-primary">{Math.round(summary.volume).toLocaleString()} kg</strong>
          <p className="text-xs text-on-surface-variant">
            Og&apos;irlik × takror. Oldingi: {Math.round(summary.previousVolume).toLocaleString()} kg
          </p>
        </div>
        <div className="rounded-xl bg-white/5 p-4">
          <p className="text-sm">Vazn o&apos;zgarishi</p>
          <strong className="text-2xl text-primary">
            {loading
              ? "…"
              : summary.weightChange === null
                ? "—"
                : `${summary.weightChange > 0 ? "+" : ""}${summary.weightChange.toFixed(1)} kg`}
          </strong>
          <p className="text-xs text-on-surface-variant">
            {error ? "Saqlangan vazn yozuvlari asosida" : "Davr ichidagi kamida 2 yozuv asosida"}
          </p>
        </div>
      </div>
      <div className="space-y-3">
        <h4 className="text-sm">Mushak guruhlari bo&apos;yicha podxodlar</h4>
        {summary.groups.map((group) => (
          <div key={group.id} className="space-y-1">
            <div className="flex justify-between gap-3 text-xs">
              <span>{group.label}</span>
              <span>{group.sets ? `${group.sets} podxod` : "Hali qayd etilmagan"}</span>
            </div>
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full"
                style={{ width: `${(group.sets / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
        <p className="text-xs text-on-surface-variant">
          Faqat mashqning asosiy mushak guruhi hisoblanadi. Tana og&apos;irligidagi mashqlar ham podxodlarda
          ko&apos;rsatiladi.
        </p>
      </div>
      {hasMore && (
        <p className="text-xs text-on-surface-variant">
          Hisobot yuklangan tarixga asoslangan. To&apos;liqroq natija uchun pastdagi eski tarixni yuklang.
        </p>
      )}
    </section>
  );
}
