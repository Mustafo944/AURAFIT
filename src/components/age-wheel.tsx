"use client";

import { useEffect, useRef, useState } from "react";

interface AgeWheelProps {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}

const ROW_HEIGHT = 44;

// Vertikal "g'ildirak" tanlagich — markazdagi son katta/yorqin, atrofdagilar
// masofaga qarab xiralashib/kichraya boradi. WeightRuler/HeightRuler bilan bir
// xil scroll-sinxronizatsiya texnikasi, shu bilan birga qo'lda kiritish ham bor.
export function AgeWheel({ value, min, max, onChange }: AgeWheelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [liveValue, setLiveValue] = useState(value);
  const [containerHeight, setContainerHeight] = useState(0);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressNextScroll = useRef(false);

  const [prevValue, setPrevValue] = useState(value);
  if (prevValue !== value) {
    setPrevValue(value);
    setLiveValue(value);
  }

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => setContainerHeight(entries[0].contentRect.height));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || containerHeight === 0) return;
    const targetTop = (value - min) * ROW_HEIGHT;
    if (Math.abs(el.scrollTop - targetTop) > 1) {
      suppressNextScroll.current = true;
      el.scrollTop = targetTop;
    }
  }, [value, min, containerHeight]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    if (suppressNextScroll.current) {
      suppressNextScroll.current = false;
      return;
    }
    const raw = min + el.scrollTop / ROW_HEIGHT;
    const clamped = Math.max(min, Math.min(max, Math.round(raw)));
    setLiveValue(clamped);

    if (settleTimer.current) clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => onChange(clamped), 120);
  };

  // Qo'lda kiritish — WeightRuler/HeightRuler'dagi bilan bir xil naqsh.
  const [manualInput, setManualInput] = useState(String(value));
  const [prevLiveValueForInput, setPrevLiveValueForInput] = useState(liveValue);
  const [manualFocused, setManualFocused] = useState(false);
  if (!manualFocused && prevLiveValueForInput !== liveValue) {
    setPrevLiveValueForInput(liveValue);
    setManualInput(String(liveValue));
  }

  const handleManualChange = (raw: string) => {
    setManualInput(raw);
    const num = Number(raw);
    if (raw !== "" && Number.isFinite(num) && num >= min && num <= max) {
      setLiveValue(Math.round(num));
    }
  };

  const commitManualValue = () => {
    const num = Number(manualInput);
    const clamped = Number.isFinite(num) && manualInput !== "" ? Math.max(min, Math.min(max, Math.round(num))) : liveValue;
    setLiveValue(clamped);
    setManualInput(String(clamped));
    setPrevLiveValueForInput(clamped);
    if (settleTimer.current) clearTimeout(settleTimer.current);
    onChange(clamped);
  };

  const rows = [];
  for (let age = min; age <= max; age++) {
    const distance = Math.abs(age - liveValue);
    const isActive = age === liveValue;
    const opacity = isActive ? 1 : Math.max(0.12, 1 - distance * 0.28);
    const scale = isActive ? 1 : Math.max(0.7, 1 - distance * 0.08);
    rows.push(
      <div
        key={age}
        className="absolute inset-x-0 flex items-center justify-center"
        style={{
          top: containerHeight / 2 + (age - min) * ROW_HEIGHT - ROW_HEIGHT / 2,
          height: ROW_HEIGHT,
          opacity,
          transform: `scale(${scale})`,
          scrollSnapAlign: "center",
        }}
      >
        <span
          className={`font-headline-md ${
            isActive ? "text-primary text-[28px] font-bold" : "text-on-surface-variant text-[18px]"
          }`}
        >
          {age}
        </span>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-xl bg-surface-container-high/60 border border-white/10 flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-tertiary-fixed-dim text-[22px]">calendar_month</span>
        </div>
        <div className="flex-1">
          <div className="font-label-mono text-label-mono text-on-surface-variant uppercase">Joriy Yoshingiz</div>
        </div>
        <div className="flex items-baseline gap-1.5">
          <input
            type="number"
            inputMode="numeric"
            value={manualInput}
            onFocus={() => setManualFocused(true)}
            onChange={(e) => handleManualChange(e.target.value)}
            onBlur={() => {
              setManualFocused(false);
              commitManualValue();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            }}
            className="w-20 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-right font-headline-md text-[22px] font-bold text-tertiary-fixed-dim outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-colors"
          />
          <span className="font-label-mono text-[13px] text-on-surface-variant">yosh</span>
        </div>
      </div>

      <div className="relative h-56">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="h-full overflow-y-scroll [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{ scrollSnapType: "y proximity" }}
        >
          <div className="relative" style={{ height: (max - min) * ROW_HEIGHT + containerHeight }}>
            {rows}
          </div>
        </div>
        <div
          className="pointer-events-none absolute left-1/2 -translate-x-1/2 w-40 border-t border-white/20"
          style={{ top: `calc(50% - ${ROW_HEIGHT / 2}px)` }}
        />
        <div
          className="pointer-events-none absolute left-1/2 -translate-x-1/2 w-40 border-t border-white/20"
          style={{ top: `calc(50% + ${ROW_HEIGHT / 2}px)` }}
        />
      </div>
    </div>
  );
}
