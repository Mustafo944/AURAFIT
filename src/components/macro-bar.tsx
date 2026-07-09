export function MacroBar({
  label,
  grams,
  color,
  max,
  rightLabel,
}: {
  label: string;
  grams: number;
  color: string;
  max: number;
  rightLabel?: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.round((grams / max) * 100)) : 0;
  return (
    <div>
      <div className="flex justify-between font-label-mono text-label-mono text-on-surface-variant mb-1">
        <span className="uppercase">{label}</span>
        <span className="text-on-surface">{rightLabel ?? `${grams}g`}</span>
      </div>
      <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color, boxShadow: `0 0 8px ${color}` }}
        />
      </div>
    </div>
  );
}
