"use client";
import { ACTIVITY_LEVELS, type ActivityLevel, type TrainingPreferences } from "@/lib/training-preferences";
import { LEVEL_LABELS, type Level } from "@/lib/exercise-metadata";

const fieldClass =
  "w-full bg-black border border-white/10 rounded-lg px-3 py-3 text-on-surface focus:border-primary outline-none";
export function TrainingPreferencesFields({
  activityLevel,
  training,
  onChange,
}: {
  activityLevel: ActivityLevel;
  training: TrainingPreferences;
  onChange: (value: { activityLevel: ActivityLevel; training: TrainingPreferences }) => void;
}) {
  const change = (patch: Partial<TrainingPreferences>) =>
    onChange({ activityLevel, training: { ...training, ...patch } });
  return (
    <fieldset className="space-y-4 border-t border-white/10 pt-5">
      <legend className="font-headline-md text-primary px-1">Shaxsiy mashg&apos;ulot sozlamalari</legend>
      <div className="grid sm:grid-cols-3 gap-4">
        <label className="space-y-2 text-sm">
          Faollik darajasi
          <select
            className={fieldClass}
            value={activityLevel}
            onChange={(e) => onChange({ activityLevel: e.target.value as ActivityLevel, training })}
          >
            {Object.entries(ACTIVITY_LEVELS).map(([key, value]) => (
              <option key={key} value={key}>
                {value.label}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-2 text-sm">
          Tajriba
          <select
            className={fieldClass}
            value={training.experience}
            onChange={(e) => change({ experience: e.target.value as Level })}
          >
            {Object.entries(LEVEL_LABELS).map(([key, value]) => (
              <option key={key} value={key}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-2 text-sm">
          Haftada necha kun?
          <select
            className={fieldClass}
            value={training.daysPerWeek}
            onChange={(e) => change({ daysPerWeek: Number(e.target.value) })}
          >
            {[1, 2, 3, 4, 5, 6].map((days) => (
              <option key={days} value={days}>
                {days} kun
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="text-xs text-on-surface-variant">
        Faollik kaloriya hisobiga, tajriba esa mashq tanlashga ta&apos;sir qiladi.
      </p>
    </fieldset>
  );
}
