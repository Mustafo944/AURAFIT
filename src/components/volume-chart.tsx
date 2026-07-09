interface VolumePoint {
  id: string;
  dateLabel: string;
  totalVolumeKg: number;
}

// Bitta seriya (umumiy hajm) + "eng oxirgisini ajratib ko'rsatish" pattern —
// o'tgan mashg'ulotlar de-emphasis rangda, joriy/oxirgisi accent rangda.
export function VolumeChart({ points }: { points: VolumePoint[] }) {
  if (points.length === 0) return null;

  if (points.length === 1) {
    return (
      <div>
        <div className="font-label-mono text-label-mono text-on-surface-variant uppercase mb-1">
          Umumiy Og&apos;irlik Hajmi
        </div>
        <div className="font-display-lg-mobile text-display-lg-mobile text-primary font-bold">
          {Math.round(points[0].totalVolumeKg).toLocaleString("uz-UZ")} kg
        </div>
        <p className="font-body-md text-[13px] text-on-surface-variant mt-2">
          Progressni grafikda ko&apos;rish uchun yana kamida bitta mashg&apos;ulot kerak.
        </p>
      </div>
    );
  }

  const max = Math.max(...points.map((p) => p.totalVolumeKg), 1);
  const latestIndex = points.length - 1;

  return (
    <div
      role="img"
      aria-label={`Oxirgi ${points.length} ta mashg'ulot bo'yicha umumiy og'irlik hajmi, kilogrammda: ${points
        .map((p) => `${p.dateLabel} ${Math.round(p.totalVolumeKg)} kg`)
        .join(", ")}`}
    >
      <div className="font-label-mono text-label-mono text-on-surface-variant uppercase mb-3">
        Umumiy Og&apos;irlik Hajmi (kg)
      </div>
      <div className="flex items-end gap-2 h-36">
        {points.map((point, index) => {
          const isLatest = index === latestIndex;
          const heightPct = Math.max(4, (point.totalVolumeKg / max) * 100);
          return (
            <div key={point.id} className="flex-1 flex flex-col items-center justify-end h-full min-w-0">
              {isLatest && (
                <span className="font-label-mono text-[10px] text-primary-fixed-dim mb-1 whitespace-nowrap">
                  {Math.round(point.totalVolumeKg).toLocaleString("uz-UZ")}
                </span>
              )}
              <div
                title={`${point.dateLabel}: ${Math.round(point.totalVolumeKg)} kg`}
                className={`w-full max-w-6 rounded-t-[4px] transition-all duration-500 ${
                  isLatest ? "bg-primary-fixed-dim" : "bg-[#647058]"
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
            key={point.id}
            className="flex-1 min-w-0 text-center font-label-mono text-[9px] text-on-surface-variant truncate"
          >
            {point.dateLabel}
          </span>
        ))}
      </div>
    </div>
  );
}
