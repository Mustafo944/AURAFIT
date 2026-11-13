import type { MuscleGroupId } from "@/lib/exercise-metadata";

// Tana siluetida tegishli mushak guruhi to'ldirilib ko'rsatiladi. Material
// Symbols'da mushak ikonkalari yo'q, shu sabab oddiy SVG siluet chizildi:
// xira kontur — tana, yorqin to'ldirish — mashq qilinadigan mushak.
const BODY = (
  <>
    <circle cx="12" cy="3.4" r="2.1" />
    <path d="M7.4 6.4h9.2l.6 7.6h-10.4z" />
    <path d="M4.2 6.9l2.7.5-.5 6.1H4.1z" />
    <path d="M19.8 6.9l-2.7.5.5 6.1h2.3z" />
    <path d="M8 14.4h3.6l-.4 7.4H8.4z" />
    <path d="M12.4 14.4H16l-.4 7.4h-2.8z" />
  </>
);

const HIGHLIGHT: Record<MuscleGroupId | "all", React.ReactNode> = {
  chest: (
    <>
      <path d="M8 7.2h3.7v3.6H8.6z" />
      <path d="M12.3 7.2H16l-.6 3.6h-3.1z" />
    </>
  ),
  // Orqa: yelka chiziqlaridan beligacha kengayuvchi "V" shaklidagi qanot mushaklari.
  back: <path d="M7.6 6.8h8.8l-1.6 7H9.2z" />,
  shoulders: (
    <>
      <circle cx="6.1" cy="7.3" r="2" />
      <circle cx="17.9" cy="7.3" r="2" />
    </>
  ),
  biceps: (
    <>
      <path d="M4.2 7.7l2.5.4-.3 3.2H4.1z" />
      <path d="M19.8 7.7l-2.5.4.3 3.2h2.3z" />
    </>
  ),
  triceps: (
    <>
      <path d="M4.1 8.2l2.7.1-.4 4.6H4.1z" />
      <path d="M19.9 8.2l-2.7.1.4 4.6h2.3z" />
    </>
  ),
  legs: (
    <>
      <path d="M8 14.4h3.6l-.4 7.4H8.4z" />
      <path d="M12.4 14.4H16l-.4 7.4h-2.8z" />
    </>
  ),
  abs: (
    <>
      <path d="M9.6 10.6h4.8l-.2 3.4H9.8z" />
    </>
  ),
  all: null,
};

export function MuscleIcon({
  group,
  size = 20,
  className,
}: {
  group: MuscleGroupId | "all";
  size?: number;
  className?: string;
}) {
  if (group === "all") {
    return (
      <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" className={className}>
        <g fill="currentColor">
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
        </g>
      </svg>
    );
  }
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" className={className}>
      <g fill="currentColor" opacity="0.28">
        {BODY}
      </g>
      <g fill="currentColor">{HIGHLIGHT[group]}</g>
    </svg>
  );
}
