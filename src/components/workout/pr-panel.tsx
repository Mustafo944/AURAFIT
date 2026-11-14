"use client";

import { useMemo, useState } from "react";
import { getPersonalRecords, type PersonalRecord } from "@/lib/personal-records";
import { getExerciseHistory, type WorkoutSession } from "@/lib/workout-log";
import { MUSCLE_GROUPS } from "@/lib/exercise-metadata";
import { MuscleIcon } from "@/components/workout/muscle-icon";
import { TrendLineChart, type TrendPoint } from "@/components/trend-line-chart";

// Grafikda ko'rsatiladigan so'nggi natijalar soni — sana yorliqlari siqilib
// o'qib bo'lmas holga kelmasligi uchun cheklangan.
const HISTORY_POINTS = 8;

function formatRecordDate(iso: string): string {
  return new Date(iso).toLocaleDateString("uz-UZ", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

function formatPointDate(iso: string): string {
  return new Date(iso).toLocaleDateString("uz-UZ", { day: "2-digit", month: "2-digit" });
}

// Shaxsiy rekordlar paneli: mushak guruhlari bo'yicha eng yaxshi natijalar.
// Mashq bosilganda o'sha mashqning og'irlik tarixi grafigi ochiladi.
export function PrPanel({
  sessions,
  onDeleteSession,
}: {
  sessions: WorkoutSession[];
  onDeleteSession?: (sessionId: string) => Promise<void> | void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [openExerciseId, setOpenExerciseId] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const records = getPersonalRecords(sessions);
    return MUSCLE_GROUPS.map((group) => ({
      group,
      records: [...records.values()]
        .filter((r) => r.muscleGroup === group.id)
        .sort((a, b) => b.weightKg - a.weightKg),
    })).filter((g) => g.records.length > 0);
  }, [sessions]);

  const recordCount = grouped.reduce((sum, g) => sum + g.records.length, 0);

  return (
    <div className="glass-card rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="w-full flex items-center gap-3 p-5 text-left"
      >
        <span
          className="material-symbols-outlined text-primary-fixed-dim"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          military_tech
        </span>
        <div className="flex-1 min-w-0">
          <div className="font-headline-md text-[17px] text-primary uppercase italic leading-tight">
            Shaxsiy Rekordlar
          </div>
          <div className="font-label-mono text-[11px] text-on-surface-variant">
            {recordCount > 0
              ? `${recordCount} ta mashq bo'yicha eng yaxshi natijalar`
              : "Hali rekord yo'q — mashg'ulotni yakunlang"}
          </div>
        </div>
        <span
          className="material-symbols-outlined text-[22px] text-on-surface-variant transition-transform duration-200"
          style={{ transform: expanded ? "rotate(180deg)" : undefined }}
        >
          expand_more
        </span>
      </button>

      {expanded && recordCount === 0 && (
        <div className="px-5 pb-6 border-t border-white/10 pt-5 text-center">
          <span className="material-symbols-outlined text-on-surface-variant/40 text-4xl">military_tech</span>
          <p className="font-body-md text-body-md text-on-surface-variant mt-2">
            Birinchi mashg&apos;ulotingizni yakunlang — har mashqdagi eng og&apos;ir podxod shu yerda mushak
            guruhi bo&apos;yicha rekord sifatida qayd etiladi.
          </p>
        </div>
      )}

      {expanded && recordCount > 0 && (
        <div className="px-5 pb-5 space-y-4 border-t border-white/10 pt-4">
          {grouped.map(({ group, records }) => (
            <div key={group.id} className="space-y-1.5">
              <div className="flex items-center gap-1.5 font-label-mono text-[11px] text-on-surface-variant uppercase">
                <MuscleIcon group={group.id} size={18} className="text-primary-fixed-dim" />
                {group.label}
              </div>
              {records.map((record) => (
                <RecordRow
                  key={record.exerciseId}
                  record={record}
                  open={openExerciseId === record.exerciseId}
                  sessions={sessions}
                  onDeleteSession={onDeleteSession}
                  onToggle={() =>
                    setOpenExerciseId(openExerciseId === record.exerciseId ? null : record.exerciseId)
                  }
                />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RecordRow({
  record,
  open,
  sessions,
  onToggle,
  onDeleteSession,
}: {
  record: PersonalRecord;
  open: boolean;
  sessions: WorkoutSession[];
  onToggle: () => void;
  onDeleteSession?: (sessionId: string) => Promise<void> | void;
}) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onDeleteSession || !record.sessionId) return;
    const ok = window.confirm(
      `"${record.exerciseName}" (${record.weightKg}kg) qayd etilgan ushbu mashg'ulot o'chirilsinmi?`
    );
    if (!ok) return;
    setDeleting(true);
    try {
      await onDeleteSession(record.sessionId);
    } finally {
      setDeleting(false);
    }
  };

  // Grafik faqat qator ochilganda hisoblanadi — panel katta tarixda ham yengil qoladi.
  const points = useMemo<TrendPoint[]>(() => {
    if (!open) return [];
    return getExerciseHistory(sessions, record.exerciseId)
      .slice(0, HISTORY_POINTS)
      .reverse()
      .map((p) => ({ id: p.finishedAt, dateLabel: formatPointDate(p.finishedAt), value: p.bestSet.weightKg }));
  }, [open, sessions, record.exerciseId]);

  return (
    <div
      className={`rounded-lg border transition-colors ${
        open ? "border-primary-fixed-dim/40 bg-primary-fixed-dim/5" : "border-white/10 bg-white/[0.02]"
      }`}
    >
      <div className="flex items-center gap-2 pr-3">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className="flex-1 min-w-0 flex items-center gap-3 p-3 text-left"
        >
          <div className="flex-1 min-w-0">
            <div className="font-body-md text-[14px] text-on-surface font-semibold truncate">{record.exerciseName}</div>
            <div className="font-label-mono text-[10px] text-on-surface-variant mt-0.5">
              {formatRecordDate(record.finishedAt)}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className="font-headline-md text-[17px] text-primary-fixed-dim font-bold leading-none">
              {record.weightKg}kg
            </div>
            <div className="font-label-mono text-[10px] text-on-surface-variant mt-0.5">&times; {record.reps} takror</div>
          </div>
          <span className="material-symbols-outlined text-[18px] text-on-surface-variant shrink-0">
            {open ? "expand_more" : "trending_up"}
          </span>
        </button>
        {onDeleteSession && record.sessionId && (
          <button
            type="button"
            disabled={deleting}
            onClick={handleDelete}
            aria-label={`${record.exerciseName} rekordini o'chirish`}
            title="Ushbu rekord qayd etilgan mashg'ulotni o'chirish"
            className="p-2 rounded-lg text-on-surface-variant/40 hover:text-error hover:bg-error/10 transition-colors shrink-0 disabled:opacity-50"
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              <line x1="10" y1="11" x2="10" y2="17" />
              <line x1="14" y1="11" x2="14" y2="17" />
            </svg>
          </button>
        )}
      </div>
      {open && points.length > 0 && (
        <div className="px-3 pb-3">
          <TrendLineChart label="Og'irlik Tarixi" unit="kg" points={points} />
        </div>
      )}
    </div>
  );
}
