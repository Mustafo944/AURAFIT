// "A" — ikki qiyalik shtanga/cho'qqi shaklida (kuch, progress) lime rangda,
// o'rtasidagi ko'ndalang chiziq "Aura" energiyasini bildiruvchi nurlanuvchi
// puls sifatida cyan rangda. Ilovaning ikki asosiy aksent rangini birlashtiradi.
export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" className={className}>
      <path
        d="M6 28 L16 5 L26 28"
        className="stroke-primary-fixed"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M10.5 19 L21.5 19" className="stroke-tertiary-fixed-dim" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
