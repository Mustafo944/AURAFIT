import type { ReactNode } from "react";
import { Logo } from "@/components/logo";

// Kirish, ro'yxatdan o'tish va kodni tasdiqlash sahifalari uchun umumiy ramka:
// fon, karta, logotip va sarlavha; xabar/xato va forma `children` ichida.
export function AuthShell({
  title,
  subtitle,
  message,
  error,
  footer,
  children,
}: {
  title: string;
  subtitle: string;
  message?: string;
  error?: string;
  footer: ReactNode;
  children: ReactNode;
}) {
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
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-primary-container via-tertiary-fixed-dim to-primary-container"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-white/[0.06] to-transparent"
        />

        <div className="relative flex flex-col items-center gap-4 text-center">
          <div className="flex items-center justify-center w-16 h-16 rounded-xl bg-surface-container-high/60 border border-white/10 shadow-[0_0_20px_rgba(195,244,0,0.15)]">
            <Logo className="w-8 h-8 drop-shadow-[0_0_8px_rgba(195,244,0,0.6)]" />
          </div>
          <div className="space-y-1">
            <h1 className="font-headline-md text-headline-md text-primary uppercase italic">{title}</h1>
            <p className="font-body-md text-[13px] text-on-surface-variant">{subtitle}</p>
          </div>
        </div>

        {message && (
          <p className="font-body-md text-[13px] text-primary-fixed-dim border border-primary-fixed-dim/30 bg-primary-fixed-dim/10 rounded-lg px-4 py-3">
            {message}
          </p>
        )}
        {error && (
          <p
            role="alert"
            className="font-body-md text-[13px] text-error border border-error/30 bg-error/10 rounded-lg px-4 py-3"
          >
            {error}
          </p>
        )}

        {children}

        <div className="text-center font-label-mono text-label-mono text-on-surface-variant pt-4 border-t border-white/10">
          {footer}
        </div>
      </div>
    </div>
  );
}
