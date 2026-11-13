"use client";
import { useEffect, useState } from "react";

export function remainingRestSeconds(deadline: number | null | undefined, now: number) {
  return deadline ? Math.max(0, Math.ceil((deadline - now) / 1000)) : 0;
}
export function RestTimer({
  deadline,
  onChange,
}: {
  deadline?: number | null;
  onChange: (deadline: number | null) => void;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!deadline) return;
    let id: ReturnType<typeof setTimeout>;
    const update = () => {
      clearTimeout(id);
      const current = Date.now();
      setNow(current);
      if (current < deadline && !document.hidden) id = setTimeout(update, Math.min(1000, deadline - current));
    };
    id = setTimeout(update, 0);
    document.addEventListener("visibilitychange", update);
    return () => {
      clearTimeout(id);
      document.removeEventListener("visibilitychange", update);
    };
  }, [deadline]);
  const remaining = remainingRestSeconds(deadline, now);
  const isCounting = Boolean(deadline && remaining > 0);
  const isFinished = Boolean(deadline && remaining === 0);

  return (
    <div className={`glass-card rounded-2xl p-4 md:p-5 flex flex-wrap items-center gap-4 relative overflow-hidden transition-all duration-300 ${
      isCounting
        ? "border-primary-fixed-dim/40 shadow-[0_0_25px_rgba(195,244,0,0.18)]"
        : "border-white/10"
    }`}>
      {isCounting && (
        <div className="absolute -right-8 -top-8 w-24 h-24 bg-primary-fixed-dim/15 rounded-full blur-xl pointer-events-none animate-pulse" />
      )}
      <div className="flex-1 min-w-[120px]">
        <div className="flex items-center gap-2 mb-0.5">
          <span className={`w-2 h-2 rounded-full ${isCounting ? "bg-primary-fixed-dim animate-ping" : "bg-on-surface-variant/40"}`} />
          <span className="font-label-mono text-[11px] uppercase tracking-wider text-on-surface-variant">
            Dam olish
          </span>
        </div>
        <div
          role="timer"
          aria-label="Qolgan dam olish vaqti"
          className={`font-label-mono text-3xl font-bold tabular-nums tracking-tight ${
            isCounting ? "text-primary drop-shadow-[0_0_8px_rgba(195,244,0,0.5)]" : "text-primary"
          }`}
        >
          {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")}
        </div>
        <span
          role="status"
          className={`font-label-mono text-[11px] block mt-0.5 ${isFinished ? "text-primary-fixed-dim font-bold animate-bounce" : "text-on-surface-variant"}`}
        >
          {isFinished ? "⚡ Dam olish vaqti tugadi!" : ""}
        </span>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {[60, 90, 120].map((seconds) => (
          <button
            key={seconds}
            type="button"
            onClick={() => {
              const current = Date.now();
              setNow(current);
              onChange(current + seconds * 1000);
            }}
            className="px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-primary-fixed-dim/20 hover:border-primary-fixed-dim/40 hover:text-primary transition-all font-label-mono text-[12px] font-semibold active:scale-95"
          >
            +{seconds}s
          </button>
        ))}
        {deadline && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="px-3 py-1.5 rounded-xl border border-error/30 text-error hover:bg-error/15 transition-all font-label-mono text-[12px] font-medium ml-1 active:scale-95"
          >
            To&apos;xtatish
          </button>
        )}
      </div>
    </div>
  );
}
