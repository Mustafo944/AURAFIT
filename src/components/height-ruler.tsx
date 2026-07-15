"use client";

import { useEffect, useRef, useState } from "react";

interface HeightRulerProps {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}

const PX_PER_CM = 10;

// WeightRuler bilan bir xil texnika (native vertikal scroll, markazda qat'iy
// ko'rsatkich, scroll to'xtaganda qiymat "qulflanadi"), faqat vertikal
// yo'nalishda — bo'y tabiiy ravishda tepadan-pastga o'lchanadi.
export function HeightRuler({ value, min, max, onChange }: HeightRulerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [liveValue, setLiveValue] = useState(value);
  const [containerHeight, setContainerHeight] = useState(0);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressNextScroll = useRef(false);

  // Tashqi `value` o'zgarsa render vaqtida moslaymiz — effekt ichidagi sync
  // setState kaskadli qo'shimcha render chiqarardi.
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

  // Faqat DOM'ni (scrollTop) tashqi `value` bilan sinxronlaydi.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || containerHeight === 0) return;
    const targetTop = (max - value) * PX_PER_CM;
    if (Math.abs(el.scrollTop - targetTop) > 1) {
      suppressNextScroll.current = true;
      el.scrollTop = targetTop;
    }
  }, [value, max, containerHeight]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    if (suppressNextScroll.current) {
      suppressNextScroll.current = false;
      return;
    }
    const raw = max - el.scrollTop / PX_PER_CM;
    const clamped = Math.max(min, Math.min(max, Math.round(raw)));
    setLiveValue(clamped);

    if (settleTimer.current) clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => onChange(clamped), 120);
  };

  // Qo'lda kiritish maydoni — WeightRuler'dagi bilan bir xil naqsh: yozayotganda
  // tashqi qiymat matnni qayta yozib yubormaydi, yakuniy qiymat blur/Enter'da
  // qulflanadi.
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

  const ticks = [];
  for (let cm = min; cm <= max; cm++) {
    const isMajor = cm % 10 === 0;
    const isMedium = !isMajor && cm % 5 === 0;
    const top = containerHeight / 2 + (max - cm) * PX_PER_CM;
    ticks.push(
      <div
        key={cm}
        className="absolute left-0 flex items-center gap-2"
        style={{ top, scrollSnapAlign: "center" }}
      >
        <div className={`bg-white/25 ${isMajor ? "h-[2px] w-10" : isMedium ? "h-px w-7" : "h-px w-4"}`} />
        {isMajor && <span className="font-label-mono text-[11px] text-on-surface-variant">{cm}</span>}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-xl bg-surface-container-high/60 border border-white/10 flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-tertiary-fixed-dim text-[22px]">trending_up</span>
        </div>
        <div className="flex-1">
          <div className="font-label-mono text-label-mono text-on-surface-variant uppercase">Joriy Bo&apos;yingiz</div>
        </div>
        <div className="flex items-baseline gap-1.5">
          <input
            type="number"
            inputMode="decimal"
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
            className="w-24 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-right font-headline-md text-[22px] font-bold text-tertiary-fixed-dim outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-colors"
          />
          <span className="font-label-mono text-[13px] text-on-surface-variant">sm</span>
        </div>
      </div>

      <div className="relative h-64">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="h-full overflow-y-scroll [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{ scrollSnapType: "y proximity" }}
        >
          <div className="relative w-24" style={{ height: (max - min) * PX_PER_CM + containerHeight }}>
            {ticks}
          </div>
        </div>
        <div className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 h-0.5 w-16 bg-tertiary-fixed-dim shadow-[0_0_8px_rgba(0,219,233,0.6)]" />
      </div>
    </div>
  );
}
