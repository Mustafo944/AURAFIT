interface WeightZone {
  upTo: number;
  color: string;
  label: string;
}

// BMI zonalarini "datchik" sifatida ko'rsatadi — faol zona yorqin (to'ldirilgan
// + porlash), qolganlari xira. `value` o'zgarganda (masalan WeightRuler orqali)
// qaysi pill "yonishi" avtomatik almashadi.
export function WeightZoneGauge({
  value,
  zones,
  compact = false,
}: {
  value: number;
  zones: WeightZone[];
  compact?: boolean;
}) {
  const activeIndex = zones.findIndex((z) => value < z.upTo);
  const idx = activeIndex === -1 ? zones.length - 1 : activeIndex;

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {zones.map((z, i) => {
        const active = i === idx;
        return (
          <span
            key={i}
            className={`font-label-mono uppercase rounded-full whitespace-nowrap transition-all duration-300 ${
              compact ? "text-[8px] px-2 py-1" : "text-[10px] px-3 py-1.5"
            } ${active ? "" : "opacity-40"}`}
            style={{
              color: active ? "#0a0a0a" : z.color,
              backgroundColor: active ? z.color : "transparent",
              border: `1px solid ${z.color}`,
              boxShadow: active ? `0 0 12px ${z.color}` : "none",
            }}
          >
            {z.label}
          </span>
        );
      })}
    </div>
  );
}
