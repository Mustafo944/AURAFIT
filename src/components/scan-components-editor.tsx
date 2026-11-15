"use client";

import { componentTotals, type ScanComponent } from "@/lib/nutrition";

const GRAM_STEP = 10;

// Skaner natijasidagi komponentlar: har birining og'irligi (gramm) tahrirlanadi,
// kaloriya esa 100 g qiymatidan jonli qayta hisoblanadi. Porsiyani AI taxmin qiladi —
// foydalanuvchi idishga qarab to'g'rilasa, natija eng aniq bo'ladi.
export function ScanComponentsEditor({
  components,
  grams,
  onGramsChange,
  onRemove,
}: {
  components: ScanComponent[];
  grams: string[];
  onGramsChange: (index: number, value: string) => void;
  onRemove: (index: number) => void;
}) {
  const adjust = (index: number, delta: number) =>
    onGramsChange(index, String(Math.max(0, Math.round(((Number(grams[index]) || 0) + delta) * 10) / 10)));

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <span className="font-label-mono text-label-mono text-on-surface-variant">TARKIB VA OG&apos;IRLIK</span>
        <span className="font-label-mono text-[10px] text-on-surface-variant/70">gramm bo&apos;yicha to&apos;g&apos;rilang</span>
      </div>
      <ul className="space-y-2">
        {components.map((component, index) => {
          const value = Number(grams[index]) || 0;
          const kcal = Math.round(componentTotals({ grams: value, per100g: component.per100g }).kcal);
          return (
            <li key={`${component.name}-${index}`} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[14px] font-semibold leading-snug text-white">{component.name}</div>
                  <div className="font-label-mono text-[10px] text-on-surface-variant">
                    100 g da {component.per100g.kcal} kkal{component.ref === null ? " · AI bahosi" : ""}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onRemove(index)}
                  aria-label={`${component.name}: ro'yxatdan olib tashlash`}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-on-surface-variant hover:bg-error/10 hover:text-error"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => adjust(index, -GRAM_STEP)}
                  aria-label={`${component.name}: ${GRAM_STEP} gramm kamaytirish`}
                  className="h-10 w-10 shrink-0 rounded-lg border border-white/15 text-[18px] text-on-surface-variant active:scale-95"
                >
                  −
                </button>
                <div className="relative min-w-0 flex-1">
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    max={2000}
                    value={grams[index] ?? ""}
                    onFocus={(event) => event.currentTarget.select()}
                    onChange={(event) => onGramsChange(index, event.target.value)}
                    aria-label={`${component.name}: og'irlik, gramm`}
                    className="h-10 w-full rounded-lg border border-white/10 bg-black/40 pr-8 text-center font-headline-md text-[16px] text-on-surface outline-none focus:border-primary-container"
                  />
                  <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 font-label-mono text-[10px] text-on-surface-variant">
                    g
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => adjust(index, GRAM_STEP)}
                  aria-label={`${component.name}: ${GRAM_STEP} gramm oshirish`}
                  className="h-10 w-10 shrink-0 rounded-lg border border-white/15 text-[18px] text-on-surface-variant active:scale-95"
                >
                  +
                </button>
                <div className="w-20 shrink-0 text-right">
                  <span className="font-headline-md text-[18px] font-bold text-primary-fixed-dim">{kcal}</span>
                  <span className="ml-1 font-label-mono text-[10px] text-on-surface-variant">kkal</span>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
