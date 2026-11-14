"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { playRestEnd } from "@/lib/rest-alert";
import { remainingRestSeconds } from "@/components/workout/rest-timer";

// Mintaqaga bog'liq bo'lmagan ming ajratgich (server va brauzer bir xil chiqaradi).
function formatThousands(value: number): string {
  return Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

function formatClock(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

// Mashg'ulot davomida ekran o'chib qolmasin (Wake Lock). Brauzer qo'llamasa
// yoki ruxsat bermasa — jimgina o'tkazib yuboriladi; sahifa qaytib
// ko'ringanda qayta so'raladi (tizim uni o'zi bekor qiladi).
function useScreenWakeLock() {
  useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;
    const request = async () => {
      try {
        if (!("wakeLock" in navigator) || document.visibilityState !== "visible") return;
        const next = await navigator.wakeLock.request("screen");
        if (cancelled) void next.release().catch(() => undefined);
        else lock = next;
      } catch {
        // Ruxsat berilmadi — taymer baribir ishlaydi.
      }
    };
    void request();
    const onVisible = () => {
      if (document.visibilityState === "visible") void request();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      void lock?.release().catch(() => undefined);
    };
  }, []);
}

export function WorkoutHud({
  startedAt,
  volumeKg,
  setsDone,
  setsTotal,
  restEndsAt,
  onRestChange,
  onDiscard,
}: {
  startedAt: string;
  volumeKg: number;
  setsDone: number;
  setsTotal: number;
  restEndsAt?: number | null;
  onRestChange: (deadline: number | null) => void;
  onDiscard: () => void;
}) {
  useScreenWakeLock();
  const [now, setNow] = useState(() => Date.now());
  const [confirming, setConfirming] = useState(false);
  const alertedFor = useRef<number | null>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    const onVisible = () => setNow(Date.now());
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const elapsed = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000));
  const remaining = remainingRestSeconds(restEndsAt, now);
  const counting = Boolean(restEndsAt && remaining > 0);
  const finished = Boolean(restEndsAt && remaining === 0);

  // Har bir dam olish tugashida signal bir marta beriladi.
  useEffect(() => {
    if (finished && restEndsAt && alertedFor.current !== restEndsAt) {
      alertedFor.current = restEndsAt;
      playRestEnd();
    }
  }, [finished, restEndsAt]);

  const stat = "flex flex-col items-center min-w-0";
  const statLabel = "font-label-mono text-[9px] uppercase text-on-surface-variant tracking-wider";
  const statValue = "font-label-mono text-[15px] font-bold text-primary tabular-nums leading-tight";

  return (
    <>
      <div className="sticky top-[calc(4.5rem+env(safe-area-inset-top))] md:top-2 z-30 rounded-2xl border border-white/10 bg-surface-container/90 backdrop-blur-xl shadow-[0_8px_28px_rgba(0,0,0,0.55)] overflow-hidden">
        <div className="flex items-center gap-1 px-3 py-2.5">
          <div className={`${stat} flex-1`}>
            <span className={statLabel}>Vaqt</span>
            <span className={statValue}>{formatClock(elapsed)}</span>
          </div>
          <div className={`${stat} flex-1`}>
            <span className={statLabel}>Hajm</span>
            <span className={statValue}>{formatThousands(volumeKg)} kg</span>
          </div>
          <div className={`${stat} flex-1`}>
            <span className={statLabel}>Podxod</span>
            <span className={statValue}>
              {setsDone}/{setsTotal}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setConfirming(true)}
            aria-label="Mashg'ulotni bekor qilish"
            className="shrink-0 w-9 h-9 rounded-xl bg-white/5 border border-white/10 text-on-surface-variant hover:text-error hover:border-error/40 flex items-center justify-center active:scale-95 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {(counting || finished) && (
          <div
            className={`flex items-center gap-2 px-3 py-2 border-t ${
              finished ? "border-primary-fixed-dim/40 bg-primary-fixed-dim/15" : "border-white/10 bg-primary-fixed-dim/[0.06]"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${finished ? "bg-primary-fixed-dim" : "bg-primary-fixed-dim animate-ping"}`}
            />
            <span className="font-label-mono text-[10px] uppercase tracking-wider text-on-surface-variant">
              {finished ? "Dam olish tugadi" : "Dam olish"}
            </span>
            <span
              role="timer"
              aria-label="Qolgan dam olish vaqti"
              className="font-label-mono text-[18px] font-bold tabular-nums text-primary-fixed-dim"
            >
              {finished ? "0:00" : `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`}
            </span>
            <div className="ml-auto flex items-center gap-1.5">
              {counting && (
                <button
                  type="button"
                  onClick={() => onRestChange(Date.now() + (remaining + 30) * 1000)}
                  className="px-2.5 py-1 rounded-lg border border-white/10 bg-white/5 font-label-mono text-[11px] active:scale-95"
                >
                  +30s
                </button>
              )}
              <button
                type="button"
                onClick={() => onRestChange(null)}
                className="px-2.5 py-1 rounded-lg border border-white/10 bg-white/5 font-label-mono text-[11px] uppercase active:scale-95"
              >
                {finished ? "Yopish" : "O'tkazish"}
              </button>
            </div>
          </div>
        )}
      </div>

      {confirming &&
        createPortal(
          <div
            role="alertdialog"
            aria-modal="true"
            aria-label="Mashg'ulotni bekor qilish"
            className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-sm flex items-center justify-center p-6"
            onClick={() => setConfirming(false)}
          >
            <div
              className="glass-card rounded-2xl p-6 w-full max-w-sm space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-headline-md text-headline-md text-primary uppercase">Bekor qilamizmi?</h3>
              <p className="font-body-md text-on-surface-variant text-sm">
                Bugungi mashg&apos;ulot va kiritilgan {setsDone} ta podxod o&apos;chiriladi. Buni qaytarib bo&apos;lmaydi.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  className="rounded-lg border border-white/15 py-3 font-label-mono text-[12px] uppercase text-on-surface"
                >
                  Qaytish
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setConfirming(false);
                    onDiscard();
                  }}
                  className="rounded-lg bg-error/20 border border-error/50 py-3 font-label-mono text-[12px] uppercase text-error"
                >
                  Ha, o&apos;chirish
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
