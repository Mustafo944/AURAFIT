import Link from "next/link";
import { redirect } from "next/navigation";
import { resendEmailCode, verifyEmailCode } from "@/lib/supabase/actions";
import { isValidEmail, normalizeEmail } from "@/lib/auth-input";
import { AuthShell } from "@/components/auth-shell";

// Ro'yxatdan o'tishning ikkinchi qadami: emailga kelgan kodni kiritish.
export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; error?: string; message?: string }>;
}) {
  const params = await searchParams;
  const email = normalizeEmail(params.email);
  if (!isValidEmail(email)) redirect("/signup");

  return (
    <AuthShell
      title="Emailni Tasdiqlash"
      subtitle="Pochtangizga yuborilgan kodni kiriting"
      message={params.message}
      error={params.error}
      footer={
        <>
          Hisobingiz bormi?{" "}
          <Link href="/login" className="text-primary-fixed-dim hover:text-primary transition-colors">
            Kirish
          </Link>
        </>
      }
    >
      <p className="font-body-md text-[13px] text-on-surface-variant text-center">
        <span className="text-on-surface break-all">{email}</span> manziliga tasdiqlash kodi yuborildi.
      </p>

      <form action={verifyEmailCode} className="space-y-4">
        <input type="hidden" name="email" value={email} />
        <div>
          <label htmlFor="code" className="block font-label-mono text-label-mono text-on-surface-variant mb-2">
            TASDIQLASH KODI
          </label>
          <input
            id="code"
            name="code"
            type="text"
            required
            autoFocus
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={12}
            placeholder="000000"
            className="w-full bg-white/[0.03] border border-white/10 rounded px-4 py-3 text-center text-2xl tracking-[0.4em] text-on-surface font-headline-md focus:border-primary-container focus:bg-white/[0.06] focus:ring-1 focus:ring-primary-container transition-colors outline-none"
          />
        </div>
        <button
          type="submit"
          className="w-full flex items-center justify-center gap-2 bg-primary-container text-on-primary-container font-headline-md text-sm uppercase tracking-wider py-3 rounded-lg glow-button hover:bg-primary-fixed transition-colors"
        >
          Tasdiqlash
          <span className="material-symbols-outlined text-[18px]">check</span>
        </button>
      </form>

      <form action={resendEmailCode} className="text-center space-y-2">
        <input type="hidden" name="email" value={email} />
        <p className="font-label-mono text-[10px] text-on-surface-variant">
          Kod kelmadimi? Spam papkasini ham tekshiring.
        </p>
        <button
          type="submit"
          className="font-label-mono text-label-mono text-primary-fixed-dim hover:text-primary transition-colors underline underline-offset-4"
        >
          Kodni qayta yuborish
        </button>
      </form>
    </AuthShell>
  );
}
