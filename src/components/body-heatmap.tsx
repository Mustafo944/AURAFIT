"use client";

import { useState } from "react";
import { recoveryColor, recoveryLabel, type MuscleRecoveryStatus } from "@/lib/muscle-recovery";
import { MUSCLE_GROUPS, type MuscleGroupId } from "@/lib/exercises";

// --color-outline tokeniga mos — hali mashq qilinmagan (kuzatilmagan) zonalar
// uchun neytral rang, tiklangan (yashil) bilan aralashib ketmasligi uchun.
const NEUTRAL_COLOR = "#8e9379";

function statusFor(statuses: MuscleRecoveryStatus[], id: MuscleGroupId) {
  return statuses.find((s) => s.muscleGroup === id);
}

function colorFor(status: MuscleRecoveryStatus | undefined): string {
  if (!status || status.hoursSinceTrained == null) return NEUTRAL_COLOR;
  return recoveryColor(status.recoveryPct);
}

function glowFor(status: MuscleRecoveryStatus | undefined): string {
  if (!status || status.hoursSinceTrained == null) return "none";
  return `drop-shadow(0 0 4px ${colorFor(status)})`;
}

const FRONT_GROUPS: MuscleGroupId[] = ["shoulders", "chest", "biceps", "abs", "legs"];
const BACK_GROUPS: MuscleGroupId[] = ["shoulders", "back", "triceps", "legs"];

export function BodyHeatmap({ statuses }: { statuses: MuscleRecoveryStatus[] }) {
  const [view, setView] = useState<"front" | "back">("front");
  const visibleGroups = view === "front" ? FRONT_GROUPS : BACK_GROUPS;

  const zoneStyle = (id: MuscleGroupId) => {
    const status = statusFor(statuses, id);
    return { fill: colorFor(status), filter: glowFor(status), stroke: "rgba(255,255,255,0.1)", strokeWidth: 0.5 };
  };

  return (
    <div>
      <div className="flex gap-2 mb-5">
        {(["front", "back"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-4 py-2 rounded-lg font-label-mono text-label-mono uppercase transition-colors ${
              view === v
                ? "bg-primary-container text-on-primary-container"
                : "bg-white/5 text-on-surface-variant border border-white/10 hover:bg-white/10"
            }`}
          >
            {v === "front" ? "Old" : "Orqa"}
          </button>
        ))}
      </div>

      <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
        <svg viewBox="0 0 100 200" className="w-40 shrink-0">
          <circle cx="50" cy="14" r="10" fill="#2a2c2c" stroke="rgba(255,255,255,0.12)" />
          <rect x="45" y="21" width="10" height="9" fill="#2a2c2c" />

          {view === "front" ? (
            <>
              <ellipse cx="26" cy="37" rx="10" ry="7" {...zoneStyle("shoulders")} />
              <ellipse cx="74" cy="37" rx="10" ry="7" {...zoneStyle("shoulders")} />
              <rect x="36" y="32" width="28" height="22" rx="6" {...zoneStyle("chest")} />
              <rect x="14" y="40" width="10" height="30" rx="5" {...zoneStyle("biceps")} />
              <rect x="76" y="40" width="10" height="30" rx="5" {...zoneStyle("biceps")} />
              <rect x="38" y="55" width="24" height="26" rx="5" {...zoneStyle("abs")} />
              <rect x="37" y="83" width="12" height="60" rx="5" {...zoneStyle("legs")} />
              <rect x="51" y="83" width="12" height="60" rx="5" {...zoneStyle("legs")} />
            </>
          ) : (
            <>
              <ellipse cx="26" cy="37" rx="10" ry="7" {...zoneStyle("shoulders")} />
              <ellipse cx="74" cy="37" rx="10" ry="7" {...zoneStyle("shoulders")} />
              <rect x="34" y="32" width="32" height="49" rx="8" {...zoneStyle("back")} />
              <rect x="14" y="40" width="10" height="30" rx="5" {...zoneStyle("triceps")} />
              <rect x="76" y="40" width="10" height="30" rx="5" {...zoneStyle("triceps")} />
              <rect x="37" y="83" width="12" height="60" rx="5" {...zoneStyle("legs")} />
              <rect x="51" y="83" width="12" height="60" rx="5" {...zoneStyle("legs")} />
            </>
          )}
        </svg>

        <div className="flex-1 w-full space-y-2">
          {visibleGroups.map((id) => {
            const info = MUSCLE_GROUPS.find((g) => g.id === id)!;
            const status = statusFor(statuses, id);
            return (
              <div
                key={id}
                className="flex items-center justify-between gap-3 bg-white/5 border border-white/10 rounded-lg px-4 py-2.5"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: colorFor(status), boxShadow: glowFor(status) === "none" ? "none" : `0 0 4px ${colorFor(status)}` }}
                  />
                  <span className="font-body-md text-[14px] text-on-surface">{info.label}</span>
                </div>
                <span className="font-label-mono text-[11px] text-on-surface-variant whitespace-nowrap">
                  {status ? recoveryLabel(status) : "—"}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
