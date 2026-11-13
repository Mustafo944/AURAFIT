import { ProgressRing } from "@/components/progress-ring";

// Shkala 15..40 oralig'ida chiziladi; zona chegaralari fitness.ts'dagi
// bmiCategory bilan bir xil (18.5 / 25 / 30).
const SCALE_MIN = 15;
const SCALE_MAX = 40;

const ZONES = [
  { upTo: 18.5, color: "#00dbe9", label: "Kam vazn" },
  { upTo: 25, color: "#abd600", label: "Norma" },
  { upTo: 30, color: "#f2b705", label: "Ortiqcha" },
  { upTo: Infinity, color: "#ffb4ab", label: "Semizlik" },
];

const toPercent = (bmi: number) =>
  Math.max(0, Math.min(100, ((bmi - SCALE_MIN) / (SCALE_MAX - SCALE_MIN)) * 100));

export function BmiCard({ bmi, category }: { bmi: number; category: string }) {
  const zone = ZONES.find((z) => bmi < z.upTo) ?? ZONES[ZONES.length - 1];
  const position = toPercent(bmi);
  const gradientStops = [
    `${ZONES[0].color} 0%`,
    `${ZONES[0].color} ${toPercent(18.5)}%`,
    `${ZONES[1].color} ${toPercent(18.5)}%`,
    `${ZONES[1].color} ${toPercent(25)}%`,
    `${ZONES[2].color} ${toPercent(25)}%`,
    `${ZONES[2].color} ${toPercent(30)}%`,
    `${ZONES[3].color} ${toPercent(30)}%`,
    `${ZONES[3].color} 100%`,
  ].join(", ");

  return (
    <div className="glass-card glass-card-hover rounded-2xl p-6 md:p-8 relative overflow-hidden border-l-[4px] border-l-tertiary-fixed-dim shadow-[0_8px_32px_rgba(0,0,0,0.5)] flex flex-col gap-5">
      <div className="absolute -right-12 -top-12 w-48 h-48 rounded-full blur-3xl pointer-events-none opacity-20" style={{ backgroundColor: zone.color }} />
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="w-1.5 h-4 rounded-full" style={{ backgroundColor: zone.color }} />
          <span className="font-label-mono text-label-mono text-on-surface-variant uppercase tracking-wider">
            Biometrik ko&apos;rsatkich
          </span>
        </div>
        <p className="text-xs text-on-surface-variant">Tana vazni indeksi (BMI)</p>
      </div>

      <div className="flex items-center justify-between gap-4 relative z-10">
        <div className="flex items-end gap-3 flex-wrap">
          <span className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-primary font-bold leading-none">
            {bmi}
          </span>
          <span
            className="font-label-mono text-[11px] px-2 py-0.5 rounded uppercase border mb-1"
            style={{ color: zone.color, borderColor: `${zone.color}80`, backgroundColor: `${zone.color}26` }}
          >
            {category}
          </span>
        </div>
        <ProgressRing percentage={position} color={zone.color} glowColor={`${zone.color}80`} />
      </div>

      <div className="relative z-10 space-y-2">
        <div
          className="relative h-2 rounded-full"
          style={{ background: `linear-gradient(to right, ${gradientStops})` }}
          role="img"
          aria-label={`BMI ${bmi}: ${category}`}
        >
          <span
            className="absolute top-1/2 w-4 h-4 rounded-full bg-white border-2 border-background -translate-x-1/2 -translate-y-1/2 shadow-[0_0_10px_rgba(255,255,255,0.6)]"
            style={{ left: `${position}%` }}
          />
        </div>
        <div className="flex justify-between font-label-mono text-[9px] sm:text-[10px] uppercase">
          {ZONES.map((z) => (
            <span
              key={z.label}
              style={{ color: z === zone ? z.color : undefined }}
              className={z === zone ? "font-bold" : "text-on-surface-variant"}
            >
              {z.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
