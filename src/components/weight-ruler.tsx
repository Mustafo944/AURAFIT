"use client";

import { useEffect, useRef, useState } from "react";
import { WeightZoneGauge } from "@/components/weight-zone-gauge";

interface WeightZone {
  upTo: number;
  color: string;
  label: string;
}

interface WeightRulerProps {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  zones: WeightZone[];
}

const PX_PER_KG = 16;

// Lineyka — brauzerning tabiiy gorizontal scroll'iga tayanadi (drag-fizikasini
// qo'lda yozish o'rniga), shu bilan birga mobil/trackpad'da silliq ishlaydi.
// Scroll to'xtaganda (120ms) qiymat "qulflanadi" — har pikselda ota-komponentni
// qayta render qilib yubormaslik uchun.
//
// MUHIM: absolyut pozitsiyalangan elementlar ota-konteynerning CSS padding'ini
// "left" hisobida e'tiborga olmaydi (padding-box chegarasidan, ya'ni padding
// ICHIDAN boshlab hisoblaydi) — shuning uchun markazlashtirish uchun konteyner
// kengligi JS orqali o'lchanadi va har bir chiziqning `left`iga qo'lda qo'shiladi.
export function WeightRuler({ value, min, max, onChange, zones }: WeightRulerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [liveValue, setLiveValue] = useState(value);
  const [containerWidth, setContainerWidth] = useState(0);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressNextScroll = useRef(false);

  // Tashqi `value` o'zgarsa (masalan profil qayta yuklanganda) render vaqtida
  // moslaymiz — effekt ichidagi sync setState kaskadli qo'shimcha render
  // chiqarardi.
  const [prevValue, setPrevValue] = useState(value);
  if (prevValue !== value) {
    setPrevValue(value);
    setLiveValue(value);
  }

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => setContainerWidth(entries[0].contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Faqat DOM'ni (scrollLeft) tashqi `value` bilan sinxronlaydi — bu haqiqiy
  // tashqi tizim bilan ishlash, shuning uchun useEffect'da qolishi to'g'ri.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || containerWidth === 0) return;
    const targetLeft = (value - min) * PX_PER_KG;
    if (Math.abs(el.scrollLeft - targetLeft) > 1) {
      suppressNextScroll.current = true;
      el.scrollLeft = targetLeft;
    }
  }, [value, min, containerWidth]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    if (suppressNextScroll.current) {
      suppressNextScroll.current = false;
      return;
    }
    const raw = min + el.scrollLeft / PX_PER_KG;
    const clamped = Math.max(min, Math.min(max, Math.round(raw)));
    setLiveValue(clamped);

    if (settleTimer.current) clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => onChange(clamped), 120);
  };

  // Qo'lda kiritish maydoni — lineykani surmasdan aniq raqam yozish uchun.
  // Yozayotganda (`manualFocused`) tashqi qiymat matnni "qayta yozib"
  // yubormaydi — aks holda masalan "150" yozayotganda "1" kiritilgan zahoti
  // (diapazondan tashqari bo'lgani uchun) matn qayta formatlanib, yozishga
  // xalaqit berardi. Yakuniy qiymat faqat maydondan chiqilganda (blur/Enter)
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

  const activeZone = zones.find((z) => liveValue < z.upTo) ?? zones[zones.length - 1];

  const ticks = [];
  for (let kg = min; kg <= max; kg++) {
    const isMajor = kg % 10 === 0;
    const isMedium = !isMajor && kg % 5 === 0;
    ticks.push(
      <div
        key={kg}
        className="absolute top-0 flex flex-col items-center"
        style={{ left: containerWidth / 2 + (kg - min) * PX_PER_KG, scrollSnapAlign: "center" }}
      >
        <div className={`bg-white/25 ${isMajor ? "w-[2px] h-10" : isMedium ? "w-px h-7" : "w-px h-4"}`} />
        {isMajor && <span className="mt-1.5 font-label-mono text-[11px] text-on-surface-variant">{kg}</span>}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-xl bg-surface-container-high/60 border border-white/10 flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-primary-fixed-dim text-[22px]">monitor_weight</span>
        </div>
        <div className="flex-1">
          <div className="font-label-mono text-label-mono text-on-surface-variant uppercase">Joriy Vazningiz</div>
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
            style={{ color: activeZone.color }}
            className="w-24 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-right font-headline-md text-[22px] font-bold outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-colors"
          />
          <span className="font-label-mono text-[13px] text-on-surface-variant">kg</span>
        </div>
      </div>

      <div className="mb-5">
        <WeightZoneGauge value={liveValue} zones={zones} />
      </div>

      <div className="relative h-16">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="h-full overflow-x-scroll [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{ scrollSnapType: "x proximity" }}
        >
          <div className="relative h-full" style={{ width: (max - min) * PX_PER_KG + containerWidth }}>
            {ticks}
          </div>
        </div>
        <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 w-0.5 h-10 bg-primary-container shadow-[0_0_8px_rgba(195,244,0,0.6)]" />
      </div>
    </div>
  );
}
