interface WeeklyActivityChartPoint {
  weekLabel: string;
  weekStart: string;
  count: number;
  totalVolumeKg: number;
}

// VolumeChart bilan bir xil ustunli-grafik naqshi, lekin haftalik mashg'ulot
// SONI asosiy ko'rsatkich, umumiy hajm esa tooltip'da ikkilamchi ma'lumot sifatida.
export function WeeklyActivityChart({ points }: { points: WeeklyActivityChartPoint[] }) {
  if (points.length === 0) return null;

  if (points.length === 1) {
    return (
      <div>
        <div className="font-label-mono text-label-mono text-on-surface-variant uppercase mb-1">
          Haftalik Faollik
        </div>
        <div className="font-display-lg-mobile text-display-lg-mobile text-primary font-bold">
          {points[0].count} mashg&apos;ulot
        </div>
        <p className="font-body-md text-[13px] text-on-surface-variant mt-2">
          Haftalik tendensiyani ko&apos;rish uchun yana bitta hafta ma&apos;lumoti kerak.
        </p>
      </div>
    );
  }

  const max = Math.max(...points.map((p) => p.count), 1);
  const latestIndex = points.length - 1;

  return (
    <div
      role="img"
      aria-label={`Oxirgi ${points.length} hafta bo'yicha mashg'ulotlar soni: ${points
        .map((p) => `${p.weekLabel} ${p.count} ta, ${Math.round(p.totalVolumeKg)} kg hajm`)
        .join(", ")}`}
    >
      <div className="font-label-mono text-label-mono text-on-surface-variant uppercase mb-3">
        Haftalik Faollik
      </div>
      <div className="flex items-end gap-2 h-36">
        {points.map((point, index) => {
          const isLatest = index === latestIndex;
          const heightPct = Math.max(6, (point.count / max) * 100);
          return (
            <div key={point.weekStart} className="flex-1 flex flex-col items-center justify-end h-full min-w-0">
              <span
                className={`font-label-mono text-[10px] mb-1 whitespace-nowrap ${
                  isLatest ? "text-tertiary-fixed-dim" : "text-on-surface-variant"
                }`}
              >
                {point.count}
              </span>
              <div
                title={`${point.weekLabel}: ${point.count} ta mashg'ulot, ${Math.round(point.totalVolumeKg)} kg hajm`}
                className={`w-full max-w-6 rounded-t-[4px] transition-all duration-500 ${
                  isLatest ? "bg-tertiary-fixed-dim" : "bg-[#3a5a5e]"
                }`}
                style={{ height: `${heightPct}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="border-t border-white/10" />
      <div className="flex gap-2 mt-1.5">
        {points.map((point) => (
          <span
            key={point.weekStart}
            className="flex-1 min-w-0 text-center font-label-mono text-[9px] text-on-surface-variant truncate"
          >
            {point.weekLabel}
          </span>
        ))}
      </div>
    </div>
  );
}
