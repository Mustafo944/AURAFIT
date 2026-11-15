import Link from "next/link";
import { signUp } from "@/lib/supabase/actions";
import { AuthShell } from "@/components/auth-shell";

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;

  return (
    <AuthShell
      title="Ro'yxatdan O'tish"
      subtitle="Yangi hisob yarating va boshlang"
      error={error}
      footer={
        <>
          Hisobingiz bormi?{" "}
          <Link href="/login" className="text-primary-fixed-dim hover:text-primary transition-colors">
            Kirish
          </Link>
        </>
      }
    >
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
              minLength={8}
              autoComplete="new-password"
              className="w-full bg-white/[0.03] border border-white/10 rounded pl-11 pr-4 py-3 text-on-surface font-body-md focus:border-primary-container focus:bg-white/[0.06] focus:ring-1 focus:ring-primary-container transition-colors outline-none"
            />
          </div>
          <p className="font-label-mono text-[10px] text-on-surface-variant mt-1.5">Kamida 8 belgi</p>
        </div>
        <button
          type="submit"
          className="w-full flex items-center justify-center gap-2 bg-primary-container text-on-primary-container font-headline-md text-sm uppercase tracking-wider py-3 rounded-lg glow-button hover:bg-primary-fixed transition-colors"
        >
          Ro&apos;yxatdan O&apos;tish
          <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
        </button>
      </form>
    </AuthShell>
  );
}
