export function ProgressRing({
  percentage,
  color,
  glowColor,
}: {
  percentage: number;
  color: string;
  glowColor: string;
}) {
  const circumference = 2 * Math.PI * 40;
  const clamped = Math.max(0, Math.min(100, percentage));
  const offset = circumference - (clamped / 100) * circumference;
  return (
    <div className="relative w-20 h-20">
      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
        <circle
          cx="50" cy="50" r="40" fill="none"
          stroke={color}
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 5px ${glowColor})` }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-headline-md text-headline-md text-primary font-bold">{Math.round(clamped)}%</span>
      </div>
    </div>
  );
}
