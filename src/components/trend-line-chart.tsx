export interface TrendPoint {
  id: string;
  dateLabel: string;
  value: number;
}

interface TrendLineChartProps {
  label: string;
  unit?: string;
  points: TrendPoint[];
  forecastPoints?: TrendPoint[];
  color?: string;
  glowColor?: string;
  emptyMessage?: string;
}

const DEFAULT_COLOR = "#abd600";
const DEFAULT_GLOW = "rgba(171,214,0,0.5)";

function formatNumber(n: number): string {
  return n.toLocaleString("uz-UZ", { maximumFractionDigits: 1 });
}

// Haqiqiy tarix (to'liq chiziq) + ixtiyoriy prognoz segmenti (punktir chiziq,
// oxirgi haqiqiy nuqtadan davom etadi). Nuqta belgilar SVG emas — alohida
// pozitsiyalangan doiralar sifatida chiziladi, aks holda `preserveAspectRatio="none"`
// tufayli tor-baland konteynerda doiralar tuxumsimon cho'zilib ko'rinardi.
export function TrendLineChart({
  label,
  unit = "",
  points,
  forecastPoints = [],
  color = DEFAULT_COLOR,
  glowColor = DEFAULT_GLOW,
  emptyMessage = "Grafikni ko'rish uchun yana kamida bitta yozuv kerak.",
}: TrendLineChartProps) {
  if (points.length === 0) return null;

  if (points.length === 1) {
    return (
      <div>
        <div className="font-label-mono text-label-mono text-on-surface-variant uppercase mb-1">{label}</div>
        <div className="font-display-lg-mobile text-display-lg-mobile text-primary font-bold">
          {formatNumber(points[0].value)}
          {unit}
        </div>
        <p className="font-body-md text-[13px] text-on-surface-variant mt-2">{emptyMessage}</p>
      </div>
    );
  }

  const allValues = [...points, ...forecastPoints].map((p) => p.value);
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  const range = max - min;
  const totalCount = points.length + forecastPoints.length;
  const xStep = totalCount > 1 ? 100 / (totalCount - 1) : 0;

  const yFor = (value: number) => {
    const fraction = range === 0 ? 0.5 : (value - min) / range;
    return 90 - fraction * 80; // 10% pastki/tepa bo'shliq — nuqtalar chetga yopishib qolmasligi uchun
  };

  const actualCoords = points.map((p, i) => ({ ...p, x: i * xStep, y: yFor(p.value) }));
  const forecastCoords = forecastPoints.map((p, i) => ({
    ...p,
    x: (points.length + i) * xStep,
    y: yFor(p.value),
  }));

  const actualPath = actualCoords.map((c) => `${c.x},${c.y}`).join(" ");
  const forecastPath =
    forecastCoords.length > 0
      ? [actualCoords[actualCoords.length - 1], ...forecastCoords].map((c) => `${c.x},${c.y}`).join(" ")
      : "";

  const ariaLabel =
    `${label}: ${actualCoords.map((c) => `${c.dateLabel} ${formatNumber(c.value)}${unit}`).join(", ")}` +
    (forecastCoords.length > 0
      ? `. Prognoz: ${forecastCoords.map((c) => `${c.dateLabel} ${formatNumber(c.value)}${unit}`).join(", ")}`
      : "");

  return (
    <div role="img" aria-label={ariaLabel}>
      <div className="font-label-mono text-label-mono text-on-surface-variant uppercase mb-3">{label}</div>
      <div className="relative h-36">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
          <polyline
            points={actualPath}
            fill="none"
            stroke={color}
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
            style={{ filter: `drop-shadow(0 0 2px ${glowColor})` }}
          />
          {forecastPath && (
            <polyline
              points={forecastPath}
              fill="none"
              stroke={color}
              strokeWidth="1.5"
              strokeDasharray="4 3"
              opacity={0.55}
              vectorEffect="non-scaling-stroke"
            />
          )}
        </svg>
        {actualCoords.map((c) => (
          <div
            key={c.id}
            title={`${c.dateLabel}: ${formatNumber(c.value)}${unit}`}
            className="absolute w-2.5 h-2.5 rounded-full -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${c.x}%`, top: `${c.y}%`, backgroundColor: color, boxShadow: `0 0 4px ${glowColor}` }}
          />
        ))}
        {forecastCoords.map((c) => (
          <div
            key={c.id}
            title={`${c.dateLabel} (prognoz): ${formatNumber(c.value)}${unit}`}
            className="absolute w-2.5 h-2.5 rounded-full border -translate-x-1/2 -translate-y-1/2 bg-surface"
            style={{ left: `${c.x}%`, top: `${c.y}%`, borderColor: color }}
          />
        ))}
      </div>
      <div className="border-t border-white/10" />
      <div className="flex gap-2 mt-1.5">
        {actualCoords.map((c) => (
          <span
            key={c.id}
            className="flex-1 min-w-0 text-center font-label-mono text-[9px] text-on-surface-variant truncate"
          >
            {c.dateLabel}
          </span>
        ))}
        {forecastCoords.map((c) => (
          <span
            key={c.id}
            className="flex-1 min-w-0 text-center font-label-mono text-[9px] text-tertiary-fixed-dim truncate"
          >
            {c.dateLabel}
          </span>
        ))}
      </div>
    </div>
  );
}
