import Link from "next/link";
import { signUp } from "@/lib/supabase/actions";
import { Logo } from "@/components/logo";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden px-margin-mobile bg-[radial-gradient(circle_at_50%_0%,#1c1f1f,var(--color-background)_65%)]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:44px_44px] [mask-image:radial-gradient(circle_at_50%_35%,black,transparent_75%)]"
      />
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-24 w-[26rem] h-[26rem] rounded-full bg-primary-container/30 blur-[120px]" />
        <div className="absolute -bottom-32 -right-20 w-[24rem] h-[24rem] rounded-full bg-tertiary-fixed-dim/25 blur-[130px]" />
      </div>

      <div
        className="relative w-full max-w-sm glass-card rounded-2xl p-8 space-y-6 overflow-hidden shadow-[0_24px_70px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.06)_inset]"
        style={{ backgroundColor: "rgba(26, 26, 26, 0.35)" }}
      >
        <div aria-hidden className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-primary-container via-tertiary-fixed-dim to-primary-container" />
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-white/[0.06] to-transparent" />

        <div className="relative flex flex-col items-center gap-4 text-center">
          <div className="flex items-center justify-center w-16 h-16 rounded-xl bg-surface-container-high/60 border border-white/10 shadow-[0_0_20px_rgba(195,244,0,0.15)]">
            <Logo className="w-8 h-8 drop-shadow-[0_0_8px_rgba(195,244,0,0.6)]" />
          </div>
          <div className="space-y-1">
            <h1 className="font-headline-md text-headline-md text-primary uppercase italic">Ro&apos;yxatdan O&apos;tish</h1>
            <p className="font-body-md text-[13px] text-on-surface-variant">Yangi hisob yarating va boshlang</p>
          </div>
        </div>

        {error && (
          <p className="font-body-md text-[13px] text-error border border-error/30 bg-error/10 rounded-lg px-4 py-3">
            {error}
          </p>
        )}

        <form action={signUp} className="space-y-4">
          <div>
            <label className="block font-label-mono text-label-mono text-on-surface-variant mb-2">EMAIL</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[20px] text-on-surface-variant">
                mail
              </span>
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                className="w-full bg-white/[0.03] border border-white/10 rounded pl-11 pr-4 py-3 text-on-surface font-body-md focus:border-primary-container focus:bg-white/[0.06] focus:ring-1 focus:ring-primary-container transition-colors outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block font-label-mono text-label-mono text-on-surface-variant mb-2">PAROL</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[20px] text-on-surface-variant">
                lock
              </span>
              <input
                name="password"
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                className="w-full bg-white/[0.03] border border-white/10 rounded pl-11 pr-4 py-3 text-on-surface font-body-md focus:border-primary-container focus:bg-white/[0.06] focus:ring-1 focus:ring-primary-container transition-colors outline-none"
              />
            </div>
            <p className="font-label-mono text-[10px] text-on-surface-variant mt-1.5">Kamida 6 belgi</p>
          </div>
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 bg-primary-container text-on-primary-container font-headline-md text-sm uppercase tracking-wider py-3 rounded-lg glow-button hover:bg-primary-fixed transition-colors"
          >
            Ro&apos;yxatdan O&apos;tish
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </button>
        </form>

        <p className="text-center font-label-mono text-label-mono text-on-surface-variant pt-4 border-t border-white/10">
          Hisobingiz bormi?{" "}
          <Link href="/login" className="text-primary-fixed-dim hover:text-primary transition-colors">
            Kirish
          </Link>
        </p>
      </div>
    </div>
  );
}
