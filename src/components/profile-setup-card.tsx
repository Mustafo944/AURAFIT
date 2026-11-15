import Link from "next/link";

// Parametrlar kiritilmagan foydalanuvchi uchun: namunaviy (noto'g'ri) raqamlar o'rniga
// anketani to'ldirishga taklif.
export function ProfileSetupCard({ compact = false }: { compact?: boolean }) {
  return (
    <section className="glass-card rounded-2xl p-6 md:p-8 border-l-[4px] border-l-primary-fixed-dim space-y-4">
      <div className="space-y-2">
        <p className="font-label-mono text-[11px] uppercase tracking-widest text-primary-fixed-dim">
          Boshlash uchun
        </p>
        <h2 className="font-headline-md text-[22px] leading-tight text-primary">
          Kunlik kaloriyangizni hisoblaylik
        </h2>
        {!compact && (
          <p className="text-sm text-on-surface-variant">
            Jins, yosh, bo&apos;y, vazn va maqsadingizni kiriting — kaloriya, BMI hamda oqsil, yog&apos; va
            uglevod me&apos;yorlari aynan siz uchun hisoblanadi. 30 soniya vaqt oladi.
          </p>
        )}
      </div>
      <Link
        href="/onboarding"
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-container py-3.5 font-headline-md text-[16px] uppercase tracking-wider text-on-primary-container glow-button hover:bg-primary-fixed transition-colors"
      >
        Ma&apos;lumotlarni kiritish
        <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
      </Link>
    </section>
  );
}
