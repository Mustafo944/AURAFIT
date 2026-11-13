"use client";

import { SyncStatus } from "@/components/sync-status";
import { useState } from "react";
import { useWeightHistory, logWeightEntry } from "@/lib/weight-log";
import { useAuth } from "@/context/auth-context";
import { TrendLineChart } from "@/components/trend-line-chart";

export function WeightHistory() {
  const { entries, loading, error, retry } = useWeightHistory();
  const { userId } = useAuth();
  const [weight, setWeight] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const visible = entries.slice(-30);
  const delta = visible.length > 1 ? visible[visible.length - 1].weightKg - visible[0].weightKg : null;
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!userId || saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      await logWeightEntry(userId, Number(weight));
      setWeight("");
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Saqlab bo'lmadi.");
    } finally {
      setSaving(false);
    }
  };
  return (
    <section className="glass-card rounded-xl p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-headline-md text-headline-md text-primary">Vazn tarixi</h3>
        {delta !== null && (
          <span className="text-sm text-on-surface-variant">
            Davr farqi: {delta > 0 ? "+" : ""}
            {delta.toFixed(1)} kg
          </span>
        )}
      </div>
      {loading && !entries.length ? (
        <p role="status">Yuklanmoqda...</p>
      ) : !entries.length ? (
        <p className="text-sm text-on-surface-variant">Birinchi vazn yozuvingizni qo&apos;shing.</p>
      ) : (
        <TrendLineChart
          label="So'nggi 30 yozuv"
          unit=" kg"
          points={visible.map((entry) => ({
            id: entry.id,
            value: entry.weightKg,
            dateLabel: new Date(entry.loggedAt).toLocaleDateString("uz-UZ", {
              day: "numeric",
              month: "short",
            }),
          }))}
        />
      )}
      <SyncStatus entityId={entries[entries.length - 1]?.id ?? null} />
      <form onSubmit={save} className="flex flex-wrap gap-3 items-end">
        <label className="text-sm flex-1 min-w-40">
          Bugungi vazn (kg)
          <input
            aria-label="Bugungi vazn (kg)"
            type="number"
            required
            min="20"
            max="500"
            step="0.1"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="block mt-1 w-full bg-black rounded-lg border border-white/10 p-3"
          />
        </label>
        <button
          disabled={saving || !userId}
          className="rounded-lg px-4 py-3 bg-primary-container text-on-primary-container disabled:opacity-50"
        >
          {saving ? "Saqlanmoqda..." : "Vaznni yozish"}
        </button>
      </form>
      <p className="text-xs text-on-surface-variant">
        Bu yozuv vazn tarixiga qo&apos;shiladi. Kaloriya hisobidagi vazn profil orqali o&apos;zgartiriladi.
      </p>
      {saveError && (
        <p role="alert" className="text-error text-sm">
          {saveError}
        </p>
      )}
      {error && (
        <p className="text-sm text-error">
          {error}{" "}
          <button onClick={() => void retry()} className="underline">
            Qayta urinish
          </button>
        </p>
      )}
    </section>
  );
}
