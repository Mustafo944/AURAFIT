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
    <div className="min-h-screen flex items-center justify-center px-margin-mobile">
      <div className="w-full max-w-sm glass-card rounded-xl p-8 space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <Logo className="w-10 h-10 drop-shadow-[0_0_6px_rgba(195,244,0,0.5)]" />
          <h1 className="font-headline-md text-headline-md text-primary uppercase italic">Ro&apos;yxatdan O&apos;tish</h1>
        </div>

        {error && (
          <p className="font-body-md text-[13px] text-error border border-error/30 bg-error/10 rounded-lg px-4 py-3">
            {error}
          </p>
        )}

        <form action={signUp} className="space-y-4">
          <div>
            <label className="block font-label-mono text-label-mono text-on-surface-variant mb-2">EMAIL</label>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full bg-[#000000] border border-white/10 rounded px-4 py-3 text-on-surface font-body-md focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-colors outline-none"
            />
          </div>
          <div>
            <label className="block font-label-mono text-label-mono text-on-surface-variant mb-2">PAROL</label>
            <input
              name="password"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              className="w-full bg-[#000000] border border-white/10 rounded px-4 py-3 text-on-surface font-body-md focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-colors outline-none"
            />
            <p className="font-label-mono text-[10px] text-on-surface-variant mt-1.5">Kamida 6 belgi</p>
          </div>
          <button
            type="submit"
            className="w-full bg-primary-container text-on-primary-container font-headline-md text-sm uppercase tracking-wider py-3 rounded-lg glow-button hover:bg-primary-fixed transition-colors"
          >
            Ro&apos;yxatdan O&apos;tish
          </button>
        </form>

        <p className="text-center font-label-mono text-label-mono text-on-surface-variant">
          Hisobingiz bormi?{" "}
          <Link href="/login" className="text-primary-fixed-dim hover:text-primary transition-colors">
            Kirish
          </Link>
        </p>
      </div>
    </div>
  );
}
